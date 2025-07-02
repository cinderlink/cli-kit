/**
 * TextInput Component - Clean implementation with consistent styling
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

export interface TextInputModel extends Focusable, Sized {
  readonly id: string
  readonly value: string
  readonly cursor: number
  readonly offset: number
  readonly placeholder: string
  readonly echoMode: EchoMode
  readonly charLimit: Option.Option<number>
  readonly showCursor: boolean
  readonly validationError: Option.Option<string>
}

export enum EchoMode {
  Normal = "normal",
  Password = "password",
  None = "none"
}

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

export interface TextInputOptions {
  readonly id?: string
  readonly value?: string
  readonly placeholder?: string
  readonly width?: number
  readonly echoMode?: EchoMode
  readonly charLimit?: number
  readonly styles?: Partial<TextInputStyles>
  readonly validator?: (value: string) => string | null
}

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
      // Clean, consistent styling
      base: style()
        .foreground(Colors.white)
        .background(Colors.black),
      focused: style()
        .foreground(Colors.white)
        .background(Colors.black),
      cursor: style()
        .foreground(Colors.black)
        .background(Colors.white),
      placeholder: style()
        .foreground(Colors.gray),
      text: style()
        .foreground(Colors.white),
      error: style()
        .foreground(Colors.red),
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
          
          const before = model.value.slice(0, model.cursor)
          const after = model.value.slice(model.cursor)
          const newValue = before + msg.char + after
          
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
          return [{ ...model, focused: true, showCursor: true }, []]
        }
        
        case "Blur": {
          return [{ ...model, focused: false, showCursor: false }, []]
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
          return [{ ...model, showCursor: !model.showCursor }, []]
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
    
    // Calculate visible portion
    const availableWidth = model.width - 2
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
    
    // Build the field content
    let fieldContent = ""
    
    if (!model.value && !model.focused) {
      // Show placeholder
      const placeholder = model.placeholder.slice(0, availableWidth)
      fieldContent = renderStyledSync(
        placeholder.padEnd(availableWidth),
        this.styles.placeholder
      )
    } else if (model.focused && model.showCursor) {
      // Show text with cursor
      const visibleText = displayText.slice(visibleStart, visibleEnd)
      const cursorPos = model.cursor - visibleStart
      
      // Build the field character by character
      const chars: string[] = []
      
      for (let i = 0; i < availableWidth; i++) {
        if (i < visibleText.length) {
          if (i === cursorPos) {
            // Cursor position
            chars.push(renderStyledSync(visibleText[i], this.styles.cursor))
          } else {
            // Regular text
            chars.push(renderStyledSync(visibleText[i], this.styles.text))
          }
        } else if (i === cursorPos) {
          // Cursor at end
          chars.push(renderStyledSync(" ", this.styles.cursor))
        } else {
          // Empty space
          chars.push(renderStyledSync(" ", this.styles.base))
        }
      }
      
      fieldContent = chars.join("")
    } else {
      // Show text without cursor
      const visibleText = displayText.slice(visibleStart, visibleEnd)
      fieldContent = renderStyledSync(
        visibleText.padEnd(availableWidth),
        this.styles.text
      )
    }
    
    // Add validation error if present
    if (Option.isSome(model.validationError)) {
      const errorMsg = renderStyledSync(
        model.validationError.value,
        this.styles.error
      )
      return {
        render: () => Effect.succeed(fieldContent + "\n" + errorMsg),
        width: model.width,
        height: 2
      }
    }
    
    return {
      render: () => Effect.succeed(fieldContent),
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

export const textInput = (options?: TextInputOptions): TextInput => {
  return new TextInput(options)
}

export const emailInput = (options?: TextInputOptions): TextInput => {
  return new TextInput({
    ...options,
    placeholder: options?.placeholder || "email@example.com",
    validator: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!value) return null
      if (!emailRegex.test(value)) return "Invalid email address"
      return null
    }
  })
}

export const passwordInput = (options?: TextInputOptions): TextInput => {
  return new TextInput({
    ...options,
    placeholder: options?.placeholder || "Enter password...",
    echoMode: EchoMode.Password
  })
}