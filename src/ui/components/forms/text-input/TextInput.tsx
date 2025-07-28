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
import { createTextInputStore, type TextInputStore } from '@ui/stores/textInputStore'

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
  // Create store for managing complex input state
  const store = createTextInputStore({
    initialValue: props.value || '',
    charLimit: props.charLimit,
    validator: props.validate,
    transformer: props.transform,
    width: props.width || 30,
  })

  // Extract bound value if provided
  const boundValue = props['bind:value']

  // Configuration
  const width = props.width || 30
  const placeholder = props.placeholder || ''
  const echoMode = props.echoMode || 'normal'
  const cursorStyle = props.cursorStyle || 'bar'

  // Sync bound value with store
  $effect(() => {
    if (boundValue && (isBindableRune(boundValue) || isStateRune(boundValue))) {
      // Update store when bound value changes
      if (boundValue() !== store.value()) {
        store.setValue(boundValue())
      }
    }
  })

  // Sync store value back to bound value
  $effect(() => {
    if (boundValue && (isBindableRune(boundValue) || isStateRune(boundValue))) {
      // Update bound value when store changes
      if (store.value() !== boundValue()) {
        boundValue.$set(store.value())
      }
    }

    // Call onChange callback
    props.onChange?.(store.value())
  })

  // Auto-focus effect
  $effect(() => {
    if (props.autoFocus) {
      store.focus()
    }
  })

  // Derived state for display
  const displayValue = $derived(() => {
    const val = store.value()
    if (echoMode === 'password') {
      return '•'.repeat(val.length)
    } else if (echoMode === 'none') {
      return ''
    }
    return store.displayValue()
  })

  // Cursor blink effect override for specific styles
  $effect(() => {
    if (store.isFocused() && cursorStyle === 'blink') {
      const interval = setInterval(() => {
        store.showCursor.$set(!store.showCursor())
      }, 500)

      return () => clearInterval(interval)
    }
  })

  // Event handlers
  function handleKeyPress(key: string) {
    if (!store.isFocused() || props.disabled) return

    switch (key) {
      case 'ArrowLeft':
        store.moveCursorRelative(-1)
        break

      case 'ArrowRight':
        store.moveCursorRelative(1)
        break

      case 'Home':
        store.moveCursor(0)
        break

      case 'End':
        store.moveCursor(store.value().length)
        break

      case 'Backspace':
        store.deleteBackward()
        break

      case 'Delete':
        store.deleteForward()
        break

      case 'Enter':
        props.onSubmit?.(store.value())
        break

      case 'a':
        // Handle Ctrl+A for select all
        // TODO: Properly handle keyboard events with modifiers
        // For now, skip Ctrl+A handling until we have proper KeyboardEvent types
        store.insertText(key)
        break

      default:
        // Character input
        if (key.length === 1) {
          store.insertText(key)
        }
    }
  }

  // Render
  const inputStyle = style({
    width,
    minHeight: 1,
    padding: { horizontal: 1 },
    border: store.isFocused() ? 'single' : 'none',
    borderColor: store.validationError()
      ? Colors.red
      : store.isFocused()
        ? Colors.blue
        : Colors.gray,
    background: props.disabled ? Colors.gray : undefined,
  })

  const cursorChar = getCursorChar(cursorStyle, store.showCursor())

  return jsx('interactive', {
    onKeyPress: handleKeyPress,
    onFocus: () => {
      store.focus()
      props.onFocus?.()
    },
    onBlur: () => {
      store.blur()
      props.onBlur?.()
    },
    focusable: !props.disabled,
    className: props.className,
    children: jsx('box', {
      style: inputStyle,
      children: renderInputContent(),
    }),
  })

  function renderInputContent(): JSX.Element {
    const visible = store.visibleText()
    const cursorPos = store.cursorPosition()

    if (!visible && placeholder) {
      return jsx('text', {
        style: style({ color: Colors.gray, italic: true }),
        children: placeholder,
      })
    }

    if (!store.isFocused() || !store.showCursor()) {
      return jsx('text', { children: visible })
    }

    // Handle selection rendering
    if (store.hasSelection() && store.selection()) {
      const [selStart, selEnd] = store.selection()
      const beforeSelection = visible.slice(0, selStart - store.offset())
      const selection = visible.slice(selStart - store.offset(), selEnd - store.offset())
      const afterSelection = visible.slice(selEnd - store.offset())

      return jsx('hstack', {
        children: [
          beforeSelection && jsx('text', { children: beforeSelection }),
          jsx('text', {
            style: style({ background: Colors.blue, color: Colors.white }),
            children: selection,
          }),
          afterSelection && jsx('text', { children: afterSelection }),
        ].filter(Boolean),
      })
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
          children: cursorChar || atCursor,
        }),
        afterCursor && jsx('text', { children: afterCursor }),
      ].filter(Boolean),
    })
  }

  function getCursorChar(style: CursorStyle, show: boolean): string {
    if (!show && style === 'blink') return ''

    switch (style) {
      case 'block':
        return '█'
      case 'underline':
        return '_'
      case 'bar':
        return '│'
      case 'blink':
        return '│'
      default:
        return '│'
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
export const emailInput = (props: TextInputProps) => (
  <TextInput {...props} placeholder="email@example.com" />
)
export const numberInput = (props: TextInputProps) => (
  <TextInput {...props} transform={v => v.replace(/[^0-9]/g, '')} />
)
