/**
 * Lazy Loading Configuration
 * 
 * Utilities for creating lazy-loaded command handlers
 */

import type { Handler, LazyHandler } from "@cli/types"

/**
 * Create a lazy-loaded command handler
 * 
 * Wraps an import function to create a lazy-loaded handler that only loads
 * the module when the command is actually executed. This improves startup
 * performance by deferring module loading.
 * 
 * @param importFn - Async function that imports the handler module
 * @param metadata - Optional metadata to attach to the lazy handler
 * @returns A lazy handler that loads the module on first use
 * 
 * @example
 * ```typescript
 * const buildCommand = defineCommand({
 *   description: "Build the project",
 *   handler: lazyLoad(() => import('./commands/build'))
 * })
 * ```
 */
export function lazyLoad(importFn: () => Promise<{ default: Handler }>, metadata?: Record<string, unknown>): LazyHandler {
  const handler: LazyHandler = async (args: Record<string, unknown>) => {
    const module = await importFn()
    return module.default(args) // Pass the args object directly
  }
  
  // Mark as lazy handler
  handler._lazy = true
  handler._importFn = importFn
  
  // Attach metadata if provided
  if (metadata) {
    Object.assign(handler, metadata)
  }
  
  return handler
}