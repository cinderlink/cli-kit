/**
 * JSX Runtime Adapter for CLI
 *
 * Provides a JSX-based implementation of the CLI's ViewRuntime interface.
 * This adapter allows the CLI module to use JSX for rendering help and output
 * without creating a direct dependency on the JSX module.
 */

import type { ViewRuntime } from '../core/viewRuntime'
import type { HelpData, HelpSection, HelpItem } from '../core/helpData'
import type { CLIContext } from '../types'
import { text, vstack, hstack, styledText } from '@core/view'
import { style, Colors } from '@core/terminal/ansi/styles'
import type { View } from '@core/types'

/**
 * JSX implementation of the CLI ViewRuntime interface
 */
export class JSXCLIViewRuntime implements ViewRuntime {
  readonly name = 'jsx'
  readonly supportsInteractive = true

  constructor(private renderFn?: (view: View) => void) {}

  renderHelp(data: HelpData): void {
    const view = this.createHelpView(data)
    this.renderView(view)
  }

  renderError(error: Error, context?: CLIContext): void {
    const elements: View[] = [
      styledText(`Error: ${error.message}`, style().foreground(Colors.red).bold()),
    ]

    if (context?.debug && error.stack) {
      elements.push(styledText(error.stack, style().foreground(Colors.gray)))
    }

    this.renderView(vstack(...elements))
  }

  renderOutput(output: unknown, context?: CLIContext): void {
    // If output is already a View, render it directly
    if (output && typeof output === 'object' && 'render' in output) {
      this.renderView(output as View)
      return
    }

    // Convert other types to text
    let view: View
    if (typeof output === 'string') {
      view = text(output)
    } else if (output === undefined || output === null) {
      return // No output
    } else {
      view = text(JSON.stringify(output, null, 2))
    }

    this.renderView(view)
  }

  /**
   * Render a view to the terminal
   * This method should be provided by the JSX module when creating the runtime
   */
  private renderView(view: View): void {
    // Default implementation: directly render to stdout
    // The JSX module can provide a more sophisticated implementation
    if (this.renderFn) {
      this.renderFn(view)
    } else {
      // Fallback: use the view's render method directly
      const output = view.render()
      process.stdout.write(output + '\n')
    }
  }

  async startInteractive(context: CLIContext): Promise<void> {
    // Interactive mode could launch a full TUI application
    // This would integrate with the TEA module for interactive apps
    throw new Error('Interactive mode not yet implemented for JSX runtime')
  }

  private createHelpView(data: HelpData): View {
    const sections: View[] = []

    for (const section of data.sections) {
      const sectionView = this.renderSection(section, data)
      if (sectionView) {
        sections.push(sectionView)
      }
    }

    return vstack(...sections)
  }

  private renderSection(section: HelpSection, data: HelpData): View | null {
    switch (section.type) {
      case 'header':
        return this.renderHeader(section, data)

      case 'description':
        return this.renderDescription(section)

      case 'usage':
        return this.renderUsage(section)

      case 'commands':
      case 'options':
      case 'arguments':
        return this.renderItemList(section)

      case 'examples':
        return this.renderExamples(section)

      case 'footer':
        return this.renderFooter(section)

      default:
        return null
    }
  }

  private renderHeader(section: HelpSection, data: HelpData): View {
    const elements: View[] = []

    if (section.content) {
      elements.push(styledText(section.content, style().foreground(Colors.brightCyan).bold()))

      if (data.version) {
        elements.push(styledText(`v${data.version}`, style().foreground(Colors.gray)))
      }
    }

    return vstack(...elements)
  }

  private renderDescription(section: HelpSection): View | null {
    if (!section.content) return null

    return styledText(section.content, style().foreground(Colors.white).italic())
  }

  private renderUsage(section: HelpSection): View {
    const elements: View[] = [
      text(''), // Empty line
      styledText('USAGE:', style().foreground(Colors.yellow).bold()),
    ]

    if (section.content) {
      elements.push(styledText(`  ${section.content}`, style().foreground(Colors.white)))
    }

    return vstack(...elements)
  }

  private renderItemList(section: HelpSection): View {
    const elements: View[] = [
      text(''), // Empty line
      styledText(section.title || '', style().foreground(Colors.yellow).bold()),
    ]

    if (section.items) {
      const maxNameLength = Math.max(...section.items.map(item => item.name.length))

      for (const item of section.items) {
        elements.push(this.renderItem(item, section.type, maxNameLength))

        if (item.aliases && item.aliases.length > 0) {
          elements.push(
            styledText(
              `      (aliases: ${item.aliases.join(', ')})`,
              style().foreground(Colors.gray).italic()
            )
          )
        }
      }
    }

    return vstack(...elements)
  }

  private renderItem(item: HelpItem, sectionType: string, padLength: number): View {
    const color =
      sectionType === 'commands'
        ? Colors.green
        : sectionType === 'options'
          ? Colors.blue
          : Colors.cyan

    return hstack(
      styledText(`  ${item.name.padEnd(padLength + 4)}`, style().foreground(color)),
      styledText(item.description || '', style().foreground(Colors.white))
    )
  }

  private renderExamples(section: HelpSection): View {
    const elements: View[] = [
      text(''), // Empty line
      styledText(section.title || 'EXAMPLES:', style().foreground(Colors.yellow).bold()),
    ]

    if (section.items) {
      for (const item of section.items) {
        elements.push(styledText(`  ${item.name}`, style().foreground(Colors.magenta)))

        if (item.description) {
          elements.push(
            styledText(`      ${item.description}`, style().foreground(Colors.gray).italic())
          )
        }
      }
    }

    return vstack(...elements)
  }

  private renderFooter(section: HelpSection): View {
    if (!section.content) return text('')

    return vstack(text(''), styledText(section.content, style().foreground(Colors.gray).italic()))
  }
}

/**
 * Create and return a JSX CLI view runtime instance
 *
 * @param renderFn - Optional custom render function. If not provided,
 *                   uses a basic stdout renderer
 */
export function createJSXCLIRuntime(renderFn?: (view: View) => void): JSXCLIViewRuntime {
  return new JSXCLIViewRuntime(renderFn)
}
