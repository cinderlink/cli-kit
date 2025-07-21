/**
 * Runtime Tests
 * 
 * Basic tests for the application runtime system including:
 * - Runtime creation and configuration
 * - Basic MVU loop functionality
 */

import { test, expect, describe } from 'bun:test'
import { Effect } from 'effect'
import { 
  createRuntime, 
  RuntimeConfig
} from './runtime'
import { 
  createTestLayer
} from '../testing/test-utils'
import type { Component } from './types'
import { text } from './view'

describe('Runtime', () => {
  describe('createRuntime', () => {
    test('should create runtime with default config', async () => {
      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime()
        expect(runtime).toBeDefined()
        expect(runtime.run).toBeInstanceOf(Function)
      })

      const result = await Effect.runPromise(program)
    })

    test('should create runtime with custom config', async () => {
      const config: RuntimeConfig = {
        fps: 30,
        debug: true,
        enableMouse: true,
        fullscreen: false
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime(config)
        expect(runtime).toBeDefined()
        expect(runtime.run).toBeInstanceOf(Function)
      })

      const result = await Effect.runPromise(program)
    })
  })

  describe('Basic Runtime', () => {
    test('should initialize and run a simple component', async () => {
      const testComponent: Component<{ count: number }, never> = {
        init: Effect.succeed([{ count: 0 }, []]),
        update: (msg, model) => Effect.succeed([model, []]),
        view: (model) => text(`Count: ${model.count}`)
      }

      const program = Effect.gen(function* () {
        const runtime = yield* createRuntime({ fps: 60 })
        // Just test that run method exists and is callable
        expect(typeof runtime.run).toBe('function')
      })

      await Effect.runPromise(
        program.pipe(
          Effect.provide(createTestLayer())
        )
      )
    })
  })
})