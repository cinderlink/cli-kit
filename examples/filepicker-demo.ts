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
  filePicker,
  type FilePickerModel,
  type FilePickerMsg 
} from "../src/components/FilePicker.ts"

// Model for the demo app
interface AppModel {
  filePicker: FilePickerModel
  selectedFiles: string[]
  showResult: string
  terminalSize: { width: number; height: number }
}

type AppMsg = 
  | { _tag: "FilePickerMsg"; msg: FilePickerMsg }
  | { _tag: "UpdateTerminalSize"; width: number; height: number }
  | { _tag: "FileSelected"; path: string }
  | { _tag: "ShowHelp" }
  | { _tag: "Quit" }

// Create file picker component with different configurations
const filePickerComponent = filePicker({
  startPath: ".",
  width: 70,
  height: 20,
  showHidden: false,
  selectionMode: 'both',
  showFileInfo: true,
  showPath: true,
  multiSelect: true,
  allowedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.txt']
})

const filePickerDemo: Component<AppModel, AppMsg> = {
  init: Effect.gen(function* () {
    // Initialize the file picker component
    const [filePickerModel] = yield* filePickerComponent.init
    
    return [{
      filePicker: filePickerModel,
      selectedFiles: [],
      showResult: "",
      terminalSize: { width: 80, height: 24 }
    }, []]
  }),

  update: (msg: AppMsg, model: AppModel) => {
    switch (msg._tag) {
      case "FilePickerMsg": {
        return Effect.gen(function* () {
          const [updated] = yield* filePickerComponent.update(msg.msg, model.filePicker)
          
          // Check if a file was selected
          let selectedFiles = model.selectedFiles
          let showResult = model.showResult
          
          if (msg.msg._tag === "SelectItem") {
            const selectedItem = model.filePicker.items[model.filePicker.selectedIndex]
            if (selectedItem && !selectedItem.isDirectory) {
              selectedFiles = [...selectedFiles, selectedItem.path]
              showResult = `Selected: ${selectedItem.name}`
            }
          }
          
          return [{ 
            ...model, 
            filePicker: updated,
            selectedFiles,
            showResult
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "UpdateTerminalSize": {
        return Effect.gen(function* () {
          const [updated] = yield* filePickerComponent.update(
            { _tag: "SetPath", path: model.filePicker.currentPath },
            model.filePicker
          )
          
          return [{
            ...model,
            terminalSize: { width: msg.width, height: msg.height },
            filePicker: updated
          }, []] as [AppModel, Cmd<AppMsg>[]]
        })
      }
      
      case "FileSelected": {
        return Effect.succeed([
          { 
            ...model, 
            selectedFiles: [...model.selectedFiles, msg.path],
            showResult: `File selected: ${msg.path}`
          },
          []
        ])
      }
      
      case "ShowHelp": {
        return Effect.succeed([
          { 
            ...model, 
            showResult: "Help: ↑↓=Navigate • Enter=Select • Backspace=Up • h=Toggle Hidden • r=Refresh • q=Quit"
          },
          []
        ])
      }
      
      case "Quit": {
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" } as any)] as const] as const)
      }
    }
  },

  view: (model: AppModel) => {
    const { text, styledText, vstack, hstack } = View
    
    const titleStyle = style().foreground(Colors.brightBlue).bold()
    
    // Create info panel
    const infoPanel = styledBox(
      vstack(
        styledText("📁 FilePicker Component Demo", titleStyle),
        text(""),
        styledText("Features demonstrated:", style().foreground(Colors.yellow).bold()),
        styledText("• Directory navigation with breadcrumbs", style().foreground(Colors.gray)),
        styledText("• File and folder listing with icons", style().foreground(Colors.gray)),
        styledText("• Hidden file toggle (press 'h')", style().foreground(Colors.gray)),
        styledText("• Multi-select support (press Tab)", style().foreground(Colors.gray)),
        styledText("• File filtering by extension", style().foreground(Colors.gray)),
        styledText("• File metadata display", style().foreground(Colors.gray)),
        text(""),
        styledText("Current selection mode: file and directory", style().foreground(Colors.blue)),
        styledText(`Selected files: ${model.selectedFiles.length}`, style().foreground(Colors.green)),
        text(""),
        model.showResult ? styledText(model.showResult, style().foreground(Colors.yellow)) : text(""),
        text(""),
        styledText("Press 'q' to quit, '?' for help", style().foreground(Colors.gray))
      ),
      {
        border: Borders.Rounded,
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        minWidth: 76,
        minHeight: 18,
        style: style().background(Colors.black).foreground(Colors.white)
      }
    )
    
    // Main layout with file picker
    return vstack(
      infoPanel,
      text(""),
      filePickerComponent.view(model.filePicker)
    )
  },

  subscriptions: (model: AppModel) => Effect.succeed(Stream.empty)
}

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting FilePicker Demo...")
console.log("This example demonstrates file/directory selection with navigation")

const program = runApp(filePickerDemo, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })