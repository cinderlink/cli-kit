/**
 * Environment Variable Configuration Tests
 */

import { describe, it, expect } from "bun:test"
import { parseEnvVars, createConfigFromEnv } from "./env"

describe("Environment Variable Configuration", () => {
  describe("parseEnvVars", () => {
    it("should parse simple environment variables", () => {
      const env = {
        CLI_NAME: "my-cli",
        CLI_VERSION: "1.0.0",
        CLI_DESCRIPTION: "My CLI app"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      expect(result).toEqual({
        name: "my-cli",
        version: "1.0.0",
        description: "My CLI app"
      })
    })

    it("should parse boolean values", () => {
      const env = {
        CLI_VERBOSE: "true",
        CLI_QUIET: "false",
        CLI_DEBUG: "1",
        CLI_PRODUCTION: "0"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      expect(result).toEqual({
        verbose: true,
        quiet: false,
        debug: true,
        production: false
      })
    })

    it("should parse numeric values", () => {
      const env = {
        CLI_PORT: "8080",
        CLI_TIMEOUT: "30.5",
        CLI_RETRIES: "-1"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      expect(result).toEqual({
        port: 8080,
        timeout: 30.5,
        retries: -1
      })
    })

    it("should parse nested values", () => {
      const env = {
        CLI_OPTION_VERBOSE: "true",
        CLI_COMMAND_BUILD_OPTION_WATCH: "true",
        CLI_COMMAND_BUILD_OPTION_OUTPUT: "dist"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      expect(result).toEqual({
        option: {
          verbose: true
        },
        command: {
          build: {
            option: {
              watch: true,
              output: "dist"
            }
          }
        }
      })
    })

    it("should ignore non-matching prefixes", () => {
      const env = {
        CLI_NAME: "my-cli",
        OTHER_VALUE: "ignored",
        CLIPPY_VALUE: "also-ignored"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      expect(result).toEqual({
        name: "my-cli"
      })
    })

    it("should handle empty segments", () => {
      const env = {
        CLI__DOUBLE__UNDERSCORE: "value",
        CLI_: "ignored"
      }
      
      const result = parseEnvVars(env, "CLI")
      
      // Should handle gracefully without errors
      expect(result).toBeDefined()
    })
  })

  describe("createConfigFromEnv", () => {
    it("should create config from current environment", () => {
      // Save original env
      const originalEnv = process.env
      
      try {
        // Mock environment
        process.env = {
          ...originalEnv,
          CLI_TEST_NAME: "test-cli",
          CLI_TEST_VERSION: "2.0.0"
        }
        
        const config = createConfigFromEnv("CLI_TEST")
        
        expect(config.name).toBe("test-cli")
        expect(config.version).toBe("2.0.0")
      } finally {
        // Restore original env
        process.env = originalEnv
      }
    })
  })
})