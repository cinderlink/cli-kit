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
  displayValue: () => string
  visibleText: () => string
  cursorPosition: () => number
  hasSelection: () => boolean
  selectionText: () => string

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
  const { initialValue = '', charLimit, validator, transformer, width = 30 } = options

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
    return transformer ? transformer(value()) : value()
  })

  const visibleText = $derived(() => {
    const display = displayValue()
    const availableWidth = width - 2 // Account for borders/padding

    if (stringWidth(display) <= availableWidth) {
      return display
    }

    // Handle scrolling to keep cursor visible
    const beforeCursor = display.slice(0, cursor())
    const cursorWidth = stringWidth(beforeCursor)

    // Adjust offset to keep cursor in view
    if (cursorWidth < offset()) {
      // Cursor is to the left of visible area
      offset.$set(Math.max(0, cursorWidth - Math.floor(availableWidth / 4)))
    } else if (cursorWidth > offset() + availableWidth) {
      // Cursor is to the right of visible area
      offset.$set(cursorWidth - Math.floor((3 * availableWidth) / 4))
    }

    // Find the visible portion
    let start = 0
    let currentWidth = 0

    // Find start position based on offset
    for (let i = 0; i < display.length; i++) {
      const char = display[i]
      if (!char) continue
      const charWidth = stringWidth(char)
      if (currentWidth + charWidth > offset()) {
        start = i
        break
      }
      currentWidth += charWidth
    }

    // Find end position based on available width
    let end = start
    currentWidth = 0

    for (let i = start; i < display.length; i++) {
      const char = display[i]
      if (!char) continue
      const charWidth = stringWidth(char)
      if (currentWidth + charWidth > availableWidth) {
        break
      }
      currentWidth += charWidth
      end = i + 1
    }

    return display.slice(start, end)
  })

  const cursorPosition = $derived(() => {
    const beforeCursor = displayValue().slice(0, cursor())
    const cursorOffset = stringWidth(beforeCursor) - offset()
    return Math.max(0, Math.min(cursorOffset, width - 2))
  })

  const hasSelection = $derived(() => {
    return selection() !== null
  })

  const selectionText = $derived(() => {
    const sel = selection()
    if (!sel) return ''
    const [start, end] = sel
    return value().slice(start, end)
  })

  // Cursor blink effect
  $effect(() => {
    if (isFocused()) {
      const interval = setInterval(() => {
        showCursor.$set(!showCursor())
      }, 500)

      return () => clearInterval(interval)
    } else {
      showCursor.$set(false)
    }
  })

  // Auto-validation effect
  $effect(() => {
    if (isDirty() && validator) {
      validationError.$set(validator(value()))
    }
  })

  // Methods
  const setValue = (newValue: string) => {
    if (charLimit && newValue.length > charLimit) {
      return
    }

    value.$set(transformer ? transformer(newValue) : newValue)
    isDirty.$set(true)
    clearSelection()
  }

  const moveCursor = (position: number) => {
    cursor.$set(Math.max(0, Math.min(position, value().length)))
    clearSelection()
  }

  const moveCursorRelative = (delta: number) => {
    moveCursor(cursor() + delta)
  }

  const insertText = (text: string) => {
    const sel = selection()
    if (hasSelection() && sel) {
      const [start, end] = sel
      const newValue = value().slice(0, start) + text + value().slice(end)
      setValue(newValue)
      cursor.$set(start + text.length)
    } else {
      const newValue = value().slice(0, cursor()) + text + value().slice(cursor())
      if (!charLimit || newValue.length <= charLimit) {
        setValue(newValue)
        cursor.$set(cursor() + text.length)
      }
    }
  }

  const deleteForward = () => {
    const sel = selection()
    if (hasSelection() && sel) {
      const [start, end] = sel
      const newValue = value().slice(0, start) + value().slice(end)
      setValue(newValue)
      cursor.$set(start)
    } else if (cursor() < value().length) {
      const newValue = value().slice(0, cursor()) + value().slice(cursor() + 1)
      setValue(newValue)
    }
  }

  const deleteBackward = () => {
    const sel = selection()
    if (hasSelection() && sel) {
      const [start, end] = sel
      const newValue = value().slice(0, start) + value().slice(end)
      setValue(newValue)
      cursor.$set(start)
    } else if (cursor() > 0) {
      const newValue = value().slice(0, cursor() - 1) + value().slice(cursor())
      setValue(newValue)
      cursor.$set(cursor() - 1)
    }
  }

  const selectAll = () => {
    selection.$set([0, value().length])
    cursor.$set(value().length)
  }

  const clearSelection = () => {
    selection.$set(null)
  }

  const setSelection = (start: number, end: number) => {
    const len = value().length
    start = Math.max(0, Math.min(start, len))
    end = Math.max(start, Math.min(end, len))
    selection.$set([start, end])
    cursor.$set(end)
  }

  const validate = () => {
    if (validator) {
      const error = validator(value())
      validationError.$set(error)
      return error
    }
    return null
  }

  const reset = () => {
    value.$set(initialValue)
    cursor.$set(0)
    offset.$set(0)
    selection.$set(null)
    validationError.$set(null)
    isDirty.$set(false)
    showCursor.$set(true)
  }

  const focus = () => {
    isFocused.$set(true)
    showCursor.$set(true)
  }

  const blur = () => {
    isFocused.$set(false)
    showCursor.$set(false)
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
    blur,
  }
}

/**
 * Common validators for text inputs
 */
export const validators = {
  required:
    (message = 'This field is required') =>
    (value: string) =>
      value.trim() ? null : message,

  email:
    (message = 'Invalid email address') =>
    (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message,

  minLength: (min: number, message?: string) => (value: string) =>
    value.length >= min ? null : message || `Must be at least ${min} characters`,

  maxLength: (max: number, message?: string) => (value: string) =>
    value.length <= max ? null : message || `Must be at most ${max} characters`,

  pattern:
    (regex: RegExp, message = 'Invalid format') =>
    (value: string) =>
      regex.test(value) ? null : message,

  numeric:
    (message = 'Must be a number') =>
    (value: string) =>
      /^\d*$/.test(value) ? null : message,

  alphanumeric:
    (message = 'Must be alphanumeric') =>
    (value: string) =>
      /^[a-zA-Z0-9]*$/.test(value) ? null : message,
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
  },
}
