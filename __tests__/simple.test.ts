/**
 * Simple Framework Tests
 * 
 * Basic tests to verify the core framework is working.
 */

import { test, expect, describe } from "bun:test"
import { Effect, Option, Cause } from "effect"
import {
  TerminalError,
  InputError,
  RenderError,
  ErrorUtils
} from "../src/core/errors.ts"

describe("Error System", () => {
  test("TerminalError should be properly structured", () => {
    const error = new TerminalError({
      operation: "clear",
      cause: new Error("Terminal not available")
    })

    expect(error._tag).toBe("TerminalError")
    expect(error.operation).toBe("clear")
    expect(error.message).toContain("clear")
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  test("InputError should be properly structured", () => {
    const error = new InputError({
      device: "keyboard",
      operation: "read"
    })

    expect(error._tag).toBe("InputError")
    expect(error.device).toBe("keyboard")
    expect(error.message).toContain("keyboard")
  })

  test("RenderError should be properly structured", () => {
    const error = new RenderError({
      phase: "render",
      operation: "paint"
    })

    expect(error._tag).toBe("RenderError")
    expect(error.phase).toBe("render")
    expect(error.message).toContain("render")
  })

  test("ErrorUtils.isCritical should classify errors correctly", () => {
    const terminalError = new TerminalError({ operation: "init" })
    const inputError = new InputError({ device: "keyboard" })
    
    expect(ErrorUtils.isCritical(terminalError)).toBe(true)
    expect(ErrorUtils.isCritical(inputError)).toBe(false)
    expect(ErrorUtils.isRecoverable(inputError)).toBe(true)
  })

  test("ErrorUtils.getUserMessage should provide user-friendly messages", () => {
    const terminalError = new TerminalError({ operation: "clear" })
    const inputError = new InputError({ device: "mouse" })
    
    const terminalMsg = ErrorUtils.getUserMessage(terminalError)
    const inputMsg = ErrorUtils.getUserMessage(inputError)
    
    expect(terminalMsg).toContain("Terminal operation failed")
    expect(inputMsg).toContain("Input error occurred")
  })
})

describe("Effect Integration", () => {
  test("Effect should work with basic operations", async () => {
    const simpleEffect = Effect.succeed("Hello World")
    const result = await Effect.runPromise(simpleEffect)
    expect(result).toBe("Hello World")
  })

  test("Effect should handle errors properly", async () => {
    const failingEffect = Effect.fail(new InputError({ device: "keyboard" }))
    
    const result = await Effect.runPromiseExit(failingEffect)
    
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      const error = Cause.failureOption(result.cause)
      expect(Option.isSome(error)).toBe(true)
      if (Option.isSome(error)) {
        expect(error.value).toBeInstanceOf(InputError)
      }
    }
  })

  test("Effect should compose operations", async () => {
    const effect1 = Effect.succeed(5)
    const effect2 = Effect.succeed(10)
    
    const combined = Effect.all([effect1, effect2]).pipe(
      Effect.map(([a, b]) => a + b)
    )
    
    const result = await Effect.runPromise(combined)
    expect(result).toBe(15)
  })
})

describe("Framework Metadata", () => {
  test("should export version information", () => {
    const { VERSION, FRAMEWORK_INFO } = require("../src/index.ts")
    
    expect(VERSION).toBe("0.1.0")
    expect(FRAMEWORK_INFO.name).toBe("@cinderlink/cli-kit")
    expect(FRAMEWORK_INFO.version).toBe("0.1.0")
  })
})