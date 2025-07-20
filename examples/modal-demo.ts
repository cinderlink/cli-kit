#!/usr/bin/env bun

import { Effect, Stream } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type AppOptions,
  type AppServices,
  type KeyEvent
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { style, Colors, Borders } from "../src/styling/index.ts"
import { styledBox } from "../src/layout/box.ts"
import { 
  modal, 
  createInfoModal,
  createConfirmModal,
  createErrorModal,
  createLoadingModal,
  type ModalModel,
  type ModalMsg 
} from "../src/components/Modal.ts"

// Model containing different modal examples
interface AppModel {
  // Different modal instances
  infoModal: ModalModel
  confirmModal: ModalModel
  errorModal: ModalModel
  loadingModal: ModalModel
  // App state
  selectedOption: number
  showResult: string
  terminalSize: { width: number; height: number }
}

type AppMsg = 
  | { _tag: "InfoModalMsg"; msg: ModalMsg }
  | { _tag: "ConfirmModalMsg"; msg: ModalMsg }
  | { _tag: "ErrorModalMsg"; msg: ModalMsg }
  | { _tag: "LoadingModalMsg"; msg: ModalMsg }
  | { _tag: "ShowInfoModal" }
  | { _tag: "ShowConfirmModal" }
  | { _tag: "ShowErrorModal" }
  | { _tag: "ShowLoadingModal" }
  | { _tag: "NavigateUp" }
  | { _tag: "NavigateDown" }
  | { _tag: "SelectOption" }
  | { _tag: "UpdateTerminalSize"; width: number; height: number }
  | { _tag: "ConfirmAction" }
  | { _tag: "CancelAction" }
  | { _tag: "SimulateLoading" }

// Create modal instances
const { component: infoModalComponent } = createInfoModal(
  "Information",
  "This is an information modal demonstrating basic modal functionality. It shows important information to the user and can be dismissed easily."
)

const { component: confirmModalComponent } = createConfirmModal(
  "Confirmation Required",
  "Are you sure you want to delete all files? This action cannot be undone.",
  () => console.log("Confirmed!"),
  () => console.log("Cancelled!")
)

const { component: errorModalComponent } = createErrorModal(
  "Error Occurred",
  "Failed to connect to the server. Please check your network connection and try again."
)

const { component: loadingModalComponent } = createLoadingModal(
  "Processing",
  "Loading data, please wait..."
)

const modalDemo: Component<AppModel, AppMsg> = {
  init: Effect.gen(function* () {
    // Initialize all modal components
    const [infoModel] = yield* infoModalComponent.init
    const [confirmModel] = yield* confirmModalComponent.init
    const [errorModel] = yield* errorModalComponent.init
    const [loadingModel] = yield* loadingModalComponent.init
    
    return [{
      infoModal: infoModel,
      confirmModal: confirmModel,
      errorModal: errorModel,
      loadingModal: loadingModel,
      selectedOption: 0,
      showResult: "",
      terminalSize: { width: 80, height: 24 }
    }, []]
  }),

  update: (msg: AppMsg, model: AppModel) => {
    switch (msg._tag) {
      case "InfoModalMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* infoModalComponent.update(msg.msg, model.infoModal)
          return [{ ...model, infoModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ConfirmModalMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* confirmModalComponent.update(msg.msg, model.confirmModal)
          return [{ ...model, confirmModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ErrorModalMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* errorModalComponent.update(msg.msg, model.errorModal)
          return [{ ...model, errorModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "LoadingModalMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* loadingModalComponent.update(msg.msg, model.loadingModal)
          return [{ ...model, loadingModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowInfoModal": {
        return Effect.gen(function* () {
          const content = [
            View.text(""),
            View.styledText("This is an information modal demonstrating basic modal functionality.", style().foreground(Colors.black)),
            View.text(""),
            View.styledText("Features demonstrated:", style().foreground(Colors.blue).bold()),
            View.styledText("• Modal overlay with backdrop", style().foreground(Colors.black)),
            View.styledText("• Keyboard navigation (Escape to close)", style().foreground(Colors.black)),
            View.styledText("• Centered positioning", style().foreground(Colors.black)),
            View.styledText("• Focus management", style().foreground(Colors.black)),
            View.text(""),
            View.styledText("Press Escape or click [×] to close", style().foreground(Colors.gray))
          ]
          
          const [updated] = yield* infoModalComponent.update(
            { _tag: "Open", content },
            model.infoModal
          )
          return [{ ...model, infoModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowConfirmModal": {
        return Effect.gen(function* () {
          const content = [
            View.text(""),
            View.styledText("Are you sure you want to delete all files?", style().foreground(Colors.black)),
            View.styledText("This action cannot be undone.", style().foreground(Colors.red)),
            View.text(""),
            View.text(""),
            View.hstack(
              View.text("                    "), // Spacing for centering
              View.styledText(" Yes ", style().background(Colors.green).foreground(Colors.white).bold()),
              View.text("   "),
              View.styledText(" No ", style().background(Colors.red).foreground(Colors.white).bold())
            ),
            View.text(""),
            View.styledText("Use Tab to navigate, Enter to select", style().foreground(Colors.gray))
          ]
          
          const [updated] = yield* confirmModalComponent.update(
            { _tag: "Open", content },
            model.confirmModal
          )
          return [{ ...model, confirmModal: updated, showResult: "" }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowErrorModal": {
        return Effect.gen(function* () {
          const content = [
            View.text(""),
            View.styledText("⚠ Failed to connect to the server", style().foreground(Colors.red)),
            View.text(""),
            View.styledText("Possible causes:", style().foreground(Colors.black).bold()),
            View.styledText("• Network connection lost", style().foreground(Colors.black)),
            View.styledText("• Server is down", style().foreground(Colors.black)),
            View.styledText("• Firewall blocking connection", style().foreground(Colors.black)),
            View.text(""),
            View.styledText("Press Escape to close", style().foreground(Colors.gray))
          ]
          
          const [updated] = yield* errorModalComponent.update(
            { _tag: "Open", content },
            model.errorModal
          )
          return [{ ...model, errorModal: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowLoadingModal": {
        return Effect.gen(function* () {
          const content = [
            View.text(""),
            View.hstack(
              View.text("  "),
              View.styledText("⠋", style().foreground(Colors.blue).bold()), // Spinner character
              View.text(" "),
              View.styledText("Loading data, please wait...", style().foreground(Colors.black))
            ),
            View.text(""),
            View.styledText("This may take a few moments", style().foreground(Colors.gray))
          ]
          
          const [updated] = yield* loadingModalComponent.update(
            { _tag: "Open", content },
            model.loadingModal
          )
          
          // Auto-close after 3 seconds for demo
          const autoCloseCmd: Cmd<AppMsg> = Effect.gen(function* () {
            yield* Effect.sleep(3000) // Wait 3 seconds
            return { _tag: "LoadingModalMsg", msg: { _tag: "Close" } } as AppMsg
          })
          
          return [{ ...model, loadingModal: updated }, [autoCloseCmd]] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "NavigateUp": {
        return Effect.succeed([
          { ...model, selectedOption: Math.max(0, model.selectedOption - 1) },
          []
        ])
      }
      
      case "NavigateDown": {
        return Effect.succeed([
          { ...model, selectedOption: Math.min(3, model.selectedOption + 1) },
          []
        ])
      }
      
      case "SelectOption": {
        const actions: AppMsg[] = [
          { _tag: "ShowInfoModal" },
          { _tag: "ShowConfirmModal" },
          { _tag: "ShowErrorModal" },
          { _tag: "ShowLoadingModal" }
        ]
        
        const selectedAction = actions[model.selectedOption]
        if (selectedAction) {
          return Effect.succeed([model, [Effect.succeed(selectedAction)] as const] as const)
        }
        return Effect.succeed([model, [] as const] as const)
      }
      
      case "UpdateTerminalSize": {
        return Effect.gen(function* () {
          const [infoUpdated] = yield* infoModalComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.infoModal
          )
          const [confirmUpdated] = yield* confirmModalComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.confirmModal
          )
          const [errorUpdated] = yield* errorModalComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.errorModal
          )
          const [loadingUpdated] = yield* loadingModalComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.loadingModal
          )
          
          return [{
            ...model,
            terminalSize: { width: msg.width, height: msg.height },
            infoModal: infoUpdated,
            confirmModal: confirmUpdated,
            errorModal: errorUpdated,
            loadingModal: loadingUpdated
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ConfirmAction": {
        return Effect.gen(function* () {
          const [updated] = yield* confirmModalComponent.update({ _tag: "Close" }, model.confirmModal)
          return [{ 
            ...model, 
            confirmModal: updated,
            showResult: "✅ Action confirmed! Files would be deleted in a real application."
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "CancelAction": {
        return Effect.gen(function* () {
          const [updated] = yield* confirmModalComponent.update({ _tag: "Close" }, model.confirmModal)
          return [{ 
            ...model, 
            confirmModal: updated,
            showResult: "❌ Action cancelled. No files were deleted."
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "SimulateLoading": {
        return Effect.succeed([
          { ...model, showResult: "⏳ Loading simulation completed!" },
          []
        ])
      }
    }
  },

  view: (model: AppModel) => {
    const { text, styledText, vstack, hstack } = View
    
    const titleStyle = style().foreground(Colors.brightBlue).bold()
    const menuStyle = (selected: boolean) => selected 
      ? style().background(Colors.blue).foreground(Colors.white).bold()
      : style().foreground(Colors.gray)
    
    const menuOptions = [
      "Info Modal - Basic information display",
      "Confirm Modal - User confirmation dialog", 
      "Error Modal - Error message display",
      "Loading Modal - Loading indicator (auto-closes)"
    ]
    
    const mainView = styledBox(
      vstack(
        styledText("🪟 Modal Component Demo", titleStyle),
        text(""),
        styledText("Select a modal type to demonstrate:", style().foreground(Colors.white)),
        text(""),
        ...menuOptions.map((option, index) => 
          styledText(
            `${index === model.selectedOption ? "► " : "  "}${option}`,
            menuStyle(index === model.selectedOption)
          )
        ),
        text(""),
        text(""),
        styledText("Controls:", style().foreground(Colors.yellow).bold()),
        styledText("• ↑↓ arrows: Navigate menu", style().foreground(Colors.gray)),
        styledText("• Enter/Space: Select option", style().foreground(Colors.gray)),
        styledText("• Escape: Close modals", style().foreground(Colors.gray)),
        styledText("• q: Quit application", style().foreground(Colors.gray)),
        text(""),
        model.showResult ? styledText(model.showResult, style().foreground(Colors.green).bold()) : text("")
      ),
      {
        border: Borders.Rounded,
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        minWidth: 70,
        style: style().background(Colors.black).foreground(Colors.white)
      }
    )
    
    // Layer modals on top of main view
    let finalView = mainView
    
    // Show active modals (only one should be open at a time in this demo)
    if (model.infoModal.isOpen) {
      // In a real implementation, we'd overlay the modal properly
      finalView = vstack(mainView, infoModalComponent.view(model.infoModal))
    } else if (model.confirmModal.isOpen) {
      finalView = vstack(mainView, confirmModalComponent.view(model.confirmModal))
    } else if (model.errorModal.isOpen) {
      finalView = vstack(mainView, errorModalComponent.view(model.errorModal))
    } else if (model.loadingModal.isOpen) {
      finalView = vstack(mainView, loadingModalComponent.view(model.loadingModal))
    }
    
    return finalView
  },

  subscriptions: (model: AppModel) => Effect.succeed(Stream.empty),

  handleKeyPress: (key: KeyEvent, model: AppModel) => {
    // Handle modal key events first
    if (model.infoModal.isOpen) {
      const modalMsg = infoModalComponent.handleKey?.(key, model.infoModal)
      if (modalMsg) {
        return Effect.succeed({ _tag: "InfoModalMsg", msg: modalMsg })
      }
    }
    
    if (model.confirmModal.isOpen) {
      const modalMsg = confirmModalComponent.handleKey?.(key, model.confirmModal)
      if (modalMsg) {
        return Effect.succeed({ _tag: "ConfirmModalMsg", msg: modalMsg })
      }
      
      // Handle confirm/cancel in confirm modal
      if (key.key === 'y' || (key.key === 'enter' && model.confirmModal.focusedButton === 0)) {
        return Effect.succeed({ _tag: "ConfirmAction" })
      }
      if (key.key === 'n' || (key.key === 'enter' && model.confirmModal.focusedButton === 1)) {
        return Effect.succeed({ _tag: "CancelAction" })
      }
    }
    
    if (model.errorModal.isOpen) {
      const modalMsg = errorModalComponent.handleKey?.(key, model.errorModal)
      if (modalMsg) {
        return Effect.succeed({ _tag: "ErrorModalMsg", msg: modalMsg })
      }
    }
    
    if (model.loadingModal.isOpen) {
      const modalMsg = loadingModalComponent.handleKey?.(key, model.loadingModal)
      if (modalMsg) {
        return Effect.succeed({ _tag: "LoadingModalMsg", msg: modalMsg })
      }
    }
    
    // Main app navigation when no modal is open
    if (!model.infoModal.isOpen && !model.confirmModal.isOpen && 
        !model.errorModal.isOpen && !model.loadingModal.isOpen) {
      switch (key.key) {
        case 'up':
        case 'k':
          return Effect.succeed({ _tag: "NavigateUp" })
        case 'down':
        case 'j':
          return Effect.succeed({ _tag: "NavigateDown" })
        case 'enter':
        case ' ':
          return Effect.succeed({ _tag: "SelectOption" })
        case 'q':
          return Effect.succeed({ _tag: "Quit" } as any)
      }
    }
    
    return Effect.succeed(null)
  }
}

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting Modal Demo...")
console.log("This example demonstrates modal/dialog components with keyboard navigation")

const program = runApp(modalDemo, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })