#!/usr/bin/env bun

/**
 * Form with Runes - Demonstrates $bindable integration with TUI components
 */

import { Effect } from "effect"
import { runApp } from "../src/core/runtime"
import { LiveServices } from "../src/services/impl"
import type { Component, RuntimeConfig, View, Cmd } from "../src/core/types"
import { $bindable, $derived } from "../src/reactivity"
import { text, vstack, hstack } from "../src/core/view"
import { style, Colors } from "../src/styling"
import { TextInput, type TextInputModel, type TextInputMsg } from "../src/components/TextInput"
import { InputService } from "../src/services"

interface FormModel {
  name: ReturnType<typeof $bindable<string>>
  email: ReturnType<typeof $bindable<string>>
  nameInput: TextInputModel
  emailInput: TextInputModel
  activeField: 'name' | 'email'
  submitted: boolean
}

type FormMsg = 
  | { tag: "NameInputMsg"; msg: TextInputMsg }
  | { tag: "EmailInputMsg"; msg: TextInputMsg }
  | { tag: "SwitchField" }
  | { tag: "Submit" }
  | { tag: "Reset" }
  | { tag: "Quit" }

const createForm = (): Component<FormModel, FormMsg> => {
  // Create bindable values
  const name = $bindable('', {
    validate: (value) => value.length > 0 || 'Name is required'
  })
  
  const email = $bindable('', {
    validate: (value) => {
      if (!value) return 'Email is required'
      return value.includes('@') || 'Invalid email address'
    }
  })
  
  // Create text inputs
  const nameInput = new TextInput({
    placeholder: "Enter your name...",
    width: 40
  })
  
  const emailInput = new TextInput({
    placeholder: "email@example.com",
    width: 40
  })
  
  // Subscribe to bindable changes to update inputs
  name.$subscribe((value) => {
    // We'll handle this through messages
  })
  
  email.$subscribe((value) => {
    // We'll handle this through messages
  })
  
  return {
    init: Effect.gen(function* () {
      const [nameModel, nameCmds] = yield* nameInput.init()
      const [emailModel, emailCmds] = yield* emailInput.init()
      
      // Focus the name field initially
      const [focusedNameModel] = yield* nameInput.update({ _tag: "Focus" }, nameModel)
      
      const model: FormModel = {
        name,
        email,
        nameInput: focusedNameModel,
        emailInput: emailModel,
        activeField: 'name',
        submitted: false
      }
      
      const cmds: Cmd<FormMsg>[] = [
        ...nameCmds.map(cmd => Effect.map(cmd, (msg): FormMsg => ({ tag: "NameInputMsg", msg }))),
        ...emailCmds.map(cmd => Effect.map(cmd, (msg): FormMsg => ({ tag: "EmailInputMsg", msg })))
      ]
      
      return [model, cmds]
    }),
    
    update: (msg, model) => Effect.gen(function* () {
      switch (msg.tag) {
        case "NameInputMsg": {
          const [newInput, cmds] = yield* nameInput.update(msg.msg, model.nameInput)
          
          // Update bindable if value changed
          if (newInput.value !== model.nameInput.value) {
            model.name.$set(newInput.value)
          }
          
          return [{
            ...model,
            nameInput: newInput
          }, cmds.map(cmd => Effect.map(cmd, (msg): FormMsg => ({ tag: "NameInputMsg", msg })))]
        }
        
        case "EmailInputMsg": {
          const [newInput, cmds] = yield* emailInput.update(msg.msg, model.emailInput)
          
          // Update bindable if value changed
          if (newInput.value !== model.emailInput.value) {
            model.email.$set(newInput.value)
          }
          
          return [{
            ...model,
            emailInput: newInput
          }, cmds.map(cmd => Effect.map(cmd, (msg): FormMsg => ({ tag: "EmailInputMsg", msg })))]
        }
        
        case "SwitchField": {
          if (model.activeField === 'name') {
            // Blur name, focus email
            const [blurredName] = yield* nameInput.update({ _tag: "Blur" }, model.nameInput)
            const [focusedEmail] = yield* emailInput.update({ _tag: "Focus" }, model.emailInput)
            
            return [{
              ...model,
              nameInput: blurredName,
              emailInput: focusedEmail,
              activeField: 'email'
            }, []]
          } else {
            // Blur email, focus name
            const [blurredEmail] = yield* emailInput.update({ _tag: "Blur" }, model.emailInput)
            const [focusedName] = yield* nameInput.update({ _tag: "Focus" }, model.nameInput)
            
            return [{
              ...model,
              nameInput: focusedName,
              emailInput: blurredEmail,
              activeField: 'name'
            }, []]
          }
        }
        
        case "Submit": {
          const nameValue = model.name()
          const emailValue = model.email()
          
          if (nameValue && emailValue && emailValue.includes('@')) {
            return [{
              ...model,
              submitted: true
            }, []]
          }
          
          return [model, []]
        }
        
        case "Reset": {
          model.name.$set('')
          model.email.$set('')
          
          const [clearedName] = yield* nameInput.update({ _tag: "SetValue", value: '' }, model.nameInput)
          const [clearedEmail] = yield* emailInput.update({ _tag: "SetValue", value: '' }, model.emailInput)
          
          return [{
            ...model,
            nameInput: clearedName,
            emailInput: clearedEmail,
            submitted: false
          }, []]
        }
        
        case "Quit": {
          return [model, [Effect.succeed({ _tag: "Quit" as const })]]
        }
      }
    }),
    
    view: (model) => {
      const nameValue = model.name()
      const emailValue = model.email()
      const isValid = nameValue && emailValue && emailValue.includes('@')
      
      const titleView = text("Form with Bindable Runes", style().bold().foreground(Colors.cyan))
      const helpView = text("Tab: switch fields | Enter: submit | Ctrl+R: reset | q: quit", style().foreground(Colors.gray))
      
      const nameLabel = text("Name:", style().bold())
      const nameView = nameInput.view(model.nameInput)
      const nameStatus = text(
        nameValue ? "✓" : "Required",
        style().foreground(nameValue ? Colors.green : Colors.yellow)
      )
      
      const emailLabel = text("Email:", style().bold())
      const emailView = emailInput.view(model.emailInput)
      const emailStatus = text(
        emailValue && emailValue.includes('@') ? "✓" : emailValue ? "Invalid" : "Required",
        style().foreground(
          emailValue && emailValue.includes('@') ? Colors.green : Colors.yellow
        )
      )
      
      const statusView = text(
        isValid ? "Ready to submit!" : "Please fill in all fields",
        style().foreground(isValid ? Colors.green : Colors.red)
      )
      
      const submittedView = model.submitted
        ? vstack(
            text(""),
            text("=== Form Submitted! ===", style().bold().foreground(Colors.green)),
            text(`Name: ${nameValue}`),
            text(`Email: ${emailValue}`),
            text("===================", style().foreground(Colors.green))
          )
        : text("")
      
      return vstack(
        titleView,
        helpView,
        text(""),
        hstack(nameLabel, text(" "), nameView, text(" "), nameStatus),
        hstack(emailLabel, text(" "), emailView, text(" "), emailStatus),
        text(""),
        statusView,
        submittedView
      )
    },
    
    subscriptions: (model) => Effect.gen(function* () {
      const input = yield* InputService
      
      return input.mapKeys(key => {
        // Handle field-specific input
        if (model.activeField === 'name') {
          const msg = nameInput.handleKey(key, model.nameInput)
          if (msg) return { tag: "NameInputMsg" as const, msg }
        } else {
          const msg = emailInput.handleKey(key, model.emailInput)
          if (msg) return { tag: "EmailInputMsg" as const, msg }
        }
        
        // Handle global keys
        switch (key.key) {
          case 'tab':
            return { tag: "SwitchField" as const }
          case 'enter':
            return { tag: "Submit" as const }
          case 'ctrl+r':
            return { tag: "Reset" as const }
          case 'q':
            return { tag: "Quit" as const }
        }
        
        return null
      })
    })
  }
}

const config: RuntimeConfig = {
  fps: 30,
  quitOnCtrlC: true,
  fullscreen: false
}

// Run the form
Effect.runPromise(
  runApp(createForm(), config).pipe(
    Effect.provide(LiveServices),
    Effect.catchAll(() => Effect.void)
  )
)