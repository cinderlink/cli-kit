#!/usr/bin/env bun
/**
 * Layout Patterns Example
 * 
 * Comprehensive demonstration of layout system capabilities:
 * - Panel composition with complete borders and proper padding
 * - Flexbox layouts (horizontal and vertical) with gap control
 * - Centering utilities for modal-style content positioning
 * - Complex nested layouts (header/sidebar/main/footer patterns)
 * - Interactive layout browsing with keyboard navigation
 * 
 * Key Learnings Demonstrated:
 * - Panel borders render completely and consistently across all layout patterns
 * - Flexbox gap system works correctly for spacing between elements
 * - Center utility properly positions content within available terminal space
 * - Nested panel composition maintains border integrity and spacing
 * - Complex layouts compose cleanly from simple building blocks
 * 
 * Layout Pattern Catalog:
 * 1. Basic Panels - Side-by-side panels with different content types
 * 2. Flexbox Grid - Grid-style layout using horizontal/vertical composition
 * 3. Centered Content - Modal-style centered content positioning
 * 4. Complex Nested - Real-world app layout with header/sidebar/main/footer
 * 
 * This example proves our layout system can handle professional application
 * layouts with consistent visual quality and reliable composition patterns.
 */

import { Effect } from "effect"
import { 
  runApp,
  View,
  type Component,
  type AppOptions,
  type Cmd
} from "../src/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { InputService, RendererService } from "../src/services/index.ts"
import { style, Colors } from "../src/styling/index.ts"
import { panel, styledBox } from "../src/layout/index.ts"
import { simpleVBox, simpleHBox, simpleCenter } from "../src/layout/flexbox-simple.ts"

// =============================================================================
// Model
// =============================================================================

interface LayoutShowcaseModel {
  currentLayout: number
}

// =============================================================================
// Messages
// =============================================================================

type LayoutShowcaseMsg =
  | { _tag: "NextLayout" }
  | { _tag: "PrevLayout" }

// Force redraw command to clear artifacts when switching layouts
const forceRedrawCmd = <Msg>(): Cmd<Msg> =>
  Effect.gen(function* (_) {
    const renderer = yield* _(RendererService)
    yield* _(renderer.forceRedraw)
    // Commands should fail to not produce a message
    yield* _(Effect.fail("force redraw"))
  })

// =============================================================================
// Layout Examples
// =============================================================================

const createSampleBox = (text: string) => 
  View.styledText(
    text,
    style()
      .foreground(Colors.white)
      .background(Colors.gray)
      .padding(1, 2)
  )

const layoutExamples = [
  // Layout 1: Basic Panels
  () => {
    const leftPanel = panel(
      simpleVBox([
        View.styledText("Left Panel", style().foreground(Colors.cyan).bold()),
        View.text(""),
        View.text("This is a panel with"),
        View.text("padding and borders."),
        View.text(""),
        View.text("• Item 1"),
        View.text("• Item 2"),
        View.text("• Item 3"),
      ]),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    const rightPanel = panel(
      simpleVBox([
        View.styledText("Right Panel", style().foreground(Colors.magenta).bold()),
        View.text(""),
        View.text("Another panel with"),
        View.text("different content."),
        View.text(""),
        View.styledText("Success!", style().foreground(Colors.green)),
        View.styledText("Warning!", style().foreground(Colors.yellow)),
        View.styledText("Error!", style().foreground(Colors.red)),
      ]),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    return simpleHBox([leftPanel, rightPanel], { gap: 2 })
  },
  
  // Layout 2: Flexbox Grid
  () => {
    const box1 = createSampleBox("Box 1")
    const box2 = createSampleBox("Box 2") 
    const box3 = createSampleBox("Box 3")
    const box4 = createSampleBox("Box 4")
    const box5 = createSampleBox("Box 5")
    const box6 = createSampleBox("Box 6")
    
    const row1 = simpleHBox([box1, box2, box3], { gap: 1 })
    const row2 = simpleHBox([box4, box5, box6], { gap: 1 })
    
    return panel(
      simpleVBox([
        View.styledText("Flexbox Grid Layout", style().foreground(Colors.cyan).bold()),
        View.text(""),
        row1,
        View.text(""),
        row2
      ]),
      { padding: { top: 2, right: 3, bottom: 2, left: 3 } }
    )
  },
  
  // Layout 3: Centered Content
  () => {
    const centeredContent = simpleVBox([
      View.styledText("Centered Content", style().foreground(Colors.cyan).bold()),
      View.text(""),
      View.text("This content is centered"),
      View.text("both horizontally and vertically"),
      View.text(""),
      View.styledText("Perfect for modals and dialogs!", style().foreground(Colors.magenta).italic()),
    ])
    
    const centeredPanel = panel(centeredContent, {
      padding: { top: 3, right: 6, bottom: 3, left: 6 }
    })
    
    return simpleCenter(centeredPanel, 80, 25)
  },
  
  // Layout 4: Complex Nested Layout
  () => {
    const header = panel(
      View.styledText("Header Section", style().foreground(Colors.white).bold()),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    const sidebar = panel(
      simpleVBox([
        View.styledText("Sidebar", style().foreground(Colors.gray).bold()),
        View.text(""),
        View.text("• Navigation"),
        View.text("• Settings"),
        View.text("• Help"),
      ]),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    const mainContent = panel(
      simpleVBox([
        View.styledText("Main Content Area", style().foreground(Colors.cyan).bold()),
        View.text(""),
        View.text("This is the main content area where"),
        View.text("the primary application content"),
        View.text("would be displayed."),
        View.text(""),
        createSampleBox("Feature 1"),
        View.text(""),
        createSampleBox("Feature 2"),
      ]),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    const footer = panel(
      View.styledText("Footer Section", style().foreground(Colors.gray).italic()),
      { padding: { top: 1, right: 2, bottom: 1, left: 2 } }
    )
    
    const bodyContent = simpleHBox([sidebar, mainContent], { gap: 1 })
    
    return simpleVBox([
      header,
      View.text(""),
      bodyContent,
      View.text(""),
      footer
    ])
  }
]

// =============================================================================
// Component
// =============================================================================

export const LayoutShowcaseComponent: Component<LayoutShowcaseModel, LayoutShowcaseMsg> = {
  init: Effect.succeed([
    { currentLayout: 0 },
    []
  ]),
  
  update: (msg: LayoutShowcaseMsg, model: LayoutShowcaseModel) =>
    Effect.succeed((() => {
      switch (msg._tag) {
        case "NextLayout": {
          const nextLayout = (model.currentLayout + 1) % layoutExamples.length
          return [{ ...model, currentLayout: nextLayout }, [forceRedrawCmd()]]
        }
        
        case "PrevLayout": {
          const prevLayout = model.currentLayout - 1 < 0 ? layoutExamples.length - 1 : model.currentLayout - 1
          return [{ ...model, currentLayout: prevLayout }, [forceRedrawCmd()]]
        }
        
        default:
          return [model, []]
      }
    })()),
  
  view: (model: LayoutShowcaseModel) => {
    const title = View.styledText(
      `Layout Showcase (${model.currentLayout + 1}/${layoutExamples.length})`,
      style()
        .foreground(Colors.cyan)
        .bold()
    )
    
    const layoutNames = [
      "Basic Panels with Borders",
      "Flexbox Grid Layout", 
      "Centered Content",
      "Complex Nested Layout"
    ]
    
    const subtitle = View.styledText(
      layoutNames[model.currentLayout],
      style().foreground(Colors.gray).italic()
    )
    
    const help = View.styledText(
      "Left/Right arrows to navigate • Q to quit",
      style().foreground(Colors.gray).italic()
    )
    
    const currentLayoutView = layoutExamples[model.currentLayout]()
    
    return simpleVBox([
      title,
      subtitle,
      View.text(""),
      currentLayoutView,
      View.text(""),
      help
    ])
  },
  
  subscriptions: (model: LayoutShowcaseModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys(key => {
        if (key.key === 'q' || (key.ctrl && key.key === 'ctrl+c')) {
          process.stdout.write('\x1b[?25h')  // Show cursor
          process.stdout.write('\x1b[2J')    // Clear screen
          process.stdout.write('\x1b[H')     // Move to home
          process.exit(0)
        }
        
        if (key.key === 'right' || key.key === ' ') {
          return { _tag: "NextLayout" as const }
        }
        
        if (key.key === 'left') {
          return { _tag: "PrevLayout" as const }
        }
        
        return null
      })
    })
}

// =============================================================================
// Main Application
// =============================================================================

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

const program = runApp(LayoutShowcaseComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })