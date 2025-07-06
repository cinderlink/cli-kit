/**
 * JSX Demo
 * 
 * Demonstrates using JSX/TSX syntax for building CLI UIs
 */

/** @jsxImportSource ../../ */
import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { createComponent } from "../../src/components/component"
import { $state } from "../../src/components/reactivity"
import { z } from "zod"

// Simple functional component
const Greeting = ({ name, emoji = "👋" }: { name: string; emoji?: string }) => (
  <vstack>
    <hstack>
      <text>{emoji} </text>
      <bold>Hello, {name}!</bold>
    </hstack>
    <faint>Welcome to CLI-KIT with JSX</faint>
  </vstack>
)

// Status badge component
const StatusBadge = ({ status }: { status: "success" | "error" | "warning" | "info" }) => {
  switch (status) {
    case "success":
      return <success>✓ Success</success>
    case "error":
      return <error>✗ Error</error>
    case "warning":
      return <warning>⚠ Warning</warning>
    case "info":
      return <info>ℹ Info</info>
  }
}

// Task list component
const TaskList = ({ tasks }: { tasks: Array<{ id: string; title: string; done: boolean }> }) => (
  <vstack>
    <blue>Tasks ({tasks.filter(t => t.done).length}/{tasks.length} completed)</blue>
    <text></text>
    {tasks.map(task => (
      <hstack key={task.id}>
        <text>{task.done ? "✓" : "○"} </text>
        <text style={task.done ? style().faint() : undefined}>{task.title}</text>
      </hstack>
    ))}
  </vstack>
)

// Color palette demo
const ColorPalette = () => (
  <vstack>
    <bold>Color Palette:</bold>
    <hstack>
      <red>Red</red>
      <text> • </text>
      <green>Green</green>
      <text> • </text>
      <blue>Blue</blue>
      <text> • </text>
      <yellow>Yellow</yellow>
    </hstack>
    <hstack>
      <cyan>Cyan</cyan>
      <text> • </text>
      <magenta>Magenta</magenta>
      <text> • </text>
      <white>White</white>
      <text> • </text>
      <gray>Gray</gray>
    </hstack>
  </vstack>
)

// Interactive counter component
const Counter = createComponent(() => {
  const count = $state(0)
  
  return {
    update: (msg, model) => {
      if (msg._tag === "KeyPress") {
        switch (msg.key.name) {
          case "up":
            count.update(n => n + 1)
            break
          case "down":
            count.update(n => n - 1)
            break
          case "r":
            count.set(0)
            break
        }
      }
      return [model, []]
    },
    
    view: () => (
      <panel title="Counter">
        <vstack>
          <hstack>
            <text>Count: </text>
            <bold>{count.value}</bold>
          </hstack>
          <text></text>
          <faint>↑/↓ to change, r to reset</faint>
        </vstack>
      </panel>
    )
  }
})

// CLI configuration
const config = defineConfig({
  name: "jsx-demo",
  version: "1.0.0",
  description: "JSX syntax demonstration",
  
  commands: {
    greet: {
      description: "Greet someone with JSX",
      args: {
        name: z.string().default("World").describe("Name to greet")
      },
      options: {
        emoji: z.string().default("👋").describe("Greeting emoji")
      },
      handler: (args) => (
        <panel title="Greeting">
          <Greeting name={args.name} emoji={args.emoji} />
        </panel>
      )
    },
    
    status: {
      description: "Show status badges",
      handler: (args) => (
        <panel title="Status Examples">
          <vstack>
            <StatusBadge status="success" />
            <StatusBadge status="error" />
            <StatusBadge status="warning" />
            <StatusBadge status="info" />
          </vstack>
        </panel>
      )
    },
    
    tasks: {
      description: "Show task list",
      handler: () => {
        const tasks = [
          { id: "1", title: "Create JSX runtime", done: true },
          { id: "2", title: "Add TypeScript support", done: true },
          { id: "3", title: "Create examples", done: true },
          { id: "4", title: "Write documentation", done: false },
          { id: "5", title: "Add more components", done: false }
        ]
        
        return (
          <panel title="Project Tasks">
            <TaskList tasks={tasks} />
          </panel>
        )
      }
    },
    
    colors: {
      description: "Show color palette",
      handler: (args) => (
        <panel title="Colors">
          <ColorPalette />
        </panel>
      )
    },
    
    counter: {
      description: "Interactive counter",
      handler: () => <Counter />
    },
    
    showcase: {
      description: "Complete JSX showcase",
      handler: (args) => (
        <panel title="JSX Showcase">
          <vstack>
            <bold>CLI-KIT JSX Support</bold>
            <text></text>
            
            <underline>Features:</underline>
            <text>• Type-safe JSX with TypeScript</text>
            <text>• Semantic HTML-like elements</text>
            <text>• Color and style shortcuts</text>
            <text>• Component composition</text>
            <text>• Conditional rendering</text>
            <text></text>
            
            <underline>Text Styles:</underline>
            <hstack>
              <bold>Bold</bold>
              <text> • </text>
              <italic>Italic</italic>
              <text> • </text>
              <underline>Underline</underline>
              <text> • </text>
              <faint>Faint</faint>
            </hstack>
            <text></text>
            
            <underline>Layout:</underline>
            <text>Using {"<vstack>"} and {"<hstack>"} for layout</text>
            <text></text>
            
            <underline>Conditional Rendering:</underline>
            {true && <success>This is shown</success>}
            {false && <error>This is hidden</error>}
            {[1, 2, 3].map(n => (
              <text key={n}>• Item {n}</text>
            ))}
          </vstack>
        </panel>
      )
    }
  }
})

// Helper to import style for use in JSX
function style() {
  const { style } = require("../../src/styling")
  return style()
}

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}