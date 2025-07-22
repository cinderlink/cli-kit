/**
 * Core service interfaces and implementations
 * @module core/services
 */

// Export service interfaces
export * from './terminal'
export * from './input'
export * from './renderer'
export * from './storage'

// Export input services (re-export from core/input)
export * from '../input/mouse/hitTest'
export * from '../input/mouse/router'
export * from '../input/focus/manager'

// Export service implementations
export * from './impl'

// Export module coordinator
export * from './serviceModule'

// Export event types
export * from './events/types'