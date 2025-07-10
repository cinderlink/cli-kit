/**
 * Tests for Storage Service Implementation
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"
import { Effect, TestContext } from "effect"
import { StorageService } from "@/services/storage"
import { StorageServiceLive } from "@/services/impl/storage-impl"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { z } from "zod"

// Mock fs module
mock.module("node:fs/promises", () => ({
  readFile: mock(async () => "{}"),
  writeFile: mock(async () => {}),
  mkdir: mock(async () => {}),
  rm: mock(async () => {}),
  readdir: mock(async () => []),
  stat: mock(async () => ({ isDirectory: () => true, mtime: new Date() })),
  access: mock(async () => {})
}))

describe("Storage Service Implementation", () => {
  let service: StorageService

  beforeEach(async () => {
    // Reset mocks
    const fsModule = await import("node:fs/promises")
    Object.values(fsModule).forEach(fn => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as any).mockClear()
      }
    })
  })

  describe("state management", () => {
    it("saves and retrieves state", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveState("testKey", "testValue")
          const value = yield* storage.loadState("testKey", z.string())
          
          expect(value).toBe("testValue")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("returns null for non-existent state", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const value = yield* storage.loadState("nonExistent", z.any())
          
          expect(value).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("deletes state", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveState("toDelete", "value")
          yield* storage.clearState("toDelete")
          const value = yield* storage.loadState("toDelete", z.any())
          
          expect(value).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("lists all state keys", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveState("key1", "value1")
          yield* storage.saveState("key2", "value2")
          yield* storage.saveState("key3", "value3")
          
          const keys = yield* storage.listStateKeys
          
          expect(keys).toContain("key1")
          expect(keys).toContain("key2")
          expect(keys).toContain("key3")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("clears all state", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveState("key1", "value1")
          yield* storage.saveState("key2", "value2")
          
          // Clear each key individually since there's no clearAllState
          yield* storage.clearState("key1")
          yield* storage.clearState("key2")
          
          const keys = yield* storage.listStateKeys
          expect(keys.length).toBe(0)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("cache management", () => {
    it("caches data without TTL", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.setCache("cacheKey", { foo: "bar" })
          const data = yield* storage.getCache("cacheKey", z.object({ foo: z.string() }))
          
          expect(data).toEqual({ foo: "bar" })
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("caches data with TTL", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          // Cache for 1 second
          yield* storage.setCache("ttlKey", "value", 1000)
          
          // Should exist immediately
          const value1 = yield* storage.getCache("ttlKey", z.string())
          expect(value1).toBe("value")
          
          // Wait for expiration
          yield* Effect.sleep("1100 millis")
          
          // Should be expired
          const value2 = yield* storage.getCache("ttlKey", z.string())
          expect(value2).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive),
          TestContext.withClock
        )
      )
    })

    it("invalidates cache", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.setCache("toInvalidate", "value")
          yield* storage.clearCache("toInvalidate")
          const value = yield* storage.getCache("toInvalidate", z.string())
          
          expect(value).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("clears all cache", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.setCache("cache1", "value1")
          yield* storage.setCache("cache2", "value2")
          yield* storage.clearExpiredCache
          
          const value1 = yield* storage.getCache("cache1", z.string())
          const value2 = yield* storage.getCache("cache2", z.string())
          
          expect(value1).toBeNull()
          expect(value2).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("lists cache keys", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.setCache("key1", "value1")
          yield* storage.setCache("key2", "value2", 1000)
          
          const stats = yield* storage.getCacheStats
          
          expect(stats.totalEntries).toBeGreaterThanOrEqual(2)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("config management", () => {
    it("saves and loads config", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          const config = {
            theme: "dark",
            fontSize: 14,
            features: ["feature1", "feature2"]
          }
          
          yield* storage.saveConfig("app", config)
          const loaded = yield* storage.loadConfig("app")
          
          expect(loaded).toEqual(config)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("validates config with schema", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          const schema = z.object({
            theme: z.string(),
            fontSize: z.number().min(10).max(20)
          })
          
          const validConfig = { theme: "dark", fontSize: 14 }
          yield* storage.saveConfig("validated", validConfig, schema)
          
          // Should pass validation
          const loaded = yield* storage.loadConfig("validated", schema)
          expect(loaded).toEqual(validConfig)
          
          // Invalid config should fail
          const invalidConfig = { theme: "dark", fontSize: 5 }
          const result = yield* storage.saveConfig("invalid", invalidConfig, schema).pipe(
            Effect.either
          )
          
          expect(result._tag).toBe("Left")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("returns null for non-existent config", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const config = yield* storage.loadConfig("nonExistent")
          
          expect(config).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("deletes config", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveConfig("toDelete", { key: "value" })
          yield* storage.deleteConfig("toDelete")
          const config = yield* storage.loadConfig("toDelete")
          
          expect(config).toBeNull()
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("lists config files", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.saveConfig("config1", {})
          yield* storage.saveConfig("config2", {})
          
          const configs = yield* storage.listConfigs()
          
          expect(configs).toContain("config1")
          expect(configs).toContain("config2")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("file operations", () => {
    it("writes and reads files", async () => {
      const fsModule = await import("node:fs/promises")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const content = "Hello, World!"
          
          yield* storage.writeTextFile("test.txt", content)
          
          expect(fsModule.writeFile).toHaveBeenCalledWith(
            expect.stringContaining("test.txt"),
            content,
            "utf8"
          )
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("reads file content", async () => {
      const fsModule = await import("node:fs/promises")
      ;(fsModule.readFile as any).mockResolvedValue("File content")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const content = yield* storage.readTextFile("test.txt")
          
          expect(content).toBe("File content")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("deletes files", async () => {
      const fsModule = await import("node:fs/promises")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          yield* storage.deleteFile("toDelete.txt")
          
          expect(fsModule.rm).toHaveBeenCalledWith(
            expect.stringContaining("toDelete.txt"),
            { force: true }
          )
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("checks file existence", async () => {
      const fsModule = await import("node:fs/promises")
      ;(fsModule.access as any).mockResolvedValue(undefined)
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const exists = yield* storage.fileExists("existing.txt")
          
          expect(exists).toBe(true)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("handles non-existent files", async () => {
      const fsModule = await import("node:fs/promises")
      ;(fsModule.access as any).mockRejectedValue(new Error("ENOENT"))
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const exists = yield* storage.fileExists("missing.txt")
          
          expect(exists).toBe(false)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("transactions", () => {
    it("executes transaction successfully", async () => {
      const fsModule = await import("node:fs/promises")
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          const result = yield* storage.transaction("tx1", (tx) =>
            Effect.gen(function* () {
              yield* tx.write("file1.txt", "content1")
              yield* tx.write("file2.txt", "content2")
              return "success"
            })
          )
          
          expect(result).toBe("success")
          expect(fsModule.writeFile).toHaveBeenCalledTimes(2)
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("rolls back on failure", async () => {
      const fsModule = await import("node:fs/promises")
      let writeCount = 0
      ;(fsModule.writeFile as any).mockImplementation(async () => {
        writeCount++
        if (writeCount === 2) {
          throw new Error("Write failed")
        }
      })
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          const result = yield* storage.transaction("tx2", (tx) =>
            Effect.gen(function* () {
              yield* tx.write("file1.txt", "content1")
              yield* tx.write("file2.txt", "content2") // This will fail
              return "success"
            })
          ).pipe(Effect.either)
          
          expect(result._tag).toBe("Left")
          
          // Rollback should delete the first file
          expect(fsModule.rm).toHaveBeenCalledWith(
            expect.stringContaining("file1.txt"),
            expect.any(Object)
          )
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("handles nested transactions", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          const result = yield* storage.transaction("parent", (tx1) =>
            Effect.gen(function* () {
              yield* tx1.write("parent.txt", "parent content")
              
              const nested = yield* storage.transaction("child", (tx2) =>
                Effect.gen(function* () {
                  yield* tx2.write("child.txt", "child content")
                  return "child result"
                })
              )
              
              return { parent: "parent result", child: nested }
            })
          )
          
          expect(result).toEqual({
            parent: "parent result",
            child: "child result"
          })
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("storage paths", () => {
    it("resolves data paths correctly", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const paths = yield* storage.getDataPaths("myapp")
          
          expect(paths.length).toBeGreaterThan(0)
          expect(paths[0]).toContain("myapp")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("resolves cache paths correctly", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const paths = yield* storage.getCachePaths("myapp")
          
          expect(paths.length).toBeGreaterThan(0)
          expect(paths[0]).toContain("myapp")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("resolves config paths correctly", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const paths = yield* storage.getConfigPaths("myapp")
          
          expect(paths.length).toBeGreaterThan(0)
          expect(paths[0]).toContain("myapp")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })

  describe("error handling", () => {
    it("handles file system errors", async () => {
      const fsModule = await import("node:fs/promises")
      ;(fsModule.readFile as any).mockRejectedValue(new Error("Permission denied"))
      
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          const result = yield* storage.readTextFile("protected.txt").pipe(
            Effect.either
          )
          
          expect(result._tag).toBe("Left")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })

    it("validates file paths", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* StorageService
          
          // Should reject path traversal attempts
          const result = yield* storage.writeTextFile("../../../etc/passwd", "hack").pipe(
            Effect.either
          )
          
          expect(result._tag).toBe("Left")
        }).pipe(
          Effect.provide(StorageServiceLive)
        )
      )
    })
  })
})