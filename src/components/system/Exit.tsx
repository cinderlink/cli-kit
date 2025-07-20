/**
 * Exit Component
 * 
 * Allows explicit control over when and how to exit the application
 */

import { Effect } from "effect"
import { text, vstack } from "../../core/view"
import type { View } from "../../core/types"
import { Interactive } from "../../core/interactive"

export interface ExitProps {
  code?: number
  message?: string | View
  children?: string | View
  delay?: number
}

/**
 * Exit component that signals the app to exit
 */
export function ExitComponent(props: ExitProps): View {
  const { code = 0, message, children, delay } = props
  
  // Schedule exit
  Effect.runPromise(
    Effect.gen(function* () {
      if (delay && delay > 0) {
        yield* Effect.sleep(delay)
      }
      
      // Check if we're in interactive mode
      const isInteractive = yield* Interactive.isActive
      
      if (isInteractive) {
        // Exit interactive mode
        yield* Interactive.exit(code)
      } else {
        // Just exit the process
        yield* Effect.sync(() => process.exit(code))
      }
    }).pipe(
      Effect.catchAll(() => Effect.void)
    )
  ).catch(() => {
    // Fallback to direct exit if Effect fails
    process.exit(code)
  })
  
  // Return the message to display
  if (message || children) {
    const content = message || children
    if (typeof content === 'string') {
      return text(content)
    }
    return content as View
  }
  
  return text('')
}

export default ExitComponent