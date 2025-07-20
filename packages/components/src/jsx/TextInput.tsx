/**
 * JSX TextInput Component
 * 
 * Provides a JSX-friendly wrapper around the TextInput component
 * with support for bind:value syntax
 */

import { Effect } from "effect"
import type { Component, Cmd } from "@tuix/core"
import { TextInput as TextInputBase, type TextInputModel, type TextInputMsg } from "../TextInput"
import type { BindableRune, StateRune } from "@tuix/reactive"
import { isBindableRune, isStateRune } from "@tuix/reactive"
import { InputService } from "@tuix/services"

export interface TextInputProps {
  value?: string
  'bind:value'?: BindableRune<string> | StateRune<string>
  placeholder?: string
  width?: number
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  password?: boolean
  maxLength?: number
  validator?: (value: string) => string | null
}

interface TextInputComponentModel {
  input: TextInputModel
  props: TextInputProps
  lastExternalValue?: string
}

type TextInputComponentMsg = 
  | { _tag: "InputMsg"; msg: TextInputMsg }
  | { _tag: "ExternalValueChange"; value: string }

export const TextInput = (props: TextInputProps): Component<TextInputComponentModel, TextInputComponentMsg> => {
  const textInput = new TextInputBase({
    value: props.value || props['bind:value']?.() || '',
    placeholder: props.placeholder,
    width: props.width,
    echoMode: props.password ? 1 : 0, // EchoMode.Password : EchoMode.Normal
    charLimit: props.maxLength,
    validator: props.validator
  })
  
  // Track subscription for cleanup
  let runeUnsubscribe: (() => void) | undefined
  
  return {
    init: Effect.gen(function* () {
      const [inputModel, inputCmds] = yield* textInput.init()
      
      const model: TextInputComponentModel = {
        input: inputModel,
        props,
        lastExternalValue: inputModel.value
      }
      
      // Map input commands
      const cmds = inputCmds.map(cmd => 
        Effect.map(cmd, (msg): TextInputComponentMsg => ({ _tag: "InputMsg", msg }))
      )
      
      return [model, cmds]
    }),
    
    update: (msg, model) => Effect.gen(function* () {
      switch (msg._tag) {
        case "InputMsg": {
          const [newInput, inputCmds] = yield* textInput.update(msg.msg, model.input)
          
          // Check if value changed
          if (newInput.value !== model.input.value) {
            // Update bindable rune if present
            if (model.props['bind:value']) {
              model.props['bind:value'].$set(newInput.value)
            }
            
            // Call onChange if present
            if (model.props.onChange) {
              model.props.onChange(newInput.value)
            }
          }
          
          // Check focus changes
          if (newInput.focused !== model.input.focused) {
            if (newInput.focused && model.props.onFocus) {
              model.props.onFocus()
            } else if (!newInput.focused && model.props.onBlur) {
              model.props.onBlur()
            }
          }
          
          const newModel: TextInputComponentModel = {
            ...model,
            input: newInput,
            lastExternalValue: newInput.value
          }
          
          // Map commands
          const cmds = inputCmds.map(cmd =>
            Effect.map(cmd, (msg): TextInputComponentMsg => ({ _tag: "InputMsg", msg }))
          )
          
          return [newModel, cmds]
        }
        
        case "ExternalValueChange": {
          // External value change (from bindable rune)
          if (msg.value !== model.lastExternalValue) {
            // Update the input model
            const setValueMsg: TextInputMsg = { _tag: "SetValue", value: msg.value }
            const [newInput, inputCmds] = yield* textInput.update(setValueMsg, model.input)
            
            const newModel: TextInputComponentModel = {
              ...model,
              input: newInput,
              lastExternalValue: msg.value
            }
            
            // Map commands
            const cmds = inputCmds.map(cmd =>
              Effect.map(cmd, (msg): TextInputComponentMsg => ({ _tag: "InputMsg", msg }))
            )
            
            return [newModel, cmds]
          }
          
          return [model, []]
        }
      }
    }),
    
    view: (model) => textInput.view(model.input),
    
    subscriptions: (model) => Effect.gen(function* () {
      // Subscribe to key events through the input component
      const inputService = yield* InputService
      
      // Set up rune subscription if needed
      if (model.props['bind:value'] && !runeUnsubscribe) {
        const rune = model.props['bind:value']
        if (isBindableRune(rune) || isStateRune(rune)) {
          runeUnsubscribe = rune.$subscribe((value: string) => {
            // Only update if value actually changed to avoid loops
            if (value !== model.input.value) {
              // This would need to be handled through the component's message system
              // For now, we'll use a direct effect
              Effect.succeed({ _tag: "ExternalValueChange" as const, value })
            }
          })
        }
      }
      
      return inputService.mapKeys(key => {
        const inputMsg = textInput.handleKey(key, model.input)
        if (inputMsg) {
          return { _tag: "InputMsg" as const, msg: inputMsg }
        }
        return null
      })
    }),
    
    // Add cleanup for rune subscription
    cleanup: () => Effect.gen(function* () {
      if (runeUnsubscribe) {
        runeUnsubscribe()
        runeUnsubscribe = undefined
      }
    })
  }
}