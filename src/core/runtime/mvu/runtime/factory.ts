/**
 * Runtime Factory Functions
 *
 * Functions for creating and configuring the runtime
 */

import { Effect, Queue, Ref, Layer } from 'effect'
import type { Component } from '../../../types'
import type { RuntimeConfig, RuntimeState } from './types'
import { Runtime } from './core'

/**
 * Run an application with the given component
 *
 * @example
 * ```typescript
 * const program = runApp(myComponent, {
 *   fps: 60,
 *   enableMouse: true
 * })
 *
 * await Effect.runPromise(
 *   Effect.provide(program, LiveServices)
 * )
 * ```
 */
export const runApp = <Model, Msg>(
  component: Component<Model, Msg>,
  config: RuntimeConfig = {}
): Effect<void> => {
  return Effect.gen(function* (_) {
    const runtime = yield* _(createRuntime<Model, Msg>(config))
    yield* _(runtime.run(component))
  })
}

/**
 * Create a runtime instance
 */
export const createRuntime = <Model = any, Msg = any>(
  config: RuntimeConfig = {}
): Effect<Runtime<Model, Msg>> => {
  return Effect.gen(function* (_) {
    const messageQueue = yield* _(Queue.unbounded<import('./types').SystemMsg<Msg>>())

    const state = yield* _(
      Ref.make<RuntimeState<Model>>({
        model: null as any,
        isRunning: false,
        frameCount: 0,
        lastRenderTime: 0,
        commandCount: 0,
        activeCommands: new Set(),
      })
    )

    return new Runtime<Model, Msg>(config, state, messageQueue)
  })
}
