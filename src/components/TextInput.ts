/**
 * TextInput Component - Unified implementation with traditional and rune support
 * 
 * This is the canonical TextInput implementation that supports:
 * - Traditional model/update pattern
 * - Svelte-inspired $bindable runes for reactive state
 * - Clean rendering without color bleeding
 * - Full feature set including cursor blinking
 * - Validation and transformation
 * - Multiple echo modes (normal, password, none)
 * 
 * @example Traditional usage:
 * ```typescript
 * const input = textInput({ placeholder: "Enter name..." })
 * ```
 * 
 * @example With runes:
 * ```typescript
 * const name = $bindable('')
 * const input = textInput({ 'bind:value': name })
 * ```
 * 
 * @example JSX usage:
 * ```tsx
 * <TextInput bind:value={name} placeholder="Enter name..." />
 * ```
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
import type { BindableRune, StateRune } from "../reactivity/runes"
import { isBindableRune, isStateRune } from "../reactivity/runes"

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
 * TextInput configuration options with rune support
 */
export interface TextInputOptions {
  readonly id?: string
  readonly value?: string
  readonly placeholder?: string
  readonly width?: number
  readonly echoMode?: EchoMode
  readonly charLimit?: number
  readonly cursorStyle?: CursorStyle
  readonly blinkSpeed?: number
  readonly styles?: Partial<TextInputStyles>
  readonly validator?: (value: string) => string | null
  // Rune support
  readonly 'bind:value'?: BindableRune<string> | StateRune<string>
  readonly onValueChange?: (value: string) => void
  readonly onFocus?: () => void
  readonly onBlur?: () => void
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
  deleteWordForward: keyBinding(["ctrl+alt+d"], ["Ctrl+Alt+D", "Delete word forward"], { _tag: "DeleteWordForward" }),
  clear: keyBinding(["ctrl+u"], ["Ctrl+U", "Clear input"], { _tag: "Clear" })
})

// =============================================================================
// TextInput Component
// =============================================================================

export class TextInput implements UIComponent<TextInputModel, TextInputMsg> {
  readonly id: string
  private keyMap: KeyMap<TextInputMsg>
  private styles: TextInputStyles
  private validator?: (value: string) => string | null
  private cursorBlinkTimer?: NodeJS.Timeout
  private boundRune?: BindableRune<string> | StateRune<string>
  private onValueChange?: (value: string) => void
  private onFocus?: () => void
  private onBlur?: () => void
  private unsubscribe?: () => void
  
  constructor(private options: TextInputOptions = {}) {
    this.id = options.id || generateComponentId("textinput")
    this.keyMap = createKeyMap()
    this.styles = this.createStyles(options.styles)
    this.validator = options.validator
    
    // Extract rune-specific options
    const { 'bind:value': boundRune, onValueChange, onFocus, onBlur } = options
    
    // Initialize with rune value if present
    if (boundRune) {
      this.options = { ...options, value: boundRune() }
    }
    
    this.boundRune = boundRune
    this.onValueChange = onValueChange
    this.onFocus = onFocus
    this.onBlur = onBlur
    
    // Subscribe to rune changes if it's bindable
    if (boundRune && isBindableRune(boundRune)) {
      this.unsubscribe = boundRune.$subscribe((newValue) => {
        // Update internal value when rune changes externally
        // This will be handled through a SetValue message
      })
    }
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
        cursorStyle: this.options.cursorStyle || CursorStyle.Blink,
        blinkSpeed: this.options.blinkSpeed || 500,
        showCursor: true,
        validationError: Option.none()
      },
      []
    ])
  }
  
  update(msg: TextInputMsg, model: TextInputModel): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, AppServices> {
    const self = this
    return Effect.gen(function* (_) {
      // If not focused, ignore all input messages except Focus/Blur and setters
      if (!model.focused && msg._tag !== "Focus" && msg._tag !== "Blur" && 
          msg._tag !== "SetValue" && msg._tag !== "SetPlaceholder" && msg._tag !== "SetEchoMode") {
        return [model, []]
      }
      
      let newModel = model
      let cmds: Cmd<TextInputMsg>[] = []
      
      switch (msg._tag) {
        case "CharacterInput": {
          // Check character limit
          if (Option.isSome(model.charLimit) && model.value.length >= model.charLimit.value) {
            return [model, []]
          }
          
          const before = model.value.slice(0, model.cursor)
          const after = model.value.slice(model.cursor)
          const newValue = before + msg.char + after
          
          const error = self.validator ? self.validator(newValue) : null
          
          newModel = {
            ...model,
            value: newValue,
            cursor: model.cursor + 1,
            validationError: error ? Option.some(error) : Option.none()
          }
          break
        }
        
        case "CursorLeft": {
          if (model.cursor > 0) {
            newModel = { ...model, cursor: model.cursor - 1 }
          }
          break
        }
        
        case "CursorRight": {
          if (model.cursor < model.value.length) {
            newModel = { ...model, cursor: model.cursor + 1 }
          }
          break
        }
        
        case "CursorStart": {
          newModel = { ...model, cursor: 0, offset: 0 }
          break
        }
        
        case "CursorEnd": {
          newModel = { ...model, cursor: model.value.length }
          break
        }
        
        case "DeleteBackward": {
          if (model.cursor > 0) {
            const before = model.value.slice(0, model.cursor - 1)
            const after = model.value.slice(model.cursor)
            const newValue = before + after
            
            const error = self.validator ? self.validator(newValue) : null
            
            newModel = {
              ...model,
              value: newValue,
              cursor: model.cursor - 1,
              validationError: error ? Option.some(error) : Option.none()
            }
          }
          break
        }
        
        case "DeleteForward": {
          if (model.cursor < model.value.length) {
            const before = model.value.slice(0, model.cursor)
            const after = model.value.slice(model.cursor + 1)
            const newValue = before + after
            
            const error = self.validator ? self.validator(newValue) : null
            
            newModel = {
              ...model,
              value: newValue,
              validationError: error ? Option.some(error) : Option.none()
            }
          }
          break
        }
        
        case "DeleteWordBackward": {
          if (model.cursor === 0) break
          
          // Find the start of the previous word
          let pos = model.cursor - 1
          
          // Skip trailing spaces
          while (pos > 0 && model.value[pos] === ' ') pos--
          
          // Skip word characters
          while (pos > 0 && model.value[pos - 1] !== ' ') pos--
          
          const before = model.value.slice(0, pos)
          const after = model.value.slice(model.cursor)
          const newValue = before + after
          
          const error = self.validator ? self.validator(newValue) : null
          
          newModel = {
            ...model,
            value: newValue,
            cursor: pos,
            validationError: error ? Option.some(error) : Option.none()
          }
          break
        }
        
        case "DeleteWordForward": {
          if (model.cursor >= model.value.length) break
          
          // Find the end of the current word
          let pos = model.cursor
          
          // Skip leading spaces
          while (pos < model.value.length && model.value[pos] === ' ') pos++
          
          // Skip word characters
          while (pos < model.value.length && model.value[pos] !== ' ') pos++
          
          const before = model.value.slice(0, model.cursor)
          const after = model.value.slice(pos)
          const newValue = before + after
          
          const error = self.validator ? self.validator(newValue) : null
          
          newModel = {
            ...model,
            value: newValue,
            validationError: error ? Option.some(error) : Option.none()
          }
          break
        }
        
        case "Clear": {
          newModel = {
            ...model,
            value: "",
            cursor: 0,
            offset: 0,
            validationError: Option.none()
          }
          break
        }
        
        case "Focus": {
          newModel = { ...model, focused: true, showCursor: true }
          
          // Start cursor blinking if style is Blink
          if (model.cursorStyle === CursorStyle.Blink) {
            const blinkCmd: Cmd<TextInputMsg> = Effect.delay(
              Effect.succeed({ _tag: "BlinkCursor" as const }),
              model.blinkSpeed
            )
            cmds.push(blinkCmd)
          }
          
          // Call onFocus callback
          if (self.onFocus) {
            self.onFocus()
          }
          break
        }
        
        case "Blur": {
          newModel = { ...model, focused: false, showCursor: false }
          
          // Call onBlur callback
          if (self.onBlur) {
            self.onBlur()
          }
          break
        }
        
        case "SetValue": {
          const error = this.validator ? this.validator(msg.value) : null
          newModel = {
            ...model,
            value: msg.value,
            cursor: Math.min(model.cursor, msg.value.length),
            validationError: error ? Option.some(error) : Option.none()
          }
          break
        }
        
        case "SetPlaceholder": {
          newModel = { ...model, placeholder: msg.placeholder }
          break
        }
        
        case "SetEchoMode": {
          newModel = { ...model, echoMode: msg.mode }
          break
        }
        
        case "BlinkCursor": {
          if (!model.focused) break
          
          newModel = { ...model, showCursor: !model.showCursor }
          
          // Schedule next blink
          if (model.cursorStyle === CursorStyle.Blink) {
            const blinkCmd: Cmd<TextInputMsg> = Effect.delay(
              Effect.succeed({ _tag: "BlinkCursor" as const }),
              model.blinkSpeed
            )
            cmds.push(blinkCmd)
          }
          break
        }
      }
      
      // Handle value changes
      if (newModel.value !== model.value) {
        // Update bound rune if present
        if (self.boundRune) {
          self.boundRune.$set(newModel.value)
        }
        
        // Call onChange callback if present
        if (self.onValueChange) {
          self.onValueChange(newModel.value)
        }
      }
      
      return [newModel, cmds]
    })
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
    
    // Build the field content
    let fieldContent = ""
    
    if (!model.value && !model.focused) {
      // Show placeholder
      const placeholder = model.placeholder.slice(0, availableWidth)
      fieldContent = renderStyledSync(
        placeholder.padEnd(availableWidth),
        this.styles.placeholder
      )
    } else if (model.focused && model.showCursor && model.echoMode !== EchoMode.None) {
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
    return Effect.void
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
  
  /**
   * Update the bound value from external source
   */
  setValue(value: string): Cmd<TextInputMsg> {
    return Effect.succeed({ _tag: "SetValue" as const, value })
  }
  
  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = undefined
    }
    
    if (this.cursorBlinkTimer) {
      clearInterval(this.cursorBlinkTimer)
      this.cursorBlinkTimer = undefined
    }
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

/**
 * JSX Component wrapper for TextInput with rune support
 * 
 * This can be used directly in JSX with bind: syntax:
 * 
 * @example
 * ```tsx
 * const name = $bindable('')
 * 
 * <TextInput bind:value={name} placeholder="Enter name..." />
 * ```
 */
export const TextInputComponent = (props: TextInputOptions) => {
  // Process bind: props automatically through JSX transform
  return textInput(props)
}

// Export JSX component as default for better IDE support
export default TextInputComponent