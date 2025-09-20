/**
 * JSX Runtime for TUIX
 * 
 * Enables JSX/TSX syntax for building terminal UIs
 * Compatible with React JSX transform with Svelte-inspired binding support
 */

import type { View } from "./core/types"
import { text, vstack, hstack, styledText } from "./core/view"
import { style, type Style, Colors } from "./styling"
import type { ComponentProps } from "./components/component"
import { isBindableRune, isStateRune, type BindableRune, type StateRune } from './reactivity/runes'

// JSX namespace for TypeScript
export namespace JSX {
  export interface Element extends View {}
  
  export interface IntrinsicElements {
    // Text elements
    text: TextProps
    span: TextProps
    
    // Layout elements
    vstack: StackProps
    hstack: StackProps
    div: StackProps
    
    // Styled elements
    bold: TextProps
    italic: TextProps
    underline: TextProps
    faint: TextProps
    
    // Color elements
    red: TextProps
    green: TextProps
    blue: TextProps
    yellow: TextProps
    cyan: TextProps
    magenta: TextProps
    white: TextProps
    gray: TextProps
    
    // Semantic elements
    error: TextProps
    success: TextProps
    warning: TextProps
    info: TextProps
    
    // Components
    panel: PanelProps
    button: ButtonProps
    list: ListProps
    input: InputProps
  }
  
  export interface TextProps {
    children?: string | number | boolean | null | undefined
    style?: Style
    color?: keyof typeof Colors
    bold?: boolean
    italic?: boolean
    underline?: boolean
    faint?: boolean
  }
  
  export interface StackProps {
    children?: JSX.Element | JSX.Element[] | string | (JSX.Element | string | null | undefined | false)[]
    gap?: number
    align?: "start" | "center" | "end"
    justify?: "start" | "center" | "end" | "between" | "around"
  }
  
  export interface PanelProps {
    children?: JSX.Element | JSX.Element[]
    title?: string
    border?: "single" | "double" | "rounded" | "thick"
    padding?: number
    width?: number
    height?: number
  }
  
  export interface ButtonProps extends TextProps {
    onClick?: () => void
    variant?: "primary" | "secondary" | "success" | "danger"
    disabled?: boolean
  }
  
  export interface ListProps {
    items: Array<{ id: string; label: string | JSX.Element }>
    selected?: number
    onSelect?: (index: number) => void
  }
  
  export interface InputProps {
    value?: string
    placeholder?: string
    onChange?: (value: string) => void
    type?: "text" | "password"
    'bind:value'?: BindableRune<string> | StateRune<string>
  }
  
  // Support bind: syntax on all intrinsic elements
  export interface IntrinsicAttributes {
    [key: `bind:${string}`]: any
  }
}

// Helper to flatten and filter children
function normalizeChildren(children: any): View[] {
  if (!children) return []
  
  const flatten = (arr: any): any[] => {
    return arr.reduce((flat: any[], item: any) => {
      if (Array.isArray(item)) {
        return flat.concat(flatten(item))
      }
      if (item === null || item === undefined || item === false || item === true) {
        return flat
      }
      return flat.concat(item)
    }, [])
  }
  
  const normalized = Array.isArray(children) ? flatten(children) : [children]
  
  return normalized.map(child => {
    if (typeof child === 'string' || typeof child === 'number') {
      return text(String(child))
    }
    return child
  })
}

// Create text with style
function createStyledText(content: string, styleBuilder: Style): View {
  return styledText(content, styleBuilder)
}

/**
 * Process bind: props for two-way data binding
 */
function processBindProps(props: any): any {
  if (!props) return props
  
  const processed = { ...props }
  
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('bind:')) {
      const bindProp = key.slice(5) // Remove 'bind:' prefix
      const capitalizedProp = bindProp.charAt(0).toUpperCase() + bindProp.slice(1)
      delete processed[key]
      
      if (isBindableRune(value) || isStateRune(value)) {
        // It's a rune - set up two-way binding
        processed[bindProp] = value() // Current value
        processed[`on${capitalizedProp}Change`] = (newValue: any) => {
          value.$set(newValue)
        }
        
        // If it's bindable, we can also pass the rune itself for advanced use
        if (isBindableRune(value)) {
          processed[`${bindProp}Rune`] = value
        }
      } else {
        // It's a regular variable - just pass the value
        // (can't do two-way binding without a rune)
        processed[bindProp] = value
      }
    }
  }
  
  return processed
}

// JSX Factory function
export function jsx(
  type: string | Function,
  props: any,
  key?: string
): JSX.Element {
  // Process bind: props before anything else
  const processedProps = processBindProps(props)
  
  // Handle function components
  if (typeof type === 'function') {
    return type(processedProps || {})
  }
  
  const { children, ...restProps } = processedProps || {}
  
  // Handle intrinsic elements
  switch (type) {
    // Text elements
    case 'text':
    case 'span': {
      // Handle children array properly
      let content = ''
      if (Array.isArray(children)) {
        content = children.join('')
      } else if (children != null && typeof children !== 'boolean') {
        content = String(children)
      }
      
      let textStyle = restProps.style || style()
      
      if (restProps.color) {
        textStyle = textStyle.foreground(Colors[restProps.color])
      }
      if (restProps.bold) textStyle = textStyle.bold()
      if (restProps.italic) textStyle = textStyle.italic()
      if (restProps.underline) textStyle = textStyle.underline()
      if (restProps.faint) textStyle = textStyle.faint()
      
      return content ? createStyledText(content, textStyle) : text('')
    }
    
    // Layout elements
    case 'vstack':
    case 'div': {
      const views = normalizeChildren(children)
      return views.length === 0 ? text('') : vstack(...views)
    }
    
    case 'hstack': {
      const views = normalizeChildren(children)
      return views.length === 0 ? text('') : hstack(...views)
    }
    
    // Styled text shortcuts
    case 'bold': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().bold())
    }
    
    case 'italic': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().italic())
    }
    
    case 'underline': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().underline())
    }
    
    case 'faint': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      return createStyledText(content, style().faint())
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
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      const color = Colors[type as keyof typeof Colors]
      return createStyledText(content, style().foreground(color))
    }
    
    // Semantic elements
    case 'error':
    case 'success':
    case 'warning':
    case 'info': {
      const content = Array.isArray(children) ? children.join('') : String(children || '')
      const colorMap = {
        error: Colors.red,
        success: Colors.green,
        warning: Colors.yellow,
        info: Colors.blue
      }
      return createStyledText(content, style().foreground(colorMap[type as keyof typeof colorMap]).bold())
    }
    
    // Components (these would need to be imported and implemented)
    case 'panel': {
      // Lazy import to avoid circular dependencies
      const { Panel } = require('./components/builders/Panel')
      const views = normalizeChildren(children)
      return Panel(views.length === 1 ? views[0] : vstack(...views), restProps)
    }
    
    case 'button': {
      const { Button, PrimaryButton, SecondaryButton, SuccessButton, DangerButton } = require('./components/builders/Button')
      const content = String(children || '')
      
      switch (restProps.variant) {
        case 'primary':
          return PrimaryButton(content, restProps)
        case 'secondary':
          return SecondaryButton(content, restProps)
        case 'success':
          return SuccessButton(content, restProps)
        case 'danger':
          return DangerButton(content, restProps)
        default:
          return Button(content, restProps)
      }
    }
    
    default:
      // Unknown element type - return a text element as fallback
      // Silent fallback to text for unknown elements
      
      let content = ''
      if (Array.isArray(children)) {
        content = children.join('')
      } else if (children != null) {
        content = String(children)
      }
      
      return text(content)
  }
}

// JSX Fragment
export function Fragment(props: { children?: any }): JSX.Element {
  const views = normalizeChildren(props.children)
  return views.length === 0 ? text('') : vstack(...views)
}

// Automatic runtime exports (for React 17+ JSX transform)
export { jsx as jsxs, jsx as jsxDEV }

// Classic runtime exports
export function createElement(
  type: string | Function,
  props: any,
  ...children: any[]
): JSX.Element {
  return jsx(type, { ...props, children: children.length === 1 ? children[0] : children })
}
