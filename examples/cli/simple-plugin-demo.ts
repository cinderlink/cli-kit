/**
 * Simple Plugin Demo
 * 
 * Basic demonstration of the plugin system
 */

import { defineConfig } from "../../src/cli/config"
import { runCLI } from "../../src/cli/runner"
import { definePlugin } from "../../src/cli/plugin"
import { z } from "zod"
import { Panel, InfoPanel, SuccessPanel } from "../../src/components/builders/Panel"
import { text, vstack } from "../../src/core/view"

// Create a simple greeting plugin
const greetingPlugin = definePlugin({
  metadata: {
    name: "greeting",
    version: "1.0.0",
    description: "Adds greeting commands"
  },
  
  commands: {
    hello: {
      description: "Say hello",
      args: {
        name: z.string().default("World").describe("Name to greet")
      },
      handler: (args) => Panel(
        text(`👋 Hello, ${args.name}!`),
        { title: "Greeting" }
      )
    },
    
    goodbye: {
      description: "Say goodbye",
      args: {
        name: z.string().default("Friend").describe("Name to say goodbye to")
      },
      handler: (args) => Panel(
        text(`👋 Goodbye, ${args.name}! See you later!`),
        { title: "Farewell" }
      )
    }
  },
  
  // Add a hook that runs before every command
  hooks: {
    beforeCommand: (command, args) => {
      console.log(`[Greeting Plugin] Command '${command}' starting...`)
    },
    
    afterCommand: (command, args, result) => {
      console.log(`[Greeting Plugin] Command '${command}' completed.`)
    }
  }
})

// Create a statistics plugin
const statsPlugin = definePlugin({
  metadata: {
    name: "stats",
    version: "1.0.0",
    description: "Tracks command usage"
  },
  
  commands: {
    stats: {
      description: "Show command statistics",
      handler: (args) => {
        const stats = (global as any).commandStats || { commands: {}, total: 0 }
        
        return InfoPanel(
          vstack(
            text(`Total commands run: ${stats.total}`),
            text(""),
            text("Commands:"),
            ...Object.entries(stats.commands as Record<string, number>).map(([cmd, count]) => 
              text(`  ${cmd}: ${count} times`)
            )
          ),
          "Usage Statistics"
        )
      }
    }
  },
  
  middleware: {
    beforeCommand: (command, args) => {
      // Track command usage
      const g = global as any
      if (!g.commandStats) {
        g.commandStats = { commands: {}, total: 0 }
      }
      g.commandStats.total++
      const cmdKey = command.join(' ')
      const commands = g.commandStats.commands
      commands[cmdKey] = (commands[cmdKey] || 0) + 1
    }
  }
})

// Base CLI configuration
const baseConfig = defineConfig({
  name: "simple-plugin-demo",
  version: "1.0.0",
  description: "Simple plugin system demonstration",
  
  commands: {
    about: {
      description: "About this CLI",
      handler: (args) => Panel(
        vstack(
          text("🔌 Simple Plugin Demo"),
          text(""),
          text("This CLI demonstrates:"),
          text("• Plugin command injection"),
          text("• Plugin hooks"),
          text("• Plugin middleware"),
          text(""),
          text("Loaded plugins:"),
          text("• greeting - Adds hello/goodbye commands"),
          text("• stats - Tracks command usage")
        ),
        { title: "About" }
      )
    }
  }
})

// Manually apply plugins (simplified version)
function applyPlugins(config: any, ...plugins: any[]): any {
  const enhanced = { ...config }
  
  // Merge commands - start with base commands
  enhanced.commands = { ...config.commands }
  
  for (const plugin of plugins) {
    if (plugin.commands) {
      enhanced.commands = { ...enhanced.commands, ...plugin.commands }
    }
  }
  
  // Chain hooks
  const originalHooks = config.hooks || {}
  enhanced.hooks = {}
  
  for (const hookName of ['beforeCommand', 'afterCommand', 'onError']) {
    const handlers: any[] = []
    
    // Add original hook
    if (originalHooks[hookName]) {
      handlers.push(originalHooks[hookName])
    }
    
    // Add plugin hooks
    for (const plugin of plugins) {
      if (plugin.hooks?.[hookName]) {
        handlers.push(plugin.hooks[hookName])
      }
      if (plugin.middleware?.[hookName]) {
        handlers.push(plugin.middleware[hookName])
      }
    }
    
    // Create chained handler
    if (handlers.length > 0) {
      enhanced.hooks[hookName] = async (...args: any[]) => {
        for (const handler of handlers) {
          await handler(...args)
        }
      }
    }
  }
  
  return enhanced
}

// Apply plugins to base config
const enhancedConfig = applyPlugins(baseConfig, greetingPlugin, statsPlugin)

// Remove debug

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  runCLI(enhancedConfig).catch(console.error)
}