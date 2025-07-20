#!/usr/bin/env bun
/**
 * TUIX CLI Application
 * 
 * Main CLI entry point that provides comprehensive development tools for TUIX applications.
 * This CLI tool serves as the central hub for TUIX development, providing commands for
 * project initialization, development server, building, testing, and plugin management.
 * 
 * Features:
 * - Project scaffolding with templates
 * - Development server with hot reloading
 * - Production builds with optimization
 * - Plugin management and marketplace
 * - Process management integration
 * - Real-time logging and monitoring
 * 
 * @example
 * ```bash
 * # Initialize a new project
 * tuix init my-app
 * 
 * # Start development server
 * tuix dev
 * 
 * # Build for production
 * tuix build
 * 
 * # Manage plugins
 * tuix plugin install @tuix/plugin-logger
 * ```
 */

import { defineConfig, runCLI } from "../../../src/cli/index.js"
import { initCommand } from "./commands/init.ts"
import { devCommand } from "./commands/dev.ts"
import { buildCommand } from "./commands/build.ts"
import { pluginCommand } from "./commands/plugin.ts"
import { z } from "zod"

// CLI Configuration
const cliConfig = defineConfig({
  name: "tuix",
  version: "1.0.0-rc.2",
  description: "TUIX CLI - Modern terminal UI framework for building sophisticated CLI applications",
  
  // Global options available to all commands
  options: {
    verbose: {
      type: z.boolean().default(false),
      alias: "v",
      description: "Enable verbose logging"
    },
    config: {
      type: z.string().optional(),
      alias: "c",
      description: "Path to config file"
    },
    quiet: {
      type: z.boolean().default(false),
      alias: "q",
      description: "Suppress output"
    }
  },
  
  // Command definitions
  commands: {
    // Project initialization
    init: initCommand,
    
    // Development server
    dev: devCommand,
    
    // Production build
    build: buildCommand,
    
    // Plugin management
    plugin: pluginCommand,
    
    // Aliases for convenience
    i: {
      alias: "init",
      hidden: true
    },
    d: {
      alias: "dev", 
      hidden: true
    },
    b: {
      alias: "build",
      hidden: true
    },
    p: {
      alias: "plugin",
      hidden: true
    }
  },
  
  // Plugin system integration
  plugins: [
    // Core plugins for enhanced functionality
    "@tuix/plugin-process-manager",
    "@tuix/plugin-logger"
  ],
  
  // Lifecycle hooks
  hooks: {
    beforeCommand: async (command: string[], args: any) => {
      // Set up logging level based on verbose flag
      if (args.options.verbose) {
        process.env['CLI_VERBOSE'] = "true"
      }
      if (args.options.quiet) {
        process.env['CLI_QUIET'] = "true"
      }
    },
    
    afterCommand: async (command: string[], args: any, result: any) => {
      // Clean up any resources
      if (process.env['CLI_VERBOSE'] === "true") {
        console.log(`✅ Command '${command.join(" ")}' completed successfully`)
      }
    },
    
    onError: async (error: any, command: string[] | undefined, args: any) => {
      // Enhanced error handling
      if (process.env['CLI_VERBOSE'] === "true") {
        console.error(`❌ Command '${command?.join(" ") || "unknown"}' failed:`, error)
      } else {
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      }
      
      // Provide helpful suggestions
      if (error instanceof Error && error.message.includes("command not found")) {
        console.error("\n💡 Try running 'tuix --help' to see available commands")
      }
    }
  }
})

// Error handling for uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("💥 Uncaught exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled rejection at:", promise, "reason:", reason)
  process.exit(1)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n👋 Received SIGTERM, shutting down...")
  process.exit(0)
})

// Main CLI execution
if (import.meta.main) {
  runCLI(cliConfig).catch((error: any) => {
    console.error("💥 CLI startup failed:", error)
    process.exit(1)
  })
}

export default cliConfig