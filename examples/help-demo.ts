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
  help,
  createHelpModal,
  createHelpPanel,
  createContextHelp,
  getDefaultKeybindings,
  type HelpModel,
  type HelpMsg,
  type HelpSection,
  type KeyBinding
} from "../src/components/Help.ts"

// Model for the demo app
interface AppModel {
  modalHelp: HelpModel
  inlineHelp: HelpModel
  currentMode: 'main' | 'file-browser' | 'text-editor'
  selectedOption: number
  showResult: string
  terminalSize: { width: number; height: number }
}

type AppMsg = 
  | { _tag: "ModalHelpMsg"; msg: HelpMsg }
  | { _tag: "InlineHelpMsg"; msg: HelpMsg }
  | { _tag: "ShowModalHelp" }
  | { _tag: "ShowInlineHelp" }
  | { _tag: "ToggleMode" }
  | { _tag: "NavigateUp" }
  | { _tag: "NavigateDown" }
  | { _tag: "SelectOption" }
  | { _tag: "UpdateTerminalSize"; width: number; height: number }
  | { _tag: "ShowDemoHelp" }
  | { _tag: "Quit" }

// Custom help sections for different modes
const getFileBrowserHelp = (): HelpSection[] => [
  ...getDefaultKeybindings(),
  createContextHelp("File Browser", [
    { key: "Enter", description: "Open file/directory", category: "file-browser" },
    { key: "Backspace", description: "Go to parent directory", category: "file-browser" },
    { key: "h", description: "Toggle hidden files", category: "file-browser" },
    { key: "r", description: "Refresh directory", category: "file-browser" },
    { key: "Tab", description: "Multi-select toggle", category: "file-browser" },
    { key: "Ctrl+A", description: "Select all files", category: "file-browser" },
    { key: "Delete", description: "Delete selected files", category: "file-browser" }
  ])
]

const getTextEditorHelp = (): HelpSection[] => [
  ...getDefaultKeybindings(),
  createContextHelp("Text Editor", [
    { key: "Ctrl+S", description: "Save file", category: "text-editor" },
    { key: "Ctrl+O", description: "Open file", category: "text-editor" },
    { key: "Ctrl+N", description: "New file", category: "text-editor" },
    { key: "Ctrl+F", description: "Find text", category: "text-editor" },
    { key: "Ctrl+H", description: "Find and replace", category: "text-editor" },
    { key: "Ctrl+G", description: "Go to line", category: "text-editor" },
    { key: "Ctrl+/", description: "Toggle comment", category: "text-editor" },
    { key: "Alt+↑", description: "Move line up", category: "text-editor" },
    { key: "Alt+↓", description: "Move line down", category: "text-editor" }
  ])
]

// Create help components
const { component: modalHelpComponent } = createHelpModal(
  "Application Help & Shortcuts",
  getDefaultKeybindings()
)

const inlineHelpComponent = createHelpPanel(
  getDefaultKeybindings(),
  {
    title: "Quick Reference",
    width: 50,
    height: 15,
    showCategories: false,
    showSearch: false
  }
)

const helpDemo: Component<AppModel, AppMsg> = {
  init: Effect.gen(function* () {
    // Initialize help components
    const [modalModel] = yield* modalHelpComponent.init
    const [inlineModel] = yield* inlineHelpComponent.init
    
    return [{
      modalHelp: modalModel,
      inlineHelp: inlineModel,
      currentMode: 'main',
      selectedOption: 0,
      showResult: "",
      terminalSize: { width: 80, height: 24 }
    }, []]
  }),

  update: (msg: AppMsg, model: AppModel) => {
    switch (msg._tag) {
      case "ModalHelpMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* modalHelpComponent.update(msg.msg, model.modalHelp)
          return [{ ...model, modalHelp: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "InlineHelpMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* inlineHelpComponent.update(msg.msg, model.inlineHelp)
          return [{ ...model, inlineHelp: updated }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowModalHelp": {
        return Effect.gen(function* () {
          // Update help content based on current mode
          let sections = getDefaultKeybindings()
          
          if (model.currentMode === 'file-browser') {
            sections = getFileBrowserHelp()
          } else if (model.currentMode === 'text-editor') {
            sections = getTextEditorHelp()
          }
          
          const [updatedWithSections] = yield* modalHelpComponent.update(
            { _tag: "SetSections", sections },
            model.modalHelp
          )
          
          const [updated] = yield* modalHelpComponent.update(
            { _tag: "Open" },
            updatedWithSections
          )
          
          return [{ 
            ...model, 
            modalHelp: updated,
            showResult: `Opened ${model.currentMode} help modal`
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowInlineHelp": {
        return Effect.gen(function* () {
          const [updated] = yield* inlineHelpComponent.update(
            { _tag: "Open" },
            model.inlineHelp
          )
          
          return [{ 
            ...model, 
            inlineHelp: updated,
            showResult: "Toggled inline help panel"
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ToggleMode": {
        const modes = ['main', 'file-browser', 'text-editor'] as const
        const currentIndex = modes.indexOf(model.currentMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]
        
        return Effect.succeed([
          { 
            ...model, 
            currentMode: nextMode,
            showResult: `Switched to ${nextMode} mode (help content will update)`
          },
          []
        ])
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
          { _tag: "ShowModalHelp" },
          { _tag: "ShowInlineHelp" },
          { _tag: "ToggleMode" },
          { _tag: "ShowDemoHelp" }
        ]
        
        const selectedAction = actions[model.selectedOption]
        if (selectedAction) {
          return Effect.succeed([model, [Effect.succeed(selectedAction)]])
        }
        return Effect.succeed([model, []])
      }
      
      case "UpdateTerminalSize": {
        return Effect.gen(function* () {
          const [modalUpdated] = yield* modalHelpComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.modalHelp
          )
          const [inlineUpdated] = yield* inlineHelpComponent.update(
            { _tag: "SetTerminalSize", width: msg.width, height: msg.height },
            model.inlineHelp
          )
          
          return [{
            ...model,
            terminalSize: { width: msg.width, height: msg.height },
            modalHelp: modalUpdated,
            inlineHelp: inlineUpdated
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "ShowDemoHelp": {
        const demoHelp: HelpSection[] = [
          {
            title: "Help Demo Controls",
            description: "Controls specific to this demonstration",
            bindings: [
              { key: "m", description: "Show modal help", category: "demo" },
              { key: "i", description: "Toggle inline help", category: "demo" },
              { key: "t", description: "Switch context mode", category: "demo" },
              { key: "?", description: "Show this demo help", category: "demo" },
              { key: "F1", description: "Context-sensitive help", category: "demo" }
            ]
          },
          {
            title: "Demo Features",
            description: "What this demo showcases",
            bindings: [
              { key: "Context", description: "Help changes based on current mode", category: "feature" },
              { key: "Search", description: "Press '/' in modal help to search", category: "feature" },
              { key: "Modal", description: "Full-screen help overlay", category: "feature" },
              { key: "Inline", description: "Side panel help display", category: "feature" },
              { key: "Sections", description: "Organized by category", category: "feature" }
            ]
          }
        ]
        
        return Effect.gen(function* () {
          const [updated] = yield* modalHelpComponent.update(
            { _tag: "SetSections", sections: demoHelp },
            model.modalHelp
          )
          
          const [opened] = yield* modalHelpComponent.update(
            { _tag: "Open" },
            updated
          )
          
          return [{ 
            ...model, 
            modalHelp: opened,
            showResult: "Opened demo-specific help"
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "Quit": {
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" } as any)]])
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
      `Modal Help (${model.currentMode} context)`,
      "Inline Help Panel",
      `Switch Mode (currently: ${model.currentMode})`,
      "Demo-specific Help"
    ]
    
    const modeDescriptions = {
      'main': "General application help",
      'file-browser': "File navigation shortcuts",
      'text-editor': "Text editing commands"
    }
    
    const mainPanel = styledBox(
      vstack(
        styledText("🆘 Help Component Demo", titleStyle),
        text(""),
        styledText("This demo showcases the Help component features:", style().foreground(Colors.white)),
        text(""),
        styledText("Features demonstrated:", style().foreground(Colors.yellow).bold()),
        styledText("• Context-sensitive help (changes with mode)", style().foreground(Colors.gray)),
        styledText("• Modal overlay and inline panel modes", style().foreground(Colors.gray)),
        styledText("• Search functionality (press '/' in modal)", style().foreground(Colors.gray)),
        styledText("• Organized sections and categories", style().foreground(Colors.gray)),
        styledText("• Customizable styling and layout", style().foreground(Colors.gray)),
        text(""),
        styledText("Select an option to demonstrate:", style().foreground(Colors.white)),
        text(""),
        ...menuOptions.map((option, index) => 
          styledText(
            `${index === model.selectedOption ? "► " : "  "}${option}`,
            menuStyle(index === model.selectedOption)
          )
        ),
        text(""),
        styledText(`Current context: ${model.currentMode}`, style().foreground(Colors.cyan)),
        styledText(`Help content: ${modeDescriptions[model.currentMode]}`, style().foreground(Colors.cyan)),
        text(""),
        text(""),
        styledText("Controls:", style().foreground(Colors.yellow).bold()),
        styledText("• ↑↓ arrows: Navigate menu", style().foreground(Colors.gray)),
        styledText("• Enter/Space: Select option", style().foreground(Colors.gray)),
        styledText("• m: Quick modal help", style().foreground(Colors.gray)),
        styledText("• i: Toggle inline help", style().foreground(Colors.gray)),
        styledText("• t: Switch context mode", style().foreground(Colors.gray)),
        styledText("• ?: Demo help", style().foreground(Colors.gray)),
        styledText("• q: Quit", style().foreground(Colors.gray)),
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
    
    // Create layout based on whether inline help is open
    if (model.inlineHelp.isOpen) {
      return hstack(
        mainPanel,
        View.text("  "),
        inlineHelpComponent.view(model.inlineHelp)
      )
    }
    
    // Layer modal help on top if open
    let finalView = mainPanel
    if (model.modalHelp.isOpen) {
      finalView = vstack(mainPanel, modalHelpComponent.view(model.modalHelp))
    }
    
    return finalView
  },

  subscriptions: (model: AppModel) => Effect.succeed(Stream.empty)
}

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting Help Component Demo...")
console.log("This example demonstrates context-sensitive help and keybinding display")

const program = runApp(helpDemo, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })