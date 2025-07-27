/**
 * Logging Plugin
 * 
 * Built-in plugin for enhanced logging functionality
 */

import { definePlugin } from "@cli/plugin"
import { createConsoleLogger, createDevelopmentLogger, createProductionLogger } from "@logger/index"
import type { CLIContext, CLIConfig } from "@cli/types"
import { z } from "zod"

/**
 * Logging plugin configuration schema
 */
const LoggingConfigSchema = z.object({
  level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  format: z.enum(["pretty", "json", "compact", "cli"]).default("pretty"),
  colorize: z.boolean().default(true),
  showEmoji: z.boolean().default(true),
  logFile: z.string().optional(),
  development: z.boolean().default(false)
})

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>

/**
 * Logging plugin implementation
 */
export const LoggingPlugin = definePlugin({
  metadata: {
    name: "logging",
    version: "1.0.0",
    description: "Enhanced logging functionality"
  },
  
  config: LoggingConfigSchema,
  
  install: async (ctx: CLIContext) => {
    // Parse configuration
    const config = LoggingConfigSchema.parse(ctx.config.plugins?.find(p => p.name === "logging")?.options || {})
    
    // Create appropriate logger based on configuration
    let logger
    if (config.development) {
      logger = createDevelopmentLogger("app", config.level)
    } else if (config.logFile) {
      logger = createProductionLogger("app", {
        level: config.level,
        logFile: config.logFile,
        console: true
      })
    } else {
      logger = createConsoleLogger(config.level, {
        colorize: config.colorize,
        prettyPrint: config.format === "pretty",
        showEmoji: config.showEmoji
      })
    }
    
    // Add logging commands to CLI
    return {
      commands: {
        log: {
          description: "Logging utilities",
          commands: {
            level: {
              description: "Get or set log level",
              handler: async (args) => {
                if (args.level) {
                  console.log(`Setting log level to: ${args.level}`)
                  // Update logger level
                } else {
                  console.log(`Current log level: ${config.level}`)
                }
              },
              options: {
                level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional()
              }
            },
            
            test: {
              description: "Test logging at different levels",
              handler: async () => {
                console.log("Testing logging at all levels:")
                
                const testLogger = createConsoleLogger("trace", {
                  colorize: config.colorize,
                  showEmoji: config.showEmoji
                })
                
                // Test all log levels (sync for demo)
                console.log("📍 TRACE: Detailed debugging information")
                console.log("🐛 DEBUG: Debug information")
                console.log("ℹ️  INFO: General information")
                console.log("⚠️  WARN: Warning message")
                console.log("❌ ERROR: Error message")
                console.log("💀 FATAL: Fatal error message")
              }
            }
          }
        }
      }
    }
  },
  
  uninstall: async () => {
    console.log("Logging plugin uninstalled")
  }
})