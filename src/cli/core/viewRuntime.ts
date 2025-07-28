/**
 * View Runtime Interface
 *
 * Defines the contract for view runtimes that can render CLI output.
 * This allows the CLI module to be view-agnostic while supporting
 * different rendering backends (TEA, JSX, plain text, etc).
 */

import type { HelpData } from './helpData'
import type { CLIContext } from '@cli/types'

/**
 * View runtime interface that rendering backends must implement
 */
export interface ViewRuntime {
  /**
   * Runtime identifier
   */
  readonly name: string

  /**
   * Render help data to the terminal
   */
  renderHelp(data: HelpData): void

  /**
   * Render an error message
   */
  renderError(error: Error, context?: CLIContext): void

  /**
   * Render command output
   */
  renderOutput(output: unknown, context?: CLIContext): void

  /**
   * Start an interactive session if supported
   */
  startInteractive?(context: CLIContext): Promise<void>

  /**
   * Check if runtime supports interactive mode
   */
  readonly supportsInteractive: boolean
}

/**
 * Default text-only view runtime
 */
export class TextViewRuntime implements ViewRuntime {
  readonly name = 'text'
  readonly supportsInteractive = false

  renderHelp(data: HelpData): void {
    const lines: string[] = []

    for (const section of data.sections) {
      switch (section.type) {
        case 'header':
          if (section.content) {
            lines.push(section.content)
            if (data.version) {
              lines.push(`v${data.version}`)
            }
          }
          break

        case 'description':
          if (section.content) {
            lines.push(section.content)
          }
          break

        case 'usage':
          lines.push('')
          lines.push('USAGE:')
          if (section.content) {
            lines.push(`  ${section.content}`)
          }
          break

        case 'commands':
        case 'options':
        case 'arguments':
          lines.push('')
          if (section.title) {
            lines.push(`${section.title}:`)
          }
          if (section.items) {
            const maxNameLength = Math.max(...section.items.map(item => item.name.length))
            for (const item of section.items) {
              const paddedName = item.name.padEnd(maxNameLength + 4)
              let line = `  ${paddedName}`
              if (item.description) {
                line += item.description
              }
              lines.push(line)

              // Add aliases on separate line
              if (item.aliases && item.aliases.length > 0) {
                lines.push(`      (aliases: ${item.aliases.join(', ')})`)
              }
            }
          }
          break

        case 'examples':
          lines.push('')
          if (section.title) {
            lines.push(`${section.title}:`)
          }
          if (section.items) {
            for (const item of section.items) {
              lines.push(`  ${item.name}`)
              if (item.description) {
                lines.push(`      ${item.description}`)
              }
            }
          }
          break

        case 'footer':
          lines.push('')
          if (section.content) {
            lines.push(section.content)
          }
          break
      }
    }

    console.log(lines.join('\n'))
  }

  renderError(error: Error, context?: CLIContext): void {
    console.error(`Error: ${error.message}`)
    if (context?.debug) {
      console.error(error.stack)
    }
  }

  renderOutput(output: unknown): void {
    if (typeof output === 'string') {
      console.log(output)
    } else if (output === undefined || output === null) {
      // No output
    } else {
      console.log(JSON.stringify(output, null, 2))
    }
  }
}

/**
 * Global view runtime registry
 */
class ViewRuntimeRegistry {
  private runtime: ViewRuntime = new TextViewRuntime()

  /**
   * Register a view runtime
   */
  register(runtime: ViewRuntime): void {
    this.runtime = runtime
  }

  /**
   * Get the current view runtime
   */
  get(): ViewRuntime {
    return this.runtime
  }

  /**
   * Reset to default runtime
   */
  reset(): void {
    this.runtime = new TextViewRuntime()
  }
}

// Global registry instance
export const viewRuntimeRegistry = new ViewRuntimeRegistry()

/**
 * Register a view runtime
 */
export function registerViewRuntime(runtime: ViewRuntime): void {
  viewRuntimeRegistry.register(runtime)
}

/**
 * Get the current view runtime
 */
export function getViewRuntime(): ViewRuntime {
  return viewRuntimeRegistry.get()
}
