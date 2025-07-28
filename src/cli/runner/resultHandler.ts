/**
 * Result Handler Module
 *
 * Handles different types of command execution results
 */

import { Effect } from 'effect'
import { runApp } from '@core/runtime'
import { LiveServices } from '@core/services/impl'

export class ResultHandler {
  /**
   * Handle command execution result
   */
  async handleResult(result: unknown): Promise<void> {
    if (!result) {
      return
    }

    if (this.isComponent(result)) {
      // Full component - run with TUI runtime
      await this.runComponent(result)
    } else if (this.isView(result)) {
      // Simple view - just render and print
      await this.renderView(result)
    } else if (typeof result === 'object') {
      // Log result for debugging
      console.log('Command returned non-component result:', result)
    }
  }

  /**
   * Run a TUI component
   */
  private async runComponent(component: unknown): Promise<void> {
    await Effect.runPromise(
      runApp(component).pipe(
        Effect.provide(LiveServices),
        Effect.catchAll(() => Effect.void), // Handle any unknown errors
        Effect.orDie // Convert requirements to errors
      )
    )
  }

  /**
   * Render a view and print it
   */
  private async renderView(view: { render: Function }): Promise<void> {
    const rendered = await Effect.runPromise(view.render())
    console.log(rendered)
  }

  /**
   * Check if a value is a TUI component
   */
  isComponent(value: unknown): value is { init?: Function; update?: Function; view?: Function } {
    return (
      value !== null &&
      typeof value === 'object' &&
      'init' in value &&
      typeof (value as Record<string, unknown>).init === 'function'
    )
  }

  /**
   * Check if a value is a View
   */
  isView(value: unknown): value is { render: Function } {
    return (
      value !== null &&
      typeof value === 'object' &&
      'render' in value &&
      typeof (value as Record<string, unknown>).render === 'function'
    )
  }

  /**
   * Convert a View to a simple Component
   */
  viewToComponent(view: unknown): unknown {
    return {
      init: Effect.succeed([{ done: false }, []]),
      update: (model: unknown, msg: unknown) => {
        // Exit on any key press or after initial render
        const modelObj = model as Record<string, unknown>
        const msgObj = msg as Record<string, unknown>
        if (msg && (msgObj._tag === 'KeyPress' || modelObj.done)) {
          return Effect.succeed([{ ...modelObj, done: true }, [Effect.succeed({ _tag: 'Quit' })]])
        }
        // Mark as done after first render to allow immediate exit
        return Effect.succeed([{ ...modelObj, done: true }, []])
      },
      view: () => view,
    }
  }
}
