/**
 * TextInput Component - Single-line text input field
 * 
 * Inspired by bubbles/textinput, this component provides:
 * - Cursor management
 * - Character input with validation
 * - Selection support
 * - Password mode
 * - Placeholder text
 * - Character limit
 */

import { Effect, Option, pipe } from "effect"
import { stringWidth } from "@/utils/string-width.ts"
import type { View, Cmd, AppServices, KeyEvent } from "@/core/types.ts"
import { KeyUtils, KeyType } from "@/core/keys.ts"
import { Style, style, Colors, renderStyledSync } from "@/styling/index.ts"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type KeyMap,
  keyBinding,
  matchKeyBinding,
  generateComponentId,
  createDefaultStyles
} from "./base.ts"

// =============================================================================
// Types
// =============================================================================

/**
 * TextInput model
 */
export interface TextInputModel extends Focusable, Sized {
  readonly id: string
  readonly value: string
  readonly cursor: number
  readonly offset: number // For horizontal scrolling
  readonly placeholder: string
  readonly echoMode: EchoMode
  readonly charLimit: Option.Option<number>
  readonly cursorStyle: CursorStyle
  readonly blinkSpeed: number
  readonly showCursor: boolean
  readonly validationError: Option.Option<string>
}

/**
 * Echo modes for text display
 */
export enum EchoMode {
  Normal = "normal",
  Password = "password",
  None = "none"
}

/**
 * Cursor display styles
 */
export enum CursorStyle {
  Block = "block",
  Underline = "underline",
  Bar = "bar",
  Blink = "blink"
}

/**
 * TextInput messages
 */
export type TextInputMsg =
  | { _tag: "CharacterInput"; char: string }
  | { _tag: "CursorLeft" }
  | { _tag: "CursorRight" }
  | { _tag: "CursorStart" }
  | { _tag: "CursorEnd" }
  | { _tag: "DeleteBackward" }
  | { _tag: "DeleteForward" }
  | { _tag: "DeleteWordBackward" }
  | { _tag: "DeleteWordForward" }
  | { _tag: "Clear" }
  | { _tag: "Paste"; text: string }
  | { _tag: "Focus" }
  | { _tag: "Blur" }
  | { _tag: "SetValue"; value: string }
  | { _tag: "SetPlaceholder"; placeholder: string }
  | { _tag: "SetEchoMode"; mode: EchoMode }
  | { _tag: "BlinkCursor" }

/**
 * TextInput configuration options
 */
export interface TextInputOptions {
  readonly id?: string
  readonly value?: string
  readonly placeholder?: string
  readonly width?: number
  readonly echoMode?: EchoMode
  readonly charLimit?: number
  readonly cursorStyle?: CursorStyle
  readonly styles?: Partial<TextInputStyles>
  readonly validator?: (value: string) => string | null
}

/**
 * TextInput specific styles
 */
export interface TextInputStyles extends ComponentStyles {
  readonly cursor: Style
  readonly placeholder: Style
  readonly text: Style
  readonly error: Style
}

// =============================================================================
// Key Bindings
// =============================================================================

const createKeyMap = (): KeyMap<TextInputMsg> => ({
  left: keyBinding(["left", "ctrl+b"], ["←", "Move cursor left"], { _tag: "CursorLeft" }),
  right: keyBinding(["right", "ctrl+f"], ["→", "Move cursor right"], { _tag: "CursorRight" }),
  home: keyBinding(["home", "ctrl+a"], ["Home", "Go to start"], { _tag: "CursorStart" }),
  end: keyBinding(["end", "ctrl+e"], ["End", "Go to end"], { _tag: "CursorEnd" }),
  delete: keyBinding(["backspace"], ["Backspace", "Delete character"], { _tag: "DeleteBackward" }),
  deleteForward: keyBinding(["delete", "ctrl+d"], ["Delete", "Delete forward"], { _tag: "DeleteForward" }),
  deleteWord: keyBinding(["ctrl+w", "alt+backspace"], ["Ctrl+W", "Delete word"], { _tag: "DeleteWordBackward" }),
  clear: keyBinding(["ctrl+u"], ["Ctrl+U", "Clear input"], { _tag: "Clear" })
})

// =============================================================================
// TextInput Component
// =============================================================================

export class TextInput implements UIComponent<TextInputModel, TextInputMsg> {
  private keyMap: KeyMap<TextInputMsg>
  private styles: TextInputStyles
  private validator?: (value: string) => string | null
  private cursorBlinkCmd?: Cmd<TextInputMsg>
  private options: TextInputOptions
  
  constructor(options: TextInputOptions = {}) {
    this.keyMap = createKeyMap()
    this.styles = this.createStyles(options.styles)
    this.validator = options.validator
    this.options = options
  }
  
  private createStyles(overrides?: Partial<TextInputStyles>): TextInputStyles {
    const base = createDefaultStyles()
    return {
      ...base,
      base: style()
        .foreground(Colors.white)
        .background(Colors.black),
      focused: style()
        .foreground(Colors.white)
        .background(Colors.black)
        .bold(),
      cursor: style()
        .foreground(Colors.black)
        .background(Colors.white)
        .bold()
        .inline(),
      placeholder: style()
        .foreground(Colors.gray)
        .background(Colors.black),
      text: style(),
      error: style().foreground(Colors.red),
      ...overrides
    }
  }
  
  init(): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, AppServices> {
    return Effect.succeed([
      {
        id: this.options.id || generateComponentId("textinput"),
        value: this.options.value || "",
        cursor: 0,
        offset: 0,
        placeholder: this.options.placeholder || "Type something...",
        focused: false,
        width: this.options.width || 40,
        echoMode: this.options.echoMode || EchoMode.Normal,
        charLimit: this.options.charLimit ? Option.some(this.options.charLimit) : Option.none(),
        cursorStyle: this.options.cursorStyle || CursorStyle.Blink,
        blinkSpeed: this.options.blinkSpeed || 500,
        showCursor: true,
        validationError: Option.none()
      },
      []
    ])
  }
  
  update(msg: TextInputMsg, model: TextInputModel): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, AppServices> {
    return Effect.succeed((() => {
      // Like Bubble Tea: if not focused, ignore all input messages except Focus/Blur
      if (!model.focused && msg._tag !== "Focus" && msg._tag !== "Blur" && msg._tag !== "SetValue" && msg._tag !== "SetPlaceholder" && msg._tag !== "SetEchoMode") {
        return [model, []]
      }
      
      switch (msg._tag) {
        case "CharacterInput": {
          // Check character limit
          if (Option.isSome(model.charLimit) && model.value.length >= model.charLimit.value) {
            return [model, []]
          }
          
          // Insert character at cursor position
          const before = model.value.slice(0, model.cursor)
          const after = model.value.slice(model.cursor)
          const newValue = before + msg.char + after
          
          // Validate if validator exists
          const error = this.validator ? this.validator(newValue) : null
          
          return [{
            ...model,
            value: newValue,
            cursor: model.cursor + 1,
            validationError: error ? Option.some(error) : Option.none()
          }, []]
        }
        
        case "CursorLeft": {
          if (model.cursor > 0) {
            return [{ ...model, cursor: model.cursor - 1 }, []]
          }
          return [model, []]
        }
        
        case "CursorRight": {
          if (model.cursor < model.value.length) {
            return [{ ...model, cursor: model.cursor + 1 }, []]
          }
          return [model, []]
        }
        
        case "CursorStart": {
          return [{ ...model, cursor: 0, offset: 0 }, []]
        }
        
        case "CursorEnd": {
          return [{ ...model, cursor: model.value.length }, []]
        }
        
        case "DeleteBackward": {
          if (model.cursor > 0) {
            const before = model.value.slice(0, model.cursor - 1)
            const after = model.value.slice(model.cursor)
            const newValue = before + after
            
            const error = this.validator ? this.validator(newValue) : null
            
            return [{
              ...model,
              value: newValue,
              cursor: model.cursor - 1,
              validationError: error ? Option.some(error) : Option.none()
            }, []]
          }
          return [model, []]
        }
        
        case "DeleteForward": {
          if (model.cursor < model.value.length) {
            const before = model.value.slice(0, model.cursor)
            const after = model.value.slice(model.cursor + 1)
            const newValue = before + after
            
            const error = this.validator ? this.validator(newValue) : null
            
            return [{
              ...model,
              value: newValue,
              validationError: error ? Option.some(error) : Option.none()
            }, []]
          }
          return [model, []]
        }
        
        case "DeleteWordBackward": {
          if (model.cursor === 0) return [model, []]
          
          // Find the start of the previous word
          let pos = model.cursor - 1
          
          // Skip trailing spaces
          while (pos > 0 && model.value[pos] === ' ') pos--
          
          // Skip word characters
          while (pos > 0 && model.value[pos - 1] !== ' ') pos--
          
          const before = model.value.slice(0, pos)
          const after = model.value.slice(model.cursor)
          const newValue = before + after
          
          const error = this.validator ? this.validator(newValue) : null
          
          return [{
            ...model,
            value: newValue,
            cursor: pos,
            validationError: error ? Option.some(error) : Option.none()
          }, []]
        }
        
        case "Clear": {
          return [{
            ...model,
            value: "",
            cursor: 0,
            offset: 0,
            validationError: Option.none()
          }, []]
        }
        
        case "Focus": {
          // Start cursor blinking
          const blinkCmd: Cmd<TextInputMsg> = Effect.succeed({ _tag: "BlinkCursor" as const })
          
          return [{
            ...model,
            focused: true,
            showCursor: true
          }, [blinkCmd]]
        }
        
        case "Blur": {
          return [{
            ...model,
            focused: false,
            showCursor: false
          }, []]
        }
        
        case "SetValue": {
          const error = this.validator ? this.validator(msg.value) : null
          
          return [{
            ...model,
            value: msg.value,
            cursor: Math.min(model.cursor, msg.value.length),
            validationError: error ? Option.some(error) : Option.none()
          }, []]
        }
        
        case "SetPlaceholder": {
          return [{ ...model, placeholder: msg.placeholder }, []]
        }
        
        case "SetEchoMode": {
          return [{ ...model, echoMode: msg.mode }, []]
        }
        
        case "BlinkCursor": {
          if (!model.focused) return [model, []]
          
          // Toggle cursor visibility and schedule next blink
          const blinkCmd: Cmd<TextInputMsg> = Effect.succeed({ _tag: "BlinkCursor" as const })
          
          return [{
            ...model,
            showCursor: !model.showCursor
          }, [blinkCmd]]
        }
        
        default:
          return [model, []]
      }
    })())
  }
  
  view(model: TextInputModel): View {
    // Prepare display text based on echo mode
    let displayText = ""
    switch (model.echoMode) {
      case EchoMode.Normal:
        displayText = model.value
        break
      case EchoMode.Password:
        displayText = "•".repeat(model.value.length)
        break
      case EchoMode.None:
        displayText = ""
        break
    }
    
    // Show placeholder if empty
    if (!model.value) {
      displayText = model.placeholder
    }
    
    // Calculate visible portion (horizontal scrolling)
    const availableWidth = model.width - 2 // Account for potential borders
    let visibleStart = model.offset
    let visibleEnd = model.offset + availableWidth
    
    // Adjust offset if cursor is outside visible area
    if (model.cursor < visibleStart) {
      visibleStart = model.cursor
      visibleEnd = visibleStart + availableWidth
    } else if (model.cursor >= visibleEnd) {
      visibleEnd = model.cursor + 1
      visibleStart = Math.max(0, visibleEnd - availableWidth)
    }
    
    // Extract visible portion
    let visibleText = displayText.slice(visibleStart, visibleEnd)
    
    // Add cursor if focused
    if (model.focused && model.showCursor && model.echoMode !== EchoMode.None) {
      const cursorPos = model.cursor - visibleStart
      
      if (cursorPos >= 0 && cursorPos <= visibleText.length) {
        const before = visibleText.slice(0, cursorPos)
        const cursorChar = visibleText[cursorPos] || " "
        const after = visibleText.slice(cursorPos + 1)
        
        const styledCursor = renderStyledSync(cursorChar, this.styles.cursor)
        visibleText = before + styledCursor + after
      }
    }
    
    // Apply styles - render text segments independently to prevent color bleeding
    const fieldStyle = model.focused ? this.styles.focused : this.styles.base
    const placeholderStyle = this.styles.placeholder
    
    // For placeholder text, use placeholder style
    if (!model.value && !model.focused) {
      const paddedText = visibleText.padEnd(availableWidth)
      const styledField = renderStyledSync(paddedText, placeholderStyle)
      return {
        render: () => Effect.succeed(styledField),
        width: model.width,
        height: 1
      }
    }
    
    // For regular text with cursor, render segments independently
    if (model.focused && model.showCursor && model.echoMode !== EchoMode.None) {
      const cursorPos = model.cursor - visibleStart
      
      if (cursorPos >= 0 && cursorPos <= visibleText.length) {
        const before = visibleText.slice(0, cursorPos)
        const cursorChar = visibleText[cursorPos] || " "
        const after = visibleText.slice(cursorPos + 1)
        
        // Render each segment independently
        const styledBefore = renderStyledSync(before, fieldStyle)
        const styledCursor = renderStyledSync(cursorChar, this.styles.cursor.inline())
        const styledAfter = renderStyledSync(after, fieldStyle)
        
        // Pad the remaining space
        const totalLength = before.length + 1 + after.length
        const remainingSpace = Math.max(0, availableWidth - totalLength)
        const styledPadding = renderStyledSync(" ".repeat(remainingSpace), fieldStyle)
        
        const styledField = styledBefore + styledCursor + styledAfter + styledPadding
        return {
          render: () => Effect.succeed(styledField),
          width: model.width,
          height: 1
        }
      }
    }
    
    // Default case - no cursor
    const paddedText = visibleText.padEnd(availableWidth)
    const styledField = renderStyledSync(paddedText, fieldStyle)
    
    // Add validation error if present
    if (Option.isSome(model.validationError)) {
      const errorMsg = renderStyledSync(
        model.validationError.value,
        this.styles.error
      )
      // Ensure error message is properly positioned below the input
      return {
        render: () => Effect.succeed(styledField + "\n" + errorMsg),
        width: model.width,
        height: 2
      }
    }
    
    return {
      render: () => Effect.succeed(styledField),
      width: model.width,
      height: 1
    }
  }
  
  // UIComponent interface methods
  focus(): Effect.Effect<Cmd<TextInputMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Focus" as const }))
  }
  
  blur(): Effect.Effect<Cmd<TextInputMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Blur" as const }))
  }
  
  focused(model: TextInputModel): boolean {
    return model.focused
  }
  
  setSize(width: number): Effect.Effect<void, never, never> {
    // Size is handled in the model
    return Effect.unit
  }
  
  getSize(model: TextInputModel): { width: number } {
    return { width: model.width }
  }
  
  handleKey(key: KeyEvent, model: TextInputModel): TextInputMsg | null {
    // Check key bindings first
    const boundMsg = matchKeyBinding(key, this.keyMap)
    if (boundMsg) return boundMsg
    
    // Handle space key
    if (key.key === " " || key.type === KeyType.Space) {
      return { _tag: "CharacterInput", char: " " }
    }
    
    // Handle regular character input
    if (key.runes && key.runes.length > 0 && !key.ctrl && !key.alt) {
      return { _tag: "CharacterInput", char: key.runes }
    }
    
    return null
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new TextInput component
 */
export const textInput = (options?: TextInputOptions): TextInput => {
  return new TextInput(options)
}

/**
 * Create a TextInput with email validation
 */
export const emailInput = (options?: TextInputOptions): TextInput => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  return new TextInput({
    ...options,
    placeholder: options?.placeholder ?? "email@example.com",
    validator: (value: string) => {
      if (!value) return null
      return emailRegex.test(value) ? null : "Invalid email address"
    }
  })
}

/**
 * Create a TextInput for passwords
 */
export const passwordInput = (options?: TextInputOptions): TextInput => {
  return new TextInput({
    ...options,
    echoMode: EchoMode.Password,
    placeholder: options?.placeholder ?? "Enter password..."
  })
}

/**
 * Create a TextInput with number validation
 */
export const numberInput = (options?: TextInputOptions): TextInput => {
  return new TextInput({
    ...options,
    placeholder: options?.placeholder ?? "0",
    validator: (value: string) => {
      if (!value) return null
      return /^\d*\.?\d*$/.test(value) ? null : "Must be a number"
    }
  })
}