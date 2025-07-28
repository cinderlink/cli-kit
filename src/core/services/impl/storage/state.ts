/**
 * State Storage Implementation
 *
 * Manages persistent state storage for applications
 */

import { Effect, Ref } from 'effect'
import { StorageError } from '../../../types/errors'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'

/**
 * State storage operations
 */
export class StateStorage {
  constructor(
    private stateStore: Ref.Ref<Map<string, string>>,
    private getStateFilePath: (key: string) => string
  ) {}

  /**
   * Save state to persistent storage
   */
  saveState<T>(
    key: string,
    data: T,
    options?: {
      readonly schema?: z.ZodSchema<T>
      readonly pretty?: boolean
    }
  ): Effect<void, StorageError> {
    return Effect.gen(
      function* (_) {
        try {
          // Validate if schema provided
          if (options?.schema) {
            options.schema.parse(data)
          }

          const serialized = JSON.stringify(data, null, options?.pretty ? 2 : undefined)

          // Save to in-memory store
          yield* _(
            Ref.update(this.stateStore, store => {
              const newStore = new Map(store)
              newStore.set(key, serialized)
              return newStore
            })
          )

          // Save to file
          const filePath = this.getStateFilePath(key)
          const dir = path.dirname(filePath)

          yield* _(
            Effect.tryPromise({
              try: async () => {
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(filePath, serialized, 'utf8')
              },
              catch: error =>
                new StorageError({
                  message: `Failed to save state for key '${key}'`,
                  path: filePath,
                  cause: error,
                }),
            })
          )
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Failed to save state for key '${key}'`,
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Load state from persistent storage
   */
  loadState<T>(key: string, schema: z.ZodSchema<T>): Effect<T, StorageError> {
    return Effect.gen(
      function* (_) {
        // Check in-memory cache first
        const store = yield* _(Ref.get(this.stateStore))
        const cached = store.get(key)

        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            return schema.parse(parsed)
          } catch (error) {
            // Invalid cached data, fall through to file
          }
        }

        // Load from file
        const filePath = this.getStateFilePath(key)

        const content = yield* _(
          Effect.tryPromise({
            try: () => fs.readFile(filePath, 'utf8'),
            catch: (error: unknown) => {
              const err = error as NodeJS.ErrnoException
              if (err.code === 'ENOENT') {
                return new StorageError({
                  message: `State not found for key '${key}'`,
                  path: filePath,
                  code: 'NOT_FOUND',
                })
              }
              return new StorageError({
                message: `Failed to load state for key '${key}'`,
                path: filePath,
                cause: error,
              })
            },
          })
        )

        try {
          const parsed = JSON.parse(content)
          const validated = schema.parse(parsed)

          // Update cache
          yield* _(
            Ref.update(this.stateStore, store => {
              const newStore = new Map(store)
              newStore.set(key, content)
              return newStore
            })
          )

          return validated
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Invalid state data for key '${key}'`,
                path: filePath,
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Clear state for a key
   */
  clearState(key: string): Effect<void, StorageError> {
    return Effect.gen(
      function* (_) {
        // Clear from in-memory store
        yield* _(
          Ref.update(this.stateStore, store => {
            const newStore = new Map(store)
            newStore.delete(key)
            return newStore
          })
        )

        // Delete file
        const filePath = this.getStateFilePath(key)
        yield* _(
          Effect.tryPromise({
            try: async () => {
              await fs.unlink(filePath)
            },
            catch: (error: unknown) => {
              const err = error as NodeJS.ErrnoException
              if (err.code === 'ENOENT') return // Already deleted
              return new StorageError({
                message: `Failed to clear state for key '${key}'`,
                path: filePath,
                cause: error,
              })
            },
          })
        )
      }.bind(this)
    )
  }

  /**
   * Check if state exists for a key
   */
  hasState(key: string): Effect<boolean, StorageError> {
    return Effect.gen(
      function* (_) {
        // Check in-memory store first
        const store = yield* _(Ref.get(this.stateStore))
        if (store.has(key)) return true

        // Check file system
        const filePath = this.getStateFilePath(key)
        return yield* _(
          Effect.tryPromise({
            try: async () => {
              await fs.access(filePath)
              return true
            },
            catch: () => false,
          })
        )
      }.bind(this)
    )
  }

  /**
   * List all state keys
   */
  listStateKeys(): Effect<string[], StorageError> {
    return Effect.gen(
      function* (_) {
        const stateDir = path.dirname(this.getStateFilePath('dummy'))

        try {
          const files = yield* _(
            Effect.tryPromise({
              try: () => fs.readdir(stateDir),
              catch: (error: unknown) => {
                const err = error as NodeJS.ErrnoException
                if (err.code === 'ENOENT') return []
                throw error
              },
            })
          )

          return files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) // Remove .json extension
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: 'Failed to list state keys',
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }
}
