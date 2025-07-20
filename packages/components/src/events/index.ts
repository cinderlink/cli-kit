/**
 * Component Event System - Inter-component communication
 * 
 * @module components/events
 */

import { ComponentEventError } from "../base/errors"

/**
 * Component event emitter interface
 */
export interface ComponentEventEmitter {
  emit<T>(event: string, data: T): void
  on<T>(event: string, handler: (data: T) => void): () => void
  once<T>(event: string, handler: (data: T) => void): () => void
  off(event: string, handler?: Function): void
}

/**
 * Component event system interface
 */
export interface ComponentEventSystem {
  createEmitter(): ComponentEventEmitter
  propagateEvent(event: ComponentEvent): void
  handleEvent(event: ComponentEvent): void
}

/**
 * Component event interface
 */
export interface ComponentEvent {
  type: string
  data: any
  source?: string
  target?: string
  timestamp: number
}

/**
 * Default event emitter implementation
 */
export class DefaultComponentEventEmitter implements ComponentEventEmitter {
  private listeners = new Map<string, Function[]>()

  emit<T>(event: string, data: T): void {
    const handlers = this.listeners.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        throw new ComponentEventError({
          eventName: event,
          operation: 'emit',
          cause: error
        })
      }
    })
  }

  on<T>(event: string, handler: (data: T) => void): () => void {
    const handlers = this.listeners.get(event) || []
    handlers.push(handler)
    this.listeners.set(event, handlers)

    return () => {
      const currentHandlers = this.listeners.get(event) || []
      const index = currentHandlers.indexOf(handler)
      if (index >= 0) {
        currentHandlers.splice(index, 1)
        this.listeners.set(event, currentHandlers)
      }
    }
  }

  once<T>(event: string, handler: (data: T) => void): () => void {
    const onceHandler = (data: T) => {
      handler(data)
      this.off(event, onceHandler)
    }
    return this.on(event, onceHandler)
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.listeners.delete(event)
    } else {
      const handlers = this.listeners.get(event) || []
      const index = handlers.indexOf(handler)
      if (index >= 0) {
        handlers.splice(index, 1)
        this.listeners.set(event, handlers)
      }
    }
  }
}

/**
 * Global event emitter
 */
export const globalEventEmitter: ComponentEventEmitter = new DefaultComponentEventEmitter()

/**
 * Create a new event emitter
 */
export function createEventEmitter(): ComponentEventEmitter {
  return new DefaultComponentEventEmitter()
}