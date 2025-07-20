/**
 * Lazy Loading Utilities
 * 
 * Provides utilities for lazy loading commands and plugins
 */

import type { Component } from "../core/types"
import type { Handler } from "./types"

export interface LazyComponent<TModel = unknown, TMsg = unknown> {
  (): Promise<Component<TModel, TMsg>>
  preload?: () => Promise<void>
  isLoaded?: boolean
}

export interface LazyHandler {
  (): Promise<Handler>
  preload?: () => Promise<void>
  isLoaded?: boolean
}

/**
 * Create a lazy-loaded module with caching and preloading support
 */
export function lazyLoad<T = unknown>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): LazyComponent<unknown, unknown> | LazyHandler {
  let cached: T | undefined
  let loading: Promise<T> | undefined
  let loadError: Error | undefined
  
  const loader = async (): Promise<T> => {
    if (cached) return cached
    
    if (!loading) {
      loading = importFn()
        .then(module => {
          cached = module.default
          loadError = undefined
          return cached
        })
        .catch(error => {
          loadError = error
          loading = undefined
          throw error
        })
    }
    
    return loading
  }
  
  const lazyFunction = async () => {
    try {
      return await loader()
    } catch (error) {
      console.error("Failed to load module:", error)
      
      if (fallback) {
        console.warn("Using fallback component")
        return fallback
      }
      
      throw error
    }
  }
  
  // Add preload method
  lazyFunction.preload = async () => {
    try {
      await loader()
    } catch (error) {
      // Preload failures are silent
      console.debug("Preload failed:", error)
    }
  }
  
  // Add isLoaded getter
  Object.defineProperty(lazyFunction, "isLoaded", {
    get: () => !!cached && !loadError
  })
  
  return lazyFunction as LazyComponent<unknown, unknown> | LazyHandler
}

/**
 * Convenience helper for lazy loading commands from file paths
 */
export function lazyLoadCommand(path: string, fallback?: Handler): LazyHandler {
  return lazyLoad(() => import(path), fallback) as LazyHandler
}

/**
 * Convenience helper for lazy loading plugins
 */
export function lazyLoadPlugin(name: string) {
  return lazyLoad(() => import(name))
}

/**
 * Preload multiple lazy-loaded modules
 */
export async function preloadAll(
  lazyModules: Array<{ preload?: () => Promise<void> }>
): Promise<void> {
  const preloadPromises = lazyModules
    .filter(module => module.preload)
    .map(module => module.preload!())
  
  await Promise.allSettled(preloadPromises)
}

/**
 * Create a lazy loading cache for frequently accessed modules
 */
export class LazyCache {
  private cache = new Map<string, unknown>()
  private loading = new Map<string, Promise<unknown>>()
  
  async get<T>(
    key: string, 
    importFn: () => Promise<{ default: T }>
  ): Promise<T> {
    // Return cached if available
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }
    
    // Return loading promise if in progress
    if (this.loading.has(key)) {
      return await (this.loading.get(key) as Promise<T>)
    }
    
    // Start loading
    const loadingPromise = importFn()
      .then(module => {
        const result = module.default
        this.cache.set(key, result)
        this.loading.delete(key)
        return result
      })
      .catch(error => {
        this.loading.delete(key)
        throw error
      })
    
    this.loading.set(key, loadingPromise)
    return loadingPromise
  }
  
  has(key: string): boolean {
    return this.cache.has(key)
  }
  
  clear(): void {
    this.cache.clear()
    this.loading.clear()
  }
  
  size(): number {
    return this.cache.size
  }
}

// Global lazy cache instance
export const globalLazyCache = new LazyCache()