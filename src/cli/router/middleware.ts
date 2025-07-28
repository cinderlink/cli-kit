/**
 * Middleware Management
 *
 * Handles middleware registration and application for command handlers
 */

import type { Handler, LazyHandler } from '@cli/types'
import type { Middleware } from './types'

export class MiddlewareManager {
  private middleware: Middleware[] = []

  /**
   * Add middleware that wraps command handlers
   */
  addMiddleware(middleware: Middleware): void {
    this.middleware.push(middleware)
  }

  /**
   * Get all registered middleware
   */
  getMiddleware(): Middleware[] {
    return [...this.middleware]
  }

  /**
   * Clear all middleware
   */
  clearMiddleware(): void {
    this.middleware = []
  }

  /**
   * Apply middleware to a handler
   * Applies in reverse order so first added is outermost
   */
  applyMiddleware(handler: Handler | LazyHandler): Handler | LazyHandler {
    let wrappedHandler = handler

    for (let i = this.middleware.length - 1; i >= 0; i--) {
      wrappedHandler = this.middleware[i](wrappedHandler)
    }

    return wrappedHandler
  }

  /**
   * Get the number of registered middleware
   */
  get count(): number {
    return this.middleware.length
  }
}
