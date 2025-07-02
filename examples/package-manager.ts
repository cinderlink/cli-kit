/**
 * Package Manager - An npm/yarn-inspired TUI for package management
 * 
 * Features:
 * - Package search and browsing
 * - Installation/uninstallation simulation
 * - Dependency tree viewing
 * - Package details and versions
 * - Bulk operations
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, RuntimeConfig } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { InputService } from "@/services/index.ts"
import { 
  table,
  createColumn,
  createRow,
  textInput,
  tabs,
  createTab,
  type TableModel,
  type TableMsg,
  type TextInputModel,
  type TextInputMsg,
  type TabsModel,
  type TabsMsg,
  TableSelectionMode
} from "@/components/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Mock Data
// =============================================================================

interface Package {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly author: string
  readonly license: string
  readonly downloads: number
  readonly dependencies: number
  readonly status: 'installed' | 'available' | 'outdated'
  readonly size: string
}

interface Dependency {
  readonly name: string
  readonly version: string
  readonly type: 'production' | 'development' | 'peer'
  readonly size: string
}

const mockPackages: Array<Package> = [
  { name: "react", version: "18.2.0", description: "JavaScript library for building user interfaces", author: "Meta", license: "MIT", downloads: 20000000, dependencies: 3, status: "installed", size: "2.8MB" },
  { name: "typescript", version: "5.0.4", description: "TypeScript extends JavaScript by adding types", author: "Microsoft", license: "Apache-2.0", downloads: 15000000, dependencies: 0, status: "installed", size: "15.2MB" },
  { name: "express", version: "4.18.2", description: "Fast, unopinionated, minimalist web framework for Node.js", author: "TJ Holowaychuk", license: "MIT", downloads: 30000000, dependencies: 31, status: "available", size: "1.2MB" },
  { name: "lodash", version: "4.17.21", description: "A modern JavaScript utility library", author: "John-David Dalton", license: "MIT", downloads: 45000000, dependencies: 0, status: "outdated", size: "1.4MB" },
  { name: "axios", version: "1.4.0", description: "Promise based HTTP client for the browser and node.js", author: "Matt Zabriskie", license: "MIT", downloads: 28000000, dependencies: 4, status: "available", size: "456KB" },
  { name: "moment", version: "2.29.4", description: "Parse, validate, manipulate, and display dates", author: "Tim Wood", license: "MIT", downloads: 12000000, dependencies: 0, status: "outdated", size: "2.9MB" },
  { name: "webpack", version: "5.88.0", description: "A bundler for javascript and friends", author: "Tobias Koppers", license: "MIT", downloads: 8000000, dependencies: 156, status: "available", size: "18.5MB" },
  { name: "jest", version: "29.5.0", description: "JavaScript testing framework", author: "Meta", license: "MIT", downloads: 6000000, dependencies: 89, status: "installed", size: "12.1MB" }
]

const mockDependencies: Array<Dependency> = [
  { name: "react-dom", version: "18.2.0", type: "production", size: "3.1MB" },
  { name: "@types/react", version: "18.2.7", type: "development", size: "156KB" },
  { name: "@types/node", version: "20.2.5", type: "development", size: "2.8MB" },
  { name: "eslint", version: "8.42.0", type: "development", size: "4.5MB" },
  { name: "prettier", version: "2.8.8", type: "development", size: "8.9MB" }
]

// =============================================================================
// Model
// =============================================================================

type Tab = 'packages' | 'dependencies' | 'search'

interface Model {
  readonly packagesTable: TableModel<Package>
  readonly dependenciesTable: TableModel<Dependency>
  readonly searchInput: TextInputModel
  readonly tabsComponent: TabsModel<string>
  readonly activeTab: Tab
  readonly searchTerm: string
  readonly selectedPackages: Set<string>
  readonly statusMessage: string
  readonly operationInProgress: boolean
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "packagesMsg"; readonly msg: TableMsg<Package> }
  | { readonly tag: "dependenciesMsg"; readonly msg: TableMsg<Dependency> }
  | { readonly tag: "searchMsg"; readonly msg: TextInputMsg }
  | { readonly tag: "tabsMsg"; readonly msg: TabsMsg<string> }
  | { readonly tag: "switchTab"; readonly tab: Tab }
  | { readonly tag: "installPackage" }
  | { readonly tag: "uninstallPackage" }
  | { readonly tag: "updatePackage" }
  | { readonly tag: "searchPackages" }
  | { readonly tag: "togglePackageSelection" }
  | { readonly tag: "bulkInstall" }
  | { readonly tag: "operationComplete" }

// =============================================================================
// Component Setup
// =============================================================================

const createPackagesTable = (packages: Array<Package>) => {
  const columns = [
    createColumn<Package>("status", "Status", { 
      width: 10, 
      align: 'center',
      render: (status: string) => {
        switch (status) {
          case 'installed': return '✅ Inst'
          case 'available': return '📦 Avail'
          case 'outdated': return '🔄 Old'
          default: return status
        }
      }
    }),
    createColumn<Package>("name", "Package", { width: 20, sortable: true }),
    createColumn<Package>("version", "Version", { width: 12, sortable: true }),
    createColumn<Package>("description", "Description", { width: 35 }),
    createColumn<Package>("downloads", "Downloads", { 
      width: 12, 
      align: 'right',
      sortable: true,
      render: (downloads: number) => `${(downloads / 1000000).toFixed(1)}M`
    }),
    createColumn<Package>("size", "Size", { width: 8, align: 'right' })
  ]
  
  const rows = packages.map(pkg => 
    createRow(`package-${pkg.name}`, pkg)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Multiple,
    showHeader: true,
    width: 100,
    pageSize: 12,
    initialSort: { column: "downloads", direction: "desc" }
  })
}

const createDependenciesTable = () => {
  const columns = [
    createColumn<Dependency>("name", "Dependency", { width: 25, sortable: true }),
    createColumn<Dependency>("version", "Version", { width: 15, sortable: true }),
    createColumn<Dependency>("type", "Type", { 
      width: 15, 
      align: 'center',
      render: (type: string) => {
        switch (type) {
          case 'production': return '🏭 Prod'
          case 'development': return '🔧 Dev'
          case 'peer': return '👥 Peer'
          default: return type
        }
      }
    }),
    createColumn<Dependency>("size", "Size", { width: 10, align: 'right' })
  ]
  
  const rows = mockDependencies.map(dep => 
    createRow(`dependency-${dep.name}`, dep)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Single,
    showHeader: true,
    width: 70,
    pageSize: 8
  })
}

const createTabsComponent = () => {
  return tabs({
    tabs: [
      createTab("packages", "Packages", "Browse and manage packages", { icon: "📦" }),
      createTab("dependencies", "Dependencies", "Project dependencies", { icon: "🔗" }),
      createTab("search", "Search", "Search for packages", { icon: "🔍" })
    ],
    activeTabId: "packages"
  })
}

// =============================================================================
// Component
// =============================================================================

const packageManager: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const packagesTableComponent = createPackagesTable(mockPackages)
    const dependenciesTableComponent = createDependenciesTable()
    const tabsComponent = createTabsComponent()
    
    const [packagesModel] = yield* _(packagesTableComponent.init())
    const [dependenciesModel] = yield* _(dependenciesTableComponent.init())
    const [tabsModel] = yield* _(tabsComponent.init())
    const [searchInputModel] = yield* _(textInput({
      placeholder: "Search packages...",
      width: 50
    }).init())
    
    return [{
      packagesTable: { ...packagesModel, focused: true },
      dependenciesTable: dependenciesModel,
      searchInput: searchInputModel,
      tabsComponent: tabsModel,
      activeTab: 'packages' as Tab,
      searchTerm: "",
      selectedPackages: new Set(),
      statusMessage: "Package manager ready - Use Tab to switch views, Space to select",
      operationInProgress: false
    }, []]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "packagesMsg": {
        const packagesTableComponent = createPackagesTable(mockPackages)
        return packagesTableComponent.update(msg.msg, model.packagesTable).pipe(
          Effect.map(([newPackagesModel, cmds]) => [
            { ...model, packagesTable: newPackagesModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(packagesMsg => ({ tag: "packagesMsg", msg: packagesMsg } as Msg))
            ))
          ])
        )
      }
      
      case "dependenciesMsg": {
        const dependenciesTableComponent = createDependenciesTable()
        return dependenciesTableComponent.update(msg.msg, model.dependenciesTable).pipe(
          Effect.map(([newDependenciesModel, cmds]) => [
            { ...model, dependenciesTable: newDependenciesModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(dependenciesMsg => ({ tag: "dependenciesMsg", msg: dependenciesMsg } as Msg))
            ))
          ])
        )
      }
      
      case "searchMsg": {
        const searchComponent = textInput({ placeholder: "Search packages...", width: 50 })
        return searchComponent.update(msg.msg, model.searchInput).pipe(
          Effect.map(([newSearchModel, cmds]) => [
            { ...model, searchInput: newSearchModel, searchTerm: newSearchModel.value },
            cmds.map(cmd => cmd.pipe(
              Effect.map(searchMsg => ({ tag: "searchMsg", msg: searchMsg } as Msg))
            ))
          ])
        )
      }
      
      case "switchTab": {
        const newModel = {
          ...model,
          activeTab: msg.tab,
          packagesTable: { ...model.packagesTable, focused: msg.tab === 'packages' },
          dependenciesTable: { ...model.dependenciesTable, focused: msg.tab === 'dependencies' },
          searchInput: { ...model.searchInput, focused: msg.tab === 'search' }
        }
        
        return Effect.succeed([newModel, []])
      }
      
      case "installPackage": {
        const selectedRow = model.packagesTable.filteredRows[model.packagesTable.currentRowIndex]
        if (selectedRow) {
          const pkg = selectedRow.data as Package
          return Effect.succeed([
            { 
              ...model, 
              statusMessage: `Installing ${pkg.name}@${pkg.version}... (simulated)`,
              operationInProgress: true
            },
            [
              Effect.delay(Effect.succeed({ tag: "operationComplete" as const }), 2000)
            ]
          ])
        }
        return Effect.succeed([model, []])
      }
      
      case "uninstallPackage": {
        const selectedRow = model.packagesTable.filteredRows[model.packagesTable.currentRowIndex]
        if (selectedRow) {
          const pkg = selectedRow.data as Package
          return Effect.succeed([
            { 
              ...model, 
              statusMessage: `Uninstalling ${pkg.name}... (simulated)`,
              operationInProgress: true
            },
            [
              Effect.delay(Effect.succeed({ tag: "operationComplete" as const }), 1500)
            ]
          ])
        }
        return Effect.succeed([model, []])
      }
      
      case "updatePackage": {
        const selectedRow = model.packagesTable.filteredRows[model.packagesTable.currentRowIndex]
        if (selectedRow) {
          const pkg = selectedRow.data as Package
          return Effect.succeed([
            { 
              ...model, 
              statusMessage: `Updating ${pkg.name} to latest version... (simulated)`,
              operationInProgress: true
            },
            [
              Effect.delay(Effect.succeed({ tag: "operationComplete" as const }), 3000)
            ]
          ])
        }
        return Effect.succeed([model, []])
      }
      
      case "bulkInstall": {
        const count = model.selectedPackages.size
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: `Installing ${count} packages... (simulated)`,
            operationInProgress: true
          },
          [
            Effect.delay(Effect.succeed({ tag: "operationComplete" as const }), 5000)
          ]
        ])
      }
      
      case "operationComplete": {
        return Effect.succeed([
          { 
            ...model, 
            statusMessage: "Operation completed successfully",
            operationInProgress: false
          },
          []
        ])
      }
      
      default:
        return Effect.succeed([model, []])
    }
  },
  
  view(model: Model) {
    const title = text("Package Manager 📦", style(Colors.BrightMagenta).bold())
    const subtitle = text(`${mockPackages.length} packages available • ${model.selectedPackages.size} selected`, style(Colors.Gray))
    
    // Tabs
    const tabsComponent = createTabsComponent()
    const tabsView = tabsComponent.view(model.tabsComponent)
    
    // Content based on active tab
    let content: any
    
    switch (model.activeTab) {
      case 'packages':
        const packagesTableComponent = createPackagesTable(mockPackages)
        content = box(
          vstack(
            text("Available Packages", style(Colors.BrightWhite)),
            text("", style()),
            packagesTableComponent.view(model.packagesTable)
          ),
          {
            border: Borders.single,
            borderStyle: style(Colors.BrightBlue),
            padding: { top: 0, right: 1, bottom: 0, left: 1 },
            width: 104,
            height: 16
          }
        )
        break
        
      case 'dependencies':
        const dependenciesTableComponent = createDependenciesTable()
        content = box(
          vstack(
            text("Project Dependencies", style(Colors.BrightWhite)),
            text("", style()),
            dependenciesTableComponent.view(model.dependenciesTable)
          ),
          {
            border: Borders.single,
            borderStyle: style(Colors.BrightGreen),
            padding: { top: 0, right: 1, bottom: 0, left: 1 },
            width: 75,
            height: 12
          }
        )
        break
        
      case 'search':
        const searchComponent = textInput({ placeholder: "Search packages...", width: 50 })
        content = box(
          vstack(
            text("Search Packages", style(Colors.BrightWhite)),
            text("", style()),
            text("Enter package name or keyword:", style(Colors.Gray)),
            searchComponent.view(model.searchInput),
            text("", style()),
            text(model.searchTerm ? `Searching for: "${model.searchTerm}"` : "Type to search packages", style(Colors.Yellow))
          ),
          {
            border: Borders.single,
            borderStyle: style(Colors.BrightYellow),
            padding: { top: 0, right: 1, bottom: 0, left: 1 },
            width: 60,
            height: 8
          }
        )
        break
    }
    
    // Package details (if a package is selected)
    const selectedRow = model.packagesTable.filteredRows[model.packagesTable.currentRowIndex]
    const packageDetails = selectedRow ? (() => {
      const pkg = selectedRow.data as Package
      return box(
        vstack(
          text("Package Details", style(Colors.BrightCyan)),
          text("", style()),
          text(`Name: ${pkg.name}`, style(Colors.White)),
          text(`Version: ${pkg.version}`, style(Colors.White)),
          text(`Author: ${pkg.author}`, style(Colors.White)),
          text(`License: ${pkg.license}`, style(Colors.White)),
          text(`Dependencies: ${pkg.dependencies}`, style(Colors.White)),
          text(`Size: ${pkg.size}`, style(Colors.White)),
          text("", style()),
          text(pkg.description, style(Colors.Gray))
        ),
        {
          border: Borders.single,
          borderStyle: style(Colors.BrightCyan),
          padding: { top: 0, right: 1, bottom: 0, left: 1 },
          width: 40,
          height: 12
        }
      )
    })() : text("", style())
    
    // Status bar
    const statusBar = box(
      hstack(
        text(model.statusMessage, style(Colors.White)),
        text(model.operationInProgress ? " ⏳" : "", style(Colors.BrightYellow))
      ),
      {
        border: Borders.single,
        borderStyle: style(Colors.Gray),
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        width: 104
      }
    )
    
    // Keybindings help
    const help = vstack(
      text("Keybindings:", style(Colors.Yellow)),
      text("Tab/1-3: Switch tabs  |  ↑↓: Navigate  |  Space: Select/Toggle  |  Enter: Details", style(Colors.Gray)),
      text("I: Install  |  U: Uninstall  |  Shift+U: Update  |  B: Bulk install  |  Ctrl+C: Exit", style(Colors.Gray))
    )
    
    const mainContent = model.activeTab === 'packages' && selectedRow
      ? hstack(content, text("  ", style()), packageDetails)
      : content
    
    return vstack(
      title,
      subtitle,
      text("", style()),
      tabsView,
      text("", style()),
      mainContent,
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
        // Tab switching
        if (key.key === 'tab') {
          const tabs: Tab[] = ['packages', 'dependencies', 'search']
          const currentIndex = tabs.indexOf(model.activeTab)
          const nextIndex = (currentIndex + 1) % tabs.length
          return { tag: "switchTab", tab: tabs[nextIndex] }
        }
        
        // Direct tab access
        if (key.key === '1') return { tag: "switchTab", tab: 'packages' }
        if (key.key === '2') return { tag: "switchTab", tab: 'dependencies' }
        if (key.key === '3') return { tag: "switchTab", tab: 'search' }
        
        // Package operations
        if (key.key === 'i') return { tag: "installPackage" }
        if (key.key === 'u') return { tag: "uninstallPackage" }
        if (key.key === 'U') return { tag: "updatePackage" }
        if (key.key === 'b') return { tag: "bulkInstall" }
        
        // Navigation within active content
        if (key.key === 'up' || key.key === 'down' || key.key === ' ' || key.key === 'enter') {
          switch (model.activeTab) {
            case 'packages':
              return { tag: "packagesMsg", msg: { 
                tag: key.key === 'up' ? "navigateUp" : 
                     key.key === 'down' ? "navigateDown" :
                     key.key === ' ' ? "toggleRowSelection" : "selectRow", 
                rowId: "" 
              }}
            case 'dependencies':
              return { tag: "dependenciesMsg", msg: { 
                tag: key.key === 'up' ? "navigateUp" : 
                     key.key === 'down' ? "navigateDown" : "selectRow", 
                rowId: "" 
              }}
            case 'search':
              // Search input handles its own keys
              return null
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

console.log("Starting Package Manager...")
console.log("This example demonstrates package management UI patterns and multi-tab interfaces")

const program = runApp(packageManager, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })