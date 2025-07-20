/**
 * Tests for error system and error handling utilities
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  ConfigError,
  ComponentError,
  ApplicationError,
  ValidationError,
  isAppError,
  ErrorUtils,
  withErrorBoundary,
  withRecovery,
  RecoveryStrategies,
  type AppError
} from "./errors.ts"

// =============================================================================
// Error Class Tests
// =============================================================================

test("TerminalError should create properly structured error", () => {
  const error = new TerminalError({
    operation: "write",
    component: "terminal",
    context: { detail: "test" }
  })
  
  expect(error._tag).toBe("TerminalError")
  expect(error.operation).toBe("write")
  expect(error.component).toBe("terminal")
  expect(error.message).toBe("Terminal operation failed: write")
  expect(error.timestamp).toBeInstanceOf(Date)
  expect(error.context).toEqual({ detail: "test" })
})

test("InputError should create properly structured error", () => {
  const error = new InputError({
    device: "keyboard",
    operation: "read",
    component: "input-handler"
  })
  
  expect(error._tag).toBe("InputError")
  expect(error.device).toBe("keyboard")
  expect(error.operation).toBe("read")
  expect(error.message).toBe("Input error on keyboard: read")
})

test("RenderError should create properly structured error", () => {
  const error = new RenderError({
    phase: "layout",
    operation: "measure",
    component: "box"
  })
  
  expect(error._tag).toBe("RenderError")
  expect(error.phase).toBe("layout")
  expect(error.message).toBe("Render error in layout: measure")
})

test("StorageError should create properly structured error", () => {
  const error = new StorageError({
    operation: "read",
    path: "/config/app.json",
    component: "storage"
  })
  
  expect(error._tag).toBe("StorageError")
  expect(error.operation).toBe("read")
  expect(error.path).toBe("/config/app.json")
  expect(error.message).toBe("Storage read failed for /config/app.json")
})

test("ConfigError should create properly structured error", () => {
  const error = new ConfigError({
    key: "theme",
    value: "invalid",
    expected: "light | dark",
    component: "config"
  })
  
  expect(error._tag).toBe("ConfigError")
  expect(error.key).toBe("theme")
  expect(error.value).toBe("invalid")
  expect(error.expected).toBe("light | dark")
  expect(error.message).toBe("Configuration error for key 'theme': expected light | dark")
})

test("ComponentError should create properly structured error", () => {
  const error = new ComponentError({
    phase: "update",
    componentType: "Button",
    component: "my-button"
  })
  
  expect(error._tag).toBe("ComponentError")
  expect(error.phase).toBe("update")
  expect(error.componentType).toBe("Button")
  expect(error.message).toBe("Component error in Button during update")
})

test("ApplicationError should create properly structured error", () => {
  const error = new ApplicationError({
    phase: "startup",
    operation: "init",
    component: "app"
  })
  
  expect(error._tag).toBe("ApplicationError")
  expect(error.phase).toBe("startup")
  expect(error.operation).toBe("init")
  expect(error.message).toBe("Application error during startup: init")
})

test("ValidationError should create properly structured error", () => {
  const error = new ValidationError({
    field: "email",
    value: "invalid-email",
    rules: ["email", "required"],
    component: "form"
  })
  
  expect(error._tag).toBe("ValidationError")
  expect(error.field).toBe("email")
  expect(error.value).toBe("invalid-email")
  expect(error.rules).toEqual(["email", "required"])
  expect(error.message).toBe("Validation failed for field 'email': email, required")
})

// =============================================================================
// Type Guard Tests
// =============================================================================

test("isAppError should correctly identify AppError instances", () => {
  const terminalError = new TerminalError({ operation: "test" })
  const inputError = new InputError({ device: "keyboard" })
  const regularError = new Error("regular error")
  const nullValue = null
  const stringValue = "not an error"
  const objectWithoutTag = { message: "test" }
  const objectWithWrongTag = { _tag: "NotAnAppError", message: "test" }
  
  expect(isAppError(terminalError)).toBe(true)
  expect(isAppError(inputError)).toBe(true)
  expect(isAppError(regularError)).toBe(false)
  expect(isAppError(nullValue)).toBe(false)
  expect(isAppError(stringValue)).toBe(false)
  expect(isAppError(objectWithoutTag)).toBe(false)
  expect(isAppError(objectWithWrongTag)).toBe(false)
})

// =============================================================================
// Error Utilities Tests
// =============================================================================

test("ErrorUtils.isCritical should identify critical errors", () => {
  const terminalError = new TerminalError({ operation: "test" })
  const applicationError = new ApplicationError({ phase: "startup" })
  const inputError = new InputError({ device: "keyboard" })
  const renderError = new RenderError({ phase: "render" })
  
  expect(ErrorUtils.isCritical(terminalError)).toBe(true)
  expect(ErrorUtils.isCritical(applicationError)).toBe(true)
  expect(ErrorUtils.isCritical(inputError)).toBe(false)
  expect(ErrorUtils.isCritical(renderError)).toBe(false)
})

test("ErrorUtils.isRecoverable should identify recoverable errors", () => {
  const terminalError = new TerminalError({ operation: "test" })
  const inputError = new InputError({ device: "keyboard" })
  const renderError = new RenderError({ phase: "render" })
  
  expect(ErrorUtils.isRecoverable(terminalError)).toBe(false)
  expect(ErrorUtils.isRecoverable(inputError)).toBe(true)
  expect(ErrorUtils.isRecoverable(renderError)).toBe(true)
})

test("ErrorUtils.fromUnknown should convert unknown values to AppError", () => {
  const regularError = new Error("test error")
  const stringError = "string error"
  const existingAppError = new InputError({ device: "keyboard" })
  
  const convertedRegularError = ErrorUtils.fromUnknown(regularError, {
    operation: "test",
    component: "test-component"
  })
  expect(convertedRegularError._tag).toBe("ApplicationError")
  expect(convertedRegularError.cause).toBe(regularError)
  if ('operation' in convertedRegularError) {
    expect(convertedRegularError.operation).toBe("test")
  }
  expect(convertedRegularError.component).toBe("test-component")
  
  const convertedStringError = ErrorUtils.fromUnknown(stringError)
  expect(convertedStringError._tag).toBe("ApplicationError")
  expect(convertedStringError.cause).toBe(stringError)
  
  const convertedAppError = ErrorUtils.fromUnknown(existingAppError)
  expect(convertedAppError).toBe(existingAppError)
})

test("ErrorUtils.getUserMessage should return user-friendly messages", () => {
  const terminalError = new TerminalError({ operation: "test" })
  const inputError = new InputError({ device: "keyboard" })
  const renderError = new RenderError({ phase: "render" })
  const storageError = new StorageError({ operation: "read" })
  const configError = new ConfigError({ key: "test" })
  const componentError = new ComponentError({ phase: "init", componentType: "Button" })
  const applicationError = new ApplicationError({ phase: "startup" })
  const validationError = new ValidationError({ field: "test" })
  
  expect(ErrorUtils.getUserMessage(terminalError)).toBe("Terminal operation failed. Please check your terminal settings.")
  expect(ErrorUtils.getUserMessage(inputError)).toBe("Input error occurred. Please try again.")
  expect(ErrorUtils.getUserMessage(renderError)).toBe("Display error occurred. The interface may not appear correctly.")
  expect(ErrorUtils.getUserMessage(storageError)).toBe("File operation failed. Please check file permissions.")
  expect(ErrorUtils.getUserMessage(configError)).toBe("Configuration error. Please check your settings.")
  expect(ErrorUtils.getUserMessage(componentError)).toBe("Component error occurred. The interface may not work correctly.")
  expect(ErrorUtils.getUserMessage(applicationError)).toBe("Application error occurred.")
  expect(ErrorUtils.getUserMessage(validationError)).toBe("Invalid input. Please check your entry and try again.")
})

test("ErrorUtils.getDebugInfo should extract debug information", () => {
  const error = new TerminalError({
    operation: "test",
    component: "terminal",
    context: { detail: "test" },
    cause: new Error("underlying error")
  })
  
  const debugInfo = ErrorUtils.getDebugInfo(error)
  
  expect(debugInfo.tag).toBe("TerminalError")
  expect(debugInfo.type).toBe("TerminalError")
  expect(debugInfo.message).toBe("Terminal operation failed: test")
  expect(debugInfo.operation).toBe("test")
  expect(debugInfo.component).toBe("terminal")
  expect(debugInfo.context).toEqual({ detail: "test" })
  expect(debugInfo.cause).toBe("Error: underlying error")
  expect(debugInfo.stack).toBeDefined()
  expect(typeof debugInfo.timestamp).toBe("string")
})

// =============================================================================
// Recovery Strategy Tests
// =============================================================================

test("RecoveryStrategies.retry should create retry strategy", () => {
  const strategy = RecoveryStrategies.retry(2, 50)
  
  expect(strategy.maxRetries).toBe(2)
  expect(strategy.retryDelay).toBe(50)
  expect(strategy.canRecover(new InputError({ device: "keyboard" }))).toBe(true)
})

test("RecoveryStrategies.fallback should create fallback strategy", () => {
  const fallbackValue = "default"
  const strategy = RecoveryStrategies.fallback(fallbackValue)
  
  expect(strategy.maxRetries).toBe(1)
  expect(strategy.canRecover(new InputError({ device: "keyboard" }))).toBe(true)
  
  const recoverEffect = strategy.recover(new InputError({ device: "keyboard" }))
  Effect.runPromise(recoverEffect).then(result => {
    expect(result).toBe(fallbackValue)
  })
})

test("RecoveryStrategies.ignore should create ignore strategy", () => {
  const strategy = RecoveryStrategies.ignore()
  
  expect(strategy.maxRetries).toBe(1)
  expect(strategy.canRecover(new InputError({ device: "keyboard" }))).toBe(true)
  
  const recoverEffect = strategy.recover(new InputError({ device: "keyboard" }))
  Effect.runPromise(recoverEffect).then(result => {
    expect(result).toBe(null)
  })
})

test("RecoveryStrategies.restoreTerminal should create terminal restore strategy", () => {
  const strategy = RecoveryStrategies.restoreTerminal()
  
  expect(strategy.maxRetries).toBe(1)
  expect(strategy.canRecover(new TerminalError({ operation: "write" }))).toBe(true)
  expect(strategy.canRecover(new TerminalError({ operation: "fatal" }))).toBe(false)
})

// =============================================================================
// Error Boundary Tests
// =============================================================================

test("withErrorBoundary should catch and handle errors", async () => {
  const testError = new InputError({ device: "keyboard" })
  const failingEffect = Effect.fail(testError)
  const fallbackValue = "fallback"
  
  let caughtError: AppError | null = null
  
  const boundaryConfig = {
    fallback: () => Effect.succeed(fallbackValue),
    onError: (error: AppError) => Effect.sync(() => { caughtError = error }),
    logErrors: false
  }
  
  const result = await Effect.runPromise(
    withErrorBoundary(failingEffect, boundaryConfig)
  )
  
  expect(result).toBe(fallbackValue)
  expect(caughtError).toBeDefined()
  expect(caughtError).toBeTruthy()
  expect(caughtError!._tag).toBe("InputError")
})

test("withErrorBoundary should catch defects when configured", async () => {
  const defectiveEffect = Effect.die("Something went wrong")
  const fallbackValue = "fallback"
  
  let caughtError: AppError | null = null
  
  const boundaryConfig = {
    fallback: () => Effect.succeed(fallbackValue),
    onError: (error: AppError) => Effect.sync(() => { caughtError = error }),
    catchDefects: true,
    logErrors: false
  }
  
  const result = await Effect.runPromise(
    withErrorBoundary(defectiveEffect, boundaryConfig)
  )
  
  expect(result).toBe(fallbackValue)
  expect(caughtError).toBeTruthy()
  expect(caughtError!._tag).toBe("ApplicationError")
  if (caughtError!._tag === "ApplicationError") {
    expect((caughtError as ApplicationError).operation).toBe("defect")
  }
})

// =============================================================================
// Recovery Effect Tests
// =============================================================================

test("withRecovery should apply recovery strategy to failing effects", async () => {
  const testError = new InputError({ device: "keyboard" })
  const failingEffect = Effect.fail(testError)
  const fallbackValue = "recovered"
  
  const strategy = RecoveryStrategies.fallback(fallbackValue)
  
  const result = await Effect.runPromise(
    withRecovery(failingEffect, strategy)
  )
  
  expect(result).toBe(fallbackValue)
})

test("withRecovery should not recover unrecoverable errors", async () => {
  const testError = new InputError({ device: "keyboard" })
  const failingEffect = Effect.fail(testError)
  
  const strategy = {
    canRecover: () => false,
    recover: () => Effect.succeed("should not reach"),
    maxRetries: 1
  }
  
  const result = await Effect.runPromiseExit(withRecovery(failingEffect, strategy))
  
  if (result._tag === "Failure") {
    expect(result.cause._tag).toBe("Fail")
    if (result.cause._tag === "Fail") {
      expect(result.cause.error).toBe(testError)
    }
  } else {
    expect(false).toBe(true) // Should not reach here
  }
})