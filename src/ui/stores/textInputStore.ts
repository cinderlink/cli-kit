/**
 * TextInput Store
 * 
 * Manages complex state for text input components including:
 * - Value and cursor position
 * - Selection state
 * - Validation and transformation
 * - Scroll offset for long inputs
 * 
 * This store is designed to be instantiated per TextInput component,
 * not as a global singleton.
 */

import { $state, $derived, $effect } from '@core/update/reactivity/runes'
import type { StateRune } from '@core/update/reactivity/runes'
import { stringWidth } from '@core/terminal/output/string/width'

export interface TextInputStoreOptions {
  initialValue?: string
  charLimit?: number
  validator?: (value: string) => string | null
  transformer?: (value: string) => string
  width?: number
}

export interface TextInputStore {
  // Core state
  value: StateRune<string>
  cursor: StateRune<number>
  offset: StateRune<number>
  selection: StateRune<[number, number] | null>
  
  // UI state
  isFocused: StateRune<boolean>
  showCursor: StateRune<boolean>
  
  // Validation state
  validationError: StateRune<string | null>
  isDirty: StateRune<boolean>
  
  // Derived state
  displayValue: { value: string }
  visibleText: { value: string }
  cursorPosition: { value: number }
  hasSelection: { value: boolean }
  selectionText: { value: string }
  
  // Methods
  setValue: (newValue: string) => void
  moveCursor: (position: number) => void
  moveCursorRelative: (delta: number) => void
  insertText: (text: string) => void
  deleteForward: () => void
  deleteBackward: () => void
  selectAll: () => void
  clearSelection: () => void
  setSelection: (start: number, end: number) => void
  validate: () => string | null
  reset: () => void
  focus: () => void
  blur: () => void
}

/**
 * Create a new TextInput store instance
 */
export function createTextInputStore(options: TextInputStoreOptions = {}): TextInputStore {
  const {
    initialValue = '',
    charLimit,
    validator,
    transformer,
    width = 30
  } = options
  
  // Core state
  const value = $state(initialValue)
  const cursor = $state(0)
  const offset = $state(0)
  const selection = $state<[number, number] | null>(null)
  
  // UI state
  const isFocused = $state(false)
  const showCursor = $state(true)
  
  // Validation state
  const validationError = $state<string | null>(null)
  const isDirty = $state(false)
  
  // Derived state
  const displayValue = $derived(() => {
    return transformer ? transformer(value.value) : value.value
  })
  
  const visibleText = $derived(() => {
    const display = displayValue.value
    const availableWidth = width - 2 // Account for borders/padding
    
    if (stringWidth(display) <= availableWidth) {
      return display
    }
    
    // Handle scrolling to keep cursor visible
    const beforeCursor = display.slice(0, cursor.value)
    const cursorWidth = stringWidth(beforeCursor)
    
    // Adjust offset to keep cursor in view
    if (cursorWidth < offset.value) {
      // Cursor is to the left of visible area
      offset.value = Math.max(0, cursorWidth - Math.floor(availableWidth / 4))
    } else if (cursorWidth > offset.value + availableWidth) {
      // Cursor is to the right of visible area
      offset.value = cursorWidth - Math.floor(3 * availableWidth / 4)
    }
    
    // Find the visible portion
    let start = 0
    let currentWidth = 0
    
    // Find start position based on offset
    for (let i = 0; i < display.length; i++) {
      const charWidth = stringWidth(display[i])
      if (currentWidth + charWidth > offset.value) {
        start = i
        break
      }
      currentWidth += charWidth
    }
    
    // Find end position based on available width
    let end = start
    currentWidth = 0
    
    for (let i = start; i < display.length; i++) {
      const charWidth = stringWidth(display[i])
      if (currentWidth + charWidth > availableWidth) {
        break
      }
      currentWidth += charWidth
      end = i + 1
    }
    
    return display.slice(start, end)
  })
  
  const cursorPosition = $derived(() => {
    const beforeCursor = displayValue.value.slice(0, cursor.value)
    const cursorOffset = stringWidth(beforeCursor) - offset.value
    return Math.max(0, Math.min(cursorOffset, width - 2))
  })
  
  const hasSelection = $derived(() => {
    return selection.value !== null
  })
  
  const selectionText = $derived(() => {
    if (!selection.value) return ''
    const [start, end] = selection.value
    return value.value.slice(start, end)
  })
  
  // Cursor blink effect
  $effect(() => {
    if (isFocused.value) {
      const interval = setInterval(() => {
        showCursor.value = !showCursor.value
      }, 500)
      
      return () => clearInterval(interval)
    } else {
      showCursor.value = false
    }
  })
  
  // Auto-validation effect
  $effect(() => {
    if (isDirty.value && validator) {
      validationError.value = validator(value.value)
    }
  })
  
  // Methods
  const setValue = (newValue: string) => {
    if (charLimit && newValue.length > charLimit) {
      return
    }
    
    value.value = transformer ? transformer(newValue) : newValue
    isDirty.value = true
    clearSelection()
  }
  
  const moveCursor = (position: number) => {
    cursor.value = Math.max(0, Math.min(position, value.value.length))
    clearSelection()
  }
  
  const moveCursorRelative = (delta: number) => {
    moveCursor(cursor.value + delta)
  }
  
  const insertText = (text: string) => {
    if (hasSelection.value && selection.value) {
      const [start, end] = selection.value
      const newValue = value.value.slice(0, start) + text + value.value.slice(end)
      setValue(newValue)
      cursor.value = start + text.length
    } else {
      const newValue = value.value.slice(0, cursor.value) + text + value.value.slice(cursor.value)
      if (!charLimit || newValue.length <= charLimit) {
        setValue(newValue)
        cursor.value += text.length
      }
    }
  }
  
  const deleteForward = () => {
    if (hasSelection.value && selection.value) {
      const [start, end] = selection.value
      const newValue = value.value.slice(0, start) + value.value.slice(end)
      setValue(newValue)
      cursor.value = start
    } else if (cursor.value < value.value.length) {
      const newValue = value.value.slice(0, cursor.value) + value.value.slice(cursor.value + 1)
      setValue(newValue)
    }
  }
  
  const deleteBackward = () => {
    if (hasSelection.value && selection.value) {
      const [start, end] = selection.value
      const newValue = value.value.slice(0, start) + value.value.slice(end)
      setValue(newValue)
      cursor.value = start
    } else if (cursor.value > 0) {
      const newValue = value.value.slice(0, cursor.value - 1) + value.value.slice(cursor.value)
      setValue(newValue)
      cursor.value--
    }
  }
  
  const selectAll = () => {
    selection.value = [0, value.value.length]
    cursor.value = value.value.length
  }
  
  const clearSelection = () => {
    selection.value = null
  }
  
  const setSelection = (start: number, end: number) => {
    const len = value.value.length
    start = Math.max(0, Math.min(start, len))
    end = Math.max(start, Math.min(end, len))
    selection.value = [start, end]
    cursor.value = end
  }
  
  const validate = () => {
    if (validator) {
      const error = validator(value.value)
      validationError.value = error
      return error
    }
    return null
  }
  
  const reset = () => {
    value.value = initialValue
    cursor.value = 0
    offset.value = 0
    selection.value = null
    validationError.value = null
    isDirty.value = false
    showCursor.value = true
  }
  
  const focus = () => {
    isFocused.value = true
    showCursor.value = true
  }
  
  const blur = () => {
    isFocused.value = false
    showCursor.value = false
    clearSelection()
  }
  
  return {
    // State
    value,
    cursor,
    offset,
    selection,
    isFocused,
    showCursor,
    validationError,
    isDirty,
    
    // Derived
    displayValue,
    visibleText,
    cursorPosition,
    hasSelection,
    selectionText,
    
    // Methods
    setValue,
    moveCursor,
    moveCursorRelative,
    insertText,
    deleteForward,
    deleteBackward,
    selectAll,
    clearSelection,
    setSelection,
    validate,
    reset,
    focus,
    blur
  }
}

/**
 * Common validators for text inputs
 */
export const validators = {
  required: (message = 'This field is required') => 
    (value: string) => value.trim() ? null : message,
    
  email: (message = 'Invalid email address') =>
    (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message,
    
  minLength: (min: number, message?: string) =>
    (value: string) => value.length >= min ? null : message || `Must be at least ${min} characters`,
    
  maxLength: (max: number, message?: string) =>
    (value: string) => value.length <= max ? null : message || `Must be at most ${max} characters`,
    
  pattern: (regex: RegExp, message = 'Invalid format') =>
    (value: string) => regex.test(value) ? null : message,
    
  numeric: (message = 'Must be a number') =>
    (value: string) => /^\d*$/.test(value) ? null : message,
    
  alphanumeric: (message = 'Must be alphanumeric') =>
    (value: string) => /^[a-zA-Z0-9]*$/.test(value) ? null : message
}

/**
 * Common transformers for text inputs
 */
export const transformers = {
  uppercase: (value: string) => value.toUpperCase(),
  lowercase: (value: string) => value.toLowerCase(),
  numeric: (value: string) => value.replace(/[^0-9]/g, ''),
  alphanumeric: (value: string) => value.replace(/[^a-zA-Z0-9]/g, ''),
  trim: (value: string) => value.trim(),
  noSpaces: (value: string) => value.replace(/\s/g, ''),
  creditCard: (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ')
  }
}