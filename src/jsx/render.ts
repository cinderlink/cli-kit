/**
 * JSX Static Rendering
 * 
 * Renders JSX elements to the terminal and exits immediately.
 * Used for CLI commands that should output and exit, not stay interactive.
 */

import { Effect, FiberRef } from "effect"
import type { View } from "../core/types"
import { TerminalService, RendererService } from "../services"
import { LiveServices } from "../services/impl"
import { InteractiveFiberRef } from "../core/interactive"
import { validateJSXElement } from "./config-validator"

/**
 * Render a JSX element to the terminal
 * Behavior depends on whether we're in interactive mode or not
 */
export async function renderToTerminal(element: JSX.Element | View): Promise<void> {
  const DEBUG = process.env.TUIX_DEBUG === 'true'
  const debug = (msg: string) => { if (DEBUG) console.log(`[TUIX RENDER] ${msg}`) }
  
  debug('renderToTerminal called')
  debug('Element:', element)
  debug('Element type:', typeof element)
  debug('Element is null?', element === null)
  debug('Element is undefined?', element === undefined)
  
  // Validate the element first
  validateJSXElement(element, 'renderToTerminal')
  debug('Element validation passed')
  
  const program = Effect.gen(function* (_) {
    const isInteractive = yield* _(FiberRef.get(InteractiveFiberRef))
    const view = element as View
    
    debug(`🔍 Interactive context check: isInteractive=${isInteractive}`)
    
    if (isInteractive) {
      debug('📺 Using interactive renderer with full terminal control')
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
      debug('📝 Using non-interactive renderer (stdout only)')
      // In non-interactive mode, just output to stdout
      const content = yield* _(view.render())
      debug(`📝 Rendered content length: ${content.length} chars`)
      process.stdout.write(content)
      process.stdout.write('\n')
      debug('📝 Non-interactive render completed')
    }
  })
  
  await Effect.runPromise(
    program.pipe(
      Effect.provide(LiveServices),
      Effect.catchAll((error) => 
        Effect.sync(() => {
          console.error('Render error:', error)
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