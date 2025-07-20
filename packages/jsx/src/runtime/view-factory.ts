/**
 * View factory for creating View objects
 * This has been refactored to use the canonical styling system from @tuix/styling.
 */
import type { View } from '../types'
import { style as createStyle, type Style, renderStyledSync } from '@tuix/styling'

/**
 * Create a new style builder
 */
export function style(): Style {
  return createStyle()
}

/**
 * Create a text view
 */
export function text(content: string): View {
  return {
    render: () => content,
  }
}

/**
 * Create a styled text view
 */
export function styledText(content: string, textStyle: Style): View {
  return {
    render: () => renderStyledSync(content, textStyle),
  }
}

/**
 * Create a vertical stack view
 */
export function vstack(...views: View[]): View {
  const content = views.map(view => view.render()).join('\n')
  return {
      render: () => content
  }
}

/**
 * Create a horizontal stack view
 */
export function hstack(...views: View[]): View {
  const content = views.map(view => view.render()).join(' ')
  return {
      render: () => content
  }
}