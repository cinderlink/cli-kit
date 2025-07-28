/**
 * Configuration Storage Implementation
 *
 * Manages application configuration files
 */

import { Effect, Ref, Stream } from 'effect'
import { StorageError } from '../../../types/errors'
import { StorageUtils } from '@core/services/storage'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'

/**
 * Configuration storage operations
 */
export class ConfigStorage {
  constructor(private configStore: Ref.Ref<Map<string, unknown>>) {}

  /**
   * Load configuration from file
   */
  loadConfig<T>(appName: string, schema: z.ZodSchema<T>, defaults: T): Effect<T, StorageError> {
    return Effect.gen(
      function* (_) {
        // Check cache first
        const store = yield* _(Ref.get(this.configStore))
        const cached = store.get(appName)
        if (cached) {
          try {
            return schema.parse(cached)
          } catch {
            // Invalid cached data, continue
          }
        }

        const configPath = this.getConfigPath(appName)

        const content = yield* _(
          Effect.tryPromise({
            try: () => fs.readFile(configPath, 'utf8'),
            catch: (error: unknown) => {
              const err = error as NodeJS.ErrnoException
              if (err.code === 'ENOENT') {
                // File doesn't exist, use defaults
                return null
              }
              return new StorageError({
                message: `Failed to load config for '${appName}'`,
                path: configPath,
                cause: error,
              })
            },
          })
        )

        if (content === null) {
          // Save defaults
          yield* _(this.saveConfig(appName, defaults, schema))
          return defaults
        }

        try {
          const parsed = JSON.parse(content)
          const validated = schema.parse({ ...defaults, ...parsed })

          // Update cache
          yield* _(
            Ref.update(this.configStore, store => {
              const newStore = new Map(store)
              newStore.set(appName, validated)
              return newStore
            })
          )

          return validated
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Invalid config data for '${appName}'`,
                path: configPath,
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Save configuration to file
   */
  saveConfig<T>(appName: string, config: T, schema: z.ZodSchema<T>): Effect<void, StorageError> {
    return Effect.gen(
      function* (_) {
        try {
          // Validate
          const validated = schema.parse(config)

          // Update cache
          yield* _(
            Ref.update(this.configStore, store => {
              const newStore = new Map(store)
              newStore.set(appName, validated)
              return newStore
            })
          )

          // Save to file
          const configPath = this.getConfigPath(appName)
          const dir = path.dirname(configPath)

          yield* _(
            Effect.tryPromise({
              try: async () => {
                await fs.mkdir(dir, { recursive: true })
                await fs.writeFile(configPath, JSON.stringify(validated, null, 2), 'utf8')
              },
              catch: error =>
                new StorageError({
                  message: `Failed to save config for '${appName}'`,
                  path: configPath,
                  cause: error,
                }),
            })
          )
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Failed to save config for '${appName}'`,
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Get the configuration file path for an app
   */
  getConfigPath(appName: string): string {
    const configPaths = StorageUtils.getConfigPaths(appName)
    return configPaths[0] ?? path.join(process.cwd(), `.${appName}rc`)
  }

  /**
   * Watch configuration file for changes
   */
  watchConfig<T>(appName: string, schema: z.ZodSchema<T>): Stream.Stream<T, StorageError> {
    return Stream.async<T, StorageError>(emit => {
      const configPath = this.getConfigPath(appName)

      // Initial load
      Effect.runPromise(
        this.loadConfig(appName, schema, {} as T).pipe(
          Effect.tap(config => Effect.sync(() => emit.single(config))),
          Effect.catchAll(error => Effect.sync(() => emit.fail(error)))
        )
      )

      // Watch for changes (simplified - real implementation would use fs.watch)
      // This is a placeholder that polls every second
      const interval = setInterval(() => {
        Effect.runPromise(
          this.loadConfig(appName, schema, {} as T).pipe(
            Effect.tap(config => Effect.sync(() => emit.single(config))),
            Effect.catchAll(() => Effect.void)
          )
        )
      }, 1000)

      // Cleanup
      return () => {
        clearInterval(interval)
      }
    })
  }
}
