/**
 * TextInput Component - JSX version with reactive state management
 * 
 * A fully-featured text input component with:
 * - Reactive state management using Svelte-inspired runes
 * - Multiple echo modes (normal, password, none)
 * - Cursor styles and blinking
 * - Validation and transformation
 * - Keyboard navigation
 * 
 * @example
 * ```tsx
 * import { TextInput } from 'tuix/components/forms/text-input'
 * 
 * function MyForm() {
 *   const name = $state('')
 *   const password = $state('')
 *   
 *   return (
 *     <vstack>
 *       <TextInput 
 *         bind:value={name} 
 *         placeholder="Enter name..." 
 *       />
 *       <TextInput 
 *         bind:value={password}
 *         placeholder="Enter password..."
 *         echoMode="password"
 *       />
 *     </vstack>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import { $state, $derived, $effect } from '@core/update/reactivity/runes'
import type { StateRune, BindableRune } from '@core/update/reactivity/runes'
import { isBindableRune, isStateRune } from '@core/update/reactivity/runes'
import type { View } from '@core/view/primitives/view'
import { text, hstack } from '@core/view/primitives/view'
import { style, Colors } from '@core/terminal/ansi/styles'
import { stringWidth } from '@core/terminal/output/string/width'

// Types
export type EchoMode = 'normal' | 'password' | 'none'
export type CursorStyle = 'block' | 'underline' | 'bar' | 'blink'

export interface TextInputProps {
  value?: string
  'bind:value'?: BindableRune<string> | StateRune<string>
  placeholder?: string
  width?: number
  echoMode?: EchoMode
  charLimit?: number
  cursorStyle?: CursorStyle
  validate?: (value: string) => string | null
  transform?: (value: string) => string
  onSubmit?: (value: string) => void
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

/**
 * TextInput Component
 */
export function TextInput(props: TextInputProps): JSX.Element {
  // Extract bound value or create internal state
  const valueRune = props['bind:value'] || $state(props.value || '')
  const value = isBindableRune(valueRune) || isStateRune(valueRune) 
    ? valueRune 
    : $state(props.value || '')
  
  // Internal state
  const cursor = $state(0)
  const offset = $state(0)
  const focused = $state(props.autoFocus || false)
  const showCursor = $state(true)
  const validationError = $state<string | null>(null)
  
  // Configuration
  const width = props.width || 30
  const placeholder = props.placeholder || ''
  const echoMode = props.echoMode || 'normal'
  const cursorStyle = props.cursorStyle || 'bar'
  const charLimit = props.charLimit
  
  // Derived state
  const displayValue = $derived(() => {
    const val = getValue(value)
    if (echoMode === 'password') {
      return '•'.repeat(val.length)
    } else if (echoMode === 'none') {
      return ''
    }
    return val
  })
  
  const visibleText = $derived(() => {
    const display = displayValue.value
    const availableWidth = width - 2 // Account for borders
    
    if (stringWidth(display) <= availableWidth) {
      return display
    }
    
    // Handle scrolling
    const beforeCursor = display.slice(0, cursor.value)
    const afterCursor = display.slice(cursor.value)
    
    if (stringWidth(beforeCursor) > availableWidth / 2) {
      // Scroll to keep cursor visible
      const start = offset.value
      return display.slice(start, start + availableWidth)
    }
    
    return display.slice(offset.value, offset.value + availableWidth)
  })
  
  // Cursor blink effect
  $effect(() => {
    if (focused.value && cursorStyle === 'blink') {
      const interval = setInterval(() => {
        showCursor.value = !showCursor.value
      }, 500)
      
      return () => clearInterval(interval)
    }
  })
  
  // Validation effect
  $effect(() => {
    if (props.validate) {
      const error = props.validate(getValue(value))
      validationError.value = error
    }
  })
  
  // Helper to get value from rune
  function getValue(v: any): string {
    if (isBindableRune(v) || isStateRune(v)) {
      return v.value
    }
    return v || ''
  }
  
  // Helper to set value
  function setValue(newValue: string) {
    if (charLimit && newValue.length > charLimit) {
      return
    }
    
    if (props.transform) {
      newValue = props.transform(newValue)
    }
    
    if (isBindableRune(value) || isStateRune(value)) {
      value.value = newValue
    }
    
    props.onChange?.(newValue)
  }
  
  // Event handlers
  function handleKeyPress(key: string) {
    if (!focused.value || props.disabled) return
    
    const currentValue = getValue(value)
    
    switch (key) {
      case 'ArrowLeft':
        if (cursor.value > 0) {
          cursor.value--
        }
        break
        
      case 'ArrowRight':
        if (cursor.value < currentValue.length) {
          cursor.value++
        }
        break
        
      case 'Home':
        cursor.value = 0
        offset.value = 0
        break
        
      case 'End':
        cursor.value = currentValue.length
        break
        
      case 'Backspace':
        if (cursor.value > 0) {
          const newValue = currentValue.slice(0, cursor.value - 1) + 
                          currentValue.slice(cursor.value)
          setValue(newValue)
          cursor.value--
        }
        break
        
      case 'Delete':
        if (cursor.value < currentValue.length) {
          const newValue = currentValue.slice(0, cursor.value) + 
                          currentValue.slice(cursor.value + 1)
          setValue(newValue)
        }
        break
        
      case 'Enter':
        props.onSubmit?.(currentValue)
        break
        
      default:
        // Character input
        if (key.length === 1) {
          const newValue = currentValue.slice(0, cursor.value) + 
                          key + 
                          currentValue.slice(cursor.value)
          setValue(newValue)
          cursor.value++
        }
    }
  }
  
  // Render
  const inputStyle = style({
    width,
    minHeight: 1,
    padding: { horizontal: 1 },
    border: focused.value ? 'single' : 'none',
    borderColor: validationError.value ? Colors.red : 
                 focused.value ? Colors.blue : Colors.gray,
    background: props.disabled ? Colors.gray : undefined
  })
  
  const cursorChar = getCursorChar(cursorStyle, showCursor.value)
  
  return jsx('interactive', {
    onKeyPress: handleKeyPress,
    onFocus: () => {
      focused.value = true
      props.onFocus?.()
    },
    onBlur: () => {
      focused.value = false
      props.onBlur?.()
    },
    focusable: !props.disabled,
    className: props.className,
    children: jsx('box', {
      style: inputStyle,
      children: renderInputContent()
    })
  })
  
  function renderInputContent(): JSX.Element {
    const visible = visibleText.value
    const cursorPos = cursor.value - offset.value
    
    if (!visible && placeholder) {
      return jsx('text', {
        style: style({ color: Colors.gray, italic: true }),
        children: placeholder
      })
    }
    
    if (!focused.value || !showCursor.value) {
      return jsx('text', { children: visible })
    }
    
    // Render with cursor
    const beforeCursor = visible.slice(0, cursorPos)
    const atCursor = visible[cursorPos] || ' '
    const afterCursor = visible.slice(cursorPos + 1)
    
    return jsx('hstack', {
      children: [
        beforeCursor && jsx('text', { children: beforeCursor }),
        jsx('text', {
          style: getCursorStyle(cursorStyle),
          children: cursorChar || atCursor
        }),
        afterCursor && jsx('text', { children: afterCursor })
      ].filter(Boolean)
    })
  }
  
  function getCursorChar(style: CursorStyle, show: boolean): string {
    if (!show && style === 'blink') return ''
    
    switch (style) {
      case 'block': return '█'
      case 'underline': return '_'
      case 'bar': return '│'
      case 'blink': return '│'
      default: return '│'
    }
  }
  
  function getCursorStyle(cursorStyle: CursorStyle) {
    switch (cursorStyle) {
      case 'block':
        return style({ background: Colors.blue, color: Colors.black })
      case 'underline':
        return style({ underline: true })
      default:
        return style({ color: Colors.blue })
    }
  }
}

// Convenience factory functions
export const textInput = (props: TextInputProps) => <TextInput {...props} />
export const passwordInput = (props: TextInputProps) => <TextInput {...props} echoMode="password" />
export const emailInput = (props: TextInputProps) => <TextInput {...props} placeholder="email@example.com" />
export const numberInput = (props: TextInputProps) => <TextInput {...props} transform={v => v.replace(/[^0-9]/g, '')} />