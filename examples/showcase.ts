/**
 * TUIX Framework Showcase
 * 
 * A comprehensive demonstration of all framework components and examples
 * in an interactive grid layout. Navigate between examples, see live
 * previews, and launch individual demos.
 */

import { Effect, Stream } from "effect"
import { runApp } from "../src/index"
import { vstack, hstack, text, styledText, box } from "../src/core/view"
import { spacer } from "../src/layout/index"
import type { Component, Cmd, AppServices, AppOptions, KeyEvent, MouseEvent } from "../src/core/types"
import { style, Colors, Borders } from "../src/styling/index"
import { InputService } from "../src/services/index"
import { LiveServices } from "../src/services/impl/index"
import { 
  largeAnimatedGradientText,
  gradientPresets
} from "../src/components/LargeText"

// =============================================================================
// Example Metadata
// =============================================================================

interface ExampleInfo {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly category: "components" | "layouts" | "interactions" | "utilities"
  readonly command: string
  readonly preview: () => Component<any, any>
}

const examples: readonly ExampleInfo[] = [
  {
    id: "loading-screen",
    title: "Loading Screen",
    description: "Interactive gradient text with animations",
    category: "components",
    command: "bun examples/loading-screen.ts",
    preview: () => createPreviewComponent("TUIX", "Animated gradient text")
  },
  {
    id: "button-showcase",
    title: "Button Showcase",
    description: "All button variants and states",
    category: "components",
    command: "bun examples/button-showcase.ts",
    preview: () => createPreviewComponent("Buttons", "Primary, Secondary, Success...")
  },
  {
    id: "modal-demo",
    title: "Modal Demo",
    description: "Modal dialogs with animations",
    category: "components",
    command: "bun examples/modal-demo.ts",
    preview: () => createPreviewComponent("Modals", "Dialog boxes and overlays")
  },
  {
    id: "tabs-showcase",
    title: "Tabs Showcase",
    description: "Tab navigation patterns",
    category: "components",
    command: "bun examples/tabs-showcase.ts",
    preview: () => createPreviewComponent("Tabs", "Tab1 | Tab2 | Tab3")
  },
  {
    id: "table-showcase",
    title: "Table Showcase",
    description: "Data tables with sorting",
    category: "components",
    command: "bun examples/table-showcase.ts",
    preview: () => createPreviewComponent("Tables", "┌─────┬─────┐\n│ Col │ Col │\n└─────┴─────┘")
  },
  {
    id: "viewport-demo",
    title: "Viewport Demo",
    description: "Scrollable content areas",
    category: "components",
    command: "bun examples/viewport-demo.ts",
    preview: () => createPreviewComponent("Viewport", "Scrollable area with content")
  },
  {
    id: "gradient-demo",
    title: "Gradient Demo",
    description: "Advanced gradient effects",
    category: "utilities",
    command: "bun examples/gradient-demo.ts",
    preview: () => createPreviewComponent("Gradients", "Rainbow, sunset, ocean...")
  },
  {
    id: "layout-patterns",
    title: "Layout Patterns",
    description: "Grid and flexbox layouts",
    category: "layouts",
    command: "bun examples/layout-patterns.ts",
    preview: () => createPreviewComponent("Layouts", "Grid, Flex, Panels")
  },
  {
    id: "mouse-demo",
    title: "Mouse Demo",
    description: "Mouse interaction patterns",
    category: "interactions",
    command: "bun examples/mouse-demo.ts",
    preview: () => createPreviewComponent("Mouse", "Click, hover, drag")
  },
  {
    id: "git-dashboard",
    title: "Git Dashboard",
    description: "Full git status interface",
    category: "utilities",
    command: "bun examples/git-dashboard.ts",
    preview: () => createPreviewComponent("Git", "Status, diff, commit")
  },
  {
    id: "log-viewer",
    title: "Log Viewer",
    description: "Streaming log display",
    category: "utilities",
    command: "bun examples/log-viewer.ts",
    preview: () => createPreviewComponent("Logs", "[INFO] Message...")
  },
  {
    id: "process-monitor",
    title: "Process Monitor",
    description: "System process viewer",
    category: "utilities",
    command: "bun examples/process-monitor.ts",
    preview: () => createPreviewComponent("Processes", "PID  CPU  MEM")
  }
]

// =============================================================================
// Model
// =============================================================================

interface ShowcaseModel {
  readonly selectedIndex: number
  readonly hoveredIndex: number | null
  readonly filter: "all" | "components" | "layouts" | "interactions" | "utilities"
  readonly animationTime: number
  readonly showHelp: boolean
}

// =============================================================================
// Messages
// =============================================================================

type ShowcaseMsg = 
  | { readonly tag: "navigate"; readonly direction: "up" | "down" | "left" | "right" }
  | { readonly tag: "select" }
  | { readonly tag: "filter"; readonly category: ShowcaseModel['filter'] }
  | { readonly tag: "hover"; readonly index: number | null }
  | { readonly tag: "toggleHelp" }
  | { readonly tag: "tick" }
  | { readonly tag: "quit" }

// =============================================================================
// Helper Components
// =============================================================================

function createPreviewComponent(title: string, content: string): Component<{}, never> {
  return {
    init: Effect.succeed([{}, []]),
    update: () => Effect.succeed([{}, []]),
    view: () => vstack(
      styledText(title, style().foreground(Colors.cyan).bold()),
      text(""),
      styledText(content, style().foreground(Colors.gray))
    ),
    subscriptions: () => Effect.succeed(Stream.empty)
  }
}

// =============================================================================
// Main Component
// =============================================================================

const showcase: Component<ShowcaseModel, ShowcaseMsg> = {
  init: Effect.succeed([
    {
      selectedIndex: 0,
      hoveredIndex: null,
      filter: "all",
      animationTime: 0,
      showHelp: false
    },
    []
  ]),

  update: (msg: ShowcaseMsg, model: ShowcaseModel) => {
    const filteredExamples = examples.filter(e => 
      model.filter === "all" || e.category === model.filter
    )

    switch (msg.tag) {
      case "navigate": {
        const cols = 3
        const rows = Math.ceil(filteredExamples.length / cols)
        const currentRow = Math.floor(model.selectedIndex / cols)
        const currentCol = model.selectedIndex % cols

        let newRow = currentRow
        let newCol = currentCol

        switch (msg.direction) {
          case "up":
            newRow = Math.max(0, currentRow - 1)
            break
          case "down":
            newRow = Math.min(rows - 1, currentRow + 1)
            break
          case "left":
            newCol = Math.max(0, currentCol - 1)
            break
          case "right":
            newCol = Math.min(cols - 1, currentCol + 1)
            break
        }

        const newIndex = Math.min(
          filteredExamples.length - 1,
          newRow * cols + newCol
        )

        return Effect.succeed([
          { ...model, selectedIndex: newIndex },
          []
        ])
      }

      case "select": {
        const example = filteredExamples[model.selectedIndex]
        if (example) {
          // In a real implementation, we'd launch the example
          console.log(`Launching: ${example.command}`)
        }
        return Effect.succeed([model, []])
      }

      case "filter": {
        return Effect.succeed([
          { ...model, filter: msg.category, selectedIndex: 0 },
          []
        ])
      }

      case "hover": {
        return Effect.succeed([
          { ...model, hoveredIndex: msg.index },
          []
        ])
      }

      case "toggleHelp": {
        return Effect.succeed([
          { ...model, showHelp: !model.showHelp },
          []
        ])
      }

      case "tick": {
        return Effect.succeed([
          { ...model, animationTime: model.animationTime + 0.1 },
          []
        ])
      }

      case "quit": {
        process.exit(0)
      }
    }
  },

  view: (model: ShowcaseModel) => {
    // Header with animated title
    const logo = largeAnimatedGradientText({
      text: "TUIX",
      gradient: gradientPresets.neon,
      time: model.animationTime,
      animationSpeed: 0.05,
      spacing: 1
    })

    const subtitle = styledText(
      "Interactive Framework Showcase",
      style().foreground(Colors.gray).italic()
    )

    // Filter tabs
    const filters: Array<[string, ShowcaseModel['filter']]> = [
      ["All", "all"],
      ["Components", "components"],
      ["Layouts", "layouts"],
      ["Interactions", "interactions"],
      ["Utilities", "utilities"]
    ]

    const filterTabs = hstack(
      ...filters.map(([label, category], i) => {
        const isActive = model.filter === category
        const tabStyle = isActive
          ? style().foreground(Colors.black).background(Colors.cyan).padding(0, 2)
          : style().foreground(Colors.gray).padding(0, 2)
        
        return [
          styledText(label, tabStyle),
          i < filters.length - 1 ? text(" ") : text("")
        ]
      }).flat()
    )

    // Grid of examples
    const filteredExamples = examples.filter(e => 
      model.filter === "all" || e.category === model.filter
    )

    const exampleCards = filteredExamples.map((example, index) => {
      const isSelected = index === model.selectedIndex
      const isHovered = index === model.hoveredIndex
      
      const titleColor = isSelected 
        ? Colors.cyan 
        : isHovered 
          ? Colors.white 
          : Colors.gray
      
      return box(
        vstack(
          styledText(example.title, style().foreground(titleColor).bold()),
          text(""),
          styledText(example.description, style().foreground(Colors.gray)),
          spacer({ size: 1 }),
          styledText(`[${example.category}]`, style().foreground(Colors.gray).faint())
        )
      )
        .border(isSelected ? Borders.Rounded : Borders.None)
        .style(style().padding(1).minWidth(30).minHeight(8))
    })

    // Simple 3-column layout instead of grid component
    const rows: any[] = []
    for (let i = 0; i < exampleCards.length; i += 3) {
      const rowItems = exampleCards.slice(i, i + 3)
      rows.push(hstack(...rowItems, spacer({ size: 2 })))
    }
    const exampleGrid = vstack(...rows)

    // Help text
    const helpText = model.showHelp
      ? vstack(
          spacer({ size: 1 }),
          box(
            vstack(
              styledText("Keyboard Controls", style().foreground(Colors.cyan).bold()),
              text(""),
              hstack(
                vstack(
                  styledText("↑/↓/←/→", style().foreground(Colors.yellow)),
                  styledText("Enter", style().foreground(Colors.yellow)),
                  styledText("Tab", style().foreground(Colors.yellow)),
                  styledText("h", style().foreground(Colors.yellow)),
                  styledText("q", style().foreground(Colors.yellow))
                ),
                spacer({ size: 2 }),
                vstack(
                  styledText("Navigate examples", style().foreground(Colors.gray)),
                  styledText("Launch selected example", style().foreground(Colors.gray)),
                  styledText("Cycle filter", style().foreground(Colors.gray)),
                  styledText("Toggle this help", style().foreground(Colors.gray)),
                  styledText("Quit showcase", style().foreground(Colors.gray))
                )
              )
            )
          )
            .border(Borders.Rounded)
            .style(style().padding(2))
        )
      : text("")

    // Status bar
    const statusBar = hstack(
      styledText("Press ", style().foreground(Colors.gray)),
      styledText("h", style().foreground(Colors.yellow)),
      styledText(" for help • ", style().foreground(Colors.gray)),
      styledText("Enter", style().foreground(Colors.yellow)),
      styledText(" to launch • ", style().foreground(Colors.gray)),
      styledText("q", style().foreground(Colors.yellow)),
      styledText(" to quit", style().foreground(Colors.gray))
    )

    // Layout
    return vstack(
      spacer({ size: 1 }),
      hstack(spacer({ size: 2 }), logo),
      hstack(spacer({ size: 2 }), subtitle),
      spacer({ size: 2 }),
      hstack(spacer({ size: 2 }), filterTabs),
      spacer({ size: 2 }),
      hstack(spacer({ size: 2 }), exampleGrid),
      helpText,
      spacer({ size: 1 }),
      hstack(spacer({ size: 2 }), statusBar)
    )
  },

  subscriptions: (model: ShowcaseModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      // Animation timer
      const timer = Stream.repeatEffect(
        Effect.gen(function* () {
          yield* Effect.sleep(100)
          return { tag: "tick" } as ShowcaseMsg
        })
      )
      
      // Keyboard input
      const keyboard = input.mapKeys((key: KeyEvent) => {
        switch (key.key) {
          case 'q':
          case 'escape':
            return { tag: "quit" }
          case 'up':
          case 'k':
            return { tag: "navigate", direction: "up" }
          case 'down':
          case 'j':
            return { tag: "navigate", direction: "down" }
          case 'left':
          case 'h':
            return { tag: "navigate", direction: "left" }
          case 'right':
          case 'l':
            return { tag: "navigate", direction: "right" }
          case 'enter':
          case ' ':
            return { tag: "select" }
          case 'tab':
            // Cycle through filters
            const filters: ShowcaseModel['filter'][] = ["all", "components", "layouts", "interactions", "utilities"]
            const currentIndex = filters.indexOf(model.filter)
            const nextIndex = (currentIndex + 1) % filters.length
            return { tag: "filter", category: filters[nextIndex] }
          case 'h':
            if (!key.shift) return { tag: "toggleHelp" }
            break
          case '1':
            return { tag: "filter", category: "all" }
          case '2':
            return { tag: "filter", category: "components" }
          case '3':
            return { tag: "filter", category: "layouts" }
          case '4':
            return { tag: "filter", category: "interactions" }
          case '5':
            return { tag: "filter", category: "utilities" }
        }
        return null
      })
      
      return Stream.merge(timer, keyboard)
    })
}

// =============================================================================
// Runtime
// =============================================================================

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: true
}

console.log("Starting TUIX Framework Showcase...")

const program = runApp(showcase, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Showcase error:", error)
    process.exit(1)
  })
