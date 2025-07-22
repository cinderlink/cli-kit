/**
 * Workflow Orchestrator - High-level orchestration for complex workflows
 * 
 * Manages complex multi-step workflows that span multiple modules,
 * with proper error handling, rollback, and state management.
 */

import { Effect, Duration } from 'effect'
import { EventBus } from "@core/model/events/eventBus"
import { ModuleBase, ModuleError } from '@core/runtime/module/base'
import { EventChoreographer } from './choreography'
import { getGlobalRegistry } from '@core/runtime/module/registry'

/**
 * Workflow error type
 */
export class WorkflowError {
  readonly _tag = 'WorkflowError'
  constructor(
    readonly workflowId: string,
    readonly cause: Error
  ) {}
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  readonly name: string
  readonly description: string
  readonly requiredModules: string[]
  readonly steps: WorkflowStep[]
  readonly timeout?: Duration.Duration
  readonly retryPolicy?: RetryPolicy
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  readonly id: string
  readonly type: 'process-management' | 'cli-execution' | 'config-update' | 'ui-update'
  readonly description: string
  readonly config: unknown
  readonly dependencies?: string[] // IDs of steps that must complete first
  readonly optional?: boolean
}

/**
 * Retry policy for workflow steps
 */
export interface RetryPolicy {
  readonly maxAttempts: number
  readonly baseDelay: Duration.Duration
  readonly maxDelay: Duration.Duration
}

/**
 * Workflow instance tracking
 */
export interface WorkflowInstance {
  readonly id: string
  readonly config: WorkflowConfig
  readonly startTime: Date
  endTime?: Date
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  readonly steps: WorkflowStepInstance[]
  error?: Error
}

/**
 * Workflow step instance
 */
export interface WorkflowStepInstance extends WorkflowStep {
  startTime?: Date
  endTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  error?: Error
  result?: unknown
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  readonly workflowId: string
  readonly status: 'completed' | 'failed' | 'cancelled'
  readonly duration: number
  readonly steps: WorkflowStepInstance[]
  readonly error?: Error
}

/**
 * Workflow Orchestrator implementation
 */
export class WorkflowOrchestrator extends ModuleBase {
  private choreographer: EventChoreographer
  private activeWorkflows = new Map<string, WorkflowInstance>()
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'orchestrator')
    this.choreographer = new EventChoreographer(eventBus)
  }
  
  /**
   * Start complex workflow with multiple coordination patterns
   */
  startComplexWorkflow(workflowId: string, config: WorkflowConfig): Effect<WorkflowResult, WorkflowError> {
    return Effect.gen(function* () {
      const workflow: WorkflowInstance = {
        id: workflowId,
        config,
        startTime: new Date(),
        status: 'running',
        steps: config.steps.map(step => ({
          ...step,
          status: 'pending'
        }))
      }
      
      this.activeWorkflows.set(workflowId, workflow)
      
      try {
        // Step 1: Initialize all required modules
        yield* this.initializeWorkflowModules(config.requiredModules)
        
        // Step 2: Set up cross-module coordination
        yield* this.choreographer.coordinateProcessWithLogging()
        yield* this.choreographer.coordinateCLIWithUI()
        yield* this.choreographer.coordinateConfigUpdates()
        
        // Step 3: Execute workflow steps in sequence/parallel based on dependencies
        yield* this.executeWorkflowSteps(workflowId)
        
        // Step 4: Finalize and cleanup
        workflow.status = 'completed'
        workflow.endTime = new Date()
        
        return {
          workflowId,
          status: 'completed',
          duration: workflow.endTime.getTime() - workflow.startTime.getTime(),
          steps: workflow.steps
        }
        
      } catch (error) {
        workflow.status = 'failed'
        workflow.error = error as Error
        
        // Attempt rollback
        yield* this.rollbackWorkflow(workflowId).pipe(
          Effect.catchAll(() => Effect.void)
        )
        
        return yield* Effect.fail(new WorkflowError(workflowId, error as Error))
      }
    }.bind(this))
  }
  
  /**
   * Cancel an active workflow
   */
  cancelWorkflow(workflowId: string): Effect<void, WorkflowError> {
    return Effect.gen(function* () {
      const workflow = this.activeWorkflows.get(workflowId)
      if (!workflow) {
        return yield* Effect.fail(new WorkflowError(workflowId, new Error('Workflow not found')))
      }
      
      workflow.status = 'cancelled'
      workflow.endTime = new Date()
      
      // Cancel all running steps
      for (const step of workflow.steps) {
        if (step.status === 'running') {
          step.status = 'skipped'
        }
      }
      
      yield* this.emitEvent('workflow-events', {
        type: 'workflow-cancelled',
        source: 'orchestrator',
        timestamp: new Date(),
        id: this.generateId(),
        workflowId,
        reason: 'User requested cancellation'
      })
    }.bind(this))
  }
  
  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): Effect<WorkflowInstance | null, never> {
    return Effect.sync(() => this.activeWorkflows.get(workflowId) || null)
  }
  
  private initializeWorkflowModules(requiredModules: string[]): Effect<void, WorkflowError> {
    return Effect.gen(function* () {
      const registry = getGlobalRegistry()
      
      for (const moduleName of requiredModules) {
        if (!registry.hasModule(moduleName)) {
          return yield* Effect.fail(
            new WorkflowError('init', new Error(`Required module '${moduleName}' not found`))
          )
        }
        
        const module = registry.getModule(moduleName)
        if (!module || module.getState() !== 'ready') {
          return yield* Effect.fail(
            new WorkflowError('init', new Error(`Module '${moduleName}' not ready`))
          )
        }
      }
    })
  }
  
  private executeWorkflowSteps(workflowId: string): Effect<void, WorkflowError> {
    return Effect.gen(function* () {
      const workflow = this.activeWorkflows.get(workflowId)!
      
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow.steps)
      
      // Execute steps respecting dependencies
      const executed = new Set<string>()
      
      while (executed.size < workflow.steps.length) {
        // Find steps that can be executed now
        const readySteps = workflow.steps.filter(step => 
          step.status === 'pending' &&
          (!step.dependencies || step.dependencies.every(dep => executed.has(dep)))
        )
        
        if (readySteps.length === 0) {
          // Check for failures
          const failedSteps = workflow.steps.filter(s => s.status === 'failed' && !s.optional)
          if (failedSteps.length > 0) {
            return yield* Effect.fail(
              new WorkflowError(workflowId, new Error('Required steps failed'))
            )
          }
          break
        }
        
        // Execute ready steps in parallel
        yield* Effect.all(
          readySteps.map(step => this.executeWorkflowStep(workflowId, step))
        )
        
        // Mark as executed
        readySteps.forEach(step => executed.add(step.id))
      }
    }.bind(this))
  }
  
  private executeWorkflowStep(workflowId: string, step: WorkflowStepInstance): Effect<void, WorkflowError> {
    return Effect.gen(function* () {
      const workflow = this.activeWorkflows.get(workflowId)!
      
      step.startTime = new Date()
      step.status = 'running'
      
      yield* this.emitEvent('workflow-events', {
        type: 'step-started',
        source: 'orchestrator',
        timestamp: new Date(),
        id: this.generateId(),
        workflowId,
        stepId: step.id,
        stepType: step.type
      })
      
      try {
        switch (step.type) {
          case 'process-management':
            yield* this.executeProcessStep(step)
            break
          case 'cli-execution':
            yield* this.executeCLIStep(step)
            break
          case 'config-update':
            yield* this.executeConfigStep(step)
            break
          case 'ui-update':
            yield* this.executeUIStep(step)
            break
        }
        
        step.status = 'completed'
        step.endTime = new Date()
        
        yield* this.emitEvent('workflow-events', {
          type: 'step-completed',
          source: 'orchestrator',
          timestamp: new Date(),
          id: this.generateId(),
          workflowId,
          stepId: step.id,
          duration: step.endTime.getTime() - step.startTime.getTime()
        })
        
      } catch (error) {
        step.status = 'failed'
        step.error = error as Error
        step.endTime = new Date()
        
        yield* this.emitEvent('workflow-events', {
          type: 'step-failed',
          source: 'orchestrator',
          timestamp: new Date(),
          id: this.generateId(),
          workflowId,
          stepId: step.id,
          error: error as Error
        })
        
        if (!step.optional) {
          throw error
        }
      }
    }.bind(this))
  }
  
  private executeProcessStep(step: WorkflowStepInstance): Effect<void, Error> {
    return Effect.gen(function* () {
      const registry = getGlobalRegistry()
      const processManager = registry.getModule('process-manager')
      
      if (!processManager) {
        return yield* Effect.fail(new Error('Process manager module not available'))
      }
      
      const config = step.config as { command: string; args: string[]; name: string }
      const pmModule = processManager as { startProcess: (config: { command: string; args: string[]; name: string }) => Effect.Effect<unknown, Error> }
      yield* pmModule.startProcess(config)
    })
  }
  
  private executeCLIStep(step: WorkflowStepInstance): Effect<void, Error> {
    return Effect.gen(function* () {
      const registry = getGlobalRegistry()
      const cliModule = registry.getModule('cli')
      
      if (!cliModule) {
        return yield* Effect.fail(new Error('CLI module not available'))
      }
      
      const config = step.config as { command: string[]; args: Record<string, unknown> }
      const cli = cliModule as { executeCommand: (command: string[], args: Record<string, unknown>) => Effect.Effect<unknown, Error> }
      yield* cli.executeCommand(config.command, config.args)
    })
  }
  
  private executeConfigStep(step: WorkflowStepInstance): Effect<void, Error> {
    return Effect.gen(function* () {
      const registry = getGlobalRegistry()
      const configModule = registry.getModule('config')
      
      if (!configModule) {
        return yield* Effect.fail(new Error('Config module not available'))
      }
      
      const config = step.config as { path: string; section: string; value: unknown }
      const cfg = configModule as { updateConfig: (path: string, section: string, value: unknown) => Effect.Effect<unknown, Error> }
      yield* cfg.updateConfig(config.path, config.section, config.value)
    })
  }
  
  private executeUIStep(step: WorkflowStepInstance): Effect<void, Error> {
    return Effect.gen(function* () {
      const config = step.config as { type: string; payload: unknown }
      
      const eventPayload = config.payload as Record<string, unknown>
      yield* this.emitEvent('ui-update', {
        type: config.type,
        source: 'orchestrator',
        timestamp: new Date(),
        id: this.generateId(),
        ...eventPayload
      })
    }.bind(this))
  }
  
  private rollbackWorkflow(workflowId: string): Effect<void, never> {
    return Effect.gen(function* () {
      const workflow = this.activeWorkflows.get(workflowId)
      if (!workflow) return
      
      // Execute rollback steps in reverse order
      const completedSteps = workflow.steps
        .filter(s => s.status === 'completed')
        .reverse()
      
      for (const step of completedSteps) {
        yield* this.rollbackStep(step).pipe(
          Effect.catchAll(() => Effect.void)
        )
      }
      
      yield* this.emitEvent('workflow-events', {
        type: 'workflow-rollback',
        source: 'orchestrator',
        timestamp: new Date(),
        id: this.generateId(),
        workflowId
      })
    }.bind(this))
  }
  
  private rollbackStep(step: WorkflowStepInstance): Effect<void, never> {
    return Effect.gen(function* () {
      // Step-specific rollback logic
      switch (step.type) {
        case 'process-management':
          // Stop any started processes
          const processConfig = step.config as { processId?: string }
          if (processConfig.processId) {
            yield* this.emitEvent('process-lifecycle', {
              type: 'process-stop-requested',
              source: 'orchestrator',
              timestamp: new Date(),
              id: this.generateId(),
              processId: processConfig.processId,
              reason: 'workflow-rollback'
            })
          }
          break
        
        case 'config-update':
          // Revert config changes if possible
          yield* this.emitEvent('config-events', {
            type: 'config-rollback-requested',
            source: 'orchestrator',
            timestamp: new Date(),
            id: this.generateId(),
            stepId: step.id
          })
          break
      }
    }.bind(this))
  }
  
  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>()
    
    for (const step of steps) {
      if (!graph.has(step.id)) {
        graph.set(step.id, new Set())
      }
      
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          const deps = graph.get(step.id)!
          deps.add(dep)
        }
      }
    }
    
    return graph
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}