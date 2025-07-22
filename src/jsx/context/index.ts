/**
 * JSX Component Context
 * 
 * Provides context for JSX components to access MVU model and dispatch
 */

import { Context, FiberRef, Effect } from "effect"

/**
 * Component context that provides access to MVU model and dispatch
 */
export interface ComponentContextValue<Model = unknown, Msg = unknown> {
  /**
   * Get the current model value
   */
  model: () => Model
  
  /**
   * Dispatch a message to the update function
   */
  dispatch: (msg: Msg) => void
  
  /**
   * Component ID for tracking
   */
  componentId?: string
}

/**
 * Create the component context
 */
export const ComponentContext = Context.GenericTag<ComponentContextValue>("@jsx/ComponentContext")

/**
 * FiberRef for component context
 */
export const ComponentContextRef = FiberRef.unsafeMake<ComponentContextValue | null>(null)

/**
 * Hook to access component context
 * This allows components to access the current model and dispatch
 */
export function useComponentContext<Model = unknown, Msg = unknown>(): Effect.Effect<ComponentContextValue<Model, Msg>, never, never> {
  return Effect.gen(function* () {
    const context = yield* FiberRef.get(ComponentContextRef)
    if (!context) {
      throw new Error("Component context not available. Make sure you're using this inside a component rendered by createJSXApp with MVU config.")
    }
    return context as ComponentContextValue<Model, Msg>
  })
}

/**
 * Provider to set component context
 */
export function withComponentContext<R, E, A, Model, Msg>(
  context: ComponentContextValue<Model, Msg>,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> {
  return FiberRef.locally(ComponentContextRef, context)(effect)
}