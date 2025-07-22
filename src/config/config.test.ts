import { test, expect, describe } from "bun:test"
import { Effect, Layer } from "effect"
import { config, createConfig, ConfigLayer, Config as IConfig } from "./index"
import type { Config } from "./types"

describe("Config", () => {
  describe("simple config", () => {
    test("should create config with defaults", async () => {
      const cfg = await config.simple({ 
        test: "value", 
        nested: { key: "nested-value" } 
      })
      
      expect(cfg.get("test")).toBe("value")
      expect(cfg.get("nested.key")).toBe("nested-value")
    })

    test("should handle empty configuration", async () => {
      const cfg = await config.simple({})
      expect(cfg.toJSON()).toEqual({})
    })
  })

  describe("config builder", () => {
    test("should build config with name", async () => {
      const cfg = await createConfig()
        .name("test-app")
        .defaults({ foo: "bar" })
        .build()
      
      expect(cfg.get("foo")).toBe("bar")
    })

    test("should merge multiple sources", async () => {
      const cfg = await createConfig()
        .defaults({ a: 1, b: 2 })
        .env({ A: "env-value" })
        .build()
      
      expect(cfg.get("a")).toBe("env-value")
      expect(cfg.get("b")).toBe(2)
    })

    test("should support nested values", async () => {
      const cfg = await createConfig()
        .defaults({
          server: {
            host: "localhost",
            port: 3000
          }
        })
        .build()
      
      expect(cfg.get("server.host")).toBe("localhost")
      expect(cfg.get("server.port")).toBe(3000)
    })
  })

  describe("get operations", () => {
    test("should get configuration value by key", async () => {
      const cfg = await config.simple({ test: "value" })
      expect(cfg.get("test")).toBe("value")
    })

    test("should get nested configuration value", async () => {
      const cfg = await config.simple({ 
        nested: { key: "nested-value" } 
      })
      expect(cfg.get("nested.key")).toBe("nested-value")
    })

    test("should return undefined for missing key", async () => {
      const cfg = await config.simple({ test: "value" })
      expect(cfg.get("missing")).toBeUndefined()
    })

    test("should return default value for missing key", async () => {
      const cfg = await config.simple({ test: "value" })
      expect(cfg.get("missing", "default")).toBe("default")
    })
  })

  describe("set operations", () => {
    test("should set configuration value", async () => {
      const cfg = await config.simple({ test: "value" })
      cfg.set("test", "new-value")
      expect(cfg.get("test")).toBe("new-value")
    })

    test("should set nested configuration value", async () => {
      const cfg = await config.simple({ nested: {} })
      cfg.set("nested.key", "new-value")
      expect(cfg.get("nested.key")).toBe("new-value")
    })

    test("should create nested paths", async () => {
      const cfg = await config.simple({})
      cfg.set("new.nested.path", "value")
      expect(cfg.get("new.nested.path")).toBe("value")
    })
  })

  describe("has operations", () => {
    test("should check if key exists", async () => {
      const cfg = await config.simple({ test: "value" })
      expect(cfg.has("test")).toBe(true)
      expect(cfg.has("missing")).toBe(false)
    })

    test("should check nested keys", async () => {
      const cfg = await config.simple({ 
        nested: { key: "value" } 
      })
      expect(cfg.has("nested.key")).toBe(true)
      expect(cfg.has("nested.missing")).toBe(false)
    })
  })

  describe("toJSON", () => {
    test("should export configuration as JSON", async () => {
      const data = { 
        test: "value", 
        nested: { key: "nested-value" },
        array: [1, 2, 3]
      }
      const cfg = await config.simple(data)
      expect(cfg.toJSON()).toEqual(data)
    })
  })

  describe("env config", () => {
    test("should create config from environment variables", async () => {
      process.env.TEST_VAR = "env-value"
      const cfg = await config.env("TEST_")
      expect(cfg.get("var")).toBe("env-value")
      delete process.env.TEST_VAR
    })

    test("should handle empty prefix", async () => {
      process.env.GLOBAL_VAR = "global-value"
      const cfg = await config.env()
      expect(cfg.get("GLOBAL_VAR")).toBe("global-value")
      delete process.env.GLOBAL_VAR
    })
  })

  describe("layer integration", () => {
    test("should work with ConfigLayer", async () => {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cfg = yield* IConfig
          return cfg.get("test", "default-value")
        }).pipe(
          Effect.provide(ConfigLayer({
            defaults: { test: "layer-value" }
          }))
        )
      )
      
      expect(result).toBe("layer-value")
    })

    test("should handle schema validation in layer", async () => {
      const schema = {
        type: "object",
        properties: {
          port: { type: "number" }
        },
        required: ["port"]
      }
      
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const cfg = yield* IConfig
          return cfg.get("port")
        }).pipe(
          Effect.provide(ConfigLayer({
            defaults: { port: 3000 },
            schema
          }))
        )
      )
      
      expect(result).toBe(3000)
    })
  })
})