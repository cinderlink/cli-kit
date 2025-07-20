/**
 * Core JSX runtime implementation
 * Provides jsx, jsxs, Fragment, and createElement functions
 */

import type { JSX, View } from '../types'
import { debug } from '../utils/debug'
import { normalizeChildren, safeString } from '../utils'
import { text, vstack, hstack, styledText, style } from './view-factory'
import { Colors } from '../types'

/**
 * Process children into View objects
 */
function processChildren(children: unknown): View[] {
  if (!children) return []
  
  const normalized = normalizeChildren(children)
  
  return normalized.map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return text(String(child))
    }
    
    // If it's already a View object, return as-is
    if (child && typeof child === 'object' && 'render' in child) {
      return child as View
    }
    
    // For other types, convert to string
    return text(safeString(child))
  })
}

/**
 * Extract text content from children, flattening JSX elements
 */
function extractTextContent(children: unknown): string {
  if (!children) return ''
  
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('')
  }
  
  // If it's a View object, render it and extract the text
  if (children && typeof children === 'object' && 'render' in children) {
    return (children as View).render()
  }
  
  return safeString(children)
}

/**
 * Create styled text with style properties
 */
function createStyledText(content: string, props: Record<string, unknown>): View {
  let textStyle = style()
  
  // Apply style props
  if (props.color && typeof props.color === 'string') {
    const colorKey = props.color as keyof typeof Colors
    if (Colors[colorKey]) {
      textStyle = textStyle.foreground(Colors[colorKey])
    }
  }
  
  if (props.bold) textStyle = textStyle.bold()
  if (props.italic) textStyle = textStyle.italic()
  if (props.underline) textStyle = textStyle.underline()
  if (props.faint) textStyle = textStyle.faint()
  
  return content ? styledText(content, textStyle) : text('')
}

/**
 * JSX factory function
 */
export function jsx(
  type: string | Function,
  props: Record<string, unknown> | null,
  key?: string
): JSX.Element {
  debug(`[JSX] Creating element: ${type}`)
  
  // Handle function components
  if (typeof type === 'function') {
    const result = type(props || {})
    return result
  }
  
  const { children, ...restProps } = props || {}
  
  // Handle intrinsic elements
  switch (type) {
    // Text elements
    case 'text':
    case 'span': {
      const content = extractTextContent(children)
      return createStyledText(content, restProps)
    }
    
    // Layout elements
    case 'vstack':
    case 'div': {
      const views = processChildren(children)
      return views.length === 0 ? text('') : vstack(...views)
    }
    
    case 'hstack': {
      const views = processChildren(children)
      return views.length === 0 ? text('') : hstack(...views)
    }
    
    // Styled text shortcuts
    case 'bold': {
      const content = extractTextContent(children)
      return styledText(content, style().bold())
    }
    
    case 'italic': {
      const content = extractTextContent(children)
      return styledText(content, style().italic())
    }
    
    case 'underline': {
      const content = extractTextContent(children)
      return styledText(content, style().underline())
    }
    
    case 'faint': {
      const content = extractTextContent(children)
      return styledText(content, style().faint())
    }
    
    // Color shortcuts
    case 'red':
    case 'green':
    case 'blue':
    case 'yellow':
    case 'cyan':
    case 'magenta':
    case 'white':
    case 'gray': {
      const content = extractTextContent(children)
      const color = Colors[type as keyof typeof Colors]
      return styledText(content, style().foreground(color))
    }
    
    // Semantic elements
    case 'error':
    case 'success':
    case 'warning':
    case 'info': {
      const content = extractTextContent(children)
      const colorMap = {
        error: Colors.red,
        success: Colors.green,
        warning: Colors.yellow,
        info: Colors.blue
      }
      const color = colorMap[type as keyof typeof colorMap]
      return styledText(content, style().foreground(color).bold())
    }
    
    // Special components that will be handled by plugins/CLI
    case 'CLI':
    case 'Plugin':
    case 'LoadPlugin':
    case 'Command':
    case 'Scope':
    case 'Arg':
    case 'Flag':
    case 'Help':
    case 'Example':
    case 'RegisterPlugin':
    case 'EnablePlugin':
    case 'ConfigurePlugin':
    case 'Exit': {
      // These will be handled by the CLI/plugin system
      // For now, return invisible element
      return text('')
    }
    
    default: {
      debug(`[JSX] Unknown element type: ${type}, creating text fallback`)
      const content = extractTextContent(children)
      return text(content)
    }
  }
}

/**
 * JSX with multiple children (same as jsx for now)
 */
export const jsxs = jsx

/**
 * JSX development runtime (same as jsx for now)
 */
export const jsxDEV = jsx

/**
 * Fragment component
 */
export function Fragment(props: { children?: unknown }): JSX.Element {
  const views = processChildren(props.children)
  return views.length === 0 ? text('') : vstack(...views)
}

/**
 * Classic createElement function (React-style)
 */
export function createElement(
  type: string | Function,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): JSX.Element {
  const allProps = {
    ...props,
    children: children.length === 1 ? children[0] : children
  }
  
  return jsx(type, allProps)
}

// Export types
export type { JSX, View } from '../types'