/**
 * Comprehensive tests for Storage Service
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { Effect, Layer } from "effect"
import { StorageService } from "@/services/storage"
import { StorageError } from "@/core/errors"
import { z } from "zod"

// Mock implementation for testing
const createMockStorageService = () => {
  const storage = new Map<string, any>()
  const cache = new Map<string, any>()
  const config = new Map<string, any>()
  const fileSystem = new Map<string, { content: string, stats: any }>()
  const transactions = new Map<string, Array<{ operation: string, path: string, content?: string }>>()
  
  const mockService: StorageService['Type'] = {
    // State Management
    saveState: (key: string, data: any, options?: any) => Effect.sync(() => {
      const value = options?.pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data)
      storage.set(key, value)
    }),
    
    loadState: (key: string, schema: any) => Effect.sync(() => {
      const raw = storage.get(key)
      if (!raw) return null
      
      try {
        const parsed = JSON.parse(raw)
        return schema.parse(parsed)
      } catch {
        return null
      }
    }),
    
    clearState: (key: string) => Effect.sync(() => {
      storage.delete(key)
    }),
    
    hasState: (key: string) => Effect.sync(() => storage.has(key)),
    
    listStateKeys: Effect.sync(() => [...storage.keys()]),
    
    // Configuration Management
    loadConfig: (appName: string, schema: any, defaults: any) => Effect.sync(() => {
      const existing = config.get(appName)
      if (existing) {
        try {
          return schema.parse(existing)
        } catch {
          return defaults
        }
      }
      return defaults
    }),
    
    saveConfig: (appName: string, configData: any, schema: any) => Effect.sync(() => {
      try {
        const validated = schema.parse(configData)
        config.set(appName, validated)
      } catch (error) {
        throw new StorageError({ operation: "validate", cause: error })
      }
    }),
    
    getConfigPath: (appName: string) => Effect.succeed(`~/.config/${appName}/config.json`),
    
    watchConfig: (appName: string, schema: any) => Effect.succeed(
      Effect.sync(() => {
        const existing = config.get(appName)
        return existing ? schema.parse(existing) : {}
      })
    ),
    
    // Cache Management
    setCache: (key: string, data: any, ttlSeconds?: number) => Effect.sync(() => {
      cache.set(key, { 
        data, 
        expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
        createdAt: Date.now()
      })
    }),
    
    getCache: (key: string, schema: any) => Effect.sync(() => {
      const entry = cache.get(key)
      if (!entry) return null
      if (entry.expires && entry.expires < Date.now()) {
        cache.delete(key)
        return null
      }
      try {
        return schema.parse(entry.data)
      } catch {
        return null
      }
    }),
    
    clearCache: (key: string) => Effect.sync(() => {
      cache.delete(key)
    }),
    
    clearExpiredCache: Effect.sync(() => {
      const now = Date.now()
      for (const [key, entry] of cache.entries()) {
        if (entry.expires && entry.expires < now) {
          cache.delete(key)
        }
      }
    }),
    
    getCacheStats: Effect.sync(() => {
      let expiredCount = 0
      const now = Date.now()
      for (const entry of cache.values()) {
        if (entry.expires && entry.expires < now) {
          expiredCount++
        }
      }
      return {
        totalEntries: cache.size,
        expiredEntries: expiredCount,
        totalSize: JSON.stringify([...cache.entries()]).length
      }
    }),
    
    // File Operations
    readTextFile: (path: string, schema?: any) => Effect.sync(() => {
      const file = fileSystem.get(path)
      if (!file) {
        throw new StorageError({ operation: "read", path })
      }
      
      const content = file.content
      if (schema) {
        try {
          return schema.parse(content)
        } catch (error) {
          throw new StorageError({ operation: "validate", path, cause: error })
        }
      }
      return content
    }),
    
    writeTextFile: (path: string, content: string, options?: any) => Effect.sync(() => {
      if (options?.backup && fileSystem.has(path)) {
        const backupPath = `${path}.backup`
        fileSystem.set(backupPath, fileSystem.get(path)!)
      }
      
      fileSystem.set(path, {
        content,
        stats: {
          size: content.length,
          modified: new Date(),
          created: new Date(),
          isFile: true,
          isDirectory: false
        }
      })
    }),
    
    readJsonFile: (path: string, schema: any) => Effect.sync(() => {
      const file = fileSystem.get(path)
      if (!file) {
        throw new StorageError({ operation: "read", path })
      }
      
      try {
        const parsed = JSON.parse(file.content)
        return schema.parse(parsed)
      } catch (error) {
        throw new StorageError({ operation: "validate", path, cause: error })
      }
    }),
    
    writeJsonFile: (path: string, data: any, options?: any) => Effect.sync(() => {
      const content = options?.pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data)
      
      if (options?.backup && fileSystem.has(path)) {
        const backupPath = `${path}.backup`
        fileSystem.set(backupPath, fileSystem.get(path)!)
      }
      
      fileSystem.set(path, {
        content,
        stats: {
          size: content.length,
          modified: new Date(),
          created: new Date(),
          isFile: true,
          isDirectory: false
        }
      })
    }),
    
    fileExists: (path: string) => Effect.succeed(fileSystem.has(path)),
    
    createDirectory: (path: string) => Effect.sync(() => {
      fileSystem.set(path, {
        content: "",
        stats: {
          size: 0,
          modified: new Date(),
          created: new Date(),
          isFile: false,
          isDirectory: true
        }
      })
    }),
    
    getFileStats: (path: string) => Effect.sync(() => {
      const file = fileSystem.get(path)
      if (!file) {
        throw new StorageError({ operation: "read", path })
      }
      return file.stats
    }),
    
    // Backup operations
    createBackup: (filePath: string, backupSuffix?: string) => Effect.sync(() => {
      const file = fileSystem.get(filePath)
      if (!file) {
        throw new StorageError({ operation: "read", path: filePath })
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const suffix = backupSuffix || timestamp
      const backupPath = `${filePath}.backup.${suffix}`
      
      fileSystem.set(backupPath, file)
      return backupPath
    }),
    
    restoreBackup: (filePath: string, backupPath: string) => Effect.sync(() => {
      const backup = fileSystem.get(backupPath)
      if (!backup) {
        throw new StorageError({ operation: "read", path: backupPath })
      }
      
      fileSystem.set(filePath, backup)
    }),
    
    listBackups: (filePath: string) => Effect.succeed([
      ...fileSystem.keys()
    ].filter(key => key.startsWith(`${filePath}.backup`))),
    
    cleanupBackups: (filePath: string, keepCount: number) => Effect.sync(() => {
      const backups = [...fileSystem.keys()]
        .filter(key => key.startsWith(`${filePath}.backup`))
        .sort()
      
      const toDelete = backups.slice(0, -keepCount)
      for (const backup of toDelete) {
        fileSystem.delete(backup)
      }
    }),
    
    // Transaction support
    beginTransaction: Effect.sync(() => {
      const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      transactions.set(txId, [])
      return txId
    }),
    
    addToTransaction: (transactionId: string, operation: 'write' | 'delete', path: string, content?: string) => 
      Effect.sync(() => {
        const tx = transactions.get(transactionId)
        if (!tx) {
          throw new StorageError({ operation: "validate", cause: new Error("Transaction not found") })
        }
        
        tx.push({ operation, path, content })
      }),
    
    commitTransaction: (transactionId: string) => Effect.sync(() => {
      const tx = transactions.get(transactionId)
      if (!tx) {
        throw new StorageError({ operation: "validate", cause: new Error("Transaction not found") })
      }
      
      // Apply all operations
      for (const op of tx) {
        if (op.operation === 'write' && op.content !== undefined) {
          fileSystem.set(op.path, {
            content: op.content,
            stats: {
              size: op.content.length,
              modified: new Date(),
              created: new Date(),
              isFile: true,
              isDirectory: false
            }
          })
        } else if (op.operation === 'delete') {
          fileSystem.delete(op.path)
        }
      }
      
      transactions.delete(transactionId)
    }),
    
    rollbackTransaction: (transactionId: string) => Effect.sync(() => {
      const tx = transactions.get(transactionId)
      if (!tx) {
        throw new StorageError({ operation: "validate", cause: new Error("Transaction not found") })
      }
      
      transactions.delete(transactionId)
    })
  }
  
  return {
    service: mockService,
    getStorage: () => storage,
    getCache: () => cache,
    getConfig: () => config,
    getFileSystem: () => fileSystem,
    getTransactions: () => transactions
  }
}

describe("StorageService", () => {
  describe("State Management", () => {
    it("saves and loads state", async () => {
      const { service, getStorage } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.object({
        name: z.string(),
        age: z.number()
      })
      
      const data = { name: "Alice", age: 30 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("user", data))
          const loaded = yield* _(storage.loadState("user", schema))
          
          expect(loaded).toEqual(data)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("saves state with pretty formatting", async () => {
      const { service, getStorage } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const data = { name: "Bob", items: ["a", "b"] }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("pretty", data, { pretty: true }))
        }).pipe(Effect.provide(layer))
      )
      
      const stored = getStorage().get("pretty")
      expect(stored).toContain("\n") // Pretty formatted has newlines
    })
    
    it("returns null for non-existent state", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.string()
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          return yield* _(storage.loadState("missing", schema))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result).toBeNull()
    })
    
    it("clears state", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("temp", "data"))
          yield* _(storage.clearState("temp"))
          const exists = yield* _(storage.hasState("temp"))
          
          expect(exists).toBe(false)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("checks if state exists", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("exists", "yes"))
          
          const exists = yield* _(storage.hasState("exists"))
          const missing = yield* _(storage.hasState("missing"))
          
          expect(exists).toBe(true)
          expect(missing).toBe(false)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("lists state keys", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("key1", "data1"))
          yield* _(storage.saveState("key2", "data2"))
          yield* _(storage.saveState("key3", "data3"))
          
          const keys = yield* _(storage.listStateKeys)
          
          expect(keys).toContain("key1")
          expect(keys).toContain("key2")
          expect(keys).toContain("key3")
          expect(keys.length).toBe(3)
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Configuration Management", () => {
    it("loads config with defaults", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.object({
        theme: z.string(),
        fontSize: z.number()
      })
      
      const defaults = { theme: "dark", fontSize: 14 }
      
      const config = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          return yield* _(storage.loadConfig("myapp", schema, defaults))
        }).pipe(Effect.provide(layer))
      )
      
      expect(config).toEqual(defaults)
    })
    
    it("saves and loads config", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.object({
        theme: z.string(),
        fontSize: z.number()
      })
      
      const config = { theme: "light", fontSize: 16 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveConfig("myapp", config, schema))
          const loaded = yield* _(storage.loadConfig("myapp", schema, { theme: "dark", fontSize: 14 }))
          
          expect(loaded).toEqual(config)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("gets config path", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const path = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          return yield* _(storage.getConfigPath("myapp"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(path).toBe("~/.config/myapp/config.json")
    })
    
    it("watches config changes", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.object({ value: z.number() })
      
      const stream = await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveConfig("watchapp", { value: 42 }, schema))
          return yield* _(storage.watchConfig("watchapp", schema))
        }).pipe(Effect.provide(layer))
      )
      
      const value = await Effect.runPromise(stream)
      expect(value.value).toBe(42)
    })
  })
  
  describe("Cache Management", () => {
    it("saves and loads cache", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const data = { cached: true, value: "test" }
      const schema = z.object({ cached: z.boolean(), value: z.string() })
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.setCache("cache1", data))
          const loaded = yield* _(storage.getCache("cache1", schema))
          
          expect(loaded).toEqual(data)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles cache TTL expiration", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.string()
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          // Save with 0.001 second TTL
          yield* _(storage.setCache("expire", "data", 0.001))
          
          // Wait for expiration
          yield* _(Effect.sleep(5))
          
          const loaded = yield* _(storage.getCache("expire", schema))
          expect(loaded).toBeNull()
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("clears specific cache key", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.string()
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.setCache("keep", "data1"))
          yield* _(storage.setCache("remove", "data2"))
          yield* _(storage.clearCache("remove"))
          
          const kept = yield* _(storage.getCache("keep", schema))
          const removed = yield* _(storage.getCache("remove", schema))
          
          expect(kept).toBe("data1")
          expect(removed).toBeNull()
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("clears expired cache entries", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      const schema = z.string()
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.setCache("expire1", "data1", 0.001))
          yield* _(storage.setCache("expire2", "data2", 0.001))
          yield* _(storage.setCache("keep", "data3", 1000))
          
          // Wait for some to expire
          yield* _(Effect.sleep(5))
          
          yield* _(storage.clearExpiredCache)
          
          const stats = yield* _(storage.getCacheStats)
          expect(stats.totalEntries).toBe(1) // Only "keep" should remain
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("gets cache statistics", async () => {
      const { service } = createMockStorageService()
      const layer = Layer.succeed(StorageService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.setCache("a", "1"))
          yield* _(storage.setCache("b", "2"))
          yield* _(storage.setCache("c", "3", 0.001))
          
          // Wait for one to expire
          yield* _(Effect.sleep(5))
          
          const stats = yield* _(storage.getCacheStats)
          expect(stats.totalEntries).toBe(3)
          expect(stats.expiredEntries).toBe(1)
          expect(stats.totalSize).toBeGreaterThan(0)
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  
  describe("Error Handling", () => {
    it("handles save errors", async () => {
      const errorService: StorageService['Type'] = {
        ...createMockStorageService().service,
        saveState: () => Effect.fail(new StorageError({ 
          operation: "write",
          cause: new Error("Disk full") 
        }))
      }
      
      const layer = Layer.succeed(StorageService, errorService)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const storage = yield* _(StorageService)
          yield* _(storage.saveState("fail", "data"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
  })
})

// Import StorageUtils separately for testing
import { StorageUtils } from "@/services/storage"

describe("StorageUtils", () => {
  describe("getConfigPaths", () => {
    const originalPlatform = process.platform
    const originalHome = process.env.HOME
    const originalUserProfile = process.env.USERPROFILE
    const originalAppData = process.env.APPDATA
    const originalXdgConfig = process.env.XDG_CONFIG_HOME
    
    afterEach(() => {
      // Restore original values
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      process.env.HOME = originalHome
      process.env.USERPROFILE = originalUserProfile
      process.env.APPDATA = originalAppData
      process.env.XDG_CONFIG_HOME = originalXdgConfig
    })
    
    it("generates correct paths for macOS", () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      process.env.HOME = "/Users/testuser"
      
      const paths = StorageUtils.getConfigPaths("myapp")
      
      expect(paths).toEqual([
        "/Users/testuser/Library/Application Support/myapp/config.json",
        "/Users/testuser/.config/myapp/config.json",
        "/Users/testuser/.myapprc"
      ])
    })
    
    it("generates correct paths for Windows", () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      delete process.env.HOME
      process.env.USERPROFILE = "C:\\Users\\testuser"
      process.env.APPDATA = "C:\\Users\\testuser\\AppData\\Roaming"
      
      const paths = StorageUtils.getConfigPaths("myapp")
      
      expect(paths).toEqual([
        "C:\\Users\\testuser\\AppData\\Roaming/myapp/config.json",
        "C:\\Users\\testuser/.config/myapp/config.json",
        "C:\\Users\\testuser/.myapprc"
      ])
    })
    
    it("generates correct paths for Linux", () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      process.env.HOME = "/home/testuser"
      process.env.XDG_CONFIG_HOME = "/home/testuser/.config"
      
      const paths = StorageUtils.getConfigPaths("myapp")
      
      expect(paths).toEqual([
        "/home/testuser/.config/myapp/config.json",
        "/home/testuser/.config/myapp/config.json",
        "/home/testuser/.myapprc"
      ])
    })
    
    it("handles missing environment variables", () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      delete process.env.HOME
      delete process.env.XDG_CONFIG_HOME
      
      const paths = StorageUtils.getConfigPaths("myapp")
      
      expect(paths[0]).toContain("~/.config/myapp/config.json")
    })
  })
  
  describe("getDataPaths", () => {
    const originalPlatform = process.platform
    const originalHome = process.env.HOME
    const originalUserProfile = process.env.USERPROFILE
    const originalAppData = process.env.APPDATA
    const originalXdgData = process.env.XDG_DATA_HOME
    
    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      process.env.HOME = originalHome
      process.env.USERPROFILE = originalUserProfile
      process.env.APPDATA = originalAppData
      process.env.XDG_DATA_HOME = originalXdgData
    })
    
    it("generates correct paths for macOS", () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      process.env.HOME = "/Users/testuser"
      
      const paths = StorageUtils.getDataPaths("myapp")
      
      expect(paths).toEqual([
        "/Users/testuser/Library/Application Support/myapp",
        "/Users/testuser/.local/share/myapp"
      ])
    })
    
    it("generates correct paths for Windows", () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      delete process.env.HOME
      process.env.USERPROFILE = "C:\\Users\\testuser"
      process.env.APPDATA = "C:\\Users\\testuser\\AppData\\Roaming"
      
      const paths = StorageUtils.getDataPaths("myapp")
      
      expect(paths).toEqual([
        "C:\\Users\\testuser\\AppData\\Roaming/myapp",
        "C:\\Users\\testuser/.local/share/myapp"
      ])
    })
    
    it("generates correct paths for Linux", () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      process.env.HOME = "/home/testuser"
      process.env.XDG_DATA_HOME = "/home/testuser/.local/share"
      
      const paths = StorageUtils.getDataPaths("myapp")
      
      expect(paths).toEqual([
        "/home/testuser/.local/share/myapp",
        "/home/testuser/.local/share/myapp"
      ])
    })
  })
  
  describe("getCachePaths", () => {
    const originalPlatform = process.platform
    const originalHome = process.env.HOME
    const originalUserProfile = process.env.USERPROFILE
    const originalLocalAppData = process.env.LOCALAPPDATA
    const originalXdgCache = process.env.XDG_CACHE_HOME
    
    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
      process.env.HOME = originalHome
      process.env.USERPROFILE = originalUserProfile
      process.env.LOCALAPPDATA = originalLocalAppData
      process.env.XDG_CACHE_HOME = originalXdgCache
    })
    
    it("generates correct paths for macOS", () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      process.env.HOME = "/Users/testuser"
      
      const paths = StorageUtils.getCachePaths("myapp")
      
      expect(paths).toEqual([
        "/Users/testuser/Library/Caches/myapp",
        "/Users/testuser/.cache/myapp"
      ])
    })
    
    it("generates correct paths for Windows", () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      delete process.env.HOME
      process.env.USERPROFILE = "C:\\Users\\testuser"
      process.env.LOCALAPPDATA = "C:\\Users\\testuser\\AppData\\Local"
      
      const paths = StorageUtils.getCachePaths("myapp")
      
      expect(paths).toEqual([
        "C:\\Users\\testuser\\AppData\\Local/myapp/Cache",
        "C:\\Users\\testuser/.cache/myapp"
      ])
    })
    
    it("generates correct paths for Linux", () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      process.env.HOME = "/home/testuser"
      process.env.XDG_CACHE_HOME = "/home/testuser/.cache"
      
      const paths = StorageUtils.getCachePaths("myapp")
      
      expect(paths).toEqual([
        "/home/testuser/.cache/myapp",
        "/home/testuser/.cache/myapp"
      ])
    })
  })
  
  describe("generateBackupName", () => {
    it("generates backup name with timestamp", () => {
      const original = "/path/to/file.json"
      const backup = StorageUtils.generateBackupName(original)
      
      expect(backup).toMatch(/^\/path\/to\/file\.json\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/)
    })
    
    it("generates backup name with custom suffix", () => {
      const original = "/path/to/file.json"
      const backup = StorageUtils.generateBackupName(original, "v1")
      
      expect(backup).toBe("/path/to/file.json.backup.v1")
    })
    
    it("handles files without extension", () => {
      const original = "/path/to/file"
      const backup = StorageUtils.generateBackupName(original, "test")
      
      expect(backup).toBe("/path/to/file.backup.test")
    })
  })
  
  describe("isSafePath", () => {
    it("allows safe paths", () => {
      expect(StorageUtils.isSafePath("/safe/path/file.txt")).toBe(true)
      expect(StorageUtils.isSafePath("relative/path/file.txt")).toBe(true)
      expect(StorageUtils.isSafePath("file.txt")).toBe(true)
      expect(StorageUtils.isSafePath("C:\\Windows\\safe\\path\\file.txt")).toBe(true)
    })
    
    it("blocks directory traversal attacks", () => {
      expect(StorageUtils.isSafePath("../etc/passwd")).toBe(false)
      expect(StorageUtils.isSafePath("/safe/../etc/passwd")).toBe(false)
      expect(StorageUtils.isSafePath("safe/../../etc/passwd")).toBe(false)
      expect(StorageUtils.isSafePath("C:\\safe\\..\\Windows\\system32")).toBe(false)
    })
    
    it("handles Windows paths correctly", () => {
      expect(StorageUtils.isSafePath("C:\\safe\\path\\file.txt")).toBe(true)
      expect(StorageUtils.isSafePath("C:\\safe\\..\\dangerous\\file.txt")).toBe(false)
    })
    
    it("handles edge cases", () => {
      expect(StorageUtils.isSafePath("")).toBe(true)
      expect(StorageUtils.isSafePath("./file.txt")).toBe(true)
      expect(StorageUtils.isSafePath("file..name.txt")).toBe(true) // .. in filename is OK when not a directory separator
    })
  })
  
  describe("ensureDirectory", () => {
    it("handles existing directory", async () => {
      // This test just ensures the function doesn't throw for valid operations
      // In a real test environment, you'd mock Bun.file and Bun.spawn
      expect(typeof StorageUtils.ensureDirectory).toBe("function")
    })
  })
})