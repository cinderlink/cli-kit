/**
 * Handler Execution Logic
 * 
 * Manages execution of command handlers including lazy loading,
 * error handling, and result processing
 */

import type { Handler, LazyHandler } from "@cli/types"

export class HandlerExecutor {
  /**
   * Check if a handler is lazy (returns a Promise<Handler>)
   */
  isLazyHandler(handler: Handler | LazyHandler): boolean {
    // A lazy handler should be a function with no parameters that returns another function
    // Regular handlers take args as parameter
    return typeof handler === 'function' && handler.length === 0
  }
  
  /**
   * Execute a handler (lazy or synchronous)
   */
  async executeHandler(
    handler: Handler | LazyHandler,
    args: Record<string, unknown>,
    isLazy: boolean = false
  ): Promise<unknown> {
    try {
      if (isLazy) {
        // Lazy handler - first call returns the actual handler
        const actualHandler = await (handler as LazyHandler)()
        return await this.callHandler(actualHandler, args)
      } else {
        // Direct handler
        return await this.callHandler(handler as Handler, args)
      }
    } catch (error) {
      // Enhance error with context
      if (error instanceof Error) {
        error.message = `Command execution failed: ${error.message}`
      }
      throw error
    }
  }
  
  /**
   * Call a handler function with proper error handling
   */
  private async callHandler(handler: Handler, args: Record<string, unknown>): Promise<unknown> {
    const result = handler(args)
    
    // Handle both sync and async handlers
    if (result instanceof Promise) {
      return await result
    }
    
    return result
  }
  
  /**
   * Execute a handler with middleware applied
   */
  async executeWithMiddleware(
    handler: Handler | LazyHandler,
    args: Record<string, unknown>,
    middleware: Array<(handler: Handler | LazyHandler) => Handler | LazyHandler>
  ): Promise<unknown> {
    // Apply middleware in reverse order so first added is outermost
    let wrappedHandler = handler
    for (let i = middleware.length - 1; i >= 0; i--) {
      wrappedHandler = middleware[i](wrappedHandler)
    }
    
    // Check if it's a zero-argument function (could be lazy or regular)
    if (typeof wrappedHandler === 'function' && wrappedHandler.length === 0) {
      // Could be lazy handler or zero-arg regular handler
      const result = await (wrappedHandler as () => Promise<unknown> | unknown)()
      if (typeof result === 'function') {
        // It's a lazy handler, result is the actual handler
        return (result as Handler)(args)
      } else {
        // It's a regular zero-arg handler, result is the final result
        return result
      }
    } else if (typeof wrappedHandler === 'function') {
      // Regular handler with args
      return (wrappedHandler as Handler)(args)
    }
    
    throw new Error('Invalid handler after middleware application')
  }
}