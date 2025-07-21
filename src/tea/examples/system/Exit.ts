/**
 * Exit Component
 * 
 * Provides a way to exit the application with an optional message and exit code.
 * Works for both interactive TUI apps and non-interactive CLI commands.
 */

import { Effect } from "effect"
import type { View } from "../../core/types"
import { text, vstack } from "../../core/view"

export interface ExitComponentProps {
  code?: number
  message?: string | View
  children?: string | View
  delay?: number // Optional delay in milliseconds before exit
}

/**
 * Global exit handler that can be set by the runtime
 */
let exitHandler: ((code: number) => void) | null = null

export function setExitHandler(handler: (code: number) => void) {
  exitHandler = handler
}

/**
 * Exit Component
 * 
 * @example
 * ```tsx
 * // Exit with success
 * <Exit message="Task completed successfully!" />
 * 
 * // Exit with error
 * <Exit code={1} message="Error: File not found" />
 * 
 * // Exit with custom JSX
 * <Exit code={0}>
 *   <success>✅ All tests passed!</success>
 * </Exit>
 * ```
 */
export function ExitComponent(props: ExitComponentProps): View {
  const exitCode = props.code ?? 0
  const message = props.message || props.children
  
  // Schedule the exit
  Effect.runPromise(
    Effect.delay(
      Effect.sync(() => {
        if (exitHandler) {
          exitHandler(exitCode)
        } else {
          process.exit(exitCode)
        }
      }),
      props.delay || 0
    )
  ).catch(() => {
    // Fallback to direct exit if Effect fails
    process.exit(exitCode)
  })
  
  // Return the message to display before exit
  if (message) {
    const messageView = typeof message === 'string' 
      ? text(message)
      : message
    
    return messageView
  }
  
  return text('')
}

/**
 * Helper to check if a view contains an Exit component
 */
export function containsExit(view: View): boolean {
  // This would need to be implemented based on the View structure
  // For now, we'll use a marker approach
  return false
}