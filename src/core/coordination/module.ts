/**
 * Coordination Module - Main coordination module that brings everything together
 *
 * Integrates event choreography, workflow orchestration, stream optimization,
 * performance monitoring, error recovery, and integration patterns.
 */

import { Effect, Duration, Fiber } from 'effect'
import { EventBus } from '@core/model/events/event-bus'
import { ModuleBase, ModuleError } from '@core/runtime/module/base'
import { EventChoreographer } from './choreography'
import { WorkflowOrchestrator } from './orchestrator'
import { EventStreamOptimizer } from './streamOptimizer'
import { PerformanceMonitor } from './performanceMonitor'
import { ErrorRecoveryManager } from './errorRecovery'
import { IntegrationPatterns } from './integrationPatterns'
import type {
  WorkflowConfig,
  WorkflowResult,
  PerformanceReport,
  ThroughputMetric,
  ErrorStatistics,
  ErrorPattern,
  RecoveryStrategy,
  PatternHandle,
} from './types'
import { WorkflowError } from './errors'

/**
 * Coordination error type
 */
export class CoordinationError {
  readonly _tag = 'CoordinationError'
  constructor(
    readonly message: string,
    readonly module?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Coordination configuration
 */
export interface CoordinationConfig {
  enableProcessMonitoring?: boolean
  enableInteractiveCLI?: boolean
  enableDynamicUI?: boolean
  enableAuditTrail?: boolean
  performanceReportingInterval?: Duration.Duration
  errorRecoveryEnabled?: boolean
  streamOptimization?: {
    processOutput?: boolean
    cliCommands?: boolean
    uiUpdates?: boolean
  }
}

/**
 * System health status
 */
export interface SystemHealth {
  readonly timestamp: Date
  readonly performance: PerformanceReport
  readonly errors: ErrorStatistics
  readonly throughput: ThroughputMetric[]
  readonly status: 'healthy' | 'degraded' | 'unhealthy'
  readonly activePatterns: string[]
  readonly activeWorkflows: number
}

/**
 * Coordination Module implementation
 */
export class CoordinationModule extends ModuleBase {
  private choreographer: EventChoreographer
  private orchestrator: WorkflowOrchestrator
  private streamOptimizer: EventStreamOptimizer
  private performanceMonitor: PerformanceMonitor
  private errorRecovery: ErrorRecoveryManager
  private integrationPatterns: IntegrationPatterns
  private activePatterns = new Map<string, PatternHandle>()
  private config: CoordinationConfig = {}

  constructor(eventBus: EventBus) {
    super(eventBus, 'coordination')

    this.choreographer = new EventChoreographer(eventBus)
    this.orchestrator = new WorkflowOrchestrator(eventBus)
    this.streamOptimizer = new EventStreamOptimizer(eventBus)
    this.performanceMonitor = new PerformanceMonitor(eventBus)
    this.errorRecovery = new ErrorRecoveryManager(eventBus)
    this.integrationPatterns = new IntegrationPatterns(eventBus)
  }

  /**
   * Initialize coordination module
   */
  initialize(): Effect<void, ModuleError> {
    return Effect.gen(
      function* () {
        this.state = 'initializing'

        try {
          // Initialize all coordination subsystems
          yield* this.performanceMonitor.initialize()
          yield* this.errorRecovery.initialize()

          // Set up core coordination patterns
          yield* this.choreographer.coordinateProcessWithLogging()
          yield* this.choreographer.coordinateCLIWithUI()
          yield* this.choreographer.coordinateConfigUpdates()

          // Set up error recovery patterns
          yield* this.setupDefaultErrorRecovery()

          // Initialize default integration patterns
          yield* this.initializeDefaultPatterns()

          // Emit initialization event
          yield* this.emitEvent('coordination-events', {
            type: 'coordination-initialized',
            source: 'coordination',
            timestamp: new Date(),
            id: this.generateId(),
          })

          yield* this.setReady()
        } catch (error) {
          return yield* Effect.fail(
            new ModuleError('coordination', 'Failed to initialize coordination module', error)
          )
        }
      }.bind(this)
    )
  }

  /**
   * Start a complex workflow with full coordination
   */
  startCoordinatedWorkflow(
    workflowId: string,
    config: WorkflowConfig
  ): Effect<WorkflowResult & { performanceMetrics?: unknown }, WorkflowError> {
    return Effect.gen(
      function* () {
        // Start performance monitoring for this workflow
        yield* this.performanceMonitor.startWorkflowMonitoring(workflowId)

        // Execute the workflow with orchestration
        const result = yield* this.orchestrator.startComplexWorkflow(workflowId, config)

        // Generate performance report
        const metrics = yield* this.performanceMonitor.getWorkflowMetrics(workflowId)

        return {
          ...result,
          performanceMetrics: metrics,
        }
      }.bind(this)
    )
  }

  /**
   * Cancel an active workflow
   */
  cancelWorkflow(workflowId: string): Effect<void, WorkflowError> {
    return this.orchestrator.cancelWorkflow(workflowId)
  }

  /**
   * Get comprehensive system health
   */
  getSystemHealth(): Effect<SystemHealth, never> {
    return Effect.gen(
      function* () {
        const performanceMetrics = yield* this.performanceMonitor.getPerformanceMetrics()
        const errorStats = yield* this.errorRecovery.getErrorStatistics()
        const eventThroughput = yield* this.performanceMonitor.getEventThroughput()
        const workflowStatus = yield* this.orchestrator.getWorkflowStatus('')

        return {
          timestamp: new Date(),
          performance: performanceMetrics,
          errors: errorStats,
          throughput: eventThroughput,
          status: this.calculateOverallStatus(performanceMetrics, errorStats),
          activePatterns: Array.from(this.activePatterns.keys()),
          activeWorkflows: workflowStatus ? 1 : 0, // Simplified for now
        }
      }.bind(this)
    )
  }

  /**
   * Configure coordination settings
   */
  configureCoordination(config: CoordinationConfig): Effect<void, CoordinationError> {
    return Effect.gen(
      function* () {
        this.config = { ...this.config, ...config }

        // Apply performance reporting interval
        if (config.performanceReportingInterval) {
          yield* this.performanceMonitor.setReportingInterval(config.performanceReportingInterval)
        }

        // Enable/disable integration patterns
        if (config.enableProcessMonitoring !== undefined) {
          yield* this.togglePattern('process-monitoring', config.enableProcessMonitoring)
        }

        if (config.enableInteractiveCLI !== undefined) {
          yield* this.togglePattern('interactive-cli', config.enableInteractiveCLI)
        }

        if (config.enableDynamicUI !== undefined) {
          yield* this.togglePattern('dynamic-ui', config.enableDynamicUI)
        }

        if (config.enableAuditTrail !== undefined) {
          yield* this.togglePattern('audit-trail', config.enableAuditTrail)
        }

        // Configure stream optimization
        if (config.streamOptimization) {
          yield* this.configureStreamOptimization(config.streamOptimization)
        }

        yield* this.emitEvent('coordination-events', {
          type: 'coordination-configured',
          source: 'coordination',
          timestamp: new Date(),
          id: this.generateId(),
          config,
        })
      }.bind(this)
    )
  }

  /**
   * Register custom error pattern
   */
  registerErrorPattern(pattern: ErrorPattern): Effect<void, never> {
    return this.errorRecovery.registerErrorPattern(pattern)
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): Effect<void, never> {
    return this.errorRecovery.registerRecoveryStrategy(strategy)
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Effect<PerformanceReport, never> {
    return this.performanceMonitor.getPerformanceMetrics()
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Effect<ErrorStatistics, never> {
    return this.errorRecovery.getErrorStatistics()
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): Effect<void, never> {
    return Effect.all([
      this.performanceMonitor.resetMetrics(),
      this.errorRecovery.resetStatistics(),
    ]).pipe(Effect.asVoid)
  }

  /**
   * Setup default error recovery patterns
   */
  private setupDefaultErrorRecovery(): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Register common error patterns
        yield* this.errorRecovery.registerErrorPattern({
          id: 'process-crash',
          description: 'Process unexpectedly terminated',
          eventTypes: ['process-crashed'],
          errorConditions: [
            {
              field: 'exitCode',
              operator: 'equals',
              value: null,
            },
          ],
          recoveryStrategyId: 'process-restart',
        })

        yield* this.errorRecovery.registerErrorPattern({
          id: 'cli-parse-error',
          description: 'Command line parsing failed',
          eventTypes: ['cli-parse-error'],
          errorConditions: [
            {
              field: 'type',
              operator: 'equals',
              value: 'cli-parse-error',
            },
          ],
          recoveryStrategyId: 'cli-fallback',
        })

        yield* this.errorRecovery.registerErrorPattern({
          id: 'service-error',
          description: 'Service encountered an error',
          eventTypes: ['service-error'],
          errorConditions: [
            {
              field: 'type',
              operator: 'equals',
              value: 'service-error',
            },
          ],
          recoveryStrategyId: 'service-circuit-break',
        })
      }.bind(this)
    )
  }

  /**
   * Initialize default integration patterns
   */
  private initializeDefaultPatterns(): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Start with basic patterns that most applications need
        if (this.config.enableProcessMonitoring !== false) {
          yield* this.enablePattern('process-monitoring')
        }

        if (this.config.enableInteractiveCLI !== false) {
          yield* this.enablePattern('interactive-cli')
        }
      }.bind(this)
    )
  }

  /**
   * Toggle integration pattern
   */
  private togglePattern(patternId: string, enable: boolean): Effect<void, never> {
    if (enable) {
      return this.enablePattern(patternId)
    } else {
      return this.disablePattern(patternId)
    }
  }

  /**
   * Enable integration pattern
   */
  private enablePattern(patternId: string): Effect<void, never> {
    return Effect.gen(
      function* () {
        if (!this.activePatterns.has(patternId)) {
          let pattern: PatternHandle | null = null

          switch (patternId) {
            case 'process-monitoring':
              pattern = yield* this.integrationPatterns.createProcessMonitoringPattern()
              break
            case 'interactive-cli':
              pattern = yield* this.integrationPatterns.createInteractiveCLIPattern()
              break
            case 'dynamic-ui':
              pattern = yield* this.integrationPatterns.createDynamicUIPattern()
              break
            case 'audit-trail':
              pattern = yield* this.integrationPatterns.createAuditPattern()
              break
          }

          if (pattern) {
            this.activePatterns.set(patternId, pattern)
          }
        }
      }.bind(this)
    )
  }

  /**
   * Disable integration pattern
   */
  private disablePattern(patternId: string): Effect<void, never> {
    return Effect.gen(
      function* () {
        const pattern = this.activePatterns.get(patternId)
        if (pattern) {
          yield* pattern.shutdown()
          this.activePatterns.delete(patternId)
        }
      }.bind(this)
    )
  }

  /**
   * Configure stream optimization
   */
  private configureStreamOptimization(
    config: NonNullable<CoordinationConfig['streamOptimization']>
  ): Effect<void, never> {
    return Effect.gen(
      function* () {
        if (config.processOutput) {
          yield* this.streamOptimizer.configureBufferSize('process-output', 100)
          yield* this.streamOptimizer.configureRateLimit('process-output', 50)
        }

        if (config.cliCommands) {
          yield* this.streamOptimizer.configureBufferSize('cli-command', 10)
          yield* this.streamOptimizer.configureRateLimit('cli-command', 20)
        }

        if (config.uiUpdates) {
          yield* this.streamOptimizer.configureBufferSize('ui-update', 50)
          yield* this.streamOptimizer.configureRateLimit('ui-update', 60) // 60fps
        }
      }.bind(this)
    )
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(
    performance: PerformanceReport,
    errors: ErrorStatistics
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Calculate average response time
    const avgResponseTime =
      performance.responseTimeStats.length > 0
        ? performance.responseTimeStats.reduce((sum, stat) => sum + stat.average, 0) /
          performance.responseTimeStats.length
        : 0

    // Calculate error rate
    const errorRate = errors.totalEvents > 0 ? errors.totalErrors / errors.totalEvents : 0

    // Determine status based on thresholds
    if (avgResponseTime > 1000 || errorRate > 0.1) {
      return 'unhealthy'
    } else if (avgResponseTime > 500 || errorRate > 0.05) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  /**
   * Shutdown coordination module
   */
  shutdown(): Effect<void, never> {
    return Effect.gen(
      function* () {
        // Shutdown all active patterns
        for (const [patternId, pattern] of this.activePatterns) {
          yield* pattern.shutdown()
        }
        this.activePatterns.clear()

        // Reset metrics
        yield* this.resetMetrics()

        yield* this.emitEvent('coordination-events', {
          type: 'coordination-shutdown',
          source: 'coordination',
          timestamp: new Date(),
          id: this.generateId(),
        })
      }.bind(this)
    )
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
