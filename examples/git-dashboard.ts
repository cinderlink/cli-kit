/**
 * Git Dashboard - A lazygit-inspired TUI for Git repository management
 * 
 * Features:
 * - File browser with git status
 * - Staging area simulation
 * - Commit history viewer
 * - Multi-panel layout
 * - Keyboard navigation between panels
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, RuntimeConfig } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { 
  list,
  table,
  createColumn,
  createRow,
  type ListModel,
  type ListMsg,
  type TableModel,
  type TableMsg,
  TableSelectionMode
} from "@/components/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Mock Data (simulating git commands)
// =============================================================================

interface GitFile {
  readonly path: string
  readonly status: 'modified' | 'added' | 'deleted' | 'untracked' | 'staged'
  readonly size: number
}

interface GitCommit {
  readonly hash: string
  readonly author: string
  readonly date: string
  readonly message: string
}

const mockFiles: Array<GitFile> = [
  { path: "src/components/Button.ts", status: "modified", size: 1250 },
  { path: "src/components/Table.ts", status: "modified", size: 2850 },
  { path: "examples/git-dashboard.ts", status: "added", size: 0 },
  { path: "README.md", status: "modified", size: 5420 },
  { path: "package.json", status: "staged", size: 892 },
  { path: "src/core/runtime.ts", status: "untracked", size: 3200 },
  { path: "docs/API.md", status: "added", size: 0 },
  { path: "tests/button.test.ts", status: "deleted", size: 0 }
]

const mockCommits: Array<GitCommit> = [
  { hash: "a1b2c3d", author: "Alice", date: "2024-01-15", message: "Add table component with sorting" },
  { hash: "e4f5g6h", author: "Bob", date: "2024-01-14", message: "Fix button focus handling" },
  { hash: "i7j8k9l", author: "Alice", date: "2024-01-14", message: "Implement tabs navigation" },
  { hash: "m1n2o3p", author: "Charlie", date: "2024-01-13", message: "Add comprehensive styling system" },
  { hash: "q4r5s6t", author: "Bob", date: "2024-01-12", message: "Initial CLI-Kit framework" }
]

const mockStagedFiles: Array<GitFile> = [
  { path: "package.json", status: "staged", size: 892 }
]

// =============================================================================
// Model
// =============================================================================

type Panel = 'files' | 'staged' | 'commits'

interface Model {
  readonly filesTable: TableModel<GitFile>
  readonly stagedTable: TableModel<GitFile>
  readonly commitsTable: TableModel<GitCommit>
  readonly activePanel: Panel
  readonly statusMessage: string
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "filesMsg"; readonly msg: TableMsg<GitFile> }
  | { readonly tag: "stagedMsg"; readonly msg: TableMsg<GitFile> }
  | { readonly tag: "commitsMsg"; readonly msg: TableMsg<GitCommit> }
  | { readonly tag: "switchPanel"; readonly panel: Panel }
  | { readonly tag: "stageFile" }
  | { readonly tag: "unstageFile" }
  | { readonly tag: "commit" }

// =============================================================================
// Component Setup
// =============================================================================

const createFilesTable = () => {
  const columns = [
    createColumn<GitFile>("status", "Status", { 
      width: 10, 
      align: 'center',
      render: (status: string) => {
        switch (status) {
          case 'modified': return '🟡 M'
          case 'added': return '🟢 A'
          case 'deleted': return '🔴 D'
          case 'untracked': return '❓ ?'
          case 'staged': return '✅ S'
          default: return status
        }
      }
    }),
    createColumn<GitFile>("path", "File Path", { width: 40, sortable: true }),
    createColumn<GitFile>("size", "Size", { 
      width: 10, 
      align: 'right',
      render: (size: number) => size > 0 ? `${size}B` : '-'
    })
  ]
  
  const rows = mockFiles.map(file => 
    createRow(`file-${file.path}`, file)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Single,
    showHeader: true,
    width: 60,
    pageSize: 8
  })
}

const createStagedTable = () => {
  const columns = [
    createColumn<GitFile>("path", "Staged Files", { width: 40 }),
    createColumn<GitFile>("size", "Size", { 
      width: 10, 
      align: 'right',
      render: (size: number) => size > 0 ? `${size}B` : '-'
    })
  ]
  
  const rows = mockStagedFiles.map(file => 
    createRow(`staged-${file.path}`, file)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Single,
    showHeader: true,
    width: 60,
    pageSize: 6
  })
}

const createCommitsTable = () => {
  const columns = [
    createColumn<GitCommit>("hash", "Hash", { width: 8 }),
    createColumn<GitCommit>("author", "Author", { width: 12 }),
    createColumn<GitCommit>("date", "Date", { width: 12 }),
    createColumn<GitCommit>("message", "Message", { width: 25 })
  ]
  
  const rows = mockCommits.map(commit => 
    createRow(`commit-${commit.hash}`, commit)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Single,
    showHeader: true,
    width: 60,
    pageSize: 6
  })
}

// =============================================================================
// Component
// =============================================================================

const gitDashboard: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const filesTableComponent = createFilesTable()
    const stagedTableComponent = createStagedTable()
    const commitsTableComponent = createCommitsTable()
    
    const [filesModel] = yield* _(filesTableComponent.init())
    const [stagedModel] = yield* _(stagedTableComponent.init())
    const [commitsModel] = yield* _(commitsTableComponent.init())
    
    return [{
      filesTable: { ...filesModel, focused: true },
      stagedTable: stagedModel,
      commitsTable: commitsModel,
      activePanel: 'files' as Panel,
      statusMessage: "Ready - Navigate: Tab, Stage: Space, Commit: C"
    }, []]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "quit":
        // Return a quit command to exit the app
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" as const })]])
      case "filesMsg": {
        const filesTableComponent = createFilesTable()
        return filesTableComponent.update(msg.msg, model.filesTable).pipe(
          Effect.map(([newFilesModel, cmds]) => [
            { ...model, filesTable: newFilesModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(filesMsg => ({ tag: "filesMsg", msg: filesMsg } as Msg))
            ))
          ])
        )
      }
      
      case "stagedMsg": {
        const stagedTableComponent = createStagedTable()
        return stagedTableComponent.update(msg.msg, model.stagedTable).pipe(
          Effect.map(([newStagedModel, cmds]) => [
            { ...model, stagedTable: newStagedModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(stagedMsg => ({ tag: "stagedMsg", msg: stagedMsg } as Msg))
            ))
          ])
        )
      }
      
      case "commitsMsg": {
        const commitsTableComponent = createCommitsTable()
        return commitsTableComponent.update(msg.msg, model.commitsTable).pipe(
          Effect.map(([newCommitsModel, cmds]) => [
            { ...model, commitsTable: newCommitsModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(commitsMsg => ({ tag: "commitsMsg", msg: commitsMsg } as Msg))
            ))
          ])
        )
      }
      
      case "switchPanel": {
        const newModel = {
          ...model,
          activePanel: msg.panel,
          filesTable: { ...model.filesTable, focused: msg.panel === 'files' },
          stagedTable: { ...model.stagedTable, focused: msg.panel === 'staged' },
          commitsTable: { ...model.commitsTable, focused: msg.panel === 'commits' }
        }
        
        return Effect.succeed([newModel, []])
      }
      
      case "stageFile": {
        return Effect.succeed([
          { ...model, statusMessage: "File staged (simulated)" },
          []
        ])
      }
      
      case "unstageFile": {
        return Effect.succeed([
          { ...model, statusMessage: "File unstaged (simulated)" },
          []
        ])
      }
      
      case "commit": {
        return Effect.succeed([
          { ...model, statusMessage: "Commit created (simulated)" },
          []
        ])
      }
    }
  },
  
  view(model: Model) {
    const title = text("Git Dashboard 🔧", style(Colors.BrightCyan).bold())
    
    // Panel titles with focus indicators
    const filesPanelTitle = model.activePanel === 'files' 
      ? text("📁 Working Directory", style(Colors.BrightWhite).background(Colors.Blue))
      : text("📁 Working Directory", style(Colors.Gray))
    
    const stagedPanelTitle = model.activePanel === 'staged'
      ? text("📋 Staging Area", style(Colors.BrightWhite).background(Colors.Blue))
      : text("📋 Staging Area", style(Colors.Gray))
    
    const commitsPanelTitle = model.activePanel === 'commits'
      ? text("📚 Commit History", style(Colors.BrightWhite).background(Colors.Blue))
      : text("📚 Commit History", style(Colors.Gray))
    
    // Tables
    const filesTableComponent = createFilesTable()
    const stagedTableComponent = createStagedTable()
    const commitsTableComponent = createCommitsTable()
    
    const filesPanel = box(
      vstack(
        filesPanelTitle,
        text("", style()),
        filesTableComponent.view(model.filesTable)
      ),
      {
        border: model.activePanel === 'files' ? Borders.single : Borders.single,
        borderStyle: model.activePanel === 'files' 
          ? style(Colors.BrightBlue) 
          : style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 64,
        height: 12
      }
    )
    
    const stagedPanel = box(
      vstack(
        stagedPanelTitle,
        text("", style()),
        stagedTableComponent.view(model.stagedTable)
      ),
      {
        border: model.activePanel === 'staged' ? Borders.single : Borders.single,
        borderStyle: model.activePanel === 'staged' 
          ? style(Colors.BrightBlue) 
          : style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 30,
        height: 8
      }
    )
    
    const commitsPanel = box(
      vstack(
        commitsPanelTitle,
        text("", style()),
        commitsTableComponent.view(model.commitsTable)
      ),
      {
        border: model.activePanel === 'commits' ? Borders.single : Borders.single,
        borderStyle: model.activePanel === 'commits' 
          ? style(Colors.BrightBlue) 
          : style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 30,
        height: 8
      }
    )
    
    // Status bar
    const statusBar = box(
      text(model.statusMessage, style(Colors.White)),
      {
        border: Borders.single,
        borderStyle: style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 64
      }
    )
    
    // Keybindings help
    const help = vstack(
      text("Keybindings:", style(Colors.Yellow)),
      text("Tab/1-3: Switch panels  |  ↑↓: Navigate  |  Space: Stage/Unstage", style(Colors.Gray)),
      text("C: Commit  |  Enter: View details  |  Ctrl+C: Exit", style(Colors.Gray))
    )
    
    return vstack(
      title,
      text("", style()),
      filesPanel,
      text("", style()),
      hstack(
        stagedPanel,
        text("  ", style()),
        commitsPanel
      ),
      text("", style()),
      statusBar,
      text("", style()),
      help
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        // Quit keys
        if (key.key === 'q' || (key.ctrl && key.key === 'ctrl+c')) {
          return { tag: "quit" }
        }
        
        // Panel switching
        if (key.key === 'tab') {
          const panels: Panel[] = ['files', 'staged', 'commits']
          const currentIndex = panels.indexOf(model.activePanel)
          const nextIndex = (currentIndex + 1) % panels.length
          return { tag: "switchPanel", panel: panels[nextIndex] }
        }
        
        // Direct panel access
        if (key.key === '1') return { tag: "switchPanel", panel: 'files' }
        if (key.key === '2') return { tag: "switchPanel", panel: 'staged' }
        if (key.key === '3') return { tag: "switchPanel", panel: 'commits' }
        
        // Actions
        if (key.key === ' ') {
          return model.activePanel === 'files' 
            ? { tag: "stageFile" }
            : { tag: "unstageFile" }
        }
        if (key.key === 'c') return { tag: "commit" }
        
        // Navigation within active panel
        if (key.key === 'up' || key.key === 'down' || key.key === 'enter') {
          switch (model.activePanel) {
            case 'files':
              return { tag: "filesMsg", msg: { tag: key.key === 'up' ? "navigateUp" : key.key === 'down' ? "navigateDown" : "selectRow", rowId: "" } }
            case 'staged':
              return { tag: "stagedMsg", msg: { tag: key.key === 'up' ? "navigateUp" : key.key === 'down' ? "navigateDown" : "selectRow", rowId: "" } }
            case 'commits':
              return { tag: "commitsMsg", msg: { tag: key.key === 'up' ? "navigateUp" : key.key === 'down' ? "navigateDown" : "selectRow", rowId: "" } }
          }
        }
        
        return null
      })
    })
}

// =============================================================================
// Main
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: false,
  quitOnEscape: true,
  quitOnCtrlC: true,
  enableMouse: false,
  fullscreen: true
}

const program = runApp(gitDashboard, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })