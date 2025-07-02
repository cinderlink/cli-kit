/**
 * Table Showcase - Demonstrates table features with sample data
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, RuntimeConfig } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { 
  table,
  createColumn,
  createRow,
  TableSelectionMode,
  type TableModel,
  type TableMsg,
  type TableColumn,
  type TableRow,
  type TableFilter
} from "@/components/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Sample Data
// =============================================================================

interface User {
  readonly id: number
  readonly name: string
  readonly email: string
  readonly role: string
  readonly status: 'active' | 'inactive' | 'pending'
  readonly lastLogin: string
  readonly score: number
}

const sampleUsers: Array<User> = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active", lastLogin: "2024-01-15", score: 95 },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "User", status: "active", lastLogin: "2024-01-14", score: 87 },
  { id: 3, name: "Carol Williams", email: "carol@example.com", role: "Moderator", status: "inactive", lastLogin: "2024-01-10", score: 92 },
  { id: 4, name: "David Brown", email: "david@example.com", role: "User", status: "pending", lastLogin: "2024-01-12", score: 78 },
  { id: 5, name: "Eve Davis", email: "eve@example.com", role: "Admin", status: "active", lastLogin: "2024-01-15", score: 98 },
  { id: 6, name: "Frank Miller", email: "frank@example.com", role: "User", status: "active", lastLogin: "2024-01-13", score: 83 },
  { id: 7, name: "Grace Wilson", email: "grace@example.com", role: "Moderator", status: "active", lastLogin: "2024-01-14", score: 89 },
  { id: 8, name: "Henry Taylor", email: "henry@example.com", role: "User", status: "inactive", lastLogin: "2024-01-08", score: 76 },
  { id: 9, name: "Ivy Anderson", email: "ivy@example.com", role: "User", status: "active", lastLogin: "2024-01-15", score: 91 },
  { id: 10, name: "Jack Thomas", email: "jack@example.com", role: "Admin", status: "active", lastLogin: "2024-01-15", score: 94 }
]

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly userTable: TableModel<User>
  readonly showingFilters: boolean
  readonly filterColumn: string
  readonly filterValue: string
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "tableMsg"; readonly msg: TableMsg<User> }
  | { readonly tag: "toggleFilters" }
  | { readonly tag: "applyFilter" }
  | { readonly tag: "clearAllFilters" }
  | { readonly tag: "setFilterColumn"; readonly column: string }
  | { readonly tag: "setFilterValue"; readonly value: string }

// =============================================================================
// Component Setup
// =============================================================================

const createUserTable = () => {
  const columns: Array<TableColumn<User>> = [
    createColumn("name", "Name", { width: 20, sortable: true }),
    createColumn("email", "Email", { width: 25, sortable: true }),
    createColumn("role", "Role", { width: 12, sortable: true, align: 'center' }),
    createColumn("status", "Status", { 
      width: 10, 
      sortable: true, 
      align: 'center',
      render: (value: string) => {
        switch (value) {
          case 'active': return '🟢 Active'
          case 'inactive': return '🔴 Inactive'
          case 'pending': return '🟡 Pending'
          default: return value
        }
      }
    }),
    createColumn("lastLogin", "Last Login", { width: 12, sortable: true }),
    createColumn("score", "Score", { 
      width: 8, 
      sortable: true, 
      align: 'right',
      render: (value: number) => `${value}%`
    })
  ]
  
  const rows = sampleUsers.map(user => 
    createRow(`user-${user.id}`, user)
  )
  
  return table({
    columns,
    rows,
    selectionMode: TableSelectionMode.Multiple,
    showHeader: true,
    showRowNumbers: true,
    width: 90,
    pageSize: 8,
    initialSort: { column: "name", direction: "asc" }
  })
}

// =============================================================================
// Component
// =============================================================================

const showcaseComponent: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const userTableComponent = createUserTable()
    const [userTableModel] = yield* _(userTableComponent.init())
    
    return [{
      userTable: userTableModel,
      showingFilters: false,
      filterColumn: "name",
      filterValue: ""
    }, []]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "tableMsg": {
        const userTableComponent = createUserTable()
        return userTableComponent.update(msg.msg, model.userTable).pipe(
          Effect.map(([newTableModel, cmds]) => [
            { ...model, userTable: newTableModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(tableMsg => ({ tag: "tableMsg", msg: tableMsg } as Msg))
            ))
          ])
        )
      }
      
      case "toggleFilters": {
        return Effect.succeed([
          { ...model, showingFilters: !model.showingFilters },
          []
        ])
      }
      
      case "applyFilter": {
        if (!model.filterValue.trim()) {
          return Effect.succeed([model, []])
        }
        
        const filter: TableFilter = {
          column: model.filterColumn,
          value: model.filterValue.trim(),
          type: "contains"
        }
        
        const userTableComponent = createUserTable()
        return userTableComponent.update(
          { tag: "addFilter", filter },
          model.userTable
        ).pipe(
          Effect.map(([newTableModel]) => [
            { 
              ...model, 
              userTable: newTableModel,
              filterValue: "",
              showingFilters: false
            },
            []
          ])
        )
      }
      
      case "clearAllFilters": {
        const userTableComponent = createUserTable()
        return userTableComponent.update(
          { tag: "clearFilters" },
          model.userTable
        ).pipe(
          Effect.map(([newTableModel]) => [
            { ...model, userTable: newTableModel },
            []
          ])
        )
      }
      
      case "setFilterColumn": {
        return Effect.succeed([
          { ...model, filterColumn: msg.column },
          []
        ])
      }
      
      case "setFilterValue": {
        return Effect.succeed([
          { ...model, filterValue: msg.value },
          []
        ])
      }
    }
  },
  
  view(model: Model) {
    const title = text("Table Component Showcase", style(Colors.BrightWhite))
    const subtitle = text("Navigate with arrows, Space to select, Enter to toggle", style(Colors.Gray))
    
    // Table view
    const userTableComponent = createUserTable()
    const tableView = userTableComponent.view(model.userTable)
    
    // Controls
    const controls = [
      text("Controls:", style(Colors.Yellow)),
      text("↑/↓ Navigate rows  |  Space/Enter Select row  |  PgUp/PgDn Page navigation", style(Colors.Gray)),
      text("Ctrl+A Select all  |  Esc Clear selection  |  Click column headers to sort", style(Colors.Gray)),
      text("F Filter rows  |  C Clear filters", style(Colors.Gray))
    ]
    
    // Filter interface (if showing)
    const filterUI = model.showingFilters ? [
      text("", style()),
      box(
        vstack(
          text("Filter Options", style(Colors.Yellow)),
          text("", style()),
          text(`Column: ${model.filterColumn}`, style(Colors.White)),
          text(`Value: ${model.filterValue}`, style(Colors.White)),
          text("", style()),
          text("Available columns: name, email, role, status", style(Colors.Gray)),
          text("Press Enter to apply filter, Esc to cancel", style(Colors.Gray))
        ),
        {
          width: 50,
          height: 9,
          border: Borders.single,
          borderStyle: style(Colors.Blue),
          padding: { top: 0, right: 1, bottom: 0, left: 1 }
        }
      )
    ] : []
    
    // Active filters display
    const activeFilters = model.userTable.filters.length > 0 ? [
      text("", style()),
      text("Active Filters:", style(Colors.Yellow)),
      ...model.userTable.filters.map(filter =>
        text(`• ${filter.column} contains "${filter.value}"`, style(Colors.Cyan))
      )
    ] : []
    
    // Sample data info
    const dataInfo = [
      text("Sample Data:", style(Colors.Yellow)),
      text("10 users with various roles and statuses", style(Colors.Gray)),
      text("Try sorting by clicking column names, filtering, and selecting rows", style(Colors.Gray))
    ]
    
    return vstack(
      title,
      subtitle,
      text("", style()),
      tableView,
      text("", style()),
      ...activeFilters,
      text("", style()),
      vstack(...controls),
      text("", style()),
      vstack(...dataInfo),
      ...filterUI,
      text("", style()),
      text("Press Ctrl+C to exit", style(Colors.Gray))
    )
  }
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

const program = runApp(showcaseComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })