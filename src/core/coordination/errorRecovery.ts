/**
 * Error Recovery Manager - Advanced error handling and recovery
 * 
 * Implements cross-module error detection, pattern matching, recovery
 * strategies, and circuit breakers for resilient system operation.
 */

import { Effect, Stream, Schedule, Duration, Option } from 'effect'
import { EventBus, BaseEvent } from "@core/model/events/eventBus"
import { ModuleBase } from '@core/runtime/module/base'

/**
 * Error pattern definition
 */
export interface ErrorPattern {
  readonly id: string
  readonly description: string
  readonly eventTypes: string[]
  readonly errorConditions: ErrorCondition[]
  readonly recoveryStrategyId: string
}

/**
 * Error condition for pattern matching
 */
export interface ErrorCondition {
  readonly field: string
  readonly operator: 'equals' | 'contains' | 'matches'
  readonly value: unknown
}

/**
 * Error indicator with severity
 */
export interface ErrorIndicator {
  readonly patternId: string
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly confidence: number
}

/**
 * Recovery strategy types
 */
export interface RecoveryStrategy {
  readonly id: string
  readonly type: 'retry' | 'fallback' | 'circuit-break' | 'notify-and-continue'
  readonly config: RecoveryConfig
}

/**
 * Recovery configuration union
 */
export type RecoveryConfig = RetryConfig | FallbackConfig | CircuitBreakConfig | NotifyConfig

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly type: 'retry'
  readonly maxAttempts: number
  readonly baseDelay: number
  readonly maxDelay?: number
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  readonly type: 'fallback'
  readonly fallbackChannel: string
  readonly fallbackEventType: string
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakConfig {
  readonly type: 'circuit-break'
  readonly failureThreshold: number
  readonly timeout: number
  readonly resetTimeout?: number
}

/**
 * Notification configuration
 */
export interface NotifyConfig {
  readonly type: 'notify'
  readonly notificationChannel: string
  readonly continueExecution: boolean
}

/**
 * Circuit breaker state
 */
export interface CircuitBreaker {
  readonly id: string
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime?: Date
  readonly threshold: number
  readonly timeout: number
  readonly resetTimeout: number
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  readonly totalErrors: number
  readonly totalEvents: number
  readonly errorsByType: Record<string, number>
  readonly errorsByModule: Record<string, number>
  readonly recoverySuccessRate: number
}

/**
 * Error detection event
 */
export interface ErrorDetectionEvent extends BaseEvent {
  readonly type: 'error-detected'
  readonly pattern: string
  readonly event: string
  readonly severity: ErrorIndicator['severity']
}

/**
 * Error recovery event
 */
export interface ErrorRecoveryEvent extends BaseEvent {
  readonly type: 'recovery-successful' | 'recovery-failed'
  readonly strategy: string
  readonly event: string
  readonly error?: Error
}

/**
 * Error Recovery Manager implementation
 */
export class ErrorRecoveryManager extends ModuleBase {
  private errorPatterns = new Map<string, ErrorPattern>()
  private recoveryStrategies = new Map<string, RecoveryStrategy>()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private errorStats = {
    totalErrors: 0,
    totalEvents: 0,
    errorsByType: {} as Record<string, number>,
    errorsByModule: {} as Record<string, number>,
    recoveryAttempts: 0,
    recoverySuccesses: 0
  }
  
  constructor(eventBus: EventBus) {
    super(eventBus, 'error-recovery')
    this.initializeRecoveryStrategies()
  }
  
  /**
   * Initialize error recovery monitoring
   */
  initialize(): Effect<void, never> {
    return Effect.all([
      this.monitorCrossModuleErrors(),
      this.implementCircuitBreakers(),
      this.setupAutomaticRecovery()
    ]).pipe(Effect.asVoid)
  }
  
  /**
   * Monitor all events for error conditions
   */
  private monitorCrossModuleErrors(): Effect<void, never> {
    return this.eventBus.subscribePattern<BaseEvent>(
      /.+/,
      event => this.analyzeEventForErrors(event)
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Implement circuit breakers for CLI commands
   */
  private implementCircuitBreakers(): Effect<void, never> {
    return this.eventBus.subscribe<BaseEvent>(
      'cli-command',
      event => this.updateCircuitBreaker(event)
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Setup automatic recovery attempts
   */
  private setupAutomaticRecovery(): Effect<void, never> {
    return Effect.fork(
      Effect.repeat(
        this.checkCircuitBreakers(),
        Schedule.fixed(Duration.seconds(30))
      )
    ).pipe(Effect.asVoid)
  }
  
  /**
   * Register an error pattern
   */
  registerErrorPattern(pattern: ErrorPattern): Effect<void, never> {
    return Effect.sync(() => {
      this.errorPatterns.set(pattern.id, pattern)
    })
  }
  
  /**
   * Register a recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): Effect<void, never> {
    return Effect.sync(() => {
      this.recoveryStrategies.set(strategy.id, strategy)
    })
  }
  
  /**
   * Analyze event for error indicators
   */
  private analyzeEventForErrors(event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      this.errorStats.totalEvents++
      
      // Check if event indicates an error condition
      const errorIndicators = this.detectErrorIndicators(event)
      
      for (const indicator of errorIndicators) {
        const pattern = this.errorPatterns.get(indicator.patternId)
        if (pattern) {
          yield* this.handleDetectedError(indicator, pattern, event)
        }
      }
    }.bind(this))
  }
  
  /**
   * Detect error indicators in event
   */
  private detectErrorIndicators(event: BaseEvent): ErrorIndicator[] {
    const indicators: ErrorIndicator[] = []
    
    for (const [patternId, pattern] of this.errorPatterns) {
      if (pattern.eventTypes.includes(event.type)) {
        let matchesAllConditions = true
        
        for (const condition of pattern.errorConditions) {
          if (!this.evaluateCondition(event, condition)) {
            matchesAllConditions = false
            break
          }
        }
        
        if (matchesAllConditions) {
          indicators.push({
            patternId,
            severity: this.calculateSeverity(event),
            confidence: 1.0
          })
        }
      }
    }
    
    return indicators
  }
  
  /**
   * Evaluate error condition
   */
  private evaluateCondition(event: BaseEvent, condition: ErrorCondition): boolean {
    const eventWithData = event as BaseEvent & Record<string, unknown>
    const value = eventWithData[condition.field]
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string)
      case 'matches':
        return typeof value === 'string' && new RegExp(condition.value as string).test(value)
      default:
        return false
    }
  }
  
  /**
   * Calculate error severity
   */
  private calculateSeverity(event: BaseEvent): ErrorIndicator['severity'] {
    // Simple heuristic - could be made more sophisticated
    if (event.type.includes('crash') || event.type.includes('fatal')) {
      return 'critical'
    } else if (event.type.includes('error')) {
      return 'high'
    } else if (event.type.includes('warn')) {
      return 'medium'
    }
    return 'low'
  }
  
  /**
   * Handle detected error
   */
  private handleDetectedError(
    indicator: ErrorIndicator,
    pattern: ErrorPattern,
    event: BaseEvent
  ): Effect<void, never> {
    return Effect.gen(function* () {
      this.errorStats.totalErrors++
      this.errorStats.errorsByType[event.type] = (this.errorStats.errorsByType[event.type] || 0) + 1
      this.errorStats.errorsByModule[event.source] = (this.errorStats.errorsByModule[event.source] || 0) + 1
      
      // Log the error detection
      yield* this.emitEvent<ErrorDetectionEvent>('error-detection', {
        type: 'error-detected',
        source: 'error-recovery',
        timestamp: new Date(),
        id: this.generateId(),
        pattern: pattern.id,
        event: event.type,
        severity: indicator.severity
      })
      
      // Apply recovery strategy if available
      const strategy = this.recoveryStrategies.get(pattern.recoveryStrategyId)
      if (strategy) {
        yield* this.executeRecoveryStrategy(strategy, event, indicator)
      }
    }.bind(this))
  }
  
  /**
   * Execute recovery strategy
   */
  private executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    event: BaseEvent,
    indicator: ErrorIndicator
  ): Effect<void, never> {
    return Effect.gen(function* () {
      this.errorStats.recoveryAttempts++
      
      try {
        switch (strategy.type) {
          case 'retry':
            yield* this.executeRetryStrategy(strategy, event)
            break
          case 'fallback':
            yield* this.executeFallbackStrategy(strategy, event)
            break
          case 'circuit-break':
            yield* this.executeCircuitBreakStrategy(strategy, event)
            break
          case 'notify-and-continue':
            yield* this.executeNotifyStrategy(strategy, event, indicator)
            break
        }
        
        this.errorStats.recoverySuccesses++
        
        yield* this.emitEvent<ErrorRecoveryEvent>('error-recovery', {
          type: 'recovery-successful',
          source: 'error-recovery',
          timestamp: new Date(),
          id: this.generateId(),
          strategy: strategy.id,
          event: event.type
        })
        
      } catch (error) {
        yield* this.emitEvent<ErrorRecoveryEvent>('error-recovery', {
          type: 'recovery-failed',
          source: 'error-recovery',
          timestamp: new Date(),
          id: this.generateId(),
          strategy: strategy.id,
          event: event.type,
          error: error as Error
        })
      }
    }.bind(this))
  }
  
  /**
   * Execute retry strategy
   */
  private executeRetryStrategy(strategy: RecoveryStrategy, event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      const retryConfig = strategy.config as RetryConfig
      
      yield* Effect.retry(
        this.retryOriginalAction(event),
        Schedule.exponential(Duration.millis(retryConfig.baseDelay), 2).pipe(
          Schedule.compose(Schedule.recurs(retryConfig.maxAttempts))
        )
      ).pipe(
        Effect.catchAll(() => Effect.void) // Don't fail the recovery process
      )
    }.bind(this))
  }
  
  /**
   * Execute fallback strategy
   */
  private executeFallbackStrategy(strategy: RecoveryStrategy, event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      const fallbackConfig = strategy.config as FallbackConfig
      
      // Execute fallback action
      yield* this.eventBus.publish(fallbackConfig.fallbackChannel, {
        type: fallbackConfig.fallbackEventType,
        source: 'error-recovery',
        timestamp: new Date(),
        id: this.generateId(),
        originalEvent: event,
        reason: 'fallback-recovery'
      })
    }.bind(this))
  }
  
  /**
   * Execute circuit breaker strategy
   */
  private executeCircuitBreakStrategy(strategy: RecoveryStrategy, event: BaseEvent): Effect<void, never> {
    return Effect.gen(function* () {
      const config = strategy.config as CircuitBreakConfig
      const breakerId = `${event.source}:${event.type}`
      
      let breaker = this.circuitBreakers.get(breakerId)
      if (!breaker) {
        breaker = {
          id: breakerId,
          state: 'closed',
          failureCount: 0,
          threshold: config.failureThreshold,
          timeout: config.timeout,
          resetTimeout: config.resetTimeout || config.timeout * 2
        }
        this.circuitBreakers.set(breakerId, breaker)
      }
      
      // Trip the circuit breaker
      breaker.failureCount++
      if (breaker.failureCount >= breaker.threshold) {
        breaker.state = 'open'
        breaker.lastFailureTime = new Date()
      }
    }.bind(this))
  }
  
  /**
   * Execute notification strategy
   */
  private executeNotifyStrategy(
    strategy: RecoveryStrategy,
    event: BaseEvent,
    indicator: ErrorIndicator
  ): Effect<void, never> {
    return Effect.gen(function* () {
      const config = strategy.config as NotifyConfig
      
      yield* this.eventBus.publish(config.notificationChannel, {
        type: 'error-notification',
        source: 'error-recovery',
        timestamp: new Date(),
        id: this.generateId(),
        originalEvent: event,
        severity: indicator.severity,
        continueExecution: config.continueExecution
      })
    }.bind(this))
  }
  
  /**
   * Retry the original action that failed
   */
  private retryOriginalAction(event: BaseEvent): Effect<void, Error> {
    // This would need to be implemented based on the specific event type
    // For now, just re-emit the event
    return this.eventBus.publish(event.source, event).pipe(
      Effect.mapError(() => new Error(`Failed to retry action for event: ${event.type}`))
    )
  }
  
  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(event: BaseEvent): Effect<void, never> {
    return Effect.sync(() => {
      const breakerId = `${event.source}:${event.type}`
      const breaker = this.circuitBreakers.get(breakerId)
      
      if (breaker && breaker.state === 'open') {
        // Check if should transition to half-open
        if (breaker.lastFailureTime) {
          const elapsed = Date.now() - breaker.lastFailureTime.getTime()
          if (elapsed > breaker.resetTimeout) {
            breaker.state = 'half-open'
            breaker.failureCount = 0
          }
        }
      }
    })
  }
  
  /**
   * Check and reset circuit breakers
   */
  private checkCircuitBreakers(): Effect<void, never> {
    return Effect.sync(() => {
      for (const breaker of this.circuitBreakers.values()) {
        if (breaker.state === 'open' && breaker.lastFailureTime) {
          const elapsed = Date.now() - breaker.lastFailureTime.getTime()
          if (elapsed > breaker.timeout) {
            breaker.state = 'half-open'
          }
        }
      }
    })
  }
  
  /**
   * Initialize default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Register common recovery strategies
    this.recoveryStrategies.set('process-restart', {
      id: 'process-restart',
      type: 'retry',
      config: { type: 'retry', maxAttempts: 3, baseDelay: 1000 }
    })
    
    this.recoveryStrategies.set('cli-fallback', {
      id: 'cli-fallback',
      type: 'fallback',
      config: {
        type: 'fallback',
        fallbackChannel: 'cli-fallback',
        fallbackEventType: 'show-help'
      }
    })
    
    this.recoveryStrategies.set('service-circuit-break', {
      id: 'service-circuit-break',
      type: 'circuit-break',
      config: {
        type: 'circuit-break',
        failureThreshold: 5,
        timeout: 30000
      }
    })
  }
  
  /**
   * Get error statistics
   */
  getErrorStatistics(): Effect<ErrorStatistics, never> {
    return Effect.sync(() => ({
      totalErrors: this.errorStats.totalErrors,
      totalEvents: this.errorStats.totalEvents,
      errorsByType: { ...this.errorStats.errorsByType },
      errorsByModule: { ...this.errorStats.errorsByModule },
      recoverySuccessRate: this.errorStats.recoveryAttempts > 0
        ? this.errorStats.recoverySuccesses / this.errorStats.recoveryAttempts
        : 0
    }))
  }
  
  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): Effect<Map<string, CircuitBreaker>, never> {
    return Effect.sync(() => new Map(this.circuitBreakers))
  }
  
  /**
   * Reset error statistics
   */
  resetStatistics(): Effect<void, never> {
    return Effect.sync(() => {
      this.errorStats = {
        totalErrors: 0,
        totalEvents: 0,
        errorsByType: {},
        errorsByModule: {},
        recoveryAttempts: 0,
        recoverySuccesses: 0
      }
    })
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}