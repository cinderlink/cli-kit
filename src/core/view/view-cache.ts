/**
 * View Rendering Cache - High-performance view rendering optimization
 *
 * This module provides intelligent caching for view rendering operations to improve
 * performance in terminal UI applications. The cache system uses LRU (Least Recently Used)
 * eviction policies and time-based expiration to manage memory efficiently.
 *
 * ## Key Features:
 *
 * ### Intelligent Caching
 * - Automatic cache key generation based on view properties
 * - Content-aware hashing for cache invalidation
 * - Configurable size limits and expiration times
 *
 * ### Performance Optimization
 * - LRU eviction to manage memory usage
 * - Access count tracking for better eviction decisions
 * - Efficient string hashing for key generation
 *
 * ### Cache Management
 * - Automatic cleanup of expired entries
 * - Size-based eviction when limits are exceeded
 * - Comprehensive cache statistics and monitoring
 *
 * ### Effect Integration
 * - Seamless integration with Effect-based view rendering
 * - Error handling and recovery for cache operations
 * - Memoization utilities for custom render functions
 *
 * @example
 * ```typescript
 * import { ViewCache, globalViewCache } from './view-cache'
 *
 * // Use global cache
 * const key = globalViewCache.generateKey(myView)
 * const rendered = await globalViewCache.renderCached(key, myView)
 *
 * // Create custom cache
 * const cache = new ViewCache({ maxSize: 500, maxAge: 60000 })
 *
 * // Memoize custom render function
 * const memoizedRender = memoizeRender(
 *   (view) => Effect.succeed(customRenderLogic(view)),
 *   (view) => `custom-${view.id}`
 * )
 * ```
 *
 * @module core/view-cache
 */

import { Effect } from 'effect'
import type { View } from './types'

/**
 * Cache entry containing rendered content and metadata
 *
 * Stores the rendered string along with timing and access information
 * for efficient cache management and eviction decisions.
 */
export interface CacheEntry {
  /** The rendered string content */
  rendered: string
  /** When this entry was created (timestamp) */
  timestamp: number
  /** How many times this entry has been accessed */
  accessCount: number
}

/**
 * High-performance view rendering cache with LRU eviction
 *
 * Manages a cache of rendered view content with configurable size limits
 * and expiration times. Uses LRU eviction and access counting for optimal
 * memory usage and cache hit rates.
 *
 * @example
 * ```typescript
 * const cache = new ViewCache({
 *   maxSize: 1000,
 *   maxAge: 30000 // 30 seconds
 * })
 *
 * const key = cache.generateKey(view)
 * const rendered = await cache.renderCached(key, view)
 * ```
 */
export class ViewCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000
  private maxAge = 30 * 1000 // 30 seconds

  /**
   * Create a new view cache with optional configuration
   *
   * @param options - Cache configuration options
   * @param options.maxSize - Maximum number of entries (default: 1000)
   * @param options.maxAge - Maximum age in milliseconds (default: 30000)
   */
  constructor(options?: { maxSize?: number; maxAge?: number }) {
    if (options?.maxSize) this.maxSize = options.maxSize
    if (options?.maxAge) this.maxAge = options.maxAge
  }

  /**
   * Get cached render result or render and cache
   *
   * Attempts to retrieve a cached render result for the given key.
   * If not found or expired, renders the view and caches the result.
   * Updates access count for LRU eviction.
   *
   * @param key - Cache key for the view
   * @param view - View to render if not cached
   * @returns Rendered string content
   *
   * @example
   * ```typescript
   * const key = cache.generateKey(myView)
   * const rendered = await cache.renderCached(key, myView)
   * ```
   */
  async renderCached(key: string, view: View): Promise<string> {
    const cached = this.cache.get(key)
    const now = Date.now()

    // Return cached if valid
    if (cached && now - cached.timestamp < this.maxAge) {
      cached.accessCount++
      return cached.rendered
    }

    // Render and cache
    const rendered = await Effect.runPromise(view.render())

    this.cache.set(key, {
      rendered,
      timestamp: now,
      accessCount: 1,
    })

    // Evict if needed
    this.evictIfNeeded()

    return rendered
  }

  /**
   * Generate cache key for a view
   *
   * Creates a unique cache key based on view properties and content.
   * The key includes view dimensions, constructor name, and content hash
   * to ensure proper cache invalidation when views change.
   *
   * @param view - View to generate key for
   * @param props - Additional properties to include in key
   * @returns Unique cache key string
   *
   * @example
   * ```typescript
   * const key = cache.generateKey(view, { theme: 'dark' })
   * ```
   */
  generateKey(view: View, props?: Record<string, unknown>): string {
    // Create a simple cache key based on view properties
    const parts = [
      view.constructor.name,
      `w:${view.width || 0}`,
      `h:${view.height || 0}`,
      // Try to get some content identifier
      this.getViewIdentifier(view),
      props ? JSON.stringify(props) : '',
    ]

    const keyString = parts.join('|')

    // Use a simple hash function for consistent key generation
    return this.hashString(keyString)
  }

  /**
   * Try to extract a unique identifier from the view
   *
   * Attempts to create a content-based identifier for the view by
   * analyzing the render function. This helps with cache invalidation
   * when view content changes.
   *
   * @param view - View to analyze
   * @returns Content-based identifier string
   *
   * @internal
   */
  private getViewIdentifier(view: View): string {
    try {
      // For object views, try to get a reasonable identifier
      const viewObj = view as Record<string, unknown>
      if (viewObj.render && typeof viewObj.render === 'function') {
        // Use the render function's string representation as part of the identifier
        const renderStr = viewObj.render.toString()

        // Extract content from Effect.succeed calls for simple text views
        const successMatch = renderStr.match(/Effect\.succeed\(['"`]([^'"`]+)['"`]\)/)
        if (successMatch) {
          return `content:${successMatch[1]}`
        }

        // Fallback to function signature
        return `render:${this.hashString(renderStr.substring(0, 100))}`
      }

      return 'unknown'
    } catch {
      return 'error'
    }
  }

  /**
   * Simple hash function for consistent key generation
   *
   * Uses a simple but effective hash algorithm to generate consistent
   * hash values from strings. Converts to base-36 for compact keys.
   *
   * @param str - String to hash
   * @returns Hash value as base-36 string
   *
   * @internal
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Clear expired entries and enforce size limit
   *
   * Performs cache maintenance by removing expired entries and
   * evicting least-accessed entries if the cache exceeds size limits.
   * Uses LRU eviction policy for optimal cache performance.
   *
   * @internal
   */
  private evictIfNeeded(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    // Remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }

    // Evict least accessed if still too large
    if (this.cache.size > this.maxSize) {
      const sorted = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].accessCount - b[1].accessCount
      )

      const toRemove = sorted.slice(0, this.cache.size - this.maxSize)
      for (const [key] of toRemove) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   *
   * Removes all cached entries, effectively resetting the cache.
   * Useful for memory cleanup or cache invalidation.
   *
   * @example
   * ```typescript
   * cache.clear() // Start fresh
   * ```
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   *
   * Returns comprehensive statistics about cache performance and usage.
   * Useful for monitoring and tuning cache parameters.
   *
   * @returns Object containing cache statistics
   *
   * @example
   * ```typescript
   * const stats = cache.getStats()
   * console.log(`Cache size: ${stats.size}, Total access: ${stats.totalAccess}`)
   * ```
   */
  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    return {
      size: this.cache.size,
      totalAccess: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      avgAge:
        entries.length > 0
          ? entries.reduce((sum, entry) => sum + Math.max(0, now - entry.timestamp), 0) /
            entries.length
          : 0,
    }
  }
}

/**
 * Global cache instance for convenient shared caching
 *
 * Pre-configured ViewCache instance that can be used across the application
 * for view caching without needing to manage cache instances manually.
 */
export const globalViewCache = new ViewCache()

/**
 * Create a memoized render function
 *
 * Wraps a custom render function with caching capabilities. The memoized
 * function will cache render results and return cached values for identical
 * inputs, improving performance for expensive render operations.
 *
 * @param renderFn - Custom render function to memoize
 * @param keyFn - Optional custom key generation function
 * @returns Memoized render function with caching
 *
 * @example
 * ```typescript
 * const memoizedRender = memoizeRender(
 *   (view) => Effect.succeed(expensiveRenderOperation(view)),
 *   (view) => `${view.id}-${view.version}`
 * )
 *
 * // Use memoized function
 * const result = await Effect.runPromise(memoizedRender(myView))
 * ```
 */
export function memoizeRender<T extends View, E = never>(
  renderFn: (view: T) => Effect.Effect<string, E, never>,
  keyFn?: (view: T) => string
) {
  return (view: T): Effect.Effect<string, E, never> => {
    const key = keyFn ? keyFn(view) : globalViewCache.generateKey(view)

    // Create a custom view that uses the provided render function
    const customView: View = {
      render: () => renderFn(view),
      width: view.width,
      height: view.height,
    }

    return Effect.tryPromise(() => globalViewCache.renderCached(key, customView)).pipe(
      Effect.catchAll(error => Effect.fail(error as E))
    )
  }
}
