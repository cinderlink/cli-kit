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

import { Effect, Option, Stream } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type AppOptions,
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

const FOCUS_NONE = -1  // No component focused

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
  | { _tag: "FocusField"; index: number }
  | { _tag: "Blur" }
  | { _tag: "Submit" }
  | { _tag: "Cancel" }
  | { _tag: "Reset" }
  | { _tag: "Quit" }
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
    
    // If newIndex is FOCUS_NONE, we're done (everything is blurred)
    if (newIndex === FOCUS_NONE) {
      return [updatedModel, []]
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
        
        case "FocusField": {
          return yield* _(setFocus(msg.index, model))
        }
        
        case "Blur": {
          // Blur all fields and set focus to none
          return yield* _(setFocus(FOCUS_NONE, model))
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
        
        case "Cancel":
        case "Quit": {
          // Create a quit command that will be processed by the runtime
          const quitCmd = Effect.succeed({ _tag: "Quit" as const })
          return [model, [quitCmd]]
        }
        
        case "Reset": {
          // Reset form to initial state
          return yield* _(init)
        }
        
        default: {
          // Only update the focused component
          let newModel = model
          
          // If nothing is focused, ignore component messages
          if (model.focusIndex === FOCUS_NONE) {
            return [model, []]
          }
          
          switch (model.focusIndex) {
            case FOCUS_NAME: {
              const [newName] = yield* _(nameField.update(msg as any, model.nameInput))
              newModel = { ...model, nameInput: newName }
              break
            }
            case FOCUS_EMAIL: {
              const [newEmail] = yield* _(emailField.update(msg as any, model.emailInput))
              newModel = { ...model, emailInput: newEmail }
              break
            }
            case FOCUS_SUBMIT: {
              const [newSubmit] = yield* _(submitBtn.update(msg as any, model.submitButton))
              newModel = { ...model, submitButton: newSubmit }
              
              // Check for button click
              if (msg._tag === "Click" && newSubmit !== model.submitButton) {
                return yield* _(update({ _tag: "Submit" }, model))
              }
              break
            }
            case FOCUS_CANCEL: {
              const [newCancel] = yield* _(cancelBtn.update(msg as any, model.cancelButton))
              newModel = { ...model, cancelButton: newCancel }
              
              // Check for button click
              if (msg._tag === "Click" && newCancel !== model.cancelButton) {
                return yield* _(update({ _tag: "Cancel" }, model))
              }
              break
            }
          }
          
          return [newModel, []]
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
        View.empty,
        View.styledText(`Name: ${model.formData.name}`, style()),
        View.styledText(`Email: ${model.formData.email}`, style()),
        View.empty,
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
      View.empty,
      nameSection,
      View.empty,
      emailSection,
      View.empty,
      buttonContainer,
      View.empty,
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
        // Always allow Ctrl+C to quit
        if (key.ctrl && key.key === 'ctrl+c') {
          return { _tag: "Quit" as const }
        }
        
        // Only allow 'q' to quit when no input field is focused
        if (key.key === 'q' && (model.focusIndex === FOCUS_NONE || 
            model.focusIndex === FOCUS_SUBMIT || 
            model.focusIndex === FOCUS_CANCEL)) {
          return { _tag: "Quit" as const }
        }
        
        if (model.submitted && key.key === 'r') {
          return { _tag: "Reset" as const }
        }
        
        // If we're in the submitted state, don't process other keys
        if (model.submitted) {
          return null
        }
        
        // ESC key blurs current field
        if (key.key === 'escape') {
          return { _tag: "Blur" as const }
        }
        
        // Tab navigation
        if (key.key === 'tab' && !key.shift) {
          // If nothing is focused, start at the beginning
          if (model.focusIndex === FOCUS_NONE) {
            return { _tag: "FocusField" as const, index: FOCUS_NAME }
          }
          return { _tag: "NextField" as const }
        }
        if (key.key === 'tab' && key.shift) {
          // If nothing is focused, start at the end
          if (model.focusIndex === FOCUS_NONE) {
            return { _tag: "FocusField" as const, index: FOCUS_CANCEL }
          }
          return { _tag: "PrevField" as const }
        }
        
        // Only handle keys for the focused component if something is focused
        if (model.focusIndex !== FOCUS_NONE) {
          switch (model.focusIndex) {
            case FOCUS_NAME:
              const nameMsg = nameField.handleKey(key, model.nameInput)
              if (nameMsg) return nameMsg
              break
            case FOCUS_EMAIL:
              const emailMsg = emailField.handleKey(key, model.emailInput)
              if (emailMsg) return emailMsg
              break
            case FOCUS_SUBMIT:
              const submitMsg = submitBtn.handleKey(key, model.submitButton)
              if (submitMsg) return submitMsg
              break
            case FOCUS_CANCEL:
              const cancelMsg = cancelBtn.handleKey(key, model.cancelButton)
              if (cancelMsg) return cancelMsg
              break
          }
        }
        
        return null
      }).pipe(
        Stream.catchAll(() => Stream.empty)
      )
    })
}

// Extract init and update functions for internal use
const { init, update } = ContactFormComponent

// =============================================================================
// Main Application - Demonstrates complete form functionality
// =============================================================================

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

// This demonstrates that our framework can handle:
// 1. Complex form interactions with multiple components
// 2. State management across form fields
// 3. Validation and submission workflows
// 4. Professional visual appearance
const program = runApp(ContactFormComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })