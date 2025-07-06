/**
 * Enhanced TextInput with Bindable Support
 * 
 * Extends the base TextInput to support $bindable runes
 */

import { Effect } from "effect"
import { TextInput, type TextInputModel, type TextInputMsg, type TextInputOptions } from "./TextInput"
import type { BindableRune } from "../reactivity/runes"
import type { Cmd } from "../core/types"

/**
 * TextInput options with bindable support
 */
export interface BindableTextInputOptions extends TextInputOptions {
  valueRune?: BindableRune<string>
}

/**
 * Enhanced TextInput that syncs with bindable runes
 */
export class BindableTextInput extends TextInput {
  private valueRune?: BindableRune<string>
  private unsubscribe?: () => void
  
  constructor(options: BindableTextInputOptions = {}) {
    super(options)
    this.valueRune = options.valueRune
  }
  
  init(): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, any> {
    return Effect.gen(function* () {
      const [model, cmds] = yield* super.init()
      
      // If we have a valueRune, sync initial value and subscribe to changes
      if (this.valueRune) {
        // Set initial value from rune
        const initialValue = this.valueRune()
        const updatedModel = { ...model, value: initialValue }
        
        // Subscribe to rune changes
        this.unsubscribe = this.valueRune.$subscribe((newValue) => {
          // This will trigger a SetValue message when the rune changes externally
          // We'll need to handle this in a way that doesn't cause infinite loops
        })
        
        return [updatedModel, cmds]
      }
      
      return [model, cmds]
    }.bind(this))
  }
  
  update(msg: TextInputMsg, model: TextInputModel): Effect.Effect<[TextInputModel, ReadonlyArray<Cmd<TextInputMsg>>], never, any> {
    return Effect.gen(function* () {
      const [newModel, cmds] = yield* super.update(msg, model)
      
      // If value changed and we have a valueRune, update it
      if (this.valueRune && newModel.value !== model.value) {
        // Update the rune when the input value changes
        // This happens for all user input (CharacterInput, DeleteBackward, etc.)
        this.valueRune.$set(newModel.value)
      }
      
      return [newModel, cmds]
    }.bind(this))
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
 * Factory function for creating bindable text inputs
 */
export const bindableTextInput = (options?: BindableTextInputOptions): BindableTextInput => {
  return new BindableTextInput(options)
}