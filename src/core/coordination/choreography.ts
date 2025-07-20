/**
 * Event Choreography Patterns - Complex multi-module workflows
 * 
 * Implements choreography patterns for coordinating events across
 * multiple domain modules without tight coupling.
 */

import { Effect, Stream, Duration } from 'effect'
import { EventBus, BaseEvent } from '../event-bus'
import { ModuleBase, ModuleError } from '../module-base'
import type { ProcessEvent, ProcessOutputEvent, ProcessHealthEvent } from '../../process-manager/events'
import type { CLICommandEvent, CLIParseEvent } from '../../cli/events'
import type { ConfigEvent } from '../../config/events'
import type { LogEvent } from '../../logger/events'

/**
 * Choreography error type
 */
export class ChoreographyError {
  readonly _tag = 'ChoreographyError'
  constructor(
    readonly message: string,
    readonly workflow?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Event Choreographer - Coordinates complex event flows
 */
export class EventChoreographer extends ModuleBase {
  constructor(eventBus: EventBus) {
    super(eventBus, 'choreographer')
  }
  
  /**
   * Coordinate process manager with logging workflow
   */
  coordinateProcessWithLogging(): Effect<void, ChoreographyError> {
    return Effect.gen(function* () {
      // Subscribe to process events
      yield* this.subscribe<ProcessEvent>(
        'process-lifecycle',
        event => this.handleProcessEventForLogging(event)
      )
      
      // Subscribe to process output for structured logging
      yield* this.subscribe<ProcessOutputEvent>(
        'process-output',
        event => this.handleProcessOutput(event)
      )
      
      // Monitor process health and trigger notifications
      yield* this.subscribe<ProcessHealthEvent>(
        'process-health',
        event => this.handleHealthEvent(event)
      )
    }.bind(this))
  }
  
  /**
   * Coordinate CLI execution with real-time UI updates
   */
  coordinateCLIWithUI(): Effect<void, ChoreographyError> {
    return Effect.gen(function* () {
      // Stream CLI execution events to UI components
      yield* this.subscribe<CLICommandEvent>(
        'cli-command',
        event => this.updateUIForCLIEvent(event)
      )
      
      // Handle parse errors with user-friendly feedback
      yield* this.subscribe<CLIParseEvent>(
        'cli-parse',
        event => this.handleParseEventForUI(event)
      )
    }.bind(this))
  }
  
  /**
   * Coordinate config changes across all modules
   */
  coordinateConfigUpdates(): Effect<void, ChoreographyError> {
    return Effect.gen(function* () {
      yield* this.subscribe<ConfigEvent>(
        'config-events',
        event => this.propagateConfigChange(event)
      )
    }.bind(this))
  }
  
  private handleProcessEventForLogging(event: ProcessEvent): Effect<void, never> {
    return Effect.gen(function* () {
      switch (event.type) {
        case 'process-started':
          yield* this.emitEvent<LogEvent>('log-events', {
            type: 'log-entry',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            level: 'info',
            message: `Process ${event.processName} started with PID ${event.pid}`,
            context: {
              processId: event.processId,
              config: event.config
            }
          })
          break
          
        case 'process-crashed':
          yield* this.emitEvent<LogEvent>('log-events', {
            type: 'log-entry',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            level: 'error',
            message: `Process ${event.processName} crashed with exit code ${event.exitCode}`,
            context: {
              processId: event.processId,
              exitCode: event.exitCode
            }
          })
          
          // Also trigger notification
          yield* this.emitEvent('notification-events', {
            type: 'notification-error',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            title: 'Process Crashed',
            message: `${event.processName} has stopped unexpectedly`,
            processId: event.processId
          })
          break
      }
    }.bind(this))
  }
  
  private handleProcessOutput(event: ProcessOutputEvent): Effect<void, never> {
    return Effect.gen(function* () {
      const level = event.type === 'process-stderr' ? 'warn' : 'debug'
      yield* this.emitEvent<LogEvent>('log-events', {
        type: 'log-entry',
        source: 'choreographer',
        timestamp: new Date(),
        id: this.generateId(),
        level,
        message: `Process ${event.processId}: ${event.data}`,
        context: {
          processId: event.processId,
          stream: event.type
        }
      })
    }.bind(this))
  }
  
  private handleHealthEvent(event: ProcessHealthEvent): Effect<void, never> {
    return Effect.gen(function* () {
      if (event.healthy === false) {
        yield* this.emitEvent<LogEvent>('log-events', {
          type: 'log-entry',
          source: 'choreographer',
          timestamp: new Date(),
          id: this.generateId(),
          level: 'warn',
          message: `Process ${event.processId} is unhealthy`,
          context: {
            processId: event.processId,
            metrics: event.metrics
          }
        })
      }
    }.bind(this))
  }
  
  private updateUIForCLIEvent(event: CLICommandEvent): Effect<void, never> {
    return Effect.gen(function* () {
      switch (event.type) {
        case 'cli-command-executed':
          // Update UI with command execution status
          yield* this.emitEvent('ui-update', {
            type: 'command-status-update',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            commandPath: event.path,
            status: 'completed',
            executionTime: event.executionTime,
            result: event.result
          })
          break
          
        case 'cli-command-failed':
          // Show error in UI
          yield* this.emitEvent('ui-update', {
            type: 'command-error',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            commandPath: event.path,
            error: event.error
          })
          break
      }
    }.bind(this))
  }
  
  private handleParseEventForUI(event: CLIParseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      if (event.type === 'cli-parse-error') {
        yield* this.emitEvent('ui-update', {
          type: 'parse-error',
          source: 'choreographer',
          timestamp: new Date(),
          id: this.generateId(),
          input: event.input,
          error: event.error,
          suggestions: event.suggestions
        })
      }
    }.bind(this))
  }
  
  private propagateConfigChange(event: ConfigEvent): Effect<void, never> {
    return Effect.gen(function* () {
      if (event.type === 'config-updated') {
        // Notify all relevant modules of config changes
        const affectedModules = this.getModulesAffectedByConfig(event.section)
        
        for (const module of affectedModules) {
          yield* this.emitEvent(`${module}-config`, {
            type: 'config-change-notification',
            source: 'choreographer',
            timestamp: new Date(),
            id: this.generateId(),
            section: event.section,
            value: event.value,
            module
          })
        }
      }
    }.bind(this))
  }
  
  private getModulesAffectedByConfig(section?: string): string[] {
    if (!section) return ['jsx', 'cli', 'services', 'process-manager', 'logger', 'styling']
    
    // Map config sections to affected modules
    const sectionMapping: Record<string, string[]> = {
      'theme': ['styling', 'jsx'],
      'logging': ['logger', 'process-manager'],
      'terminal': ['services', 'jsx'],
      'processes': ['process-manager', 'cli']
    }
    
    return sectionMapping[section] || []
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

/**
 * UI update event types
 */
export interface UIUpdateEvent extends BaseEvent {
  readonly type: 'command-status-update' | 'command-error' | 'parse-error'
  readonly commandPath?: string[]
  readonly status?: string
  readonly executionTime?: number
  readonly result?: unknown
  readonly error?: Error
  readonly input?: string[]
  readonly suggestions?: string[]
}

/**
 * Notification event types
 */
export interface NotificationEvent extends BaseEvent {
  readonly type: 'notification-error' | 'notification-warning' | 'notification-info'
  readonly title: string
  readonly message: string
  readonly processId?: string
}

/**
 * Config change notification event
 */
export interface ConfigChangeNotificationEvent extends BaseEvent {
  readonly type: 'config-change-notification'
  readonly section?: string
  readonly value: unknown
  readonly module: string
}