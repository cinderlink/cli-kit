/**
 * Plugin Middleware Functions
 *
 * Functions for creating and managing plugin middleware
 */

import type { Plugin, PluginContext } from './types'
import type { CLIContext } from '@cli/types'

/**
 * Create middleware from plugins
 *
 * Combines all plugin wrappers into a single middleware chain
 */
export function createMiddlewareFromPlugins(
  plugins: Plugin[],
  context: PluginContext
): (ctx: CLIContext, next: () => Promise<void>) => Promise<void> {
  // Collect all wrappers
  const wrappers = plugins.flatMap(p => p.wrappers || [])

  if (wrappers.length === 0) {
    return async (_ctx, next) => await next()
  }

  // Create middleware chain
  return createMiddlewareChain(wrappers, context)
}

/**
 * Create a middleware chain from wrappers
 */
export function createMiddlewareChain(
  wrappers: Plugin['wrappers'],
  context: PluginContext
): (ctx: CLIContext, next: () => Promise<void>) => Promise<void> {
  return async (ctx: CLIContext, next: () => Promise<void>) => {
    let index = 0

    async function dispatch(): Promise<void> {
      if (index >= wrappers.length) {
        return await next()
      }

      const wrapper = wrappers[index++]
      await wrapper(ctx, dispatch, context)
    }

    await dispatch()
  }
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(
  ...middlewares: Array<(ctx: CLIContext, next: () => Promise<void>) => Promise<void>>
): (ctx: CLIContext, next: () => Promise<void>) => Promise<void> {
  return async (ctx: CLIContext, next: () => Promise<void>) => {
    let index = 0

    async function dispatch(): Promise<void> {
      if (index >= middlewares.length) {
        return await next()
      }

      const middleware = middlewares[index++]
      await middleware(ctx, dispatch)
    }

    await dispatch()
  }
}
