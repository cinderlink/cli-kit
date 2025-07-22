#!/usr/bin/env bun

/**
 * TUIX Command Line Tool
 * 
 * Main binary for TUIX framework utilities
 * Dogfoods the CLI framework with JSX components
 */

import { defineConfig, runCLI } from "../src/cli/index"
import { z } from "zod"

// Define the CLI configuration
const cliConfig = defineConfig({
  name: "tuix",
  version: "1.0.0-rc.3",
  description: "🎨 A performant TUI framework for Bun",
  
  commands: {
    dev: {
      description: "Development environment management",
      commands: {
        start: {
          description: "Start development services",
          options: {
            services: z.string().optional().describe("Comma-separated list of services (typecheck,test-watch,lint,build)"),
            coverage: z.boolean().optional().describe("Enable test coverage"),
            interactive: z.boolean().optional().describe("Start interactive monitor after starting services"),
            timeout: z.number().optional().describe("Auto-stop watchers after specified seconds")
          },
          handler: () => import("../src/cli/commands/dev/start")
        },
        stop: {
          description: "Stop all development services",
          handler: () => import("../src/cli/commands/dev/stop")
        },
        status: {
          description: "Show development services status",
          handler: () => import("../src/cli/commands/dev/status")
        }
      },
      handler: () => import("../src/cli/commands/dev/start") // Default to start
    },
    
    pm: {
      description: "Process manager commands",
      aliases: ["process"],
      commands: {
        start: {
          description: "Start a service",
          args: {
            service: z.string().describe("Service name")
          },
          options: {
            preset: z.string().optional().describe("Service preset (vitest, vite, tsc, eslint, bun)")
          },
          handler: () => import("../src/cli/commands/pm/start")
        },
        stop: {
          description: "Stop a service",
          args: {
            service: z.string().describe("Service name")
          },
          options: {
            force: z.boolean().optional().describe("Force stop")
          },
          handler: () => import("../src/cli/commands/pm/stop")
        },
        restart: {
          description: "Restart a service",
          args: {
            service: z.string().describe("Service name")
          },
          handler: () => import("../src/cli/commands/pm/restart")
        },
        status: {
          description: "Show process status",
          args: {
            service: z.string().optional().describe("Service name (optional)")
          },
          options: {
            watch: z.boolean().optional().describe("Watch mode with interactive TUI")
          },
          handler: () => import("../src/cli/commands/pm/status")
        },
        logs: {
          description: "View service logs",
          args: {
            service: z.string().describe("Service name")
          },
          options: {
            lines: z.number().optional().describe("Number of lines to show"),
            follow: z.boolean().optional().describe("Follow log output"),
            timeout: z.number().optional().describe("Auto-stop after seconds")
          },
          handler: () => import("../src/cli/commands/pm/logs")
        },
        groups: {
          description: "Manage process groups",
          args: {
            action: z.string().optional().describe("Action (start, stop)"),
            name: z.string().optional().describe("Group name")
          },
          handler: () => import("../src/cli/commands/pm/groups")
        }
      },
      options: {
        timeout: z.number().optional().describe("Auto-stop watchers after specified seconds (for AI assistants)")
      }
    },
    
    logs: {
      description: "View service logs",
      aliases: ["log"],
      args: {
        service: z.string().describe("Service name or log file")
      },
      options: {
        interactive: z.boolean().optional().describe("Interactive log explorer"),
        tail: z.boolean().optional().describe("Follow log output"),
        filter: z.string().optional().describe("Filter logs by pattern/regex"),
        preset: z.string().optional().describe("Format preset (vitest, vite, tsc, eslint)"),
        timeout: z.number().optional().describe("Auto-stop after seconds"),
        merge: z.string().optional().describe("Merge logs from multiple services (comma-separated)"),
        wait: z.boolean().optional().describe("Wait for specific event"),
        until: z.string().optional().describe("Event pattern to wait for")
      },
      handler: () => import("../src/cli/commands/logs")
    },
    
    screenshot: {
      description: "Screenshot management",
      aliases: ["ss"],
      commands: {
        list: {
          description: "List saved screenshots",
          aliases: ["ls"],
          options: {
            long: z.boolean().optional().describe("Detailed view")
          },
          handler: () => import("../src/cli/commands/screenshot/list")
        },
        quick: {
          description: "Quick screenshot capture",
          aliases: ["q"],
          args: {
            command: z.string().describe("Command to capture")
          },
          options: {
            name: z.string().optional().describe("Screenshot name"),
            description: z.string().optional().describe("Description"),
            pty: z.boolean().optional().describe("Use PTY mode"),
            duration: z.number().optional().describe("Capture duration (ms)")
          },
          handler: () => import("../src/cli/commands/screenshot/quick")
        },
        create: {
          description: "Create a new screenshot",
          aliases: ["new"],
          args: {
            name: z.string().describe("Screenshot name")
          },
          options: {
            command: z.string().describe("Command to capture"),
            description: z.string().optional().describe("Description"),
            show: z.boolean().optional().describe("Show preview after capture"),
            pty: z.boolean().optional().describe("Use PTY mode"),
            duration: z.number().optional().describe("Capture duration (ms)"),
            raw: z.boolean().optional().describe("Include raw ANSI codes")
          },
          handler: () => import("../src/cli/commands/screenshot/create")
        },
        show: {
          description: "Display a screenshot",
          aliases: ["view"],
          args: {
            name: z.string().describe("Screenshot name")
          },
          options: {
            metadata: z.boolean().optional().describe("Show metadata"),
            tree: z.boolean().optional().describe("Show component tree"),
            raw: z.boolean().optional().describe("Raw output without colors")
          },
          handler: () => import("../src/cli/commands/screenshot/show")
        },
        delete: {
          description: "Delete a screenshot",
          aliases: ["rm"],
          args: {
            name: z.string().describe("Screenshot name")
          },
          options: {
            force: z.boolean().optional().describe("Skip confirmation")
          },
          handler: () => import("../src/cli/commands/screenshot/delete")
        },
        export: {
          description: "Export a screenshot",
          args: {
            name: z.string().describe("Screenshot name"),
            output: z.string().describe("Output file path")
          },
          options: {
            format: z.enum(["json", "text", "ansi"]).optional().describe("Export format")
          },
          handler: () => import("../src/cli/commands/screenshot/export")
        },
        multi: {
          description: "Batch screenshot capture",
          aliases: ["batch"],
          options: {
            file: z.string().optional().describe("JSON file with commands"),
            examples: z.boolean().optional().describe("Use built-in examples"),
            prefix: z.string().optional().describe("Name prefix for screenshots"),
            show: z.boolean().optional().describe("Show previews")
          },
          handler: () => import("../src/cli/commands/screenshot/multi")
        }
      }
    },
    
    docs: {
      description: "View framework documentation",
      aliases: ["doc", "documentation"],
      args: {
        file: z.string().optional().describe("Documentation file (default: README.md)")
      },
      options: {
        path: z.string().optional().describe("Custom docs directory")
      },
      handler: () => import("../src/cli/commands/docs")
    },
    
    init: {
      description: "Create new TUIX project",
      aliases: ["create"],
      args: {
        name: z.string().optional().describe("Project name")
      },
      options: {
        template: z.enum(["jsx", "basic", "cli"]).optional().describe("Project template"),
        jsx: z.boolean().optional().describe("Enable JSX (default: true)"),
        force: z.boolean().optional().describe("Force creation in existing directory"),
        "skip-health": z.boolean().optional().describe("Skip environment health check")
      },
      handler: () => import("../src/cli/commands/init")
    },
    
    doctor: {
      description: "Health checks and diagnostics",
      aliases: ["health"],
      commands: {
        check: {
          description: "Run full diagnostics",
          aliases: ["status"],
          options: {
            verbose: z.boolean().optional().describe("Show detailed information"),
            all: z.boolean().optional().describe("Include all checks even outside project")
          },
          handler: () => import("../src/cli/commands/doctor/check")
        },
        fix: {
          description: "Apply automatic fixes",
          args: {
            check: z.string().describe("Check name to fix")
          },
          handler: () => import("../src/cli/commands/doctor/fix")
        },
        env: {
          description: "Check environment health",
          aliases: ["environment"],
          handler: () => import("../src/cli/commands/doctor/env")
        },
        project: {
          description: "Check project health",
          handler: () => import("../src/cli/commands/doctor/project")
        },
        detect: {
          description: "Detect project type and configuration",
          handler: () => import("../src/cli/commands/doctor/detect")
        }
      },
      handler: () => import("../src/cli/commands/doctor/check") // Default to check
    }
  }
})

// Run the CLI with automatic help generation, validation, and error handling
runCLI(cliConfig).catch((error) => {
  console.error(`❌ Error: ${error.message || error}`)
  process.exit(1)
})