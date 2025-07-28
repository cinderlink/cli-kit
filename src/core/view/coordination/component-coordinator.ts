import { Effect, Fiber } from 'effect'
import { EventBus, BaseEvent } from '../../model/events/event-bus'
import { generateId } from '../../model/events/event-bus'

// Error types
export class CoordinationError extends Error {
  readonly _tag = 'CoordinationError'
}

export class CoordinationPatternNotFoundError extends CoordinationError {
  constructor(patternId: string) {
    super(`Coordination pattern not found: ${patternId}`)
  }
}

// Coordinate complex interactions between components
export class ComponentCoordinator {
  private coordinationPatterns = new Map<string, CoordinationPattern>()
  private activeCoordinations = new Map<string, ActiveCoordination>()

  constructor(private eventBus: EventBus) {}

  // Register coordination pattern
  registerPattern(pattern: CoordinationPattern): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.coordinationPatterns.set(pattern.id, pattern)
    })
  }

  // Start coordination between components
  startCoordination(
    coordinationId: string,
    patternId: string,
    participants: string[],
    config?: Record<string, unknown>
  ): Effect.Effect<void, CoordinationError> {
    return Effect.gen(
      function* () {
        const pattern = this.coordinationPatterns.get(patternId)
        if (!pattern) {
          yield* Effect.fail(new CoordinationPatternNotFoundError(patternId))
          return
        }

        const coordination: ActiveCoordination = {
          id: coordinationId,
          pattern: pattern,
          participants,
          config: config || {},
          startTime: new Date(),
          state: 'active',
          eventUnsubscribes: [],
        }

        // Set up event handlers for this coordination
        for (const eventType of pattern.eventTypes) {
          const unsubscribe = yield* this.eventBus.subscribe<BaseEvent>(eventType, event =>
            this.handleCoordinationEvent(coordination, event)
          )

          coordination.eventUnsubscribes.push(unsubscribe)
        }

        this.activeCoordinations.set(coordinationId, coordination)

        // Execute pattern initialization
        yield* pattern.initialize(coordination)

        // Emit coordination started event
        yield* this.eventBus.publish('component-coordination', {
          type: 'coordination-started',
          source: 'component-coordinator',
          timestamp: new Date(),
          id: generateId(),
          payload: {
            coordinationId,
            patternId,
            participants,
          },
        })
      }.bind(this)
    )
  }

  // Stop coordination
  stopCoordination(coordinationId: string): Effect.Effect<void, never> {
    return Effect.gen(
      function* () {
        const coordination = this.activeCoordinations.get(coordinationId)
        if (!coordination) return

        coordination.state = 'stopping'

        // Clean up event handlers
        for (const unsubscribe of coordination.eventUnsubscribes) {
          unsubscribe()
        }

        // Execute pattern cleanup
        yield* coordination.pattern.cleanup(coordination).pipe(Effect.catchAll(() => Effect.void))

        coordination.state = 'stopped'
        this.activeCoordinations.delete(coordinationId)

        // Emit coordination stopped event
        yield* this.eventBus.publish('component-coordination', {
          type: 'coordination-stopped',
          source: 'component-coordinator',
          timestamp: new Date(),
          id: generateId(),
          payload: {
            coordinationId,
            duration: Date.now() - coordination.startTime.getTime(),
          },
        })
      }.bind(this)
    )
  }

  // Get active coordinations
  getActiveCoordinations(): Effect.Effect<ActiveCoordinationInfo[], never> {
    return Effect.sync(() => {
      return Array.from(this.activeCoordinations.values()).map(coord => ({
        id: coord.id,
        patternId: coord.pattern.id,
        participants: coord.participants,
        state: coord.state,
        startTime: coord.startTime,
      }))
    })
  }

  private handleCoordinationEvent(
    coordination: ActiveCoordination,
    event: BaseEvent
  ): Effect.Effect<void, never> {
    return Effect.gen(function* () {
      // Check if event is relevant to this coordination
      if (!coordination.pattern.isEventRelevant(event, coordination)) {
        return
      }

      // Let pattern handle the event
      yield* coordination.pattern.handleEvent(event, coordination).pipe(
        Effect.catchAll(error =>
          Effect.sync(() => {
            console.error(`Error handling coordination event:`, error)
          })
        )
      )
    })
  }
}

export interface CoordinationPattern {
  id: string
  name: string
  eventTypes: string[]
  initialize: (coordination: ActiveCoordination) => Effect.Effect<void, never>
  handleEvent: (event: BaseEvent, coordination: ActiveCoordination) => Effect.Effect<void, never>
  isEventRelevant: (event: BaseEvent, coordination: ActiveCoordination) => boolean
  cleanup: (coordination: ActiveCoordination) => Effect.Effect<void, never>
}

interface ActiveCoordination {
  id: string
  pattern: CoordinationPattern
  participants: string[]
  config: Record<string, unknown>
  startTime: Date
  state: 'active' | 'stopping' | 'stopped'
  eventUnsubscribes: (() => void)[]
}

interface ActiveCoordinationInfo {
  id: string
  patternId: string
  participants: string[]
  state: string
  startTime: Date
}

// Built-in coordination patterns
export const MasterDetailPattern: CoordinationPattern = {
  id: 'master-detail',
  name: 'Master-Detail Coordination',
  eventTypes: ['component-selection', 'component-update'],

  initialize: coordination =>
    Effect.sync(() => {
      console.log(
        `Master-Detail coordination initialized for ${coordination.participants.join(', ')}`
      )
    }),

  handleEvent: (event, coordination) =>
    Effect.gen(function* () {
      const eventBus = (coordination as { eventBus?: EventBus }).eventBus // TODO: Better pattern access

      if (event.type === 'component-selection') {
        const masterId = coordination.config.masterId as string
        const detailId = coordination.config.detailId as string

        const componentEvent = event as BaseEvent & { componentId?: string; selectedItem?: unknown }
        if (componentEvent.componentId === masterId) {
          // Master selected something, update detail
          yield* eventBus.publish('component-update', {
            type: 'detail-update',
            source: 'master-detail-pattern',
            timestamp: new Date(),
            id: generateId(),
            payload: {
              targetId: detailId,
              selectedItem: componentEvent.selectedItem,
            },
          })
        }
      }
    }),

  isEventRelevant: (event, coordination) => {
    const componentEvent = event as BaseEvent & { componentId?: string }
    return componentEvent.componentId
      ? coordination.participants.includes(componentEvent.componentId)
      : false
  },

  cleanup: () =>
    Effect.sync(() => {
      console.log('Master-Detail coordination cleaned up')
    }),
}

export const DataFlowPattern: CoordinationPattern = {
  id: 'data-flow',
  name: 'Data Flow Coordination',
  eventTypes: ['data-changed', 'data-request'],

  initialize: coordination =>
    Effect.sync(() => {
      console.log(
        `Data flow coordination initialized for ${coordination.participants.join(' -> ')}`
      )
    }),

  handleEvent: (event, coordination) =>
    Effect.gen(function* () {
      if (event.type === 'data-changed') {
        const componentEvent = event as BaseEvent & { componentId?: string }
        if (componentEvent.componentId) {
          const sourceIndex = coordination.participants.indexOf(componentEvent.componentId)
          if (sourceIndex >= 0 && sourceIndex < coordination.participants.length - 1) {
            // Propagate to next component in flow
            const nextComponent = coordination.participants[sourceIndex + 1]
            // TODO: Emit data update to next component
          }
        }
      }
    }),

  isEventRelevant: (event, coordination) => {
    const componentEvent = event as BaseEvent & { componentId?: string }
    return componentEvent.componentId
      ? coordination.participants.includes(componentEvent.componentId)
      : false
  },

  cleanup: () =>
    Effect.sync(() => {
      console.log('Data flow coordination cleaned up')
    }),
}
