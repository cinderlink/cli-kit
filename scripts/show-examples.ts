#!/usr/bin/env bun

/**
 * Show Examples Script
 * 
 * Displays all available examples with descriptions and keyboard shortcuts
 */

import { style, Colors } from "../src/styling/index.ts"

const examples = [
  {
    script: "example:git-dashboard",
    name: "🔧 Git Dashboard",
    description: "Multi-panel git repository management (inspired by lazygit)",
    file: "examples/git-dashboard.ts",
    patterns: ["Multi-panel navigation", "Git workflow simulation", "Table management"]
  },
  {
    script: "example:process-monitor", 
    name: "📊 Process Monitor",
    description: "Real-time system monitoring (inspired by htop)",
    file: "examples/process-monitor.ts",
    patterns: ["Real-time data updates", "Progress bars", "Process management"]
  },
  {
    script: "example:log-viewer",
    name: "📝 Log Viewer", 
    description: "Streaming log analysis with filtering (inspired by lnav)",
    file: "examples/log-viewer.ts",
    patterns: ["Streaming data", "Advanced filtering", "Search & highlighting"]
  },
  {
    script: "example:package-manager",
    name: "📦 Package Manager",
    description: "Package management interface (inspired by npm/yarn)",
    file: "examples/package-manager.ts", 
    patterns: ["Tab navigation", "Bulk operations", "Multi-view state"]
  },
  {
    script: "example:contact-form",
    name: "📋 Contact Form",
    description: "Form handling and validation patterns",
    file: "examples/contact-form.ts",
    patterns: ["Form state management", "Input validation", "Field navigation"]
  },
  {
    script: "example:layout-patterns",
    name: "🎨 Layout Patterns",
    description: "Layout composition and responsive design",
    file: "examples/layout-patterns.ts",
    patterns: ["Advanced layouts", "Responsive design", "Container composition"]
  },
  {
    script: "example:table-showcase",
    name: "📊 Table Showcase", 
    description: "Data table with sorting and filtering",
    file: "examples/table-showcase.ts",
    patterns: ["Data tables", "Sorting", "Filtering", "Selection"]
  },
  {
    script: "example:tabs-showcase",
    name: "📑 Tabs Showcase",
    description: "Tab navigation and multi-view interfaces", 
    file: "examples/tabs-showcase.ts",
    patterns: ["Tab navigation", "Multi-view", "Content switching"]
  },
  {
    script: "example:mouse-demo",
    name: "🖱️ Mouse Demo",
    description: "Mouse event capture and handling",
    file: "examples/mouse-demo.ts",
    patterns: ["Mouse events", "Event capture", "Coordinate tracking"]
  }
]

function printHeader() {
  console.log("CLI-Kit Examples 🎨")
  console.log("=" .repeat(60))
  console.log("Real-world TUI applications demonstrating framework capabilities")
  console.log("")
}

function printExample(example: any, index: number) {
  const number = (index + 1).toString().padStart(2, " ")
  
  console.log(`${number}. ${example.name}`)
  console.log(`    ${example.description}`)
  console.log(`    📁 ${example.file}`)
  console.log(`    🎯 Patterns: ${example.patterns.join(", ")}`)
  console.log(`    ▶️  bun run ${example.script}`)
  console.log("")
}

function printFooter() {
  console.log("Quick Commands:")
  console.log("  bun run examples              # Show this help")
  console.log("  bun run examples:test         # Test all examples (3s each)")
  console.log("  bun run test:e2e:all          # Run all e2e tests")
  console.log("")
  console.log("Common Keyboard Shortcuts:")
  console.log("  Tab       - Navigate between panels/tabs")
  console.log("  1-9       - Direct access to tabs/panels") 
  console.log("  ↑↓        - Navigate lists/tables")
  console.log("  Space     - Select/toggle items")
  console.log("  Enter     - Confirm/submit actions")
  console.log("  Escape    - Cancel/clear")
  console.log("  Ctrl+C    - Exit application")
  console.log("")
  console.log("For detailed documentation, see examples/README.md")
}

// Main execution
printHeader()

examples.forEach((example, index) => {
  printExample(example, index)
})

printFooter()