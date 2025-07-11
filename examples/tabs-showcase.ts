/**
 * Tabs Showcase - Demonstrates tab component features
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { vstack, hstack, text, styledText, box } from "@/core/view.ts"
import type { Component, Cmd, AppServices, AppOptions } from "@/core/types.ts"
import { style, Colors, Borders } from "@/styling/index.ts"
import { 
  tabs,
  createTab,
  stringTabs,
  type TabsModel,
  type TabsMsg,
  type Tab
} from "@/components/index.ts"
import { InputService } from "@/services/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Sample Data
// =============================================================================

const sampleTabs: Array<{ id: string; title: string; content: string; icon?: string; badge?: string }> = [
  {
    id: "overview",
    title: "Overview",
    icon: "📊",
    content: `Welcome to the Tabs Component Showcase!

This tab demonstrates the basic functionality of the tabs component:

• Multiple tabs with different content
• Keyboard navigation (←/→ or Tab/Shift+Tab)
• Number key shortcuts (1-9)
• Icons and badges support
• Customizable styling

Key Features:
- Dynamic tab switching
- Disabled state support
- Focus management
- Mouse interaction support
- Flexible content rendering`
  },
  {
    id: "data",
    title: "Data",
    icon: "📈",
    badge: "42",
    content: `Sample Data Overview

User Statistics:
- Total Users: 1,247
- Active Users: 892
- New Users (Today): 23
- Retention Rate: 76%

System Metrics:
- CPU Usage: 45%
- Memory Usage: 62%
- Disk Usage: 23%
- Network I/O: 156 KB/s

Recent Activity:
✓ Database backup completed
✓ Cache refreshed
⚠ High memory usage detected
✓ Security scan passed`
  },
  {
    id: "settings",
    title: "Settings",
    icon: "⚙️",
    content: `Application Settings

General:
□ Enable notifications
☑ Dark mode
□ Auto-save
☑ Show line numbers

Performance:
□ Enable caching
☑ Compress responses
□ Enable CDN
☑ Lazy loading

Security:
☑ Two-factor authentication
☑ Session timeout (30 min)
□ IP whitelist
☑ Audit logging

Appearance:
• Theme: Dark
• Font Size: 14px
• Color Scheme: Blue
• Animation Speed: Normal`
  },
  {
    id: "logs",
    title: "Logs",
    icon: "📋",
    badge: "New",
    content: `System Logs (Last 24 hours)

[2024-01-15 14:30:21] INFO  Application started
[2024-01-15 14:30:22] INFO  Database connection established
[2024-01-15 14:30:23] INFO  Cache warmed up
[2024-01-15 14:35:42] WARN  High memory usage: 85%
[2024-01-15 14:36:15] INFO  Memory cleaned up
[2024-01-15 15:22:33] INFO  User login: alice@example.com
[2024-01-15 15:45:17] ERROR HTTP 500: Internal server error
[2024-01-15 15:45:18] INFO  Error handled and recovered
[2024-01-15 16:12:44] INFO  Backup process started
[2024-01-15 16:15:32] INFO  Backup completed successfully
[2024-01-15 16:30:01] INFO  Scheduled maintenance completed
[2024-01-15 17:05:23] INFO  User logout: alice@example.com

Total Events: 156
Errors: 3
Warnings: 8`
  },
  {
    id: "help",
    title: "Help",
    icon: "❓",
    content: `Help & Documentation

Navigation:
• ← → Arrow keys to switch tabs
• Tab/Shift+Tab to navigate
• Number keys (1-9) for direct access
• Mouse clicks (coming soon)

Component Features:
• Tab content can be any type
• Support for icons and badges
• Tabs can be enabled/disabled
• Customizable styling
• Focus management
• Dynamic tab addition/removal

Keyboard Shortcuts:
Tab       - Next tab
Shift+Tab - Previous tab
1-9       - Select tab by number
Ctrl+C    - Exit application
Esc       - Exit application

For more information, visit our documentation
or contact support@example.com`
  }
]

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly tabsComponent: TabsModel<string>
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "tabsMsg"; readonly msg: TabsMsg<string> }

// =============================================================================
// Component Setup
// =============================================================================

const createTabsComponent = () => {
  return stringTabs(sampleTabs)
}

// =============================================================================
// Component
// =============================================================================

const showcaseComponent: Component<Model, Msg> = {
  init: Effect.gen(function* (_) {
    const tabsComp = createTabsComponent()
    const [tabsModel] = yield* _(tabsComp.init())
    
    return [{
      tabsComponent: tabsModel
    }, []]
  }),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "tabsMsg": {
        const tabsComp = createTabsComponent()
        return tabsComp.update(msg.msg, model.tabsComponent).pipe(
          Effect.map(([newTabsModel, cmds]) => [
            { ...model, tabsComponent: newTabsModel },
            cmds.map(cmd => cmd.pipe(
              Effect.map(tabsMsg => ({ tag: "tabsMsg", msg: tabsMsg } as Msg))
            ))
          ])
        )
      }
    }
  },
  
  view(model: Model) {
    const title = styledText("Tabs Component Showcase", style().foreground(Colors.brightWhite))
    const subtitle = styledText("Navigate between tabs to see different content", style().foreground(Colors.gray))
    
    // Tabs view
    const tabsComp = createTabsComponent()
    const tabsView = tabsComp.view(model.tabsComponent)
    
    // Instructions
    const instructions = [
      styledText("Navigation Instructions:", style().foreground(Colors.yellow)),
      styledText("← → Arrow keys  |  Tab/Shift+Tab  |  Number keys (1-5)  |  Ctrl+C to exit", style().foreground(Colors.gray))
    ]
    
    // Current tab info
    const activeTab = sampleTabs.find(tab => tab.id === model.tabsComponent.activeTabId)
    const tabInfo = activeTab ? [
      styledText("", style()),
      styledText(`Active Tab: ${activeTab.icon || ""} ${activeTab.title}${activeTab.badge ? ` (${activeTab.badge})` : ""}`, style().foreground(Colors.cyan))
    ] : []
    
    // Features demonstration
    const features = [
      styledText("Component Features:", style().foreground(Colors.yellow)),
      styledText("✓ Multiple content types", style().foreground(Colors.green)),
      styledText("✓ Icons and badges", style().foreground(Colors.green)),
      styledText("✓ Keyboard navigation", style().foreground(Colors.green)),
      styledText("✓ Number key shortcuts", style().foreground(Colors.green)),
      styledText("✓ Focus management", style().foreground(Colors.green)),
      styledText("○ Mouse support (planned)", style().foreground(Colors.gray))
    ]
    
    return vstack(
      title,
      subtitle,
      styledText("", style()),
      box(
        tabsView,
        {
          width: 80,
          height: 20,
          border: Borders.single,
          borderStyle: style().foreground(Colors.blue),
          padding: { top: 0, right: 1, bottom: 0, left: 1 }
        }
      ),
      ...tabInfo,
      styledText("", style()),
      vstack(...instructions),
      styledText("", style()),
      vstack(...features)
    )
  },
  
  subscriptions: (model: Model) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        // Tab navigation
        if (key.key === 'left' || (key.key === 'tab' && key.shift)) {
          return { tag: "tabsMsg", msg: { tag: "prevTab" } } as Msg
        }
        if (key.key === 'right' || key.key === 'tab') {
          return { tag: "tabsMsg", msg: { tag: "nextTab" } } as Msg
        }
        
        // Number key shortcuts
        if (key.key >= '1' && key.key <= '9') {
          const tabIndex = parseInt(key.key) - 1
          if (tabIndex < sampleTabs.length) {
            return { tag: "tabsMsg", msg: { tag: "selectTab", tabId: sampleTabs[tabIndex].id } } as Msg
          }
        }
        
        return null
      })
    })
}

// =============================================================================
// Main
// =============================================================================

const config: AppOptions = {
  fps: 30,
  debug: true,
  mouse: true,
  alternateScreen: true
}

const program = runApp(showcaseComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })