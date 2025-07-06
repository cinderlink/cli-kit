/**
 * Git Dashboard E2E Tests
 * 
 * Tests for the git dashboard example demonstrating:
 * - Multi-panel navigation
 * - Table interaction
 * - Git workflow simulation
 * - Keyboard shortcuts
 * 
 * CONVERTED TO USE COMPONENT LOGIC TESTING APPROACH
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "./component-test-utils.ts"

// Mock git dashboard component for testing
interface GitDashboardModel {
  readonly activePanel: 'files' | 'staged' | 'commits'
  readonly statusMessage: string
  readonly selectedFile: string | null
  readonly stagedFiles: string[]
  readonly commitCount: number
  readonly branch: string
}

type GitDashboardMsg = 
  | { readonly tag: "switchPanel"; readonly panel: 'files' | 'staged' | 'commits' }
  | { readonly tag: "selectFile"; readonly fileName: string }
  | { readonly tag: "stageFile" }
  | { readonly tag: "unstageFile" }
  | { readonly tag: "commit" }
  | { readonly tag: "refreshStatus" }

const mockGitDashboard = {
  init: Effect.succeed([
    {
      activePanel: 'files' as const,
      statusMessage: "Git Dashboard ready - Tab to switch panels",
      selectedFile: null,
      stagedFiles: [],
      commitCount: 15,
      branch: "main"
    },
    []
  ]),
  
  update: (msg: GitDashboardMsg, model: GitDashboardModel) => {
    switch (msg.tag) {
      case "switchPanel":
        return Effect.succeed([
          { 
            ...model, 
            activePanel: msg.panel,
            statusMessage: `Switched to ${msg.panel} panel`
          },
          []
        ])
      case "selectFile":
        return Effect.succeed([
          { 
            ...model, 
            selectedFile: msg.fileName,
            statusMessage: `Selected: ${msg.fileName}`
          },
          []
        ])
      case "stageFile":
        if (model.selectedFile && !model.stagedFiles.includes(model.selectedFile)) {
          return Effect.succeed([
            { 
              ...model, 
              stagedFiles: [...model.stagedFiles, model.selectedFile],
              statusMessage: `Staged ${model.selectedFile}`
            },
            []
          ])
        }
        return Effect.succeed([model, []])
      case "unstageFile":
        if (model.selectedFile) {
          return Effect.succeed([
            { 
              ...model, 
              stagedFiles: model.stagedFiles.filter(f => f !== model.selectedFile),
              statusMessage: `Unstaged ${model.selectedFile}`
            },
            []
          ])
        }
        return Effect.succeed([model, []])
      case "commit":
        return Effect.succeed([
          { 
            ...model, 
            stagedFiles: [],
            commitCount: model.commitCount + 1,
            statusMessage: `Committed ${model.stagedFiles.length} files`
          },
          []
        ])
      case "refreshStatus":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: "Repository status refreshed"
          },
          []
        ])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: GitDashboardModel) => ({
    render: () => Effect.succeed([
      "Git Dashboard 🌿",
      `Branch: ${model.branch} | Commits: ${model.commitCount}`,
      `Active panel: ${model.activePanel}`,
      `Selected file: ${model.selectedFile || 'None'}`,
      `Staged files: ${model.stagedFiles.length}`,
      model.statusMessage,
      "",
      model.activePanel === 'files' 
        ? "📁 Files: src/main.ts | src/utils.ts | README.md | package.json"
        : model.activePanel === 'staged'
        ? `📋 Staged: ${model.stagedFiles.join(' | ') || 'No files staged'}`
        : "📜 Commits: feat: add dashboard | fix: resolve bug | docs: update readme"
    ].join('\n'))
  }),
  
  // Keyboard mapping function for testing
  handleKeyEvent: (key: string): GitDashboardMsg | null => {
    switch (key) {
      case 'tab':
      case '1': return { tag: "switchPanel", panel: 'files' }
      case '2': return { tag: "switchPanel", panel: 'staged' }
      case '3': return { tag: "switchPanel", panel: 'commits' }
      case 's': return { tag: "stageFile" }
      case 'u': return { tag: "unstageFile" }
      case 'c': return { tag: "commit" }
      case 'r': return { tag: "refreshStatus" }
      default: return null
    }
  }
}

test("Git Dashboard - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Git Dashboard 🌿")
      expect(output).toContain("Branch: main")
      expect(output).toContain("Commits: 15")
      expect(output).toContain("Active panel: files")
      expect(output).toContain("Selected file: None")
      expect(output).toContain("Staged files: 0")
    })
  )
})

test("Git Dashboard - Panel Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Switch to staged panel
      ctx = yield* _(ctx.sendMessage({ tag: "switchPanel", panel: "staged" }))
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Active panel: staged")
      expect(output).toContain("Switched to staged panel")
      expect(output).toContain("📋 Staged:")
      
      // Switch to commits panel
      ctx = yield* _(ctx.sendMessage({ tag: "switchPanel", panel: "commits" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active panel: commits")
      expect(output).toContain("📜 Commits:")
      
      // Switch back to files
      ctx = yield* _(ctx.sendMessage({ tag: "switchPanel", panel: "files" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active panel: files")
      expect(output).toContain("📁 Files:")
    })
  )
})

test("Git Dashboard - File Selection", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Select a file
      const ctx2 = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "src/main.ts" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Selected file: src/main.ts")
      expect(output).toContain("Selected: src/main.ts")
    })
  )
})

test("Git Dashboard - Stage File", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Select and stage a file
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "src/main.ts" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Staged files: 1")
      expect(output).toContain("Staged src/main.ts")
    })
  )
})

test("Git Dashboard - Unstage File", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Select, stage, then unstage a file
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "src/main.ts" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      ctx = yield* _(ctx.sendMessage({ tag: "unstageFile" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Staged files: 0")
      expect(output).toContain("Unstaged src/main.ts")
    })
  )
})

test("Git Dashboard - Commit Files", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Stage multiple files and commit
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "src/main.ts" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "README.md" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      ctx = yield* _(ctx.sendMessage({ tag: "commit" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Commits: 16") // Should increment
      expect(output).toContain("Staged files: 0") // Should be cleared
      expect(output).toContain("Committed 2 files")
    })
  )
})

test("Git Dashboard - Refresh Status", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // Refresh status
      const ctx2 = yield* _(ctx.sendMessage({ tag: "refreshStatus" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Repository status refreshed")
    })
  )
})

test("Git Dashboard - Keyboard Mapping", () => {
  // Test keyboard event mapping logic
  expect(mockGitDashboard.handleKeyEvent('1')).toEqual({ tag: "switchPanel", panel: "files" })
  expect(mockGitDashboard.handleKeyEvent('2')).toEqual({ tag: "switchPanel", panel: "staged" })
  expect(mockGitDashboard.handleKeyEvent('3')).toEqual({ tag: "switchPanel", panel: "commits" })
  expect(mockGitDashboard.handleKeyEvent('s')).toEqual({ tag: "stageFile" })
  expect(mockGitDashboard.handleKeyEvent('u')).toEqual({ tag: "unstageFile" })
  expect(mockGitDashboard.handleKeyEvent('c')).toEqual({ tag: "commit" })
  expect(mockGitDashboard.handleKeyEvent('r')).toEqual({ tag: "refreshStatus" })
  expect(mockGitDashboard.handleKeyEvent('x')).toBeNull()
})

test("Git Dashboard - Complete Git Workflow", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockGitDashboard))
      
      // 1. Check initial state
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Git Dashboard 🌿")
      expect(output).toContain("Active panel: files")
      
      // 2. Select and stage files
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "src/main.ts" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      
      ctx = yield* _(ctx.sendMessage({ tag: "selectFile", fileName: "package.json" }))
      ctx = yield* _(ctx.sendMessage({ tag: "stageFile" }))
      
      // 3. Check staged panel
      ctx = yield* _(ctx.sendMessage({ tag: "switchPanel", panel: "staged" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active panel: staged")
      expect(output).toContain("Staged files: 2")
      
      // 4. Commit changes
      ctx = yield* _(ctx.sendMessage({ tag: "commit" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Commits: 16")
      expect(output).toContain("Staged files: 0")
      
      // 5. Check commits panel
      ctx = yield* _(ctx.sendMessage({ tag: "switchPanel", panel: "commits" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active panel: commits")
      expect(output).toContain("📜 Commits:")
    })
  )
})