/**
 * View Rendering Cache
 * 
 * Optimizes view rendering through memoization and caching
 */

import { Effect } from "effect"
import type { View } from "./types"

export interface CacheEntry {
  rendered: string
  timestamp: number
  accessCount: number
}

export class ViewCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000
  private maxAge = 30 * 1000 // 30 seconds
  
  constructor(options?: { maxSize?: number; maxAge?: number }) {
    if (options?.maxSize) this.maxSize = options.maxSize
    if (options?.maxAge) this.maxAge = options.maxAge
  }
  
  /**
   * Get cached render result or render and cache
   */
  async renderCached(key: string, view: View): Promise<string> {
    const cached = this.cache.get(key)
    const now = Date.now()
    
    // Return cached if valid
    if (cached && (now - cached.timestamp) < this.maxAge) {
      cached.accessCount++
      return cached.rendered
    }
    
    // Render and cache
    const rendered = await Effect.runPromise(view.render())
    
    this.cache.set(key, {
      rendered,
      timestamp: now,
      accessCount: 1
    })
    
    // Evict if needed
    this.evictIfNeeded()
    
    return rendered
  }
  
  /**
   * Generate cache key for a view
   */
  generateKey(view: View, props?: Record<string, any>): string {
    // Create a unique key for the view by examining its properties
    const propsStr = props ? JSON.stringify(props) : ''
    const viewType = view.type || view.constructor.name
    
    // Include view properties for uniqueness
    let viewData = ''
    try {
      // For text views created by text(), examine the render function output
      if (view.render && typeof view.render === 'function') {
        // Get the view's dimensions and type as a simple signature
        viewData = `w:${view.width || 0}|h:${view.height || 0}`
        
        // For simple views, try to extract some identifying info
        const renderStr = view.render.toString()
        if (renderStr.includes('Effect.succeed(')) {
          // This is likely a text view, include its content hash
          const match = renderStr.match(/Effect\.succeed\(([^)]+)\)/)
          if (match) {
            viewData += `|content:${match[1]}`
          }
        }
      }
    } catch (e) {
      // Fallback to object properties
      viewData = Object.keys(view).join('|')
    }
    
    const viewStr = viewType + '|' + viewData + '|' + propsStr
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < viewStr.length; i++) {
      const char = viewStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(36)
  }
  
  /**
   * Clear expired entries and enforce size limit
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
      const sorted = Array.from(this.cache.entries())
        .sort((a, b) => a[1].accessCount - b[1].accessCount)
      
      const toRemove = sorted.slice(0, this.cache.size - this.maxSize)
      for (const [key] of toRemove) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    return {
      size: this.cache.size,
      totalAccess: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      avgAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + Math.max(0, now - entry.timestamp), 0) / entries.length
        : 0
    }
  }
}

// Global cache instance
export const globalViewCache = new ViewCache()

/**
 * Create a memoized render function
 */
export function memoizeRender<T extends View, E = never>(
  renderFn: (view: T) => Effect.Effect<string, E, never>,
  keyFn?: (view: T) => string
) {
  return (view: T): Effect.Effect<string, E, never> => {
    const key = keyFn ? keyFn(view) : globalViewCache.generateKey(view)
    
    return Effect.tryPromise(() => 
      globalViewCache.renderCached(key, view)
    ).pipe(
      Effect.catchAll(error => Effect.fail(error as E))
    )
  }
}