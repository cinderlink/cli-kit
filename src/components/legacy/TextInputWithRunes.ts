/**
 * Enhanced TextInput Component with Rune Support
 * 
 * This version supports both traditional model/update pattern
 * and the new $bindable rune system for reactive state management
 */

import { Effect, Option } from "effect"
import type { View, Cmd, AppServices, KeyEvent } from "../core/types"
import { KeyType } from "../core/keys"
import { style, Colors, renderStyledSync } from "../styling"
import { 
  TextInput as BaseTextInput,
  type TextInputModel,
  type TextInputMsg,
  type TextInputOptions,
  type TextInputStyles,
  EchoMode
} from "./TextInput-clean"
import type { BindableRune, StateRune } from "../reactivity/runes"
import { isBindableRune, isStateRune } from "../reactivity/runes"

/**
 * Enhanced TextInput options with rune support
 */
export interface TextInputWithRunesOptions extends TextInputOptions {
  'bind:value'?: BindableRune<string> | StateRune<string>
  onValueChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
}

/**
 * Enhanced TextInput that integrates with the rune system
 * 
 * Features:
 * - Supports bind:value for two-way data binding
 * - Maintains compatibility with traditional model/update pattern
 * - Automatically syncs with bindable runes
 * - Provides onChange callbacks for custom handling
 */
export class TextInputWithRunes extends BaseTextInput {
  private boundRune?: BindableRune<string> | StateRune<string>
  private onValueChange?: (value: string) => void
  private onFocus?: () => void
  private onBlur?: () => void
  private unsubscribe?: () => void
  
  constructor(options: TextInputWithRunesOptions = {}) {
    // Extract rune-specific options
    const { 'bind:value': boundRune, onValueChange, onFocus, onBlur, ...baseOptions } = options
    
    // Initialize with rune value if present
    if (boundRune) {
      baseOptions.value = boundRune()
    }
    
    super(baseOptions)
    
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
  
  update(msg: TextInputMsg, model: TextInputModel): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, AppServices> {
    return Effect.gen(function* () {
      const [newModel, cmds] = yield* super.update(msg, model)
      
      // Handle value changes
      if (newModel.value !== model.value) {
        // Update bound rune if present
        if (this.boundRune) {
          this.boundRune.$set(newModel.value)
        }
        
        // Call onChange callback if present
        if (this.onValueChange) {
          this.onValueChange(newModel.value)
        }
      }
      
      // Handle focus changes
      if (msg._tag === "Focus" && this.onFocus) {
        this.onFocus()
      } else if (msg._tag === "Blur" && this.onBlur) {
        this.onBlur()
      }
      
      return [newModel, cmds]
    }.bind(this))
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
  }
}

/**
 * Factory function for creating TextInput with rune support
 * 
 * @example
 * ```typescript
 * const name = $bindable('')
 * const input = textInputWithRunes({ 'bind:value': name })
 * 
 * // Or with traditional callbacks
 * const input = textInputWithRunes({ 
 *   value: 'initial',
 *   onValueChange: (v) => console.log('Changed to:', v)
 * })
 * ```
 */
export const textInputWithRunes = (options?: TextInputWithRunesOptions): TextInputWithRunes => {
  return new TextInputWithRunes(options)
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
export const TextInput = (props: TextInputWithRunesOptions) => {
  // Process bind: props automatically through JSX transform
  return textInputWithRunes(props)
}