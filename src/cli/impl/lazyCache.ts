/**
 * Lazy Loading Cache
 * 
 * Optimized caching system for lazy-loaded modules
 */

import type { Handler, LazyHandler } from "../types"

/**
 * Represents a JavaScript module that can be loaded dynamically.
 * The module should either export the handler as default or be the handler itself.
 */
export interface LoadedModule {
  default?: Handler
  [key: string]: unknown
}

export interface CacheEntry {
  module: LoadedModule | Handler
  handler: Handler
  loadTime: number
  lastAccess: number
  accessCount: number
}

export class LazyCache {
  private cache = new Map<string, CacheEntry>()
  private loading = new Map<string, Promise<LoadedModule | Handler>>()
  
  // Cache configuration
  private maxSize: number = 100
  private maxAge: number = 60 * 60 * 1000 // 1 hour
  private preloadQueue: Set<string> = new Set()
  
  constructor(options?: {
    maxSize?: number
    maxAge?: number
  }) {
    if (options?.maxSize) this.maxSize = options.maxSize
    if (options?.maxAge) this.maxAge = options.maxAge
  }
  
  /**
   * Get or load a lazy handler
   */
  async get(
    key: string,
    loader: () => Promise<LoadedModule | Handler>
  ): Promise<Handler> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      cached.lastAccess = Date.now()
      cached.accessCount++
      return cached.handler
    }
    
    // Check if already loading
    const loading = this.loading.get(key)
    if (loading) {
      const module = await loading
      return this.extractHandler(module)
    }
    
    // Start loading
    const loadPromise = this.load(key, loader)
    this.loading.set(key, loadPromise)
    
    try {
      const module = await loadPromise
      const handler = this.extractHandler(module)
      
      // Cache the result
      this.cache.set(key, {
        module,
        handler,
        loadTime: Date.now(),
        lastAccess: Date.now(),
        accessCount: 1
      })
      
      // Cleanup loading state
      this.loading.delete(key)
      
      // Evict old entries if needed
      this.evictIfNeeded()
      
      return handler
    } catch (error) {
      this.loading.delete(key)
      throw error
    }
  }
  
  /**
   * Preload a module
   */
  preload(key: string, loader: () => Promise<unknown>): void {
    if (!this.cache.has(key) && !this.loading.has(key)) {
      this.preloadQueue.add(key)
      
      // Process preload queue in next tick
      queueMicrotask(() => {
        if (this.preloadQueue.has(key)) {
          this.preloadQueue.delete(key)
          this.get(key, loader).catch(() => {
            // Ignore preload errors
          })
        }
      })
    }
  }
  
  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear()
    this.loading.clear()
    this.preloadQueue.clear()
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    hits: number
    misses: number
    avgLoadTime: number
    mostUsed: string[]
  } {
    const entries = Array.from(this.cache.entries())
    const totalHits = entries.reduce((sum, [_, entry]) => sum + entry.accessCount, 0)
    const totalLoadTime = entries.reduce((sum, [_, entry]) => sum + entry.loadTime, 0)
    
    const mostUsed = entries
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 5)
      .map(([key]) => key)
    
    return {
      size: this.cache.size,
      hits: totalHits,
      misses: 0, // Would need to track this separately
      avgLoadTime: entries.length > 0 ? totalLoadTime / entries.length : 0,
      mostUsed
    }
  }
  
  /**
   * Extract handler from a loaded module
   */
  private extractHandler(module: LoadedModule | Handler): Handler {
    // If it's already a handler function, return it
    if (typeof module === 'function') {
      return module
    }
    
    // If it's a module with default export, use that
    if (typeof module === 'object' && module && 'default' in module && typeof module.default === 'function') {
      return module.default
    }
    
    throw new Error('Invalid module: expected a function or object with default export')
  }

  /**
   * Load a module
   */
  private async load(key: string, loader: () => Promise<LoadedModule | Handler>): Promise<LoadedModule | Handler> {
    const startTime = performance.now()
    
    try {
      const module = await loader()
      const loadTime = performance.now() - startTime
      
      // Log slow loads in development
      if (process.env.NODE_ENV === 'development' && loadTime > 100) {
        console.warn(`Slow module load: ${key} took ${loadTime.toFixed(2)}ms`)
      }
      
      return module
    } catch (error) {
      console.error(`Failed to load module: ${key}`, error)
      throw error
    }
  }
  
  /**
   * Evict old entries if cache is too large
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) return
    
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // First, remove expired entries
    for (const [key, entry] of entries) {
      if (now - entry.lastAccess > this.maxAge) {
        this.cache.delete(key)
      }
    }
    
    // If still too large, remove least recently used
    if (this.cache.size > this.maxSize) {
      const sorted = entries
        .filter(([key]) => this.cache.has(key))
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      
      const toRemove = sorted.slice(0, this.cache.size - this.maxSize)
      for (const [key] of toRemove) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const globalLazyCache = new LazyCache()

/**
 * Create an optimized lazy handler
 */
export function createLazyHandler(
  importPath: string,
  loader: () => Promise<LoadedModule | Handler>
): LazyHandler {
  const handler = async () => {
    return globalLazyCache.get(importPath, loader)
  }
  
  // Add preload method
  handler.preload = () => {
    globalLazyCache.preload(importPath, loader)
  }
  
  // Add cache key for debugging
  handler._cacheKey = importPath
  
  // Add lazy marker
  handler._lazy = true
  
  return handler as LazyHandler
}

/**
 * Preload multiple lazy handlers
 */
export function preloadHandlers(handlers: LazyHandler[]): void {
  for (const handler of handlers) {
    if ('preload' in handler && typeof handler.preload === 'function') {
      handler.preload()
    }
  }
}