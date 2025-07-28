/**
 * Tests for Core Component Context
 */

import { test, expect, describe } from 'bun:test'
import { Effect } from 'effect'
import {
  ComponentContext,
  ComponentContextRef,
  useComponentContext,
  withComponentContext,
  type ComponentContextValue,
} from './component'

describe('Core Component Context', () => {
  test('should create context with proper tag', () => {
    expect(ComponentContext.key).toBe('@core/ComponentContext')
  })

  test('should provide and retrieve context using withComponentContext', async () => {
    const mockContext: ComponentContextValue<number, string> = {
      model: () => 42,
      dispatch: msg => console.log(msg),
      componentId: 'test-component',
    }

    const program = withComponentContext(
      mockContext,
      Effect.gen(function* () {
        const context = yield* useComponentContext<number, string>()
        return context
      })
    )

    const result = await Effect.runPromise(program)
    expect(result.model()).toBe(42)
    expect(result.componentId).toBe('test-component')
  })

  test('should throw error when context not available', async () => {
    const program = useComponentContext()

    await expect(Effect.runPromise(program)).rejects.toThrow('Component context not available')
  })

  test('should handle nested contexts correctly', async () => {
    const outerContext: ComponentContextValue<string, string> = {
      model: () => 'outer',
      dispatch: () => {},
    }

    const innerContext: ComponentContextValue<string, string> = {
      model: () => 'inner',
      dispatch: () => {},
    }

    const program = withComponentContext(
      outerContext,
      Effect.gen(function* () {
        const outer = yield* useComponentContext<string, string>()

        const inner = yield* withComponentContext(
          innerContext,
          useComponentContext<string, string>()
        )

        const afterInner = yield* useComponentContext<string, string>()

        return { outer, inner, afterInner }
      })
    )

    const result = await Effect.runPromise(program)
    expect(result.outer.model()).toBe('outer')
    expect(result.inner.model()).toBe('inner')
    expect(result.afterInner.model()).toBe('outer')
  })
})
