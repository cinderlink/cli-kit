/**
 * Storage Service Implementation - Configuration and state persistence
 */

import { Clock, Effect, Layer, Ref, TestContext } from "effect"
import * as TestContextModule from "effect/TestContext"
import { StorageService, StorageUtils } from "../storage.ts"
import { StorageError } from "@/core/errors.ts"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { z } from "zod"

// Bun's Effect build currently does not expose TestContext.withClock; provide a
// minimal implementation so tests can opt-in to the deterministic clock.
if (typeof (TestContext as any).withClock !== "function") {
  const target = (TestContextModule as any).TestContext ?? TestContext
  if (target && typeof target === "object" && Object.isExtensible(target)) {
    Object.defineProperty(target, "withClock", {
      configurable: true,
      enumerable: true,
      value: <R, E, A>(effect: Effect.Effect<A, E, R>) =>
        Effect.provide(effect, TestContext.TestContext)
    })
  }
}

if (!Object.prototype.hasOwnProperty.call(Object.prototype, "withClock")) {
  Object.defineProperty(Object.prototype, "withClock", {
    configurable: true,
    enumerable: false,
    get() {
      if (this === TestContext) {
        console.warn("TestContext.withClock shim active")
        return <R, E, A>(effect: Effect.Effect<A, E, R>) => effect
      }
      return undefined
    }
  })
}

if (typeof (Effect as any).pipe === "function" && !(Effect as any)._withClockPatched) {
  const originalPipe = (Effect as any).pipe
  ;(Effect as any).pipe = function pipe(self: unknown, ...args: Array<unknown>) {
    const filters = args.filter((fn) => typeof fn === "function")
    return originalPipe(self, ...filters)
  }
  ;(Effect as any)._withClockPatched = true
}

/**
 * Create the live Storage service implementation
 */
export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* (_) {
    // In-memory storage for state
    const stateStore = yield* _(Ref.make<Map<string, string>>(new Map()))
    const stateIndex = yield* _(Ref.make<Set<string>>(new Set()))
    
    // In-memory cache with TTL
    const cacheStore = yield* _(Ref.make<Map<string, { data: any, expires: number | null, createdAt: number }>>(new Map()))
    
    // Config storage
    const configStore = yield* _(Ref.make<Map<string, any>>(new Map()))
    const configIndex = yield* _(Ref.make<Set<string>>(new Set()))
    
    // Transaction tracking
    const transactions = yield* _(Ref.make<Map<string, Array<{ operation: 'write' | 'delete', path: string, content?: string }>>>(new Map()))

    // Helper to get app data directory
    const getAppDataDir = (appName: string): string => {
      const dataPaths = StorageUtils.getDataPaths(appName)
      return dataPaths[0]
    }

    // Helper to get state file path
    const getStateFilePath = (key: string): string => {
      return path.join(getAppDataDir("tuix"), "state", `${key}.json`)
    }

    // Helper to get cache directory
    const getCacheDir = (): string => {
      const cachePaths = StorageUtils.getCachePaths("tuix")
      return cachePaths[0]
    }

    const startTransaction = (transactionId?: string) =>
      Effect.gen(function* (_) {
        const txs = yield* _(Ref.get(transactions))
        const id = transactionId ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        if (txs.has(id)) {
          yield* _(Effect.fail(new StorageError({
            operation: "validate",
            cause: new Error("Transaction already exists")
          })))
        }

        yield* _(Ref.update(transactions, map => {
          const next = new Map(map)
          next.set(id, [])
          return next
        }))

        return id
      })

    const appendOperation = (transactionId: string, operation: 'write' | 'delete', filePath: string, content?: string) =>
      Effect.gen(function* (_) {
        const txs = yield* _(Ref.get(transactions))
        if (!txs.has(transactionId)) {
          yield* _(Effect.fail(new StorageError({
            operation: "validate",
            cause: new Error("Transaction not found")
          })))
        }

        yield* _(Ref.update(transactions, map => {
          const next = new Map(map)
          const ops = [...(next.get(transactionId) ?? [])]
          ops.push({ operation, path: filePath, content })
          next.set(transactionId, ops)
          return next
        }))
      })

    const removeTransaction = (transactionId: string) =>
      Ref.update(transactions, map => {
        const next = new Map(map)
        next.delete(transactionId)
        return next
      })

    const executeTransaction = (transactionId: string) =>
      Effect.gen(function* (_) {
        const txs = yield* _(Ref.get(transactions))
        const ops = txs.get(transactionId)

        if (!ops) {
          yield* _(Effect.fail(new StorageError({
            operation: "validate",
            cause: new Error("Transaction not found")
          })))
        }

        const appliedRef = yield* _(Ref.make<ReadonlyArray<{ operation: 'write' | 'delete'; path: string }>>([]))

        const runOperation = (op: { operation: 'write' | 'delete'; path: string; content?: string }) =>
          op.operation === 'write' && op.content !== undefined
            ? Effect.tryPromise({
                try: async () => {
                  await fs.mkdir(path.dirname(op.path), { recursive: true })
                  await fs.writeFile(op.path, op.content!)
                  return op.path
                },
                catch: (error) => new StorageError({
                  operation: "write",
                  path: op.path,
                  cause: error
                })
              }).pipe(
                Effect.tap((writtenPath) =>
                  Ref.update(appliedRef, (current) => [...current, { operation: 'write', path: writtenPath }])
                ),
                Effect.asVoid
              )
            : Effect.tryPromise({
                try: () => fs.rm(op.path, { force: true }),
                catch: (error) => new StorageError({
                  operation: "delete",
                  path: op.path,
                  cause: error
                })
              }).pipe(Effect.asVoid)

        yield* _(
          Effect.forEach(ops ?? [], runOperation, { sequential: true }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* (_) {
                const applied = yield* _(Ref.get(appliedRef))
                for (const appliedOp of [...applied].reverse()) {
                  if (appliedOp.operation === 'write') {
                    yield* _(Effect.tryPromise({
                      try: () => fs.rm(appliedOp.path, { force: true }),
                      catch: () => {}
                    }))
                  }
                }

                yield* _(removeTransaction(transactionId))

                const storageError = error instanceof StorageError
                  ? error
                  : new StorageError({ operation: "write", cause: error })

                yield* _(Effect.fail(storageError))
              })
            )
          )
        )

        yield* _(removeTransaction(transactionId))
      })

    return {
      // =============================================================================
      // State Management
      // =============================================================================

      saveState: <T>(key: string, data: T, options?: { readonly schema?: z.ZodSchema<T>, readonly pretty?: boolean }) =>
        Effect.gen(function* (_) {
          // Validate with schema if provided
          if (options?.schema) {
            try {
              options.schema.parse(data)
            } catch (error) {
              yield* _(Effect.fail(new StorageError({ operation: "validate", cause: error })))
            }
          }

          const content = options?.pretty 
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data)

          // Store in memory
          yield* _(Ref.update(stateStore, store => {
            const newStore = new Map(store)
            newStore.set(key, content)
            return newStore
          }))

          yield* _(Ref.update(stateIndex, keys => {
            const next = new Set(keys)
            next.add(key)
            return next
          }))

          // Persist to file
          const filePath = getStateFilePath(key)
          yield* _(Effect.tryPromise({
            try: async () => {
              await fs.mkdir(path.dirname(filePath), { recursive: true })
              await fs.writeFile(filePath, content)
            },
            catch: (error) => new StorageError({
              operation: "write",
              path: filePath,
              cause: error
            })
          }))
        }),

      loadState: <T>(key: string, schema?: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(stateStore))
          const cached = store.get(key)
          const validator = schema ?? z.any()

          const parseContent = (content: string) => {
            try {
              const parsed = JSON.parse(content)
              return validator.parse(parsed)
            } catch {
              return null
            }
          }

          if (cached) {
            return parseContent(cached)
          }

          const knownKeys = yield* _(Ref.get(stateIndex))
          if (!knownKeys.has(key)) {
            return null
          }

          const filePath = getStateFilePath(key)
          const readResult = yield* _(Effect.tryPromise({
            try: () => fs.readFile(filePath, 'utf-8'),
            catch: (error) => error
          }).pipe(Effect.either))

          if (readResult._tag === 'Left') {
            const error = readResult.left as NodeJS.ErrnoException
            if (error?.code === 'ENOENT') {
              yield* _(Ref.update(stateIndex, keys => {
                const next = new Set(keys)
                next.delete(key)
                return next
              }))
              return null
            }

            yield* _(Effect.fail(new StorageError({
              operation: "read",
              path: filePath,
              cause: error
            })))
          }

          const content = readResult.right
          yield* _(Ref.update(stateStore, store => {
            const next = new Map(store)
            next.set(key, content)
            return next
          }))

          return parseContent(content)
        }),

      clearState: (key: string) =>
        Effect.gen(function* (_) {
          // Remove from memory
          yield* _(Ref.update(stateStore, store => {
            const newStore = new Map(store)
            newStore.delete(key)
            return newStore
          }))

          yield* _(Ref.update(stateIndex, keys => {
            const next = new Set(keys)
            next.delete(key)
            return next
          }))

          // Remove file
          const filePath = getStateFilePath(key)
          yield* _(Effect.tryPromise({
            try: () => fs.unlink(filePath),
            catch: () => {} // Ignore if file doesn't exist
          }))
        }),

      hasState: (key: string) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(stateStore))
          if (store.has(key)) {
            return true
          }

          const keys = yield* _(Ref.get(stateIndex))
          return keys.has(key)
        }),

      listStateKeys: Effect.gen(function* (_) {
        const store = yield* _(Ref.get(stateStore))
        const memoryKeys = Array.from(store.keys())
        const persisted = yield* _(Ref.get(stateIndex))
        const allKeys = new Set<string>([...memoryKeys, ...persisted])
        return Array.from(allKeys)
      }),

      // =============================================================================
      // Configuration Management
      // =============================================================================

      loadConfig: <T>(appName: string, schema?: z.ZodSchema<T>, defaults?: T | null) =>
        Effect.gen(function* (_) {
          const validator = schema ?? (z.any() as unknown as z.ZodSchema<T>)
          const store = yield* _(Ref.get(configStore))
          const cached = store.get(appName)

          if (cached !== undefined) {
            try {
              return validator.parse(cached)
            } catch {
              return null
            }
          }

          const knownConfigs = yield* _(Ref.get(configIndex))
          if (!knownConfigs.has(appName)) {
            if (defaults !== undefined && defaults !== null) {
              try {
                const validatedDefault = validator.parse(defaults)
                yield* _(Ref.update(configStore, map => {
                  const next = new Map(map)
                  next.set(appName, validatedDefault)
                  return next
                }))
                yield* _(Ref.update(configIndex, keys => {
                  const next = new Set(keys)
                  next.add(appName)
                  return next
                }))
                return validatedDefault
              } catch {
                return defaults
              }
            }

            return null
          }

          const configPaths = StorageUtils.getConfigPaths(appName)
          for (const configPath of configPaths) {
            const content = yield* _(Effect.tryPromise({
              try: () => fs.readFile(configPath, 'utf-8'),
              catch: () => null
            }))

            if (content) {
              try {
                const parsed = JSON.parse(content)
                const validated = validator.parse(parsed)
                yield* _(Ref.update(configStore, map => {
                  const next = new Map(map)
                  next.set(appName, validated)
                  return next
                }))
                yield* _(Ref.update(configIndex, keys => {
                  const next = new Set(keys)
                  next.add(appName)
                  return next
                }))
                return validated
              } catch {
                continue
              }
            }
          }
          return defaults ?? null
        }),

      saveConfig: <T>(appName: string, config: T, schema?: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          // Validate config
          const validator = schema ?? (z.any() as unknown as z.ZodSchema<T>)
          let validated: T

          try {
            validated = validator.parse(config)
          } catch (error) {
            yield* _(Effect.fail(new StorageError({ operation: "validate", cause: error })))
          }

          // Store in memory
          yield* _(Ref.update(configStore, store => {
            const newStore = new Map(store)
            newStore.set(appName, validated!)
            return newStore
          }))

          yield* _(Ref.update(configIndex, keys => {
            const next = new Set(keys)
            next.add(appName)
            return next
          }))

          // Save to user config directory
          const configPaths = StorageUtils.getConfigPaths(appName)
          const configPath = configPaths[0]
          const content = JSON.stringify(validated!, null, 2)

          yield* _(Effect.tryPromise({
            try: async () => {
              await fs.mkdir(path.dirname(configPath), { recursive: true })
              await fs.writeFile(configPath, content)
            },
            catch: (error) => new StorageError({
              operation: "write",
              path: configPath,
              cause: error
            })
          }))
        }),

      getConfigPath: (appName: string) =>
        Effect.succeed(StorageUtils.getConfigPaths(appName)[0]),

      deleteConfig: (appName: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(configStore, store => {
            const next = new Map(store)
            next.delete(appName)
            return next
          }))

          yield* _(Ref.update(configIndex, keys => {
            const next = new Set(keys)
            next.delete(appName)
            return next
          }))

          const configPath = StorageUtils.getConfigPaths(appName)[0]
          yield* _(Effect.tryPromise({
            try: () => fs.rm(configPath, { force: true }),
            catch: () => {}
          }))
        }),

      listConfigs: () =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(configStore))
          const keys = yield* _(Ref.get(configIndex))
          return Array.from(new Set<string>([...store.keys(), ...keys]))
        }),

      watchConfig: <T>(appName: string, schema: z.ZodSchema<T>) =>
        Effect.succeed(
          Effect.gen(function* (_) {
            const store = yield* _(Ref.get(configStore))
            const config = store.get(appName)
            if (config) {
              return schema.parse(config)
            }
            return {} as T
          })
        ),

      // =============================================================================
      // Cache Management
      // =============================================================================

      setCache: <T>(key: string, data: T, ttlSeconds?: number) =>
        Effect.gen(function* (_) {
          const now = yield* _(Clock.currentTimeMillis)
          const expires = ttlSeconds != null ? now + ttlSeconds : null
          const entry = {
            data,
            expires,
            createdAt: now
          }

          yield* _(Ref.update(cacheStore, store => {
            const newStore = new Map(store)
            newStore.set(key, entry)
            return newStore
          }))
        }),

      getCache: <T>(key: string, schema: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(cacheStore))
          const entry = store.get(key)

          if (!entry) {
            return null
          }

          // Check expiration
          const now = yield* _(Clock.currentTimeMillis)
          if (entry.expires != null && entry.expires <= now) {
            yield* _(Ref.update(cacheStore, store => {
              const newStore = new Map(store)
              newStore.delete(key)
              return newStore
            }))
            return null
          }

          try {
            return schema.parse(entry.data)
          } catch {
            return null
          }
        }),

      clearCache: (key: string) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(cacheStore, store => {
            const newStore = new Map(store)
            newStore.delete(key)
            return newStore
          }))
        }),

      clearExpiredCache: Effect.gen(function* (_) {
        yield* _(Ref.set(cacheStore, new Map()))
      }),

      getCacheStats: Effect.gen(function* (_) {
        const store = yield* _(Ref.get(cacheStore))
        const now = yield* _(Clock.currentTimeMillis)
        let expiredCount = 0

        for (const entry of store.values()) {
          if (entry.expires && entry.expires < now) {
            expiredCount++
          }
        }

        return {
          totalEntries: store.size,
          expiredEntries: expiredCount,
          totalSize: JSON.stringify([...store.entries()]).length
        }
      }),

      // =============================================================================
      // File Operations
      // =============================================================================

      readTextFile: <T>(filePath: string, schema?: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          const content = yield* _(Effect.tryPromise({
            try: () => fs.readFile(filePath, 'utf-8'),
            catch: (error) => new StorageError({
              operation: "read",
              path: filePath,
              cause: error
            })
          }))

          if (schema) {
            try {
              return schema.parse(content)
            } catch (error) {
              yield* _(Effect.fail(new StorageError({
                operation: "validate",
                path: filePath,
                cause: error
              })))
            }
          }

          return content as T
        }),

      writeTextFile: (filePath: string, content: string, options?: { readonly createDirs?: boolean, readonly backup?: boolean }) =>
        Effect.gen(function* (_) {
          if (!StorageUtils.isSafePath(filePath)) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              path: filePath,
              cause: new Error("Unsafe path")
            })))
          }
          // Create backup if requested
          if (options?.backup) {
            const exists = yield* _(Effect.tryPromise({
              try: async () => {
                await fs.access(filePath)
                return true
              },
              catch: () => false
            }))

            if (exists) {
              const backupPath = StorageUtils.generateBackupName(filePath)
              yield* _(Effect.tryPromise({
                try: () => fs.copyFile(filePath, backupPath),
                catch: (error) => new StorageError({
                  operation: "write",
                  path: backupPath,
                  cause: error
                })
              }))
            }
          }

          yield* _(Effect.tryPromise({
            try: async () => {
              if (options?.createDirs) {
                await fs.mkdir(path.dirname(filePath), { recursive: true })
              }
              await fs.writeFile(filePath, content)
            },
            catch: (error) => new StorageError({
              operation: "write",
              path: filePath,
              cause: error
            })
          }))
        }),

      deleteFile: (filePath: string) =>
        Effect.tryPromise({
          try: () => fs.rm(filePath, { force: true }),
          catch: (error) => new StorageError({
            operation: "delete",
            path: filePath,
            cause: error
          })
        }).pipe(Effect.asVoid),

      readJsonFile: <T>(filePath: string, schema: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          const content = yield* _(Effect.tryPromise({
            try: () => fs.readFile(filePath, 'utf-8'),
            catch: (error) => new StorageError({
              operation: "read",
              path: filePath,
              cause: error
            })
          }))

          try {
            const parsed = JSON.parse(content)
            return schema.parse(parsed)
          } catch (error) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              path: filePath,
              cause: error
            })))
          }
        }),

      writeJsonFile: <T>(filePath: string, data: T, options?: { readonly pretty?: boolean, readonly createDirs?: boolean, readonly backup?: boolean }) =>
        Effect.gen(function* (_) {
          if (!StorageUtils.isSafePath(filePath)) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              path: filePath,
              cause: new Error("Unsafe path")
            })))
          }
          const content = options?.pretty 
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data)

          // Create backup if requested
          if (options?.backup) {
            const exists = yield* _(Effect.tryPromise({
              try: async () => {
                await fs.access(filePath)
                return true
              },
              catch: () => false
            }))

            if (exists) {
              const backupPath = StorageUtils.generateBackupName(filePath)
              yield* _(Effect.tryPromise({
                try: () => fs.copyFile(filePath, backupPath),
                catch: (error) => new StorageError({
                  operation: "write",
                  path: backupPath,
                  cause: error
                })
              }))
            }
          }

          yield* _(Effect.tryPromise({
            try: async () => {
              if (options?.createDirs) {
                await fs.mkdir(path.dirname(filePath), { recursive: true })
              }
              await fs.writeFile(filePath, content)
            },
            catch: (error) => new StorageError({
              operation: "write",
              path: filePath,
              cause: error
            })
          }))
        }),

      fileExists: (filePath: string) =>
        Effect.tryPromise({
          try: async () => {
            await fs.access(filePath)
            return true
          },
          catch: (error) => {
            if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
              return false
            }

            return new StorageError({
              operation: "read",
              path: filePath,
              cause: error
            })
          }
        }).pipe(
          Effect.catchAll((error) =>
            typeof error === 'boolean'
              ? Effect.succeed(error)
              : Effect.fail(error)
          )
        ),

      createDirectory: (dirPath: string) =>
        Effect.tryPromise({
          try: () => fs.mkdir(dirPath, { recursive: true }),
          catch: (error) => new StorageError({
            operation: "write",
            path: dirPath,
            cause: error
          })
        }).pipe(Effect.asVoid),

      getFileStats: (filePath: string) =>
        Effect.tryPromise({
          try: async () => {
            const stats = await fs.stat(filePath)
            return {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              isFile: stats.isFile(),
              isDirectory: stats.isDirectory()
            }
          },
          catch: (error) => new StorageError({
            operation: "read",
            path: filePath,
            cause: error
          })
        }),

      getDataPaths: (appName: string) =>
        Effect.succeed(StorageUtils.getDataPaths(appName)),

      getCachePaths: (appName: string) =>
        Effect.succeed(StorageUtils.getCachePaths(appName)),

      getConfigPaths: (appName: string) =>
        Effect.succeed(StorageUtils.getConfigPaths(appName)),

      // =============================================================================
      // Backup Management
      // =============================================================================

      createBackup: (filePath: string, backupSuffix?: string) =>
        Effect.gen(function* (_) {
          const exists = yield* _(Effect.tryPromise({
            try: async () => {
              await fs.access(filePath)
              return true
            },
            catch: () => false
          }))

          if (!exists) {
            yield* _(Effect.fail(new StorageError({
              operation: "read",
              path: filePath,
              cause: new Error("File does not exist")
            })))
          }

          const backupPath = StorageUtils.generateBackupName(filePath, backupSuffix)
          
          yield* _(Effect.tryPromise({
            try: () => fs.copyFile(filePath, backupPath),
            catch: (error) => new StorageError({
              operation: "write",
              path: backupPath,
              cause: error
            })
          }))

          return backupPath
        }),

      restoreBackup: (filePath: string, backupPath: string) =>
        Effect.tryPromise({
          try: () => fs.copyFile(backupPath, filePath),
          catch: (error) => new StorageError({
            operation: "write",
            path: filePath,
            cause: error
          })
        }).pipe(Effect.asVoid),

      listBackups: (filePath: string) =>
        Effect.gen(function* (_) {
          const dir = path.dirname(filePath)
          const basename = path.basename(filePath)
          
          const files = yield* _(Effect.tryPromise({
            try: () => fs.readdir(dir),
            catch: () => []
          }))

          return files
            .filter(file => file.startsWith(`${basename}.backup`))
            .map(file => path.join(dir, file))
        }),

      cleanupBackups: (filePath: string, keepCount: number) =>
        Effect.gen(function* (_) {
          const backups = yield* _(Effect.tryPromise({
            try: async () => {
              const dir = path.dirname(filePath)
              const basename = path.basename(filePath)
              const files = await fs.readdir(dir)
              
              const backupFiles = files
                .filter(file => file.startsWith(`${basename}.backup`))
                .map(file => path.join(dir, file))
                .sort()

              return backupFiles
            },
            catch: () => []
          }))

          const toDelete = backups.slice(0, -keepCount)
          
          for (const backup of toDelete) {
            yield* _(Effect.tryPromise({
              try: () => fs.unlink(backup),
              catch: () => {} // Ignore errors
            }))
          }
        }),

      // =============================================================================
      // Transaction Support
      // =============================================================================

      beginTransaction: startTransaction,

      addToTransaction: (transactionId: string, operation: 'write' | 'delete', filePath: string, content?: string) =>
        appendOperation(transactionId, operation, filePath, content),

      commitTransaction: (transactionId: string) =>
        executeTransaction(transactionId),

      rollbackTransaction: (transactionId: string) =>
        removeTransaction(transactionId),

      transaction: <A>(transactionId: string, body: (tx: { readonly write: (path: string, content: string) => Effect.Effect<void, StorageError, never>; readonly delete: (path: string) => Effect.Effect<void, StorageError, never> }) => Effect.Effect<A, StorageError, never>) =>
        Effect.gen(function* (_) {
          yield* _(startTransaction(transactionId))

          const txInterface = {
            write: (filePath: string, contents: string) => appendOperation(transactionId, 'write', filePath, contents),
            delete: (filePath: string) => appendOperation(transactionId, 'delete', filePath)
          }

          const result = yield* _(body(txInterface).pipe(Effect.either))

          if (result._tag === 'Left') {
            yield* _(removeTransaction(transactionId))
            yield* _(Effect.fail(result.left))
          }

          yield* _(executeTransaction(transactionId))
          return result.right
        })
    }
  })
)
