/**
 * Plugin System Demo
 * 
 * Demonstrates the CLI plugin system with auth and config plugins
 */

import { defineConfig, runCLI } from "../../cli"
import { PluginLoader } from "../../src/cli/loader"
import { PluginRegistry } from "../../src/cli/registry"
import { z } from "zod"
import authPlugin from "../../plugins/auth"
import configPlugin from "../../plugins/config"
import { Panel, InfoPanel, SuccessPanel, text, vstack, PrimaryButton } from "../../cli"

// Create a demo CLI with plugin support
const config = defineConfig({
  name: "plugin-demo",
  version: "1.0.0",
  description: "CLI Plugin System Demonstration",
  
  options: {
    verbose: z.boolean().default(false).describe("Enable verbose output")
  },
  
  commands: {
    info: {
      description: "Show plugin information",
      handler: async (args) => {
        // Access injected services from plugins
        const authService = (args as any)._services?.auth
        const configService = (args as any)._services?.config
        
        const user = authService ? await authService.getCurrentUser() : null
        const config = configService ? await configService.get() : null
        
        return Panel(
          vstack(
            text("Plugin System Demo"),
            text(""),
            text("Loaded Plugins:"),
            text("• Auth Plugin - Provides authentication"),
            text("• Config Plugin - Manages configuration"),
            text(""),
            text("Current Status:"),
            user 
              ? text(`✓ Logged in as: ${user.username}`)
              : text("✗ Not logged in"),
            config
              ? text(`✓ Config loaded: ${Object.keys(config).length} keys`)
              : text("✗ No config loaded"),
            text(""),
            text("Available Commands:"),
            text("• login <username> - Authenticate"),
            text("• logout - Clear authentication"),
            text("• whoami - Show current user"),
            text("• config show - Display configuration"),
            text("• config set <key> <value> - Set config value"),
            text("• protected - Demo protected command")
          ),
          { title: "Plugin Demo Info" }
        )
      }
    },
    
    protected: {
      description: "A protected command that requires authentication",
      options: {
        admin: z.boolean().default(false).describe("Require admin permissions")
      },
      handler: async (args) => {
        // This will be protected by auth middleware
        const user = (args as any)._user
        
        return SuccessPanel(
          vstack(
            text("✓ Access granted!"),
            text(""),
            text(`User: ${user.username}`),
            text(`ID: ${user.id}`),
            text(`Permissions: ${user.permissions.join(", ")}`),
            text(""),
            text("This command is protected by the auth plugin.")
          ),
          "Protected Resource"
        )
      }
    },
    
    demo: {
      description: "Interactive plugin demo",
      handler: async (args) => {
        const authService = (args as any)._services?.auth
        const isAuthenticated = authService ? await authService.isAuthenticated() : false
        
        return Panel(
          vstack(
            text("🔌 Plugin System Demo"),
            text(""),
            text("This CLI demonstrates:"),
            text("• Dynamic plugin loading"),
            text("• Command injection"),
            text("• Middleware hooks"),
            text("• Service providers"),
            text(""),
            isAuthenticated
              ? vstack(
                  text("✓ You are logged in!"),
                  text("Try: plugin-demo protected")
                )
              : vstack(
                  text("✗ You are not logged in"),
                  text("Try: plugin-demo login <username>")
                ),
            text(""),
            text("Try these commands:"),
            text("• plugin-demo info"),
            text("• plugin-demo login alice"),
            text("• plugin-demo config show"),
            text("• plugin-demo config set theme dark")
          ),
          { title: "Plugin Demo" }
        )
      }
    }
  }
})

// Main function to setup and run CLI with plugins
async function main() {
  try {
    // Create plugin registry
    const registry = new PluginRegistry({
      autoEnable: true,
      validateDependencies: false
    })
    
    // Register plugins
    console.log("Loading plugins...")
    registry.register(authPlugin)
    registry.register(configPlugin)
    
    // Apply plugins to CLI config
    const enhancedConfig = registry.applyCLIConfig(config)
    
    // Add plugin services to command context
    const originalHooks = enhancedConfig.hooks || {}
    enhancedConfig.hooks = {
      ...originalHooks,
      beforeCommand: async (command, args) => {
        // Inject services
        (args as any)._services = registry.getServices()
        
        // Call original hook if exists
        if (originalHooks.beforeCommand) {
          await originalHooks.beforeCommand(command, args)
        }
      }
    }
    
    // Run CLI with enhanced config
    await runCLI(enhancedConfig)
    
  } catch (error) {
    console.error("CLI Error:", error)
    process.exit(1)
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && import.meta.path === Bun.main) {
  main()
}