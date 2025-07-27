/**
 * JSX Component Context
 * 
 * Re-exports the core component context for JSX module compatibility.
 * The actual implementation is in @core/context to avoid circular dependencies.
 */

export {
  ComponentContext,
  ComponentContextRef,
  useComponentContext,
  withComponentContext,
  type ComponentContextValue
} from "@core/context"