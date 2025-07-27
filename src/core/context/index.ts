/**
 * Core Context Module
 * 
 * Provides context abstractions for cross-cutting concerns
 * that need to be shared between different parts of the framework.
 */

// Component context exports
export {
  ComponentContext,
  ComponentContextRef,
  useComponentContext,
  withComponentContext,
  type ComponentContextValue
} from './component'