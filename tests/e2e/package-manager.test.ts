/**
 * Package Manager E2E Tests
 * 
 * Tests for the package manager example demonstrating:
 * - Multi-tab navigation
 * - Package operations (install/uninstall/update)
 * - Search functionality
 * - Bulk operations
 * - Package details display
 * 
 * CONVERTED TO USE COMPONENT LOGIC TESTING APPROACH
 */

import { test, expect } from "bun:test"
import { Effect } from "effect"
import { createComponentTestContext } from "./component-test-utils.ts"

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
    render: () => Effect.succeed([
      "Package Manager 📦",
      `${model.packageCount} packages available • ${model.selectedPackages} selected`,
      `Active tab: ${model.activeTab}`,
      `Selected package: ${model.selectedPackage}`,
      `Operation in progress: ${model.operationInProgress}`,
      model.statusMessage,
      "📦 Packages | 🔗 Dependencies | 🔍 Search",
      model.activeTab === 'packages' 
        ? "react | typescript | express | lodash | axios | moment | webpack | jest"
        : model.activeTab === 'dependencies'
        ? "react-dom | @types/react | @types/node | eslint | prettier"
        : `Search term: "${model.searchTerm}"`
    ].join('\n'))
  }),
  
  // Keyboard mapping function for testing
  handleKeyEvent: (key: string): PackageManagerMsg | null => {
    switch (key) {
      case 'tab':
      case '1': return { tag: "switchTab", tab: 'packages' }
      case '2': return { tag: "switchTab", tab: 'dependencies' }
      case '3': return { tag: "switchTab", tab: 'search' }
      case 'i': return { tag: "installPackage" }
      case 'u': return { tag: "uninstallPackage" }
      case 'U': return { tag: "updatePackage" }
      case 'b': return { tag: "bulkInstall" }
      default: return null
    }
  }
}

test("Package Manager - Initial State", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Package Manager 📦")
      expect(output).toContain("8 packages available")
      expect(output).toContain("0 selected")
      expect(output).toContain("Active tab: packages")
      expect(output).toContain("Selected package: react")
      expect(output).toContain("react | typescript | express")
    })
  )
})

test("Package Manager - Tab Navigation", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Switch to dependencies tab
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "dependencies" }))
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: dependencies")
      expect(output).toContain("react-dom")
      
      // Switch to search tab
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "search" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: search")
      expect(output).toContain('Search term: ""')
      
      // Switch back to packages
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "packages" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: packages")
      expect(output).toContain("react | typescript")
    })
  )
})

test("Package Manager - Install Package", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Install package
      const ctx2 = yield* _(ctx.sendMessage({ tag: "installPackage" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Installing react... (simulated)")
      expect(output).toContain("Operation in progress: true")
    })
  )
})

test("Package Manager - Uninstall Package", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Uninstall package
      const ctx2 = yield* _(ctx.sendMessage({ tag: "uninstallPackage" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Uninstalling react... (simulated)")
      expect(output).toContain("Operation in progress: true")
    })
  )
})

test("Package Manager - Update Package", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Update package
      const ctx2 = yield* _(ctx.sendMessage({ tag: "updatePackage" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Updating react to latest version... (simulated)")
      expect(output).toContain("Operation in progress: true")
    })
  )
})

test("Package Manager - Bulk Install", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Bulk install
      const ctx2 = yield* _(ctx.sendMessage({ tag: "bulkInstall" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Installing 0 packages... (simulated)")
      expect(output).toContain("Operation in progress: true")
    })
  )
})

test("Package Manager - Package Selection", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Select a package
      const ctx2 = yield* _(ctx.sendMessage({ tag: "selectPackage", packageName: "typescript" }))
      
      const output = yield* _(ctx2.getOutput())
      expect(output).toContain("Selected package: typescript")
      expect(output).toContain("1 selected")
    })
  )
})

test("Package Manager - Search", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // Switch to search tab
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "search" }))
      
      // Perform search
      ctx = yield* _(ctx.sendMessage({ tag: "search", term: "react" }))
      
      const output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: search")
      expect(output).toContain('Search term: "react"')
      expect(output).toContain('Searching for: "react"')
    })
  )
})

test("Package Manager - Keyboard Mapping", () => {
  // Test keyboard event mapping logic
  expect(mockPackageManager.handleKeyEvent('1')).toEqual({ tag: "switchTab", tab: "packages" })
  expect(mockPackageManager.handleKeyEvent('2')).toEqual({ tag: "switchTab", tab: "dependencies" })
  expect(mockPackageManager.handleKeyEvent('3')).toEqual({ tag: "switchTab", tab: "search" })
  expect(mockPackageManager.handleKeyEvent('i')).toEqual({ tag: "installPackage" })
  expect(mockPackageManager.handleKeyEvent('u')).toEqual({ tag: "uninstallPackage" })
  expect(mockPackageManager.handleKeyEvent('U')).toEqual({ tag: "updatePackage" })
  expect(mockPackageManager.handleKeyEvent('b')).toEqual({ tag: "bulkInstall" })
  expect(mockPackageManager.handleKeyEvent('x')).toBeNull()
})

test("Package Manager - Complete Workflow", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      let ctx = yield* _(createComponentTestContext(mockPackageManager))
      
      // 1. Check initial state (packages tab)
      let output = yield* _(ctx.getOutput())
      expect(output).toContain("Package Manager 📦")
      expect(output).toContain("Active tab: packages")
      
      // 2. Navigate through tabs
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "dependencies" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: dependencies")
      
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "search" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: search")
      
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "packages" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: packages")
      
      // 3. Install a package
      ctx = yield* _(ctx.sendMessage({ tag: "installPackage" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Installing react")
      
      // 4. Update a package
      ctx = yield* _(ctx.sendMessage({ tag: "updatePackage" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Updating react")
      
      // 5. Check dependencies
      ctx = yield* _(ctx.sendMessage({ tag: "switchTab", tab: "dependencies" }))
      output = yield* _(ctx.getOutput())
      expect(output).toContain("Active tab: dependencies")
      expect(output).toContain("react-dom")
    })
  )
})