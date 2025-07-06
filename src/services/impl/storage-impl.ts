/**
 * Storage Service Implementation - Configuration and state persistence
 */

import { Effect, Layer, Ref } from "effect"
import { StorageService, StorageUtils } from "../storage.ts"
import { StorageError } from "@/core/errors.ts"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { z } from "zod"

/**
 * Create the live Storage service implementation
 */
export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* (_) {
    // In-memory storage for state
    const stateStore = yield* _(Ref.make<Map<string, string>>(new Map()))
    
    // In-memory cache with TTL
    const cacheStore = yield* _(Ref.make<Map<string, { data: any, expires: number | null, createdAt: number }>>(new Map()))
    
    // Config storage
    const configStore = yield* _(Ref.make<Map<string, any>>(new Map()))
    
    // Transaction tracking
    const transactions = yield* _(Ref.make<Map<string, Array<{ operation: 'write' | 'delete', path: string, content?: string }>>>(new Map()))

    // Helper to get app data directory
    const getAppDataDir = (appName: string): string => {
      const dataPaths = StorageUtils.getDataPaths(appName)
      return dataPaths[0]
    }

    // Helper to get state file path
    const getStateFilePath = (key: string): string => {
      return path.join(getAppDataDir("cli-kit"), "state", `${key}.json`)
    }

    // Helper to get cache directory
    const getCacheDir = (): string => {
      const cachePaths = StorageUtils.getCachePaths("cli-kit")
      return cachePaths[0]
    }

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

      loadState: <T>(key: string, schema: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          // Try memory first
          const store = yield* _(Ref.get(stateStore))
          let content = store.get(key)

          // If not in memory, try file
          if (!content) {
            const filePath = getStateFilePath(key)
            const exists = yield* _(Effect.tryPromise({
              try: async () => {
                await fs.access(filePath)
                return true
              },
              catch: () => false
            }))

            if (!exists) {
              return null
            }

            content = yield* _(Effect.tryPromise({
              try: () => fs.readFile(filePath, 'utf-8'),
              catch: (error) => new StorageError({
                operation: "read",
                path: filePath,
                cause: error
              })
            }))

            // Store in memory for next time
            yield* _(Ref.update(stateStore, store => {
              const newStore = new Map(store)
              newStore.set(key, content!)
              return newStore
            }))
          }

          try {
            const parsed = JSON.parse(content)
            return schema.parse(parsed)
          } catch {
            return null
          }
        }),

      clearState: (key: string) =>
        Effect.gen(function* (_) {
          // Remove from memory
          yield* _(Ref.update(stateStore, store => {
            const newStore = new Map(store)
            newStore.delete(key)
            return newStore
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

          // Check file system
          const filePath = getStateFilePath(key)
          return yield* _(Effect.tryPromise({
            try: async () => {
              await fs.access(filePath)
              return true
            },
            catch: () => false
          }))
        }),

      listStateKeys: Effect.gen(function* (_) {
        const store = yield* _(Ref.get(stateStore))
        const memoryKeys = Array.from(store.keys())

        // Also check file system
        const stateDir = path.join(getAppDataDir("cli-kit"), "state")
        const fileKeys = yield* _(Effect.tryPromise({
          try: async () => {
            try {
              const files = await fs.readdir(stateDir)
              return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.slice(0, -5)) // Remove .json extension
            } catch {
              return []
            }
          },
          catch: () => []
        }))

        // Combine and deduplicate
        const allKeys = [...new Set([...memoryKeys, ...fileKeys])]
        return allKeys
      }),

      // =============================================================================
      // Configuration Management
      // =============================================================================

      loadConfig: <T>(appName: string, schema: z.ZodSchema<T>, defaults: T) =>
        Effect.gen(function* (_) {
          const configPaths = StorageUtils.getConfigPaths(appName)

          for (const configPath of configPaths) {
            const exists = yield* _(Effect.tryPromise({
              try: async () => {
                await fs.access(configPath)
                return true
              },
              catch: () => false
            }))

            if (exists) {
              const content = yield* _(Effect.tryPromise({
                try: () => fs.readFile(configPath, 'utf-8'),
                catch: () => null
              }))

              if (content) {
                try {
                  const parsed = JSON.parse(content)
                  const validated = schema.parse(parsed)
                  
                  // Store in memory
                  yield* _(Ref.update(configStore, store => {
                    const newStore = new Map(store)
                    newStore.set(appName, validated)
                    return newStore
                  }))

                  return validated
                } catch {
                  // Continue to next path or defaults
                }
              }
            }
          }

          // Store defaults in memory
          yield* _(Ref.update(configStore, store => {
            const newStore = new Map(store)
            newStore.set(appName, defaults)
            return newStore
          }))

          return defaults
        }),

      saveConfig: <T>(appName: string, config: T, schema: z.ZodSchema<T>) =>
        Effect.gen(function* (_) {
          // Validate config
          try {
            const validated = schema.parse(config)
            
            // Store in memory
            yield* _(Ref.update(configStore, store => {
              const newStore = new Map(store)
              newStore.set(appName, validated)
              return newStore
            }))

            // Save to user config directory
            const configPaths = StorageUtils.getConfigPaths(appName)
            const configPath = configPaths[0] // Use first (user) path
            const content = JSON.stringify(validated, null, 2)

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
          } catch (error) {
            yield* _(Effect.fail(new StorageError({ operation: "validate", cause: error })))
          }
        }),

      getConfigPath: (appName: string) =>
        Effect.succeed(StorageUtils.getConfigPaths(appName)[0]),

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
          const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
          const entry = {
            data,
            expires,
            createdAt: Date.now()
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
          if (entry.expires && entry.expires < Date.now()) {
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
        const now = Date.now()
        yield* _(Ref.update(cacheStore, store => {
          const newStore = new Map(store)
          for (const [key, entry] of newStore.entries()) {
            if (entry.expires && entry.expires < now) {
              newStore.delete(key)
            }
          }
          return newStore
        }))
      }),

      getCacheStats: Effect.gen(function* (_) {
        const store = yield* _(Ref.get(cacheStore))
        const now = Date.now()
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
          catch: () => false
        }),

      createDirectory: (dirPath: string) =>
        Effect.tryPromise({
          try: () => fs.mkdir(dirPath, { recursive: true }),
          catch: (error) => new StorageError({
            operation: "write",
            path: dirPath,
            cause: error
          })
        }).pipe(Effect.void),

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
        }).pipe(Effect.void),

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

      beginTransaction: Effect.gen(function* (_) {
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        yield* _(Ref.update(transactions, txs => {
          const newTxs = new Map(txs)
          newTxs.set(txId, [])
          return newTxs
        }))
        return txId
      }),

      addToTransaction: (transactionId: string, operation: 'write' | 'delete', filePath: string, content?: string) =>
        Effect.gen(function* (_) {
          const txs = yield* _(Ref.get(transactions))
          const tx = txs.get(transactionId)
          
          if (!tx) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              cause: new Error("Transaction not found")
            })))
          }

          yield* _(Ref.update(transactions, txs => {
            const newTxs = new Map(txs)
            const ops = [...(newTxs.get(transactionId) || [])]
            ops.push({ operation, path: filePath, content })
            newTxs.set(transactionId, ops)
            return newTxs
          }))
        }),

      commitTransaction: (transactionId: string) =>
        Effect.gen(function* (_) {
          const txs = yield* _(Ref.get(transactions))
          const tx = txs.get(transactionId)
          
          if (!tx) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              cause: new Error("Transaction not found")
            })))
          }

          // Execute all operations
          for (const op of tx) {
            if (op.operation === 'write' && op.content !== undefined) {
              yield* _(Effect.tryPromise({
                try: async () => {
                  await fs.mkdir(path.dirname(op.path), { recursive: true })
                  await fs.writeFile(op.path, op.content!)
                },
                catch: (error) => new StorageError({
                  operation: "write",
                  path: op.path,
                  cause: error
                })
              }))
            } else if (op.operation === 'delete') {
              yield* _(Effect.tryPromise({
                try: () => fs.unlink(op.path),
                catch: () => {} // Ignore if file doesn't exist
              }))
            }
          }

          // Clean up transaction
          yield* _(Ref.update(transactions, txs => {
            const newTxs = new Map(txs)
            newTxs.delete(transactionId)
            return newTxs
          }))
        }),

      rollbackTransaction: (transactionId: string) =>
        Effect.gen(function* (_) {
          const txs = yield* _(Ref.get(transactions))
          
          if (!txs.has(transactionId)) {
            yield* _(Effect.fail(new StorageError({
              operation: "validate",
              cause: new Error("Transaction not found")
            })))
          }

          yield* _(Ref.update(transactions, txs => {
            const newTxs = new Map(txs)
            newTxs.delete(transactionId)
            return newTxs
          }))
        })
    }
  })
)