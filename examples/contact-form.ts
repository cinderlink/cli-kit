#!/usr/bin/env bun
/**
 * Contact Form Example
 * 
 * Professional form implementation demonstrating:
 * - Text input components with validation (email validation working)
 * - Tab navigation between form fields with visual focus indicators
 * - Button components with proper styling and interaction
 * - Form submission workflow with success feedback
 * - Clean panel composition with borders and padding
 * 
 * Key Learnings Demonstrated:
 * - Text input cursor rendering works without color bleeding
 * - Focus management preserves visual state correctly  
 * - Panel borders render completely (top, right, bottom, left)
 * - Component composition allows complex forms from simple parts
 * 
 * This example proves our framework can handle real-world form scenarios
 * with professional appearance and smooth user interaction.
 */

import { Effect, Option } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type RuntimeConfig,
  type AppServices
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { InputService } from "../src/services/index.ts"
import {
  TextInput,
  textInput,
  emailInput,
  Button,
  primaryButton,
  secondaryButton,
  type TextInputModel,
  type TextInputMsg,
  type ButtonModel,
  type ButtonMsg
} from "../src/components/index.ts"
import { style, Colors } from "../src/styling/index.ts"
import { panel } from "../src/layout/index.ts"
import { simpleVBox, simpleHBox } from "../src/layout/flexbox-simple.ts"

// =============================================================================
// Model - Contact form with name/email inputs and submit/cancel buttons
// =============================================================================

interface ContactFormModel {
  nameInput: TextInputModel
  emailInput: TextInputModel
  submitButton: ButtonModel
  cancelButton: ButtonModel
  
  focusIndex: number
  submitted: boolean
  formData: { name: string; email: string } | null
}

const FOCUS_NAME = 0
const FOCUS_EMAIL = 1
const FOCUS_SUBMIT = 2
const FOCUS_CANCEL = 3

// =============================================================================
// Messages - Form navigation, submission, and component-specific messages
// =============================================================================

type ContactFormMsg =
  | { _tag: "NextField" }
  | { _tag: "PrevField" }
  | { _tag: "Submit" }
  | { _tag: "Cancel" }
  | { _tag: "Reset" }
  | TextInputMsg
  | ButtonMsg

// =============================================================================
// Component Instances - Pre-configured form components
// =============================================================================

const nameField = textInput({
  placeholder: "Enter your name...",
  width: 30
})

const emailField = emailInput({
  placeholder: "email@example.com",
  width: 30
})

const submitBtn = primaryButton("Submit", { width: 12 })
const cancelBtn = secondaryButton("Cancel", { width: 12 })

// =============================================================================
// Focus Management - Handles switching focus between form components
// Key Learning: Bubble Tea pattern of blurring all then focusing one works reliably
// =============================================================================

const setFocus = (newIndex: number, model: ContactFormModel): Effect.Effect<[ContactFormModel, ReadonlyArray<Cmd<ContactFormMsg>>], never, AppServices> =>
  Effect.gen(function* (_) {
    let updatedModel = { ...model, focusIndex: newIndex }
    
    // Blur all components
    const [blurredName] = yield* _(nameField.update({ _tag: "Blur" }, model.nameInput))
    const [blurredEmail] = yield* _(emailField.update({ _tag: "Blur" }, model.emailInput))
    const [blurredSubmit] = yield* _(submitBtn.update({ _tag: "Blur" }, model.submitButton))
    const [blurredCancel] = yield* _(cancelBtn.update({ _tag: "Blur" }, model.cancelButton))
    
    updatedModel = {
      ...updatedModel,
      nameInput: blurredName,
      emailInput: blurredEmail,
      submitButton: blurredSubmit,
      cancelButton: blurredCancel
    }
    
    // Focus the new component
    switch (newIndex) {
      case FOCUS_NAME: {
        const [focused] = yield* _(nameField.update({ _tag: "Focus" }, updatedModel.nameInput))
        updatedModel = { ...updatedModel, nameInput: focused }
        break
      }
      case FOCUS_EMAIL: {
        const [focused] = yield* _(emailField.update({ _tag: "Focus" }, updatedModel.emailInput))
        updatedModel = { ...updatedModel, emailInput: focused }
        break
      }
      case FOCUS_SUBMIT: {
        const [focused] = yield* _(submitBtn.update({ _tag: "Focus" }, updatedModel.submitButton))
        updatedModel = { ...updatedModel, submitButton: focused }
        break
      }
      case FOCUS_CANCEL: {
        const [focused] = yield* _(cancelBtn.update({ _tag: "Focus" }, updatedModel.cancelButton))
        updatedModel = { ...updatedModel, cancelButton: focused }
        break
      }
    }
    
    return [updatedModel, []]
  })

// =============================================================================
// Component - Main contact form with validation and submission workflow
// =============================================================================

export const ContactFormComponent: Component<ContactFormModel, ContactFormMsg> = {
  init: Effect.gen(function* (_) {
    const [nameModel] = yield* _(nameField.init())
    const [emailModel] = yield* _(emailField.init())
    const [submitModel] = yield* _(submitBtn.init())
    const [cancelModel] = yield* _(cancelBtn.init())
    
    // Focus name field initially
    const [focusedName] = yield* _(nameField.update({ _tag: "Focus" }, nameModel))
    
    return [
      {
        nameInput: focusedName,
        emailInput: emailModel,
        submitButton: submitModel,
        cancelButton: cancelModel,
        focusIndex: FOCUS_NAME,
        submitted: false,
        formData: null
      },
      []
    ]
  }),
  
  update: (msg: ContactFormMsg, model: ContactFormModel) =>
    Effect.gen(function* (_) {
      switch (msg._tag) {
        case "NextField": {
          const nextIndex = model.focusIndex + 1 > FOCUS_CANCEL ? FOCUS_NAME : model.focusIndex + 1
          return yield* _(setFocus(nextIndex, model))
        }
        
        case "PrevField": {
          const prevIndex = model.focusIndex - 1 < FOCUS_NAME ? FOCUS_CANCEL : model.focusIndex - 1
          return yield* _(setFocus(prevIndex, model))
        }
        
        case "Submit": {
          // Basic validation
          if (!model.nameInput.value || !model.emailInput.value) {
            return [model, []]
          }
          
          if (Option.isSome(model.emailInput.validationError)) {
            return [model, []]
          }
          
          const formData = {
            name: model.nameInput.value,
            email: model.emailInput.value
          }
          
          return [{ ...model, submitted: true, formData }, []]
        }
        
        case "Cancel": {
          process.stdout.write('\x1b[?25h') // Show cursor
          process.stdout.write('\x1b[2J')   // Clear screen
          process.stdout.write('\x1b[H')    // Move to top
          process.exit(0)
        }
        
        case "Reset": {
          // Reset form to initial state
          return yield* _(init)
        }
        
        default: {
          // Update all components
          const [newName] = yield* _(nameField.update(msg as any, model.nameInput))
          const [newEmail] = yield* _(emailField.update(msg as any, model.emailInput))
          const [newSubmit] = yield* _(submitBtn.update(msg as any, model.submitButton))
          const [newCancel] = yield* _(cancelBtn.update(msg as any, model.cancelButton))
          
          // Check for button clicks
          if (msg._tag === "Click") {
            if (model.focusIndex === FOCUS_SUBMIT && newSubmit !== model.submitButton) {
              return yield* _(update({ _tag: "Submit" }, model))
            }
            if (model.focusIndex === FOCUS_CANCEL && newCancel !== model.cancelButton) {
              return yield* _(update({ _tag: "Cancel" }, model))
            }
          }
          
          return [
            {
              ...model,
              nameInput: newName,
              emailInput: newEmail,
              submitButton: newSubmit,
              cancelButton: newCancel
            },
            []
          ]
        }
      }
    }),
  
  view: (model: ContactFormModel) => {
    if (model.submitted && model.formData) {
      const successContent = simpleVBox([
        View.styledText(
          "✓ Form Submitted Successfully!",
          style().foreground(Colors.green).bold()
        ),
        View.text(""),
        View.styledText(`Name: ${model.formData.name}`, style()),
        View.styledText(`Email: ${model.formData.email}`, style()),
        View.text(""),
        View.styledText(
          "Press 'r' to reset or 'q' to quit",
          style().foreground(Colors.gray).italic()
        )
      ])
      
      return panel(successContent, {
        padding: { top: 2, right: 4, bottom: 2, left: 4 }
      })
    }
    
    // Form title
    const title = View.styledText(
      "Simple Contact Form",
      style().foreground(Colors.cyan).bold()
    )
    
    // Form fields
    const nameSection = simpleVBox([
      View.styledText("Name:", style().foreground(Colors.white)),
      nameField.view(model.nameInput)
    ])
    
    const emailSection = simpleVBox([
      View.styledText("Email:", style().foreground(Colors.white)),
      emailField.view(model.emailInput)
    ])
    
    // Buttons
    const buttonContainer = simpleHBox([
      submitBtn.view(model.submitButton),
      cancelBtn.view(model.cancelButton)
    ], { gap: 2 })
    
    // Help text
    const help = View.styledText(
      "Tab to navigate • Enter to select • Q to quit",
      style().foreground(Colors.gray).italic()
    )
    
    // Compose form
    const formContent = simpleVBox([
      title,
      View.text(""),
      nameSection,
      View.text(""),
      emailSection,
      View.text(""),
      buttonContainer,
      View.text(""),
      help
    ])
    
    return panel(formContent, {
      padding: { top: 1, right: 3, bottom: 1, left: 3 }
    })
  },
  
  subscriptions: (model: ContactFormModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        // Global keys
        if (key.key === 'q' || (key.ctrl && key.key === 'ctrl+c')) {
          process.stdout.write('\x1b[?25h')  // Show cursor
          process.stdout.write('\x1b[2J')    // Clear screen
          process.stdout.write('\x1b[H')     // Move to home
          process.exit(0)
        }
        
        if (model.submitted && key.key === 'r') {
          return { _tag: "Reset" as const }
        }
        
        // If we're in the submitted state, don't process other keys
        if (model.submitted) {
          return null
        }
        
        // Tab navigation
        if (key.key === 'tab' && !key.shift) {
          return { _tag: "NextField" as const }
        }
        if (key.key === 'tab' && key.shift) {
          return { _tag: "PrevField" as const }
        }
        
        // Try all components
        const nameMsg = nameField.handleKey(key, model.nameInput)
        if (nameMsg) return nameMsg
        
        const emailMsg = emailField.handleKey(key, model.emailInput)
        if (emailMsg) return emailMsg
        
        const submitMsg = submitBtn.handleKey(key, model.submitButton)
        if (submitMsg) return submitMsg
        
        const cancelMsg = cancelBtn.handleKey(key, model.cancelButton)
        if (cancelMsg) return cancelMsg
        
        return null
      })
    })
}

// Extract init and update functions for internal use
const { init, update } = ContactFormComponent

// =============================================================================
// Main Application - Demonstrates complete form functionality
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: false,
  quitOnCtrlC: false,
  enableMouse: false,
  fullscreen: true
}

// This demonstrates that our framework can handle:
// 1. Complex form interactions with multiple components
// 2. State management across form fields
// 3. Validation and submission workflows
// 4. Professional visual appearance
const program = runApp(ContactFormComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program).catch(console.error)