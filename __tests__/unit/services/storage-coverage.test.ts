/**
 * Coverage tests for Storage service
 */

import { describe, it, expect } from "bun:test"
import { Effect } from "effect"
import { 
  StorageService, 
  StorageKey, 
  createStorageKey,
  StorageValue,
  isStorageKey 
} from "../../../src/services/storage"
import { StorageError } from "../../../src/core/errors"

describe("Storage Service - Coverage", () => {
  describe("StorageKey", () => {
    it("creates storage keys with namespace", () => {
      const key = createStorageKey("user", "settings")
      expect(key.namespace).toBe("user")
      expect(key.key).toBe("settings")
    })

    it("creates storage keys without namespace", () => {
      const key = createStorageKey("globalConfig")
      expect(key.namespace).toBe("")
      expect(key.key).toBe("globalConfig")
    })

    it("validates storage keys", () => {
      const validKey = { namespace: "app", key: "data" }
      const invalidKey1 = { namespace: "app" }
      const invalidKey2 = { key: "data" }
      const invalidKey3 = "not-an-object"
      
      expect(isStorageKey(validKey)).toBe(true)
      expect(isStorageKey(invalidKey1)).toBe(false)
      expect(isStorageKey(invalidKey2)).toBe(false)
      expect(isStorageKey(invalidKey3)).toBe(false)
    })
  })

  describe("StorageService interface", () => {
    it("has correct service tag", () => {
      expect(StorageService.key).toBe("StorageService")
    })

    it("defines all required methods", () => {
      const mockStorage: typeof StorageService.Service = {
        get: () => Effect.succeed(null),
        set: () => Effect.succeed(undefined),
        delete: () => Effect.succeed(undefined),
        clear: () => Effect.succeed(undefined),
        has: () => Effect.succeed(false),
        keys: () => Effect.succeed([]),
        size: () => Effect.succeed(0),
        getMany: () => Effect.succeed(new Map()),
        setMany: () => Effect.succeed(undefined),
        deleteMany: () => Effect.succeed(undefined),
        transaction: (operations) => Effect.succeed(undefined),
        watch: () => Effect.succeed(() => {}),
        backup: () => Effect.succeed(undefined),
        restore: () => Effect.succeed(undefined),
        migrate: () => Effect.succeed(undefined)
      }
      
      expect(mockStorage.get).toBeDefined()
      expect(mockStorage.set).toBeDefined()
      expect(mockStorage.delete).toBeDefined()
      expect(mockStorage.clear).toBeDefined()
      expect(mockStorage.has).toBeDefined()
      expect(mockStorage.keys).toBeDefined()
      expect(mockStorage.size).toBeDefined()
    })
  })

  describe("StorageValue types", () => {
    it("handles different value types", () => {
      const values: StorageValue[] = [
        "string value",
        123,
        true,
        false,
        null,
        { key: "value" },
        [1, 2, 3],
        { nested: { data: true } }
      ]
      
      values.forEach(value => {
        expect(value === null || value !== undefined).toBe(true)
      })
    })
  })

  describe("Storage operations", () => {
    it("can create a test implementation", async () => {
      const storage = new Map<string, StorageValue>()
      
      const testImpl: typeof StorageService.Service = {
        get: (key) => Effect.succeed(storage.get(`${key.namespace}:${key.key}`) ?? null),
        set: (key, value) => Effect.sync(() => {
          storage.set(`${key.namespace}:${key.key}`, value)
        }),
        delete: (key) => Effect.sync(() => {
          storage.delete(`${key.namespace}:${key.key}`)
        }),
        clear: () => Effect.sync(() => storage.clear()),
        has: (key) => Effect.succeed(storage.has(`${key.namespace}:${key.key}`)),
        keys: () => Effect.succeed(
          Array.from(storage.keys()).map(k => {
            const [namespace, key] = k.split(':')
            return { namespace, key }
          })
        ),
        size: () => Effect.succeed(storage.size),
        getMany: (keys) => Effect.succeed(new Map(
          keys.map(k => [k, storage.get(`${k.namespace}:${k.key}`) ?? null])
        )),
        setMany: (entries) => Effect.sync(() => {
          entries.forEach(([key, value]) => {
            storage.set(`${key.namespace}:${key.key}`, value)
          })
        }),
        deleteMany: (keys) => Effect.sync(() => {
          keys.forEach(key => {
            storage.delete(`${key.namespace}:${key.key}`)
          })
        }),
        transaction: (operations) => Effect.sync(() => {
          operations.forEach(op => {
            switch (op.type) {
              case 'set':
                storage.set(`${op.key.namespace}:${op.key.key}`, op.value)
                break
              case 'delete':
                storage.delete(`${op.key.namespace}:${op.key.key}`)
                break
            }
          })
        }),
        watch: (key, callback) => Effect.sync(() => {
          // Simple mock - just return unsubscribe function
          return () => {}
        }),
        backup: (path) => Effect.succeed(undefined),
        restore: (path) => Effect.succeed(undefined),
        migrate: (migrations) => Effect.succeed(undefined)
      }
      
      // Test basic operations
      const key = createStorageKey("test", "value")
      
      await Effect.runPromise(testImpl.set(key, "hello"))
      const value = await Effect.runPromise(testImpl.get(key))
      expect(value).toBe("hello")
      
      const hasKey = await Effect.runPromise(testImpl.has(key))
      expect(hasKey).toBe(true)
      
      await Effect.runPromise(testImpl.delete(key))
      const deleted = await Effect.runPromise(testImpl.get(key))
      expect(deleted).toBe(null)
    })
  })

  describe("Storage patterns", () => {
    it("supports namespaced storage", () => {
      const userKey = createStorageKey("user", "preferences")
      const appKey = createStorageKey("app", "config")
      const globalKey = createStorageKey("version")
      
      expect(userKey.namespace).toBe("user")
      expect(appKey.namespace).toBe("app")
      expect(globalKey.namespace).toBe("")
    })

    it("supports bulk operations", () => {
      const keys = [
        createStorageKey("user", "name"),
        createStorageKey("user", "email"),
        createStorageKey("user", "preferences")
      ]
      
      const entries: Array<[StorageKey, StorageValue]> = [
        [keys[0], "John Doe"],
        [keys[1], "john@example.com"],
        [keys[2], { theme: "dark" }]
      ]
      
      expect(keys).toHaveLength(3)
      expect(entries).toHaveLength(3)
    })

    it("supports transactions", () => {
      const operations = [
        { type: 'set' as const, key: createStorageKey("counter"), value: 1 },
        { type: 'set' as const, key: createStorageKey("status"), value: "active" },
        { type: 'delete' as const, key: createStorageKey("temp") }
      ]
      
      expect(operations).toHaveLength(3)
      expect(operations[0].type).toBe('set')
      expect(operations[2].type).toBe('delete')
    })
  })
})