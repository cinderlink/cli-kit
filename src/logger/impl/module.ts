/**
 * Logger Module - Domain module for centralized logging
 * 
 * Manages log aggregation, filtering, transport management,
 * and integration with all other modules via the event system.
 */

import { Effect, Stream } from 'effect'
import { ModuleBase, ModuleError } from '../../core/runtime/module/base'
import type { EventBus, BaseEvent } from '../../core/model/events/eventBus'
import type { 
  LogEvent, 
  LogTransportEvent,
  LogFilterEvent,
  LogRotationEvent,
  LogFilterCriteria
} from './events'
import { LoggerEventChannels } from './events'
import type { ProcessOutputEvent } from '../../process-manager/impl/events'

/**
 * Log transport interface
 */
export interface LogTransport {
  readonly name: string
  readonly type: 'console' | 'file' | 'network'
  write(entry: LogEntry): Effect<void, never>
  connect(): Effect<void, Error>
  disconnect(): Effect<void, never>
}

/**
 * Log entry structure
 */
export interface LogEntry {
  readonly timestamp: Date
  readonly level: LogEvent['level']
  readonly message: string
  readonly module: string
  readonly context?: Record<string, unknown>
}

/**
 * Logger error
 */
export class LoggerError {
  readonly _tag = 'LoggerError'
  constructor(
    readonly message: string,
    readonly transport?: string,
    readonly cause?: unknown
  ) {}
}

/**
 * Logger Module implementation
 */
export class LoggerModule extends ModuleBase {
  private transports = new Map<string, LogTransport>()
  private filters = new Map<string, LogFilterCriteria>()
  private currentLevel: LogEvent['level'] = 'info'
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'logger')
  }
  
  /**
   * Initialize the logger module
   */
  initialize(): Effect<void, ModuleError> {
    return Effect.gen(function* () {
      this.state = 'initializing'
      
      // Add default console transport
      yield* this.addTransport(this.createConsoleTransport())
      
      // Subscribe to all events for logging
      yield* this.subscribeToAllEvents()
      
      // Subscribe to specific module events
      yield* this.subscribeToModuleEvents()
      
      // Mark as ready
      yield* this.setReady()
    }.bind(this))
  }
  
  /**
   * Subscribe to all events for audit logging
   */
  private subscribeToAllEvents(): Effect<void, never> {
    // Subscribe to known event channels for audit logging
    const channels = [
      'scope-events', 'jsx-render', 'jsx-lifecycle', 'jsx-scope',
      'cli-command', 'cli-parse', 'cli-route',
      'reactivity-rune', 'reactivity-state', 'reactivity-effect',
      'service-events', 'terminal-events', 'input-events',
      'config-events', 'config-validation',
      'process-lifecycle', 'process-output', 'process-health',
      'style-events', 'theme-events', 'layout-events'
    ]
    
    return this.subscribeMany(
      channels.map(channel => ({
        channel,
        handler: (event) => this.logEvent(event)
      }))
    )
  }
  
  /**
   * Subscribe to specific module events
   */
  private subscribeToModuleEvents(): Effect<void, never> {
    return this.subscribeMany([
      {
        channel: 'process-output',
        handler: (event) => this.logProcessOutput(event as ProcessOutputEvent)
      },
      {
        channel: 'service-events',
        handler: (event) => this.logServiceEvent(event)
      },
      {
        channel: 'config-events',
        handler: (event) => this.logConfigEvent(event)
      }
    ])
  }
  
  /**
   * Log any event
   */
  private logEvent(event: BaseEvent): Effect<void, never> {
    return this.log('debug', `Event: ${event.type}`, {
      source: event.source,
      timestamp: event.timestamp,
      eventId: event.id
    })
  }
  
  /**
   * Log process output
   */
  private logProcessOutput(event: ProcessOutputEvent): Effect<void, never> {
    const level = event.type === 'process-stderr' ? 'warn' : 'info'
    return this.log(level, `Process ${event.processId}: ${event.data}`, {
      processId: event.processId,
      stream: event.type
    })
  }
  
  /**
   * Log service events
   */
  private logServiceEvent(event: BaseEvent): Effect<void, never> {
    if (event.type === 'service-error' && 'error' in event && 'serviceName' in event) {
      // Type guard ensures properties exist
      const serviceErrorEvent = event as BaseEvent & { error: unknown; serviceName: string }
      return this.log('error', `Service error: ${serviceErrorEvent.serviceName}`, {
        error: serviceErrorEvent.error
      })
    }
    return this.log('info', `Service ${event.type}`, { event })
  }
  
  /**
   * Log config events
   */
  private logConfigEvent(event: BaseEvent): Effect<void, never> {
    if (event.type === 'config-updated' && 'section' in event && 'value' in event) {
      // Type guard ensures properties exist
      const configEvent = event as BaseEvent & { section: string; value: unknown }
      return this.log('info', 'Configuration updated', {
        section: configEvent.section,
        value: configEvent.value
      })
    }
    return Effect.void
  }
  
  /**
   * Main logging function
   */
  log(level: LogEvent['level'], message: string, context?: Record<string, unknown>): Effect<void, never> {
    return Effect.gen(function* () {
      // Check if level is enabled
      if (!this.isLevelEnabled(level)) {
        return
      }
      
      // Create log entry
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        module: context?.module as string || 'unknown',
        context
      }
      
      // Apply filters
      if (!this.passesFilters(entry)) {
        return
      }
      
      // Write to all transports
      yield* Effect.all(
        Array.from(this.transports.values()).map(transport =>
          transport.write(entry).pipe(
            Effect.catchAll(() => Effect.void)
          )
        )
      )
      
      // Emit log event
      yield* this.emitLogEntry(level, message, context)
    }.bind(this))
  }
  
  /**
   * Add a log transport
   */
  addTransport(transport: LogTransport): Effect<void, LoggerError> {
    return Effect.gen(function* () {
      try {
        yield* transport.connect()
        this.transports.set(transport.name, transport)
        yield* this.emitTransportConnected(transport.name, transport.type)
      } catch (error) {
        yield* this.emitTransportError(transport.name, transport.type, error as Error)
        return yield* Effect.fail(new LoggerError(
          `Failed to add transport ${transport.name}`,
          transport.name,
          error
        ))
      }
    }.bind(this))
  }
  
  /**
   * Remove a log transport
   */
  removeTransport(transportName: string): Effect<void, LoggerError> {
    return Effect.gen(function* () {
      const transport = this.transports.get(transportName)
      if (!transport) {
        return yield* Effect.fail(new LoggerError(
          `Transport not found: ${transportName}`,
          transportName
        ))
      }
      
      yield* transport.disconnect()
      this.transports.delete(transportName)
      yield* this.emitTransportDisconnected(transportName, transport.type)
    }.bind(this))
  }
  
  /**
   * Set log level
   */
  setLevel(level: LogEvent['level']): Effect<void, never> {
    return Effect.gen(function* () {
      const previousLevel = this.currentLevel
      this.currentLevel = level
      yield* this.emitLevelChanged(level)
    }.bind(this))
  }
  
  /**
   * Add a log filter
   */
  addFilter(name: string, criteria: LogFilterCriteria): Effect<void, never> {
    return Effect.gen(function* () {
      this.filters.set(name, criteria)
      yield* this.emitFilterApplied(name, criteria)
    }.bind(this))
  }
  
  /**
   * Create console transport
   */
  private createConsoleTransport(): LogTransport {
    return {
      name: 'console',
      type: 'console',
      write: (entry) => Effect.sync(() => {
        const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.module}]`
        console.log(`${prefix} ${entry.message}`, entry.context || '')
      }),
      connect: () => Effect.succeed(undefined),
      disconnect: () => Effect.succeed(undefined)
    }
  }
  
  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogEvent['level']): boolean {
    const levels: LogEvent['level'][] = ['debug', 'info', 'warn', 'error']
    const currentIndex = levels.indexOf(this.currentLevel)
    const levelIndex = levels.indexOf(level)
    return levelIndex >= currentIndex
  }
  
  /**
   * Check if log entry passes filters
   */
  private passesFilters(entry: LogEntry): boolean {
    for (const filter of this.filters.values()) {
      if (filter.level && entry.level !== filter.level) {
        return filter.exclude || false
      }
      if (filter.module && entry.module !== filter.module) {
        return filter.exclude || false
      }
      if (filter.pattern && !entry.message.includes(filter.pattern)) {
        return filter.exclude || false
      }
    }
    return true
  }
  
  // Event emission helpers
  
  emitLogEntry(level: LogEvent['level'], message: string, context?: Record<string, unknown>): Effect<void, never> {
    return this.emitEvent<LogEvent>(LoggerEventChannels.LOG, {
      type: 'log-entry',
      level,
      message,
      context
    })
  }
  
  emitLevelChanged(level: LogEvent['level']): Effect<void, never> {
    return this.emitEvent<LogEvent>(LoggerEventChannels.LOG, {
      type: 'log-level-changed',
      level,
      message: `Log level changed to ${level}`
    })
  }
  
  emitTransportConnected(transportName: string, transportType: LogTransportEvent['transportType']): Effect<void, never> {
    return this.emitEvent<LogTransportEvent>(LoggerEventChannels.TRANSPORT, {
      type: 'transport-connected',
      transportName,
      transportType
    })
  }
  
  emitTransportDisconnected(transportName: string, transportType: LogTransportEvent['transportType']): Effect<void, never> {
    return this.emitEvent<LogTransportEvent>(LoggerEventChannels.TRANSPORT, {
      type: 'transport-disconnected',
      transportName,
      transportType
    })
  }
  
  emitTransportError(transportName: string, transportType: LogTransportEvent['transportType'], error: Error): Effect<void, never> {
    return this.emitEvent<LogTransportEvent>(LoggerEventChannels.TRANSPORT, {
      type: 'transport-error',
      transportName,
      transportType,
      error
    })
  }
  
  emitFilterApplied(filterName: string, criteria: LogFilterCriteria): Effect<void, never> {
    return this.emitEvent<LogFilterEvent>(LoggerEventChannels.FILTER, {
      type: 'filter-applied',
      filterName,
      criteria
    })
  }
}