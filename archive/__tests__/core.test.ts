/**
 * Core Framework Tests
 * 
 * Tests for the core types, error system, and basic functionality.
 */

import { test, expect, describe } from "bun:test"
import { Effect } from "effect"
import type { Component, ComponentMsg, View } from "../../src/core/types"
import {
  TerminalError,
  InputError,
  RenderError,
  ErrorUtils,
  withErrorBoundary,
  RecoveryStrategies
} from "../../src/core/errors"
import { testComponent, TUIAssert, createTestLayer } from "../../src/testing/test-utils"

// =============================================================================
// Test Components
// =============================================================================

interface CounterModel {
  readonly count: number
}

type CounterMsg = 
  | { readonly _tag: 'Increment' }
  | { readonly _tag: 'Decrement' }
  | { readonly _tag: 'Reset' }

const CounterComponent: Component<CounterModel, ComponentMsg<CounterMsg>> = {
  init: Effect.succeed([{ count: 0 }, []] as const),

  update: (msg, model) => {
    switch (msg._tag) {
      case 'Increment':
        return Effect.succeed([{ count: model.count + 1 }, []] as const)
      case 'Decrement':
        return Effect.succeed([{ count: model.count - 1 }, []] as const)
      case 'Reset':
        return Effect.succeed([{ count: 0 }, []] as const)
      default:
        return Effect.succeed([model, []] as const)
    }
  },

  view: (model): View => ({
    render: () => Effect.succeed(`Count: ${model.count}`)
  })
}

// =============================================================================
// Core Type Tests
// =============================================================================

describe("Core Types", () => {
  test("Component interface should be properly typed", async () => {
    const tester = testComponent(CounterComponent)
    
    // Test initialization
    const [initialModel, initialCmds] = await tester.testInit()
    expect(initialModel.count).toBe(0)
    expect(initialCmds).toEqual([])
  })

  test("Component update should handle messages correctly", async () => {
    const tester = testComponent(CounterComponent)
    const initialModel = { count: 0 }
    
    // Test increment
    const [newModel1] = await tester.testUpdate({ _tag: 'Increment' }, initialModel)
    expect(newModel1.count).toBe(1)
    
    // Test decrement
    const [newModel2] = await tester.testUpdate({ _tag: 'Decrement' }, newModel1)
    expect(newModel2.count).toBe(0)
    
    // Test reset
    const modelWithCount = { count: 42 }
    const [newModel3] = await tester.testUpdate({ _tag: 'Reset' }, modelWithCount)
    expect(newModel3.count).toBe(0)
  })

  test("Component view should render correctly", async () => {
    const tester = testComponent(CounterComponent)
    const model = { count: 42 }
    
    const rendered = await tester.testView(model)
    TUIAssert.outputContains(rendered, "Count: 42")
  })

  test("Component should handle system messages", async () => {
    const tester = testComponent(CounterComponent)
    const initialModel = { count: 0 }
    
    // System messages should not change the model
    const [newModel] = await tester.testUpdate({ _tag: 'KeyPress', key: {
      type: 'enter' as any,
      key: 'enter',
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    }}, initialModel)
    
    expect(newModel.count).toBe(0)
  })
})

// =============================================================================
// Error System Tests
// =============================================================================

describe("Error System", () => {
  test("TerminalError should be properly structured", () => {
    const error = new TerminalError({
      operation: "clear",
      cause: new Error("Terminal not available"),
      component: "TestComponent",
      context: { attempt: 1 }
    })

    expect(error._tag).toBe("TerminalError")
    expect(error.message).toContain("clear")
    expect(error.component).toBe("TestComponent")
    expect(error.context?.attempt).toBe(1)
    expect(error.timestamp).toBeInstanceOf(Date)
  })

  test("InputError should be properly structured", () => {
    const error = new InputError({
      device: "keyboard",
      operation: "read",
      cause: "Device disconnected"
    })

    expect(error._tag).toBe("InputError")
    expect(error.message).toContain("keyboard")
    expect(error.message).toContain("read")
  })

  test("RenderError should be properly structured", () => {
    const error = new RenderError({
      phase: "render",
      operation: "paint",
      component: "Button"
    })

    expect(error._tag).toBe("RenderError")
    expect(error.message).toContain("render")
    expect(error.message).toContain("paint")
    expect(error.component).toBe("Button")
  })

  test("ErrorUtils.isCritical should classify errors correctly", () => {
    const terminalError = new TerminalError({ operation: "init" })
    const inputError = new InputError({ device: "keyboard" })
    
    expect(ErrorUtils.isCritical(terminalError)).toBe(true)
    expect(ErrorUtils.isCritical(inputError)).toBe(false)
    expect(ErrorUtils.isRecoverable(inputError)).toBe(true)
  })

  test("ErrorUtils.fromUnknown should handle various error types", () => {
    // Test with Error instance
    const jsError = new Error("Something went wrong")
    const appError1 = ErrorUtils.fromUnknown(jsError, { 
      operation: "test",
      component: "TestComponent"
    })
    expect(appError1._tag).toBe("ApplicationError")
    expect(appError1.component).toBe("TestComponent")

    // Test with string
    const appError2 = ErrorUtils.fromUnknown("String error")
    expect(appError2._tag).toBe("ApplicationError")

    // Test with already converted error
    const terminalError = new TerminalError({ operation: "test" })
    const appError3 = ErrorUtils.fromUnknown(terminalError)
    expect(appError3).toBe(terminalError)
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

// =============================================================================
// Error Boundary Tests
// =============================================================================

describe("Error Boundaries", () => {
  test("withErrorBoundary should catch and handle errors", async () => {
    const failingEffect = Effect.fail(new InputError({ device: "keyboard" }))
    const fallbackValue = "fallback result"
    
    const boundedEffect = withErrorBoundary(failingEffect, {
      fallback: () => Effect.succeed(fallbackValue),
      logErrors: false
    })
    
    const result = await Effect.runPromise(boundedEffect)
    expect(result).toBe(fallbackValue)
  })

  test("withErrorBoundary should pass through successful effects", async () => {
    const successEffect = Effect.succeed("success result")
    
    const boundedEffect = withErrorBoundary(successEffect, {
      fallback: () => Effect.succeed("fallback"),
      logErrors: false
    })
    
    const result = await Effect.runPromise(boundedEffect)
    expect(result).toBe("success result")
  })

  test("Recovery strategies should work correctly", async () => {
    const layer = createTestLayer()
    
    // Test fallback strategy
    const failingEffect = Effect.fail(new RenderError({ phase: "render" }))
    const fallbackStrategy = RecoveryStrategies.fallback("default value")
    
    const canRecover = fallbackStrategy.canRecover(new RenderError({ phase: "render" }))
    expect(canRecover).toBe(true)
    
    const recovered = await Effect.runPromise(
      fallbackStrategy.recover(new RenderError({ phase: "render" })).pipe(
        Effect.provide(layer)
      )
    )
    expect(recovered).toBe("default value")

    // Test ignore strategy
    const ignoreStrategy = RecoveryStrategies.ignore()
    const ignored = await Effect.runPromise(
      ignoreStrategy.recover(new InputError({ device: "mouse" })).pipe(
        Effect.provide(layer)
      )
    )
    expect(ignored).toBe(null)
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe("Framework Integration", () => {
  test("Component should work with mock services", async () => {
    const tester = testComponent(CounterComponent, {
      environment: {
        size: { width: 100, height: 30 },
        capabilities: {
          colors: 'truecolor',
          unicode: true,
          mouse: true,
          alternateScreen: true,
          cursorShapes: true
        }
      }
    })

    // Test full workflow
    const [initialModel] = await tester.testInit()
    const [updatedModel] = await tester.testUpdate({ _tag: 'Increment' }, initialModel)
    const rendered = await tester.testView(updatedModel)

    expect(initialModel.count).toBe(0)
    expect(updatedModel.count).toBe(1)
    TUIAssert.outputContains(rendered, "Count: 1")
  })

  test("Multiple components should not interfere", async () => {
    const tester1 = testComponent(CounterComponent)
    const tester2 = testComponent(CounterComponent)

    const [model1] = await tester1.testInit()
    const [model2] = await tester2.testInit()

    const [updated1] = await tester1.testUpdate({ _tag: 'Increment' }, model1)
    const [updated2] = await tester2.testUpdate({ _tag: 'Decrement' }, model2)

    expect(updated1.count).toBe(1)
    expect(updated2.count).toBe(-1)
  })

  test("Error handling should work end-to-end", async () => {
    const layer = createTestLayer()
    
    // Create an effect that might fail
    const riskyEffect = Effect.gen(function* (_) {
      const shouldFail = Math.random() > 0.5
      if (shouldFail) {
        yield* _(Effect.fail(new RenderError({ 
          phase: "render",
          component: "TestComponent"
        })))
      }
      return "success"
    })

    // Test with error boundary
    const safeEffect = withErrorBoundary(riskyEffect, {
      fallback: (error) => Effect.succeed(`Handled: ${error._tag}`),
      logErrors: false
    })

    const result = await Effect.runPromise(
      safeEffect.pipe(Effect.provide(layer))
    )

    expect(typeof result).toBe("string")
    expect(result === "success" || result.startsWith("Handled:")).toBe(true)
  })
})