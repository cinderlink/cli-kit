/**
 * Working Component Example
 * 
 * Simple demonstration that Phase 2 simplified API works
 */

import { 
  defineConfig, 
  runCLI,
  text,
  Panel,
  SuccessPanel,
  PrimaryButton,
  vstack
} from "../../cli"
import { z } from "zod"

// Test 1: Static component using builder functions
const StaticComponent = () => Panel(
  vstack(
    text("🚀 TUIX Simplified API"),
    text(""),
    text("✓ Component builders work"),
    text("✓ Panel and Button builders work"),
    text("✓ Clean imports work"),
    text("✓ CLI framework integration works")
  ),
  { title: "Phase 2 Success!" }
)

// Test 2: Simple dynamic component
const DynamicComponent = (name: string) => SuccessPanel(
  vstack(
    text(`Hello, ${name}!`),
    text(""),
    text("This component was created with:"),
    text("• Simplified builder API"),
    text("• Clean component composition"),
    text("• Zero Effect complexity")
  ),
  "Dynamic Component"
)

// Test 3: Component with interactive elements
const InteractiveComponent = () => Panel(
  vstack(
    text("Interactive Elements Test"),
    text(""),
    PrimaryButton("This is a Primary Button"),
    text(""),
    text("Component builders make UI creation simple!")
  ),
  { title: "Interactive Components" }
)

const config = defineConfig({
  name: "working-component",
  version: "1.0.0",
  description: "Working examples of Phase 2 simplified API",
  
  commands: {
    static: {
      description: "Show static component",
      handler: (args) => StaticComponent()
    },
    
    dynamic: {
      description: "Show dynamic component with name",
      args: {
        name: z.string().default("Developer").describe("Name to greet")
      },
      handler: (args) => DynamicComponent(args.name)
    },
    
    interactive: {
      description: "Show interactive component",
      handler: (args) => InteractiveComponent()
    },
    
    builders: {
      description: "Test all builder functions",
      handler: (args) => Panel(
        vstack(
          text("🎨 Builder Functions Showcase"),
          text(""),
          Panel(text("This is a basic Panel"), { title: "Basic Panel" }),
          text(""),
          SuccessPanel(text("This is a Success Panel"), "Success Panel"),
          text(""),
          PrimaryButton("Primary Button"),
          text(""),
          text("All builder functions working! ✨")
        ),
        { title: "Builder Functions Test" }
      )
    }
  }
})

if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(config).catch(console.error)
}
