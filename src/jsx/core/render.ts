/**
 * JSX Static Rendering
 *
 * Renders JSX elements to the terminal and exits immediately.
 * Used for CLI commands that should output and exit, not stay interactive.
 */

import { Effect, FiberRef } from 'effect'
import type { View } from '@core/view/primitives/view'
import { TerminalService, RendererService } from '@core/services'
import { LiveServices } from '@core/services/impl'
import { InteractiveFiberRef } from '@core/runtime/interactive'
import { validateJSXElement } from './configValidator'
import { renderDebug } from '@core/debug'
import { log } from '@logger/core/logger'

// Legacy debug function for backwards compatibility
const debug = (message: string) => renderDebug.debug(message)

/**
 * Render a JSX element to the terminal
 * Behavior depends on whether we're in interactive mode or not
 */
export async function renderToTerminal(element: JSX.Element | View): Promise<void> {
  renderDebug.trace('renderToTerminal called', {
    elementType: typeof element,
    isNull: element === null,
    isUndefined: element === undefined,
  })

  // Validate the element first
  validateJSXElement(element, 'renderToTerminal')
  renderDebug.trace('Element validation passed')

  const program = Effect.gen(function* (_) {
    const isInteractive = yield* _(FiberRef.get(InteractiveFiberRef))
    const view = element as View

    renderDebug.debug('Interactive context check', { isInteractive })

    if (isInteractive) {
      renderDebug.debug('Using interactive renderer with full terminal control')
      // In interactive mode, use the full renderer with proper positioning
      const terminal = yield* _(TerminalService)
      const renderer = yield* _(RendererService)

      // Clear screen for interactive mode
      yield* _(terminal.clear)
      yield* _(terminal.hideCursor)

      // Use the renderer for proper terminal control
      yield* _(renderer.render(view))
      debug('📺 Interactive render completed')
    } else {
      renderDebug.debug('Using non-interactive renderer (stdout only)')
      // In non-interactive mode, just output to stdout
      const content = yield* _(view.render())
      renderDebug.trace('Rendered content', { length: content.length })
      process.stdout.write(content)
      process.stdout.write('\n')
      renderDebug.debug('Non-interactive render completed')
    }
  })

  await Effect.runPromise(
    program.pipe(
      Effect.provide(LiveServices),
      Effect.catchAll(error =>
        log.error('Render error', error instanceof Error ? error : undefined, {
          context: 'jsx-render',
          errorDetails: typeof error === 'object' ? JSON.stringify(error) : String(error),
        })
      )
    )
  )
}

/**
 * Render a JSX element to a string
 * Useful for testing or piping output
 */
export async function renderToString(element: JSX.Element | View): Promise<string> {
  let output = ''

  const program = Effect.gen(function* (_) {
    const renderer = yield* _(RendererService)

    // Render the element
    const result = yield* _(renderer.render(element as View, { x: 0, y: 0 }))
    output = result
  })

  await Effect.runPromise(
    program.pipe(
      Effect.provide(LiveServices),
      Effect.catchAll(() => Effect.void)
    )
  )

  return output
}
