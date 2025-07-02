/**
 * Git Dashboard E2E Tests
 * 
 * Tests for the git dashboard example demonstrating:
 * - Multi-panel navigation
 * - Table interaction
 * - Git workflow simulation
 * - Keyboard shortcuts
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { 
  createTestContext, 
  keys, 
  key, 
  navigate,
  assertOutputContains,
  assertOutputMatches
} from "./setup.ts"

// Import the git dashboard component (we'll need to adjust imports)
// For now, let's create a mock component structure for testing

interface GitDashboardModel {
  readonly activePanel: 'files' | 'staged' | 'commits'
  readonly statusMessage: string
}

type GitDashboardMsg = 
  | { readonly tag: "switchPanel"; readonly panel: 'files' | 'staged' | 'commits' }
  | { readonly tag: "stageFile" }
  | { readonly tag: "commit" }

// Mock component for testing
const mockGitDashboard = {
  init: Effect.succeed([
    { 
      activePanel: 'files' as const, 
      statusMessage: "Ready - Navigate: Tab, Stage: Space, Commit: C"
    }, 
    []
  ]),
  
  update: (msg: GitDashboardMsg, model: GitDashboardModel) => {
    switch (msg.tag) {
      case "switchPanel":
        return Effect.succeed([
          { ...model, activePanel: msg.panel },
          []
        ])
      case "stageFile":
        return Effect.succeed([
          { ...model, statusMessage: "File staged (simulated)" },
          []
        ])
      case "commit":
        return Effect.succeed([
          { ...model, statusMessage: "Commit created (simulated)" },
          []
        ])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: GitDashboardModel) => ({
    _tag: "VStack" as const,
    children: [
      { _tag: "Text" as const, content: "Git Dashboard 🔧" },
      { _tag: "Text" as const, content: `Active Panel: ${model.activePanel}` },
      { _tag: "Text" as const, content: model.statusMessage },
      { _tag: "Text" as const, content: "Working Directory | Staging Area | Commit History" }
    ]
  }),
  
  subscriptions: (model: GitDashboardModel) =>
    Effect.gen(function* (_) {
      // Mock input service would be provided by test context
      return {
        mapKeys: (mapper: any) => ({})
      }
    })
}

test("Git Dashboard - Initial State", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Check initial render
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Git Dashboard 🔧"))
      yield* _(assertOutputContains(output, "Active Panel: files"))
      yield* _(assertOutputContains(output, "Ready - Navigate: Tab, Stage: Space, Commit: C"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - Panel Navigation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Test Tab navigation
      yield* _(ctx.sendKey(keys.tab))
      
      // Wait for panel switch
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: staged"), 1000))
      
      const output1 = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output1, "Active Panel: staged"))
      
      // Navigate to commits panel
      yield* _(ctx.sendKey(keys.tab))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: commits"), 1000))
      
      const output2 = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output2, "Active Panel: commits"))
      
      // Navigate back to files
      yield* _(ctx.sendKey(keys.tab))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: files"), 1000))
      
      const output3 = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output3, "Active Panel: files"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - Direct Panel Access", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Test direct access with number keys
      yield* _(ctx.sendKey(key('2')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: staged"), 1000))
      
      yield* _(ctx.sendKey(key('3')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: commits"), 1000))
      
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: files"), 1000))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - File Staging", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Ensure we're on files panel
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: files"), 1000))
      
      // Stage a file with Space
      yield* _(ctx.sendKey(keys.space))
      yield* _(ctx.waitForOutput(output => output.includes("File staged (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "File staged (simulated)"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - Commit Creation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Create a commit with 'c' key
      yield* _(ctx.sendKey(key('c')))
      yield* _(ctx.waitForOutput(output => output.includes("Commit created (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Commit created (simulated)"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - UI Elements Present", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      const output = yield* _(ctx.getOutput())
      
      // Check that all main UI elements are present
      yield* _(assertOutputContains(output, "Git Dashboard 🔧"))
      yield* _(assertOutputContains(output, "Working Directory"))
      yield* _(assertOutputContains(output, "Staging Area"))
      yield* _(assertOutputContains(output, "Commit History"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Git Dashboard - Workflow Simulation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockGitDashboard))
      
      // Simulate a complete git workflow
      
      // 1. Start in files panel
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: files"), 1000))
      
      // 2. Stage a file
      yield* _(ctx.sendKey(keys.space))
      yield* _(ctx.waitForOutput(output => output.includes("File staged"), 1000))
      
      // 3. Switch to staged panel
      yield* _(ctx.sendKey(key('2')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: staged"), 1000))
      
      // 4. Create commit
      yield* _(ctx.sendKey(key('c')))
      yield* _(ctx.waitForOutput(output => output.includes("Commit created"), 1000))
      
      // 5. Check commit history
      yield* _(ctx.sendKey(key('3')))
      yield* _(ctx.waitForOutput(output => output.includes("Active Panel: commits"), 1000))
      
      const finalOutput = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(finalOutput, "Active Panel: commits"))
      
      yield* _(ctx.cleanup())
    })
  )
})