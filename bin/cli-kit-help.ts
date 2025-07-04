/**
 * Custom Help Screen for CLI-KIT
 * 
 * A beautiful, interactive help screen showcasing our TUI framework capabilities
 */

import { Effect, Stream } from "effect"
import { runApp } from "../src/core/runtime.ts"
import type { Cmd, View, AppServices } from "../src/core/types.ts"
import { vstack, hstack, text, styledText } from "../src/core/view.ts"
import { style, Colors, Borders } from "../src/styling/index.ts"
import { styledBox } from "../src/layout/box.ts"
import { spacer } from "../src/layout/spacer.ts"
import { largeAnimatedGradientText, colorPalettes } from "../src/components/LargeText.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { TerminalService } from "../src/services/index.ts"
import type { HelpSection } from "../src/components/Help.ts"

// =============================================================================
// Types
// =============================================================================

interface HelpModel {
  time: number
  selectedSection: number
  expandedSection: boolean
  terminalWidth: number
  terminalHeight: number
}

type HelpMsg = 
  | { _tag: "Tick"; time: number }
  | { _tag: "KeyPress"; key: string }
  | { _tag: "SelectSection"; index: number }
  | { _tag: "ToggleExpand" }
  | { _tag: "Quit" }

// =============================================================================
// Help Content
// =============================================================================

const helpSections: HelpSection[] = [
  {
    title: "📸 Screenshot Commands",
    description: "Capture and manage CLI screenshots",
    bindings: [
      { key: "screenshot list", description: "List all saved screenshots" },
      { key: "screenshot quick <cmd>", description: "Quick capture with auto-generated name" },
      { key: "screenshot create <name>", description: "Create named screenshot" },
      { key: "screenshot show <name>", description: "Display a saved screenshot" },
      { key: "screenshot delete <name>", description: "Delete a screenshot" },
      { key: "screenshot export <name> <file>", description: "Export to file (json/text/ansi)" },
      { key: "screenshot multi", description: "Batch capture multiple commands" }
    ]
  },
  {
    title: "🎨 Screenshot Options",
    description: "Fine-tune your captures",
    bindings: [
      { key: "--pty", description: "Use PTY mode for interactive commands" },
      { key: "--duration <ms>", description: "Set capture duration for PTY mode" },
      { key: "--raw", description: "Include raw ANSI codes in capture" },
      { key: "-s, --show", description: "Show screenshot immediately after capture" },
      { key: "-d, --description", description: "Add description to screenshot" },
      { key: "-f, --format", description: "Export format: json, text, or ansi" }
    ]
  },
  {
    title: "🚀 Getting Started",
    description: "Quick examples to try",
    bindings: [
      { key: "cli-kit ss quick 'ls -la'", description: "Capture directory listing" },
      { key: "cli-kit ss create demo --command 'echo Hello' --show", description: "Named capture with preview" },
      { key: "cli-kit ss multi --examples", description: "Capture CLI-KIT examples" },
      { key: "cli-kit create my-app", description: "Create new CLI-KIT app (coming soon!)" }
    ]
  },
  {
    title: "⌨️  Keyboard Shortcuts",
    description: "Navigate this help screen",
    bindings: [
      { key: "↑/↓ or j/k", description: "Navigate sections" },
      { key: "Enter", description: "Expand/collapse section" },
      { key: "q or Escape", description: "Exit help" },
      { key: "?", description: "Show this help" }
    ]
  }
]

// =============================================================================
// View Functions
// =============================================================================

function renderHeader(model: HelpModel): View {
  const gradient = {
    colors: [
      colorPalettes.neon.colors[0],
      colorPalettes.neon.colors[1],
      colorPalettes.neon.colors[2],
      colorPalettes.purple.colors[0],
      colorPalettes.purple.colors[1]
    ],
    direction: 'horizontal' as const
  }
  
  const animatedTitle = largeAnimatedGradientText({
    text: "CLI-KIT",
    font: 'ansiShadow',
    gradient,
    time: model.time,
    animationSpeed: 0.05,
    mode: 'outlined'
  })
  
  const subtitle = styledText(
    "The Ultimate Terminal UI Framework",
    style().foreground(Colors.brightCyan).italic()
  )
  
  const version = styledText(
    "v1.0.0",
    style().foreground(Colors.gray)
  )
  
  // Center by adding spacers
  const centerView = (view: View, width: number): View => {
    return hstack(spacer(), view, spacer())
  }
  
  return vstack(
    text(""),
    centerView(animatedTitle, model.terminalWidth),
    centerView(subtitle, model.terminalWidth),
    centerView(version, model.terminalWidth),
    text("")
  )
}

function renderSection(section: HelpSection, index: number, isSelected: boolean, isExpanded: boolean): View {
  const headerStyle = isSelected 
    ? style().foreground(Colors.brightYellow).bold()
    : style().foreground(Colors.cyan).bold()
    
  const arrow = isExpanded ? "▼" : "▶"
  const header = styledText(
    `${arrow} ${section.title}`,
    headerStyle
  )
  
  const description = section.description 
    ? styledText(`   ${section.description}`, style().foreground(Colors.gray).italic())
    : text("")
  
  if (!isExpanded) {
    return vstack(header, description)
  }
  
  const bindings = section.bindings.map(binding => {
    const keyStyle = style().foreground(Colors.yellow)
    const descStyle = style().foreground(Colors.white)
    const separator = styledText(" • ", style().foreground(Colors.gray))
    
    return hstack(
      text("     "),
      styledText(binding.key.padEnd(35), keyStyle),
      separator,
      styledText(binding.description, descStyle)
    )
  })
  
  return vstack(
    header,
    description,
    text(""),
    ...bindings,
    text("")
  )
}

function renderFooter(model: HelpModel): View {
  const footerStyle = style().foreground(Colors.gray)
  const keyStyle = style().foreground(Colors.yellow).bold()
  
  return styledBox(
    hstack(
      styledText("Navigate: ", footerStyle),
      styledText("↑↓", keyStyle),
      styledText(" • Expand: ", footerStyle),
      styledText("Enter", keyStyle),
      styledText(" • Exit: ", footerStyle),
      styledText("q", keyStyle),
      styledText(" • ", footerStyle),
      styledText("Built with ❤️  using CLI-KIT", style().foreground(Colors.magenta))
    ),
    {
      border: Borders.Single,
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
      style: style().foreground(Colors.gray)
    }
  )
}

// =============================================================================
// Update Function
// =============================================================================

function update(msg: HelpMsg, model: HelpModel): Effect.Effect<[HelpModel, Cmd<HelpMsg>[]], never, AppServices> {
  switch (msg._tag) {
    case "Tick":
      return Effect.succeed([{ ...model, time: msg.time }, []])
      
    case "KeyPress":
      switch (msg.key) {
        case 'q':
        case 'escape':
          return Effect.succeed([model, [{ type: "exit" }]])
        case 'up':
        case 'k':
          return Effect.succeed([
            { 
              ...model, 
              selectedSection: Math.max(0, model.selectedSection - 1),
              expandedSection: false 
            }, 
            []
          ])
        case 'down':
        case 'j':
          return Effect.succeed([
            { 
              ...model, 
              selectedSection: Math.min(helpSections.length - 1, model.selectedSection + 1),
              expandedSection: false 
            }, 
            []
          ])
        case 'enter':
        case ' ':
          return Effect.succeed([
            { ...model, expandedSection: !model.expandedSection }, 
            []
          ])
        default:
          return Effect.succeed([model, []])
      }
      
    case "SelectSection":
      return Effect.succeed([
        { 
          ...model, 
          selectedSection: msg.index,
          expandedSection: model.selectedSection === msg.index ? !model.expandedSection : true
        }, 
        []
      ])
      
    case "ToggleExpand":
      return Effect.succeed([
        { ...model, expandedSection: !model.expandedSection }, 
        []
      ])
      
    case "Quit":
      return Effect.succeed([model, [{ type: "exit" }]])
  }
}

// =============================================================================
// View Function
// =============================================================================

function view(model: HelpModel): View {
  const header = renderHeader(model)
  
  const sections = helpSections.map((section, index) => 
    renderSection(
      section, 
      index, 
      index === model.selectedSection,
      index === model.selectedSection && model.expandedSection
    )
  )
  
  const content = styledBox(
    vstack(...sections),
    {
      border: Borders.Rounded,
      padding: { top: 1, right: 2, bottom: 1, left: 2 },
      style: style().foreground(Colors.white)
    }
  )
  
  const footer = renderFooter(model)
  
  // Add left padding with spaces
  const paddedContent = hstack(
    text("    "), // 4 spaces for padding
    content
  )
  
  // Center footer
  const centeredFooter = hstack(spacer(), footer, spacer())
  
  return vstack(
    header,
    paddedContent,
    text(""),
    centeredFooter
  )
}

// =============================================================================
// Subscriptions
// =============================================================================

function subscriptions(_model: HelpModel): Cmd<HelpMsg>[] {
  return [
    {
      type: "tick",
      fps: 10,
      handler: (time) => ({ _tag: "Tick", time })
    },
    {
      type: "keypress",
      handler: (key) => ({ _tag: "KeyPress", key: key.key })
    }
  ]
}

// =============================================================================
// Main Function
// =============================================================================

export function showHelp(): Effect.Effect<void, never, AppServices> {
  return runApp({
    init: Effect.gen(function* () {
      const terminal = yield* TerminalService
      const size = yield* terminal.size
      
      const initialModel: HelpModel = {
        time: 0,
        selectedSection: 0,
        expandedSection: true, // Start with first section expanded
        terminalWidth: size.columns,
        terminalHeight: size.rows
      }
      
      return [initialModel, []]
    }),
    update,
    view,
    subscriptions
  })
}

// Run if called directly
if (import.meta.main) {
  await Effect.runPromise(
    showHelp().pipe(
      Effect.provide(LiveServices)
    )
  )
}