/**
 * Cache Storage Implementation
 * 
 * Manages in-memory cache with TTL support
 */

import { Effect, Ref } from "effect"
import { StorageError } from "../../../types/errors"
import { z } from "zod"

interface CacheEntry {
  data: unknown
  expires: number | null
  createdAt: number
}

/**
 * Cache storage operations
 */
export class CacheStorage {
  constructor(
    private cacheStore: Ref.Ref<Map<string, CacheEntry>>
  ) {}

  /**
   * Set a cache entry with optional TTL
   */
  setCache<T>(
    key: string, 
    data: T, 
    ttlSeconds?: number
  ): Effect<void, StorageError> {
    return Effect.gen(function* (_) {
      const now = Date.now()
      const expires = ttlSeconds ? now + (ttlSeconds * 1000) : null
      
      yield* _(Ref.update(this.cacheStore, store => {
        const newStore = new Map(store)
        newStore.set(key, {
          data,
          expires,
          createdAt: now
        })
        return newStore
      }))
    }.bind(this))
  }

  /**
   * Get a cache entry
   */
  getCache<T>(
    key: string, 
    schema: z.ZodSchema<T>
  ): Effect<T | null, StorageError> {
    return Effect.gen(function* (_) {
      const store = yield* _(Ref.get(this.cacheStore))
      const entry = store.get(key)
      
      if (!entry) return null
      
      // Check if expired
      if (entry.expires && Date.now() > entry.expires) {
        // Remove expired entry
        yield* _(this.clearCache(key))
        return null
      }
      
      try {
        return schema.parse(entry.data)
      } catch (error) {
        return yield* _(Effect.fail(new StorageError({
          message: `Invalid cache data for key '${key}'`,
          cause: error
        })))
      }
    }.bind(this))
  }

  /**
   * Clear a specific cache entry
   */
  clearCache(key: string): Effect<void, never> {
    return Ref.update(this.cacheStore, store => {
      const newStore = new Map(store)
      newStore.delete(key)
      return newStore
    })
  }

  /**
   * Clear all expired cache entries
   */
  clearExpiredCache(): Effect<number, never> {
    return Effect.gen(function* (_) {
      const now = Date.now()
      let cleared = 0
      
      yield* _(Ref.update(this.cacheStore, store => {
        const newStore = new Map(store)
        for (const [key, entry] of store) {
          if (entry.expires && now > entry.expires) {
            newStore.delete(key)
            cleared++
          }
        }
        return newStore
      }))
      
      return cleared
    }.bind(this))
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Effect<{
    totalEntries: number
    totalSize: number
    expiredEntries: number
    averageAge: number
  }, never> {
    return Effect.gen(function* (_) {
      const store = yield* _(Ref.get(this.cacheStore))
      const now = Date.now()
      
      let totalSize = 0
      let expiredEntries = 0
      let totalAge = 0
      
      for (const [_, entry] of store) {
        totalSize += JSON.stringify(entry.data).length
        if (entry.expires && now > entry.expires) {
          expiredEntries++
        }
        totalAge += now - entry.createdAt
      }
      
      return {
        totalEntries: store.size,
        totalSize,
        expiredEntries,
        averageAge: store.size > 0 ? totalAge / store.size : 0
      }
    }.bind(this))
  }
}