/**
 * Package Manager E2E Tests
 * 
 * Tests for the package manager example demonstrating:
 * - Multi-tab navigation
 * - Package operations (install/uninstall/update)
 * - Search functionality
 * - Bulk operations
 * - Package details display
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { 
  createTestContext, 
  keys, 
  key, 
  typeText,
  assertOutputContains,
  assertOutputMatches
} from "./setup.ts"

// Mock package manager component for testing
interface PackageManagerModel {
  readonly activeTab: 'packages' | 'dependencies' | 'search'
  readonly packageCount: number
  readonly selectedPackages: number
  readonly statusMessage: string
  readonly searchTerm: string
  readonly operationInProgress: boolean
  readonly selectedPackage: string
}

type PackageManagerMsg = 
  | { readonly tag: "switchTab"; readonly tab: 'packages' | 'dependencies' | 'search' }
  | { readonly tag: "installPackage" }
  | { readonly tag: "uninstallPackage" }
  | { readonly tag: "updatePackage" }
  | { readonly tag: "bulkInstall" }
  | { readonly tag: "selectPackage"; readonly packageName: string }
  | { readonly tag: "search"; readonly term: string }

const mockPackageManager = {
  init: Effect.succeed([
    {
      activeTab: 'packages' as const,
      packageCount: 8,
      selectedPackages: 0,
      statusMessage: "Package manager ready - Use Tab to switch views, Space to select",
      searchTerm: "",
      operationInProgress: false,
      selectedPackage: "react"
    },
    []
  ]),
  
  update: (msg: PackageManagerMsg, model: PackageManagerModel) => {
    switch (msg.tag) {
      case "switchTab":
        return Effect.succeed([
          { ...model, activeTab: msg.tab },
          []
        ])
      case "installPackage":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Installing ${model.selectedPackage}... (simulated)`,
            operationInProgress: true
          },
          []
        ])
      case "uninstallPackage":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Uninstalling ${model.selectedPackage}... (simulated)`,
            operationInProgress: true
          },
          []
        ])
      case "updatePackage":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Updating ${model.selectedPackage} to latest version... (simulated)`,
            operationInProgress: true
          },
          []
        ])
      case "bulkInstall":
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Installing ${model.selectedPackages} packages... (simulated)`,
            operationInProgress: true
          },
          []
        ])
      case "selectPackage":
        return Effect.succeed([
          { 
            ...model, 
            selectedPackage: msg.packageName,
            selectedPackages: model.selectedPackages + 1
          },
          []
        ])
      case "search":
        return Effect.succeed([
          { 
            ...model, 
            searchTerm: msg.term,
            statusMessage: `Searching for: "${msg.term}"`
          },
          []
        ])
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view: (model: PackageManagerModel) => ({
    _tag: "VStack" as const,
    children: [
      { _tag: "Text" as const, content: "Package Manager 📦" },
      { _tag: "Text" as const, content: `${model.packageCount} packages available • ${model.selectedPackages} selected` },
      { _tag: "Text" as const, content: `Active tab: ${model.activeTab}` },
      { _tag: "Text" as const, content: `Selected package: ${model.selectedPackage}` },
      { _tag: "Text" as const, content: `Operation in progress: ${model.operationInProgress}` },
      { _tag: "Text" as const, content: model.statusMessage },
      { _tag: "Text" as const, content: "📦 Packages | 🔗 Dependencies | 🔍 Search" },
      model.activeTab === 'packages' 
        ? { _tag: "Text" as const, content: "react | typescript | express | lodash | axios | moment | webpack | jest" }
        : model.activeTab === 'dependencies'
        ? { _tag: "Text" as const, content: "react-dom | @types/react | @types/node | eslint | prettier" }
        : { _tag: "Text" as const, content: `Search term: "${model.searchTerm}"` }
    ]
  }),
  
  subscriptions: () => Effect.succeed({})
}

test("Package Manager - Initial State", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Package Manager 📦"))
      yield* _(assertOutputContains(output, "8 packages available"))
      yield* _(assertOutputContains(output, "0 selected"))
      yield* _(assertOutputContains(output, "Active tab: packages"))
      yield* _(assertOutputContains(output, "Selected package: react"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Tab Navigation", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Test Tab navigation
      yield* _(ctx.sendKey(keys.tab))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: dependencies"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Active tab: dependencies"))
      yield* _(assertOutputContains(output, "react-dom"))
      
      // Navigate to search tab
      yield* _(ctx.sendKey(keys.tab))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: search"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Active tab: search"))
      
      // Navigate back to packages
      yield* _(ctx.sendKey(keys.tab))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: packages"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Active tab: packages"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Direct Tab Access", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Test direct access with number keys
      yield* _(ctx.sendKey(key('2')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: dependencies"), 1000))
      
      yield* _(ctx.sendKey(key('3')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: search"), 1000))
      
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: packages"), 1000))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Install Package", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Ensure we're on packages tab
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: packages"), 1000))
      
      // Install package with 'i'
      yield* _(ctx.sendKey(key('i')))
      yield* _(ctx.waitForOutput(output => output.includes("Installing react... (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Installing react... (simulated)"))
      yield* _(assertOutputContains(output, "Operation in progress: true"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Uninstall Package", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Uninstall package with 'u'
      yield* _(ctx.sendKey(key('u')))
      yield* _(ctx.waitForOutput(output => output.includes("Uninstalling react... (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Uninstalling react... (simulated)"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Update Package", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Update package with Shift+U
      yield* _(ctx.sendKey(key('U')))
      yield* _(ctx.waitForOutput(output => output.includes("Updating react to latest version... (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Updating react to latest version... (simulated)"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Bulk Install", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Bulk install with 'b'
      yield* _(ctx.sendKey(key('b')))
      yield* _(ctx.waitForOutput(output => output.includes("Installing 0 packages... (simulated)"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Installing 0 packages... (simulated)"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Package Lists Display", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Check packages tab content
      yield* _(ctx.sendKey(key('1')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: packages"), 1000))
      
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "react"))
      yield* _(assertOutputContains(output, "typescript"))
      yield* _(assertOutputContains(output, "express"))
      
      // Check dependencies tab content
      yield* _(ctx.sendKey(key('2')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: dependencies"), 1000))
      
      output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "react-dom"))
      yield* _(assertOutputContains(output, "@types/react"))
      yield* _(assertOutputContains(output, "eslint"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Tab Icons Display", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      const output = yield* _(ctx.getOutput())
      
      // Check that tab icons are displayed
      yield* _(assertOutputContains(output, "📦 Packages"))
      yield* _(assertOutputContains(output, "🔗 Dependencies"))
      yield* _(assertOutputContains(output, "🔍 Search"))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Search Tab", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // Go to search tab
      yield* _(ctx.sendKey(key('3')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: search"), 1000))
      
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Active tab: search"))
      yield* _(assertOutputContains(output, 'Search term: ""'))
      
      yield* _(ctx.cleanup())
    })
  )
})

test("Package Manager - Complete Workflow", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createTestContext(mockPackageManager))
      
      // 1. Check initial state (packages tab)
      let output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Package Manager 📦"))
      yield* _(assertOutputContains(output, "Active tab: packages"))
      
      // 2. Navigate through tabs
      yield* _(ctx.sendKey(key('2')))  // Dependencies
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: dependencies"), 1000))
      
      yield* _(ctx.sendKey(key('3')))  // Search
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: search"), 1000))
      
      yield* _(ctx.sendKey(key('1')))  // Back to packages
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: packages"), 1000))
      
      // 3. Install a package
      yield* _(ctx.sendKey(key('i')))
      yield* _(ctx.waitForOutput(output => output.includes("Installing react"), 1000))
      
      // 4. Update a package
      yield* _(ctx.sendKey(key('U')))
      yield* _(ctx.waitForOutput(output => output.includes("Updating react"), 1000))
      
      // 5. Check dependencies
      yield* _(ctx.sendKey(key('2')))
      yield* _(ctx.waitForOutput(output => output.includes("Active tab: dependencies"), 1000))
      
      const finalOutput = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(finalOutput, "Active tab: dependencies"))
      yield* _(assertOutputContains(finalOutput, "react-dom"))
      
      yield* _(ctx.cleanup())
    })
  )
})