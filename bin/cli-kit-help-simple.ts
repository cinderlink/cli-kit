/**
 * Simple Help Screen for CLI-KIT
 * 
 * A simpler version that just prints help text
 */

import { largeTextWithPalette } from "../src/components/LargeText.ts"
import { styledText, text } from "../src/core/view.ts"
import { style, Colors } from "../src/styling/index.ts"
import { Effect } from "effect"

export function showHelpSimple() {
  // Create the title
  const title = largeTextWithPalette("CLI-KIT", "neon", {
    font: 'ansiShadow',
    mode: 'outlined'
  })
  
  const subtitle = styledText(
    "The Ultimate Terminal UI Framework",
    style().foreground(Colors.brightCyan).italic()
  )
  
  const version = styledText("v1.0.0", style().foreground(Colors.gray))
  
  // Render the title
  const titleRender = Effect.runSync(title.render())
  const subtitleRender = Effect.runSync(subtitle.render())
  const versionRender = Effect.runSync(version.render())
  
  console.log()
  console.log(titleRender)
  console.log()
  console.log("                    " + subtitleRender)
  console.log("                             " + versionRender)
  console.log()
  
  // Print sections
  const sections = [
    {
      title: "📸 Screenshot Commands",
      items: [
        { cmd: "screenshot list", desc: "List all saved screenshots" },
        { cmd: "screenshot quick <cmd>", desc: "Quick capture with auto-generated name" },
        { cmd: "screenshot create <name>", desc: "Create named screenshot" },
        { cmd: "screenshot show <name>", desc: "Display a saved screenshot" },
        { cmd: "screenshot delete <name>", desc: "Delete a screenshot" },
        { cmd: "screenshot export <name> <file>", desc: "Export to file (json/text/ansi)" },
        { cmd: "screenshot multi", desc: "Batch capture multiple commands" }
      ]
    },
    {
      title: "🎨 Screenshot Options", 
      items: [
        { cmd: "--pty", desc: "Use PTY mode for interactive commands" },
        { cmd: "--duration <ms>", desc: "Set capture duration for PTY mode" },
        { cmd: "--raw", desc: "Include raw ANSI codes in capture" },
        { cmd: "-s, --show", desc: "Show screenshot immediately after capture" },
        { cmd: "-d, --description", desc: "Add description to screenshot" },
        { cmd: "-f, --format", desc: "Export format: json, text, or ansi" }
      ]
    },
    {
      title: "🚀 Getting Started",
      items: [
        { cmd: "cli-kit ss quick 'ls -la'", desc: "Capture directory listing" },
        { cmd: "cli-kit ss create demo --command 'echo Hello' --show", desc: "Named capture with preview" },
        { cmd: "cli-kit ss multi --examples", desc: "Capture CLI-KIT examples" },
        { cmd: "cli-kit create my-app", desc: "Create new CLI-KIT app (coming soon!)" }
      ]
    }
  ]
  
  sections.forEach(section => {
    const titleRender = Effect.runSync(
      styledText(section.title, style().foreground(Colors.yellow).bold()).render()
    )
    console.log(titleRender)
    console.log()
    
    section.items.forEach(item => {
      const cmd = styledText(item.cmd.padEnd(40), style().foreground(Colors.cyan))
      const desc = styledText(item.desc, style().foreground(Colors.white))
      const cmdRender = Effect.runSync(cmd.render())
      const descRender = Effect.runSync(desc.render())
      console.log(`  ${cmdRender} ${descRender}`)
    })
    console.log()
  })
  
  // Footer
  const footerRender = Effect.runSync(
    styledText("Built with ❤️  using CLI-KIT", style().foreground(Colors.magenta)).render()
  )
  console.log(footerRender)
  console.log()
}

// Run if called directly
if (import.meta.main) {
  showHelpSimple()
}