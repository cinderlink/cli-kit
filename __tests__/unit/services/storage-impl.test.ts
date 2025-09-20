/**
 * Tests for Storage Service Implementation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from "@domir/bun-test"
import { mock } from "bun:test"
import { Effect, TestClock } from "effect"
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
  unlink: mock(async () => {}),
  readdir: mock(async () => []),
  stat: mock(async () => ({ isDirectory: () => true, mtime: new Date() })),
  access: mock(async () => {})
}))

let StorageService: typeof import("@/services/storage").StorageService
let StorageServiceLive: typeof import("@/services/impl/storage-impl").StorageServiceLive

beforeAll(async () => {
  ;({ StorageService } = await import("@/services/storage"))
  ;({ StorageServiceLive } = await import("@/services/impl/storage-impl"))
})

describe("Storage Service Implementation", () => {
  let service: StorageService
  let fsModule: Awaited<typeof import("node:fs/promises")>

  beforeEach(async () => {
    // Reset mocks
    fsModule = await import("node:fs/promises")
    Object.values(fsModule).forEach(fn => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as any).mockClear()
      }
    })
  })

  describe("state management", () => {
    it.effect("saves and retrieves state", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveState("testKey", "testValue")
        const value = yield* storage.loadState("testKey", z.string())

        expect(value).toBe("testValue")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("returns null for non-existent state", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const value = yield* storage.loadState("nonExistent", z.any())

        expect(value).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("deletes state", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveState("toDelete", "value")
        yield* storage.clearState("toDelete")
        const value = yield* storage.loadState("toDelete", z.any())

        expect(value).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("lists all state keys", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveState("key1", "value1")
        yield* storage.saveState("key2", "value2")
        yield* storage.saveState("key3", "value3")

        const keys = yield* storage.listStateKeys

        expect(keys).toContain("key1")
        expect(keys).toContain("key2")
        expect(keys).toContain("key3")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("clears all state", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveState("key1", "value1")
        yield* storage.saveState("key2", "value2")

        // Clear each key individually since there's no clearAllState
        yield* storage.clearState("key1")
        yield* storage.clearState("key2")

        const keys = yield* storage.listStateKeys
        expect(keys.length).toBe(0)
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("cache management", () => {
    it.effect("caches data without TTL", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.setCache("cacheKey", { foo: "bar" })
        const data = yield* storage.getCache("cacheKey", z.object({ foo: z.string() }))

        expect(data).toEqual({ foo: "bar" })
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("caches data with TTL", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        // Cache for 1 second
        yield* storage.setCache("ttlKey", "value", 1000)

        // Should exist immediately
        const value1 = yield* storage.getCache("ttlKey", z.string())
        expect(value1).toBe("value")

        // Wait for expiration
        yield* TestClock.adjust("1100 millis")

        // Should be expired
        const value2 = yield* storage.getCache("ttlKey", z.string())
        expect(value2).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("invalidates cache", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.setCache("toInvalidate", "value")
        yield* storage.clearCache("toInvalidate")
        const value = yield* storage.getCache("toInvalidate", z.string())

        expect(value).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("clears all cache", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.setCache("cache1", "value1")
        yield* storage.setCache("cache2", "value2")
        yield* storage.clearExpiredCache

        const value1 = yield* storage.getCache("cache1", z.string())
        const value2 = yield* storage.getCache("cache2", z.string())

        expect(value1).toBeNull()
        expect(value2).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("lists cache keys", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.setCache("key1", "value1")
        yield* storage.setCache("key2", "value2", 1000)

        const stats = yield* storage.getCacheStats

        expect(stats.totalEntries).toBeGreaterThanOrEqual(2)
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("config management", () => {
    it.effect("saves and loads config", () =>
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
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("validates config with schema", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        const schema = z.object({
          theme: z.string(),
          fontSize: z.number().min(10).max(20)
        })

        const validConfig = { theme: "dark", fontSize: 14 }
        yield* storage.saveConfig("validated", validConfig, schema)

        const loaded = yield* storage.loadConfig("validated", schema)
        expect(loaded).toEqual(validConfig)

        const invalidConfig = { theme: "dark", fontSize: 5 }
        const result = yield* storage.saveConfig("invalid", invalidConfig, schema).pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("returns null for non-existent config", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const config = yield* storage.loadConfig("nonExistent")

        expect(config).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("deletes config", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveConfig("toDelete", { key: "value" })
        yield* storage.deleteConfig("toDelete")
        const config = yield* storage.loadConfig("toDelete")

        expect(config).toBeNull()
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("lists config files", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        yield* storage.saveConfig("config1", {})
        yield* storage.saveConfig("config2", {})

        const configs = yield* storage.listConfigs()

        expect(configs).toContain("config1")
        expect(configs).toContain("config2")
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("file operations", () => {
    it.effect("writes and reads files", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const content = "Hello, World!"

        yield* storage.writeTextFile("test.txt", content)

        expect(fsModule.writeFile).toHaveBeenCalledWith(
          expect.stringContaining("test.txt"),
          content
        )
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("reads file content", () =>
      Effect.gen(function* () {
        ;(fsModule.readFile as any).mockResolvedValue("File content")

        const storage = yield* StorageService
        const content = yield* storage.readTextFile("test.txt")

        expect(content).toBe("File content")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("deletes files", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        const outcome = yield* storage.deleteFile("toDelete.txt").pipe(Effect.either)

        expect(outcome._tag).toBe("Right")

        expect(fsModule.rm).toHaveBeenCalledWith(
          expect.stringContaining("toDelete.txt"),
          expect.objectContaining({ force: true })
        )
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("checks file existence", () =>
      Effect.gen(function* () {
        ;(fsModule.access as any).mockResolvedValue(undefined)

        const storage = yield* StorageService
        const exists = yield* storage.fileExists("existing.txt")

        expect(exists).toBe(true)
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("handles non-existent files", () =>
      Effect.gen(function* () {
        const enoent = Object.assign(new Error("ENOENT"), { code: "ENOENT" })
        ;(fsModule.access as any).mockRejectedValue(enoent)

        const storage = yield* StorageService
        const exists = yield* storage.fileExists("missing.txt")
        expect(exists).toBe(false)
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("transactions", () => {
    it.effect("executes transaction successfully", () =>
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
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("rolls back on failure", () =>
      Effect.gen(function* () {
        let writeCount = 0
        ;(fsModule.writeFile as any).mockImplementation(async () => {
          writeCount++
          if (writeCount === 2) {
            throw new Error("Write failed")
          }
        })

        const storage = yield* StorageService

        const result = yield* storage.transaction("tx2", (tx) =>
          Effect.gen(function* () {
            yield* tx.write("file1.txt", "content1")
            yield* tx.write("file2.txt", "content2")
            return "success"
          })
        ).pipe(Effect.either)

        expect(result._tag).toBe("Left")
        expect(fsModule.rm).toHaveBeenCalledWith(
          expect.stringContaining("file1.txt"),
          expect.objectContaining({ force: true })
        )
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("handles nested transactions", () =>
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
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("storage paths", () => {
    it.effect("resolves data paths correctly", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const paths = yield* storage.getDataPaths("myapp")

        expect(paths.length).toBeGreaterThan(0)
        expect(paths[0]).toContain("myapp")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("resolves cache paths correctly", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const paths = yield* storage.getCachePaths("myapp")

        expect(paths.length).toBeGreaterThan(0)
        expect(paths[0]).toContain("myapp")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("resolves config paths correctly", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService
        const paths = yield* storage.getConfigPaths("myapp")

        expect(paths.length).toBeGreaterThan(0)
        expect(paths[0]).toContain("myapp")
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })

  describe("error handling", () => {
    it.effect("handles file system errors", () =>
      Effect.gen(function* () {
        const permissionError = Object.assign(new Error("Permission denied"), { code: "EACCES" })
        ;(fsModule.readFile as any).mockRejectedValue(permissionError)

        const storage = yield* StorageService
        const result = yield* storage.readTextFile("protected.txt").pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }).pipe(Effect.provide(StorageServiceLive))
    )

    it.effect("validates file paths", () =>
      Effect.gen(function* () {
        const storage = yield* StorageService

        const result = yield* storage.writeTextFile("../../../etc/passwd", "hack").pipe(Effect.either)

        expect(result._tag).toBe("Left")
      }).pipe(Effect.provide(StorageServiceLive))
    )
  })
})
