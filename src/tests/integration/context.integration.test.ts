/**
 * Integration tests for Core Context usage across modules
 */

import { test, expect, describe } from 'bun:test'
import { Effect } from 'effect'
import { withComponentContext, useComponentContext } from './index'
import type { ComponentContextValue } from './component'

describe('Core Context Integration', () => {
  test('should work with CLI module patterns', async () => {
    // Simulate CLI MVU pattern
    let currentModel = { count: 0, message: 'Hello' }
    const dispatch = (msg: { type: string; payload?: any }) => {
      if (msg.type === 'INCREMENT') {
        currentModel = { ...currentModel, count: currentModel.count + 1 }
      }
    }

    const context: ComponentContextValue = {
      model: () => currentModel,
      dispatch,
      componentId: 'cli-app',
    }

    // Simulate component rendering with context
    const renderWithContext = (fn: () => Effect.Effect<any, any, any>) => {
      return withComponentContext(context, fn())
    }

    const component = () =>
      Effect.gen(function* () {
        const ctx = yield* useComponentContext()
        const model = ctx.model() as typeof currentModel
        ctx.dispatch({ type: 'INCREMENT' })
        return {
          initialCount: model.count,
          modelAfterDispatch: currentModel.count,
        }
      })

    const result = await Effect.runPromise(renderWithContext(component))
    expect(result.initialCount).toBe(0)
    expect(result.modelAfterDispatch).toBe(1)
  })

  test('should handle type safety with generics', async () => {
    type TestModel = { value: string; enabled: boolean }
    type TestMsg = { type: 'TOGGLE' } | { type: 'SET_VALUE'; value: string }

    const context: ComponentContextValue<TestModel, TestMsg> = {
      model: () => ({ value: 'test', enabled: true }),
      dispatch: msg => {
        // Type checking works here
        if (msg.type === 'TOGGLE') {
          // Handle toggle
        }
      },
    }

    const program = withComponentContext(
      context,
      Effect.gen(function* () {
        const ctx = yield* useComponentContext<TestModel, TestMsg>()
        const model = ctx.model()
        ctx.dispatch({ type: 'SET_VALUE', value: 'new' })
        return model.value
      })
    )

    const result = await Effect.runPromise(program)
    expect(result).toBe('test')
  })
})
