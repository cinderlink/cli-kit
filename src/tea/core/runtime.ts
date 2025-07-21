/**
 * TEA Runtime
 * 
 * Pure functional runtime for TEA programs, providing a clean
 * functional interface over the MVU runtime.
 */

import { Effect } from 'effect'
import { runApp } from '../../core/runtime/mvu/runtime'
import type { Program } from './program'
import type { Component, AppServices } from '../../core/types'

/**
 * Converts a TEA program to MVU component
 */
export function programToComponent<Model, Msg>(
  program: Program<Model, Msg>
): Component<Model, Msg> {
  return {
    init: Effect.sync(() => program.init()),
    update: (msg, model) => Effect.sync(() => program.update(msg, model)),
    view: (model) => ({
      render: () => Effect.sync(() => program.view(model).render())
    }),
    subscriptions: program.subscriptions
      ? (model) => Effect.sync(() => [program.subscriptions!(model)])
      : undefined
  }
}

/**
 * Run a TEA program
 */
export function runProgram<Model, Msg>(
  program: Program<Model, Msg>,
  options?: { fps?: number }
): Effect.Effect<void, never, AppServices> {
  const component = programToComponent(program)
  return runApp(component, options)
}