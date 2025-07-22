/**
 * Lazy Loading Tests
 */

import { describe, it, expect } from "bun:test"
import { lazyLoad } from "./lazy"

describe("Lazy Loading", () => {
  describe("lazyLoad", () => {
    it("should create lazy handler", () => {
      const handler = lazyLoad(async () => ({
        default: (args: Record<string, unknown>) => {
          console.log("Loaded!", args)
        }
      }))
      
      expect(handler._lazy).toBe(true)
      expect(handler._importFn).toBeDefined()
      expect(typeof handler).toBe("function")
    })

    it("should load and execute handler on call", async () => {
      let loaded = false
      let receivedArgs: Record<string, unknown> | null = null
      
      const handler = lazyLoad(async () => ({
        default: (args: Record<string, unknown>) => {
          loaded = true
          receivedArgs = args
        }
      }))
      
      await handler({ test: true } as any)
      
      expect(loaded).toBe(true)
      expect(receivedArgs as Record<string, unknown>).toEqual({ test: true })
    })

    it("should attach metadata", () => {
      const metadata = {
        handlerName: "test-handler",
        handlerVersion: "1.0.0"
      }
      
      const handler = lazyLoad(
        async () => ({ default: () => {} }),
        metadata
      )
      
      expect(handler.metadata?.handlerName).toBe("test-handler")
      expect(handler.metadata?.handlerVersion).toBe("1.0.0")
    })

    it("should handle async handlers", async () => {
      let result = ""
      
      const handler = lazyLoad(async () => ({
        default: async (args: Record<string, unknown>) => {
          await new Promise(resolve => setTimeout(resolve, 1))
          result = args.message as string
        }
      }))
      
      await handler({ message: "Hello" })
      
      expect(result).toBe("Hello")
    })

    it("should handle errors in import", async () => {
      const handler = lazyLoad(async () => {
        throw new Error("Import failed")
      })
      
      await expect(handler({})).rejects.toThrow("Import failed")
    })

    it("should handle errors in handler", async () => {
      const handler = lazyLoad(async () => ({
        default: () => {
          throw new Error("Handler failed")
        }
      }))
      
      await expect(handler({})).rejects.toThrow("Handler failed")
    })
  })
})