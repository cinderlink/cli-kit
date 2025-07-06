/**
 * Tests for actual error system API
 */

import { describe, it, expect } from "bun:test"
import { 
  TerminalError,
  InputError, 
  RenderError,
  StorageError,
  ConfigError,
  ComponentError,
  ApplicationError,
  ValidationError,
  ErrorCode,
  ErrorUtils,
  isAppError
} from "@/core/errors"

describe("Error Types", () => {
  it("creates TerminalError", () => {
    const error = new TerminalError({
      message: "Terminal failed"
    })
    
    expect(error.message).toBe("Terminal failed")
    expect(error._tag).toBe("TerminalError")
    expect(isAppError(error)).toBe(true)
  })

  it("creates InputError with details", () => {
    const error = new InputError({
      message: "Invalid input",
      key: "ESC",
      event: { type: "key", key: "ESC" }
    })
    
    expect(error.message).toBe("Invalid input")
    expect(error.key).toBe("ESC")
    expect(error.event?.key).toBe("ESC")
  })

  it("creates RenderError with phase", () => {
    const error = new RenderError({
      message: "Render failed",
      component: "Table",
      phase: "layout",
      cause: new Error("Layout error")
    })
    
    expect(error.component).toBe("Table")
    expect(error.phase).toBe("layout")
    expect(error.cause).toBeDefined()
  })

  it("creates StorageError", () => {
    const error = new StorageError({
      message: "Storage failed",
      operation: "write",
      path: "/tmp/file.txt"
    })
    
    expect(error.operation).toBe("write")
    expect(error.path).toBe("/tmp/file.txt")
  })

  it("creates ConfigError", () => {
    const error = new ConfigError({
      message: "Invalid config",
      field: "apiKey",
      value: null,
      expected: "string"
    })
    
    expect(error.field).toBe("apiKey")
    expect(error.value).toBe(null)
    expect(error.expected).toBe("string")
  })

  it("creates ComponentError", () => {
    const error = new ComponentError({
      message: "Component failed",
      component: "Button",
      state: { clicked: false },
      action: "click"
    })
    
    expect(error.component).toBe("Button")
    expect(error.state).toEqual({ clicked: false })
    expect(error.action).toBe("click")
  })

  it("creates ApplicationError", () => {
    const error = new ApplicationError({
      phase: "startup",
      operation: "init",
      cause: new Error("Init failed"),
      component: "App",
      context: { version: "1.0.0" }
    })
    
    expect(error.phase).toBe("startup")
    expect(error.operation).toBe("init")
    expect(error.component).toBe("App")
    expect(error.context?.version).toBe("1.0.0")
  })

  it("creates ValidationError", () => {
    const error = new ValidationError({
      message: "Validation failed",
      field: "email",
      value: "invalid",
      rule: "email",
      expected: "valid email format"
    })
    
    expect(error.field).toBe("email")
    expect(error.value).toBe("invalid")
    expect(error.rule).toBe("email")
  })
})

describe("ErrorUtils", () => {
  it("converts unknown errors", () => {
    const regularError = new Error("Regular error")
    const appError = ErrorUtils.fromUnknown(regularError)
    expect(appError._tag).toBe("ApplicationError")
    expect(appError.cause).toBe(regularError)

    const terminalError = new TerminalError({ message: "Terminal error" })
    const sameError = ErrorUtils.fromUnknown(terminalError)
    expect(sameError).toBe(terminalError)

    const stringError = ErrorUtils.fromUnknown("String error")
    expect(stringError._tag).toBe("ApplicationError")

    const unknownError = ErrorUtils.fromUnknown(null)
    expect(unknownError._tag).toBe("ApplicationError")
  })

  it("provides user messages", () => {
    const terminalError = new TerminalError({ message: "Failed" })
    expect(ErrorUtils.getUserMessage(terminalError)).toContain("Terminal")

    const inputError = new InputError({ message: "Invalid" })
    expect(ErrorUtils.getUserMessage(inputError)).toContain("Input")

    const renderError = new RenderError({ message: "Failed" })
    expect(ErrorUtils.getUserMessage(renderError)).toContain("Display")
  })

  it("provides debug info", () => {
    const error = new TerminalError({
      message: "Test error",
      operation: "clear"
    })
    
    const debug = ErrorUtils.getDebugInfo(error)
    expect(debug.tag).toBe("TerminalError")
    expect(debug.message).toBe("Test error")
    expect(debug.operation).toBe("clear")
  })

  it("identifies app errors", () => {
    const appError = new TerminalError({ message: "Test" })
    expect(isAppError(appError)).toBe(true)

    const regularError = new Error("Regular")
    expect(isAppError(regularError)).toBe(false)

    expect(isAppError(null)).toBe(false)
    expect(isAppError("string")).toBe(false)
  })
})

describe("Error Code", () => {
  it("has all error codes", () => {
    expect(ErrorCode.TERMINAL_INIT_FAILED).toBeDefined()
    expect(ErrorCode.INPUT_TIMEOUT).toBeDefined()
    expect(ErrorCode.RENDER_FAILED).toBeDefined()
    expect(ErrorCode.STORAGE_READ_FAILED).toBeDefined()
    expect(ErrorCode.CONFIG_INVALID).toBeDefined()
    expect(ErrorCode.COMPONENT_INIT_FAILED).toBeDefined()
    expect(ErrorCode.APPLICATION_STARTUP_FAILED).toBeDefined()
    expect(ErrorCode.VALIDATION_FAILED).toBeDefined()
    expect(ErrorCode.UNKNOWN).toBeDefined()
  })
})