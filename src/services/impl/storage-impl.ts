/**
 * Storage Service Implementation - Configuration and state persistence
 */

import { Effect, Layer, Ref } from "effect"
import { StorageService } from "../storage.ts"
import { StorageError } from "@/core/errors.ts"
import * as fs from "node:fs/promises"
import * as path from "node:path"

/**
 * Create the live Storage service implementation
 */
export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* (_) {
    // In-memory storage for quick access
    const memoryStore = yield* _(Ref.make<Map<string, any>>(new Map()))
    
    // Transaction tracking
    const transactions = yield* _(Ref.make<Map<string, Map<string, any>>>(new Map()))
    
    return {
      get: <T>(key: string, defaultValue?: T) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(memoryStore))
          const value = store.get(key)
          return value !== undefined ? value : defaultValue
        }),
      
      set: <T>(key: string, value: T) =>
        Ref.update(memoryStore, store => {
          const newStore = new Map(store)
          newStore.set(key, value)
          return newStore
        }),
      
      delete: (key: string) =>
        Ref.update(memoryStore, store => {
          const newStore = new Map(store)
          newStore.delete(key)
          return newStore
        }),
      
      clear: Ref.set(memoryStore, new Map()),
      
      has: (key: string) =>
        Effect.map(Ref.get(memoryStore), store => store.has(key)),
      
      keys: Effect.map(Ref.get(memoryStore), store => Array.from(store.keys())),
      
      values: Effect.map(Ref.get(memoryStore), store => Array.from(store.values())),
      
      entries: Effect.map(Ref.get(memoryStore), store => Array.from(store.entries())),
      
      size: Effect.map(Ref.get(memoryStore), store => store.size),
      
      subscribe: <T>(key: string, callback: (value: T | undefined) => void) =>
        Effect.sync(() => {
          // Simple subscription - in real implementation would use event emitter
          return () => {} // Unsubscribe function
        }),
      
      batch: (operations) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(memoryStore, store => {
            const newStore = new Map(store)
            for (const op of operations) {
              switch (op.type) {
                case 'set':
                  newStore.set(op.key, op.value)
                  break
                case 'delete':
                  newStore.delete(op.key)
                  break
              }
            }
            return newStore
          }))
        }),
      
      loadFromFile: (filePath) =>
        Effect.tryPromise({
          try: async () => {
            const content = await fs.readFile(filePath, 'utf-8')
            const data = JSON.parse(content)
            return data
          },
          catch: (error) => new StorageError({
            operation: 'read',
            path: filePath,
            cause: error
          })
        }).pipe(
          Effect.tap(data =>
            Ref.set(memoryStore, new Map(Object.entries(data)))
          )
        ),
      
      saveToFile: (filePath) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(memoryStore))
          const data = Object.fromEntries(store)
          
          yield* _(Effect.tryPromise({
            try: async () => {
              const dir = path.dirname(filePath)
              await fs.mkdir(dir, { recursive: true })
              await fs.writeFile(filePath, JSON.stringify(data, null, 2))
            },
            catch: (error) => new StorageError({
              operation: 'write',
              path: filePath,
              cause: error
            })
          }))
        }),
      
      merge: (other) =>
        Ref.update(memoryStore, store => {
          const newStore = new Map(store)
          for (const [key, value] of Object.entries(other)) {
            newStore.set(key, value)
          }
          return newStore
        }),
      
      namespace: (prefix) => ({
        get: <T>(key: string, defaultValue?: T) =>
          Effect.gen(function* (_) {
            const store = yield* _(Ref.get(memoryStore))
            const value = store.get(`${prefix}:${key}`)
            return value !== undefined ? value : defaultValue
          }),
        
        set: <T>(key: string, value: T) =>
          Ref.update(memoryStore, store => {
            const newStore = new Map(store)
            newStore.set(`${prefix}:${key}`, value)
            return newStore
          }),
        
        delete: (key: string) =>
          Ref.update(memoryStore, store => {
            const newStore = new Map(store)
            newStore.delete(`${prefix}:${key}`)
            return newStore
          }),
        
        clear: Effect.gen(function* (_) {
          yield* _(Ref.update(memoryStore, store => {
            const newStore = new Map(store)
            for (const key of newStore.keys()) {
              if (key.startsWith(`${prefix}:`)) {
                newStore.delete(key)
              }
            }
            return newStore
          }))
        })
      }),
      
      startTransaction: (transactionId) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(memoryStore))
          yield* _(Ref.update(transactions, txns => {
            const newTxns = new Map(txns)
            newTxns.set(transactionId, new Map(store))
            return newTxns
          }))
        }),
      
      commitTransaction: (transactionId) =>
        Ref.update(transactions, txns => {
          const newTxns = new Map(txns)
          newTxns.delete(transactionId)
          return newTxns
        }),
      
      rollbackTransaction: (transactionId) =>
        Effect.gen(function* (_) {
          const txns = yield* _(Ref.get(transactions))
          const snapshot = txns.get(transactionId)
          if (snapshot) {
            yield* _(Ref.set(memoryStore, snapshot))
            yield* _(Ref.update(transactions, t => {
              const newT = new Map(t)
              newT.delete(transactionId)
              return newT
            }))
          }
        }),
      
      getConfig: <T>(path: string, schema?: any) =>
        Effect.gen(function* (_) {
          const store = yield* _(Ref.get(memoryStore))
          const value = store.get(`config:${path}`)
          
          if (schema && value !== undefined) {
            // Simple validation - in real impl would use proper schema
            return value as T
          }
          
          return value
        }),
      
      setConfig: <T>(path: string, value: T) =>
        Ref.update(memoryStore, store => {
          const newStore = new Map(store)
          newStore.set(`config:${path}`, value)
          return newStore
        }),
      
      fileExists: (path: string) =>
        Effect.tryPromise({
          try: async () => {
            await fs.access(path)
            return true
          },
          catch: () => false
        }),
      
      createDirectory: (path: string) =>
        Effect.tryPromise({
          try: () => fs.mkdir(path, { recursive: true }),
          catch: (error) => new StorageError({
            operation: 'write',
            path,
            cause: error
          })
        }).pipe(Effect.void),
      
      removeFile: (path: string) =>
        Effect.tryPromise({
          try: () => fs.unlink(path),
          catch: (error) => new StorageError({
            operation: 'delete',
            path,
            cause: error
          })
        }).pipe(Effect.void),
      
      removeDirectory: (path: string) =>
        Effect.tryPromise({
          try: () => fs.rmdir(path, { recursive: true }),
          catch: (error) => new StorageError({
            operation: 'delete',
            path,
            cause: error
          })
        }).pipe(Effect.void),
      
      listFiles: (dirPath: string) =>
        Effect.tryPromise({
          try: () => fs.readdir(dirPath),
          catch: (error) => new StorageError({
            operation: 'read',
            path: dirPath,
            cause: error
          })
        }),
      
      readTextFile: <T>(_path: string, _schema?: any) =>
        Effect.tryPromise({
          try: async () => {
            const content = await fs.readFile(_path, 'utf-8')
            return content as T
          },
          catch: (error) => new StorageError({
            operation: 'read',
            path: _path,
            cause: error
          })
        }),
      
      writeTextFile: (_path: string, content: string, options) =>
        Effect.tryPromise({
          try: async () => {
            if (options?.createDirs) {
              await fs.mkdir(path.dirname(_path), { recursive: true })
            }
            await fs.writeFile(_path, content, 'utf-8')
          },
          catch: (error) => new StorageError({
            operation: 'write',
            path: _path,
            cause: error
          })
        }).pipe(Effect.void),
      
      readJsonFile: <T>(_path: string, _schema?: any) =>
        Effect.tryPromise({
          try: async () => {
            const content = await fs.readFile(_path, 'utf-8')
            return JSON.parse(content) as T
          },
          catch: (error) => new StorageError({
            operation: 'read',
            path: _path,
            cause: error
          })
        }),
      
      writeJsonFile: <T>(_path: string, data: T, options) =>
        Effect.tryPromise({
          try: async () => {
            const content = options?.pretty 
              ? JSON.stringify(data, null, 2)
              : JSON.stringify(data)
            await fs.writeFile(_path, content, 'utf-8')
          },
          catch: (error) => new StorageError({
            operation: 'write',
            path: _path,
            cause: error
          })
        }).pipe(Effect.void),
    }
  })
)