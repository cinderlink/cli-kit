#!/usr/bin/env bun

/**
 * TUIX Command Line Tool
 * 
 * Main binary for TUIX framework utilities
 */

import { Effect } from "effect"
import { runApp } from "../src/core/runtime"
import { Screenshot, formatScreenshot } from "../src/screenshot/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { showHelpSimple } from "./cli-kit-help-simple.ts"
import { ProcessManager as ProcessManagerClass } from "../src/process-manager/manager.ts"
import { ProcessMonitor } from "../src/process-manager/index.ts"
import { createConsoleLogger, createDevelopmentLogger, LogExplorer } from "../src/logger/index.ts"
import { TUITransport } from "../src/logger/transports.ts"
// // import { MarkdownRenderer } from "../src/components/MarkdownRenderer.ts"
import * as fs from "fs/promises"
import * as path from "path"

// =============================================================================
// Argument Parsing
// =============================================================================

interface ParsedArgs {
  command?: string
  subcommand?: string
  args: string[]
  options: Record<string, string | boolean>
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    args: [],
    options: {}
  }
  
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    
    if (arg.startsWith('--')) {
      // Long option
      const key = arg.slice(2)
      const nextArg = argv[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        result.options[key] = nextArg
        i += 2
      } else {
        result.options[key] = true
        i++
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short option(s)
      const flags = arg.slice(1).split('')
      for (const flag of flags) {
        result.options[flag] = true
      }
      i++
    } else {
      // Regular argument
      if (!result.command) {
        result.command = arg
      } else if (!result.subcommand) {
        result.subcommand = arg
      } else {
        result.args.push(arg)
      }
      i++
    }
  }
  
  return result
}

// =============================================================================
// Process Manager Commands  
// =============================================================================

async function handleProcessManager(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  if (!subcommand) {
    console.error("Error: Process manager subcommand required")
    console.log("Usage: tuix pm <start|stop|restart|status|logs|groups> [options]")
    console.log("\nOptions:")
    console.log("  --timeout <seconds>  Auto-stop watchers after specified seconds (for AI assistants)")
    process.exit(1)
  }

  // Create logger for process manager
  const logger = createConsoleLogger("info", { 
    colorize: true, 
    prettyPrint: true, 
    showEmoji: true 
  })

  // Create process manager instance
  const pm = new ProcessManagerClass({
    logger: logger.child("process-manager"),
    logDir: "./logs",
    autoSave: true
  })

  await pm.init()

  switch (subcommand) {
    case 'start':
      if (args.length === 0) {
        console.error("Error: Service name required")
        console.log("Usage: tuix pm start <service> [--preset <preset>]")
        process.exit(1)
      }
      await startService(pm, args[0], options)
      break

    case 'stop':
      if (args.length === 0) {
        console.error("Error: Service name required") 
        console.log("Usage: tuix pm stop <service> [--force]")
        process.exit(1)
      }
      await stopService(pm, args[0], options)
      break

    case 'restart':
      if (args.length === 0) {
        console.error("Error: Service name required")
        console.log("Usage: tuix pm restart <service>")
        process.exit(1)
      }
      await restartService(pm, args[0], options)
      break

    case 'status':
      if (options.watch || options.w) {
        // Use interactive TUI component
        await showInteractiveStatus(pm, args[0], options)
      } else {
        // Use simple text output
        await showStatus(pm, args[0], options)
      }
      break

    case 'logs':
      if (args.length === 0) {
        console.error("Error: Service name required")
        console.log("Usage: tuix pm logs <service> [--lines <n>] [--follow] [--timeout <s>]")
        process.exit(1)
      }
      await showServiceLogs(pm, args[0], options)
      break

    case 'groups':
      await handleGroups(pm, args[0], args.slice(1), options)
      break

    default:
      console.error(`Unknown process manager command: ${subcommand}`)
      console.log("Available commands: start, stop, restart, status, logs, groups")
      process.exit(1)
  }
}

async function startService(pm: ProcessManagerClass, serviceName: string, options: Record<string, string | boolean>) {
  try {
    // Check if service already exists
    const existing = pm.list().find(p => p.name === serviceName)
    
    if (!existing) {
      // Create service with preset or default configuration
      const preset = options.preset || options.p
      const config = await getServiceConfig(serviceName, preset as string)
      await pm.add(config)
    }
    
    await pm.start(serviceName)
    console.log(`✅ Started service: ${serviceName}`)
  } catch (error) {
    console.error(`❌ Failed to start ${serviceName}: ${error}`)
    process.exit(1)
  }
}

async function stopService(pm: ProcessManagerClass, serviceName: string, options: Record<string, string | boolean>) {
  try {
    await pm.stop(serviceName)
    console.log(`✅ Stopped service: ${serviceName}`)
  } catch (error) {
    console.error(`❌ Failed to stop ${serviceName}: ${error}`)
    process.exit(1)
  }
}

async function restartService(pm: ProcessManagerClass, serviceName: string, options: Record<string, string | boolean>) {
  try {
    await pm.restart(serviceName)
    console.log(`✅ Restarted service: ${serviceName}`)
  } catch (error) {
    console.error(`❌ Failed to restart ${serviceName}: ${error}`)
    process.exit(1)
  }
}

async function showInteractiveStatus(pm: ProcessManagerClass, serviceName: string | undefined, options: Record<string, string | boolean>) {
  try {
    // Parse timeout option
    const timeoutSeconds = parseInt(options.timeout as string || '0')
    const timeoutMessage = timeoutSeconds > 0 ? ` for ${timeoutSeconds}s` : ' (press \'q\' to quit)'
    
    console.log(`📊 Monitoring processes${timeoutMessage}...`)
    console.log()

    // Create a proper component that wraps the ProcessMonitor view
    const component = {
      init: Effect.succeed([{}, []] as const),
      update: () => Effect.succeed([{}, []] as const),
      view: () => ProcessMonitor({ 
        manager: pm, 
        showLogs: true, 
        showStats: true,
        refreshInterval: 1000 
      }),
      subscription: () => Effect.succeed([])
    }
    
    // Set up timeout if specified
    let timeoutHandle: NodeJS.Timeout | null = null
    const appPromise = Effect.runPromise(
      runApp(component).pipe(
        Effect.provide(LiveServices),
        Effect.catchAll(() => Effect.void),
        Effect.orDie
      )
    )

    if (timeoutSeconds > 0) {
      timeoutHandle = setTimeout(() => {
        console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), stopping monitor`)
        process.exit(0)
      }, timeoutSeconds * 1000)

      // Race between timeout and normal completion
      await Promise.race([
        appPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutSeconds * 1000))
      ]).catch(() => {
        // Timeout reached
        if (timeoutHandle) clearTimeout(timeoutHandle)
        console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), stopped monitoring`)
        process.exit(0)
      })
    } else {
      await appPromise
    }

    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  } catch (error) {
    console.error(`❌ Failed to show interactive status: ${error}`)
    // Fallback to simple status
    await showStatus(pm, serviceName, options)
  }
}

async function showStatus(pm: ProcessManagerClass, serviceName: string | undefined, options: Record<string, string | boolean>) {
  const processes = serviceName ? [pm.status(serviceName) as any] : pm.list()
  
  console.log("\n📊 Process Status:\n")
  
  for (const proc of processes) {
    const status = proc.status === "running" ? "🟢" : 
                  proc.status === "stopped" ? "⚪" : 
                  proc.status === "error" ? "🔴" : "🟡"
    
    const uptime = proc.startTime ? 
      `${Math.floor((Date.now() - proc.startTime.getTime()) / 1000)}s` : "-"
    
    console.log(`${status} ${proc.name.padEnd(15)} ${proc.status.padEnd(8)} PID:${(proc.pid || "-").toString().padEnd(8)} Uptime:${uptime.padEnd(8)} Restarts:${proc.restarts}`)
  }
  
  console.log()
}

async function showServiceLogs(pm: ProcessManagerClass, serviceName: string, options: Record<string, string | boolean>) {
  try {
    const lines = typeof options.lines === "string" ? parseInt(options.lines) : 
                  typeof options.n === "string" ? parseInt(options.n) : 50
    
    const logs = pm.getLogs(serviceName, lines)
    
    console.log(`\n📝 Logs for ${serviceName} (last ${lines} lines):\n`)
    
    logs.forEach(log => {
      const timestamp = log.timestamp.toLocaleTimeString()
      const level = log.level.toUpperCase().padEnd(5)
      const color = log.level === "error" ? "\x1b[31m" : 
                   log.level === "warn" ? "\x1b[33m" : 
                   log.level === "debug" ? "\x1b[36m" : "\x1b[37m"
      
      console.log(`${timestamp} ${color}${level}\x1b[0m ${log.message}`)
    })
    
    if (options.follow || options.f) {
      // Parse timeout option
      const timeoutSeconds = parseInt(options.timeout as string || '0')
      const timeoutMessage = timeoutSeconds > 0 ? ` for ${timeoutSeconds}s` : ' (Ctrl+C to stop)'
      
      console.log(`\nFollowing logs${timeoutMessage}...`)
      const unsubscribe = pm.tailLogs(serviceName, (log) => {
        const timestamp = log.timestamp.toLocaleTimeString()
        const level = log.level.toUpperCase().padEnd(5)
        const color = log.level === "error" ? "\x1b[31m" : 
                     log.level === "warn" ? "\x1b[33m" : 
                     log.level === "debug" ? "\x1b[36m" : "\x1b[37m"
        
        console.log(`${timestamp} ${color}${level}\x1b[0m ${log.message}`)
      })
      
      // Set up timeout if specified
      let timeoutHandle: NodeJS.Timeout | null = null
      if (timeoutSeconds > 0) {
        timeoutHandle = setTimeout(() => {
          unsubscribe()
          console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), stopped following logs`)
          process.exit(0)
        }, timeoutSeconds * 1000)
      }
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        if (timeoutHandle) clearTimeout(timeoutHandle)
        unsubscribe()
        console.log("\nStopped following logs")
        process.exit(0)
      })
    }
  } catch (error) {
    console.error(`❌ Failed to get logs for ${serviceName}: ${error}`)
    process.exit(1)
  }
}

async function handleGroups(pm: ProcessManagerClass, action: string | undefined, args: string[], options: Record<string, string | boolean>) {
  if (!action) {
    // List groups
    const groups = pm.getGroups()
    console.log("\n📁 Process Groups:\n")
    
    if (groups.length === 0) {
      console.log("No groups defined")
    } else {
      groups.forEach(group => {
        console.log(`📁 ${group.name}: [${group.processes.join(", ")}]`)
      })
    }
    console.log()
    return
  }
  
  switch (action) {
    case 'start':
      if (args.length === 0) {
        console.error("Error: Group name required")
        process.exit(1)
      }
      await pm.startGroup(args[0])
      console.log(`✅ Started group: ${args[0]}`)
      break
      
    case 'stop':
      if (args.length === 0) {
        console.error("Error: Group name required")
        process.exit(1)
      }
      await pm.stopGroup(args[0])
      console.log(`✅ Stopped group: ${args[0]}`)
      break
      
    default:
      console.error(`Unknown group action: ${action}`)
      console.log("Available actions: start, stop")
      process.exit(1)
  }
}

async function getServiceConfig(serviceName: string, preset?: string) {
  // Service presets for common development tools
  const presets: Record<string, any> = {
    vitest: {
      name: serviceName,
      command: "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "vitest",
      healthCheck: {
        pattern: "Test Files|PASS|FAIL",
        timeout: 10000
      }
    },
    vite: {
      name: serviceName,
      command: "bun run dev",
      autorestart: true,
      group: "build",
      logPreset: "vite",
      healthCheck: {
        pattern: "Local:|ready in|build started",
        timeout: 15000
      }
    },
    tsc: {
      name: serviceName,
      command: "bun run typecheck --watch",
      autorestart: false,
      group: "quality",
      logPreset: "tsc",
      healthCheck: {
        pattern: "Found \\d+ errors|No errors found",
        timeout: 10000
      }
    },
    eslint: {
      name: serviceName,
      command: "bun run lint --watch",
      autorestart: false,
      group: "quality",
      logPreset: "eslint",
      healthCheck: {
        pattern: "✓|✗|problems?",
        timeout: 8000
      }
    },
    bun: {
      name: serviceName,
      command: "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "bun",
      healthCheck: {
        pattern: "pass|fail|\\d+ test",
        timeout: 8000
      }
    }
  }
  
  if (preset && presets[preset]) {
    return presets[preset]
  }
  
  // Default configuration
  return {
    name: serviceName,
    command: serviceName, // Assume the service name is the command
    autorestart: false,
    logPreset: "default"
  }
}

// =============================================================================
// Logs Commands
// =============================================================================

async function handleLogs(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  if (!args.length) {
    console.error("Error: Service name or log file required")
    console.log("Usage: tuix logs <service|file> [--interactive] [--tail] [--filter <pattern>] [--preset <name>] [--timeout <s>] [--merge <services>] [--wait] [--until <event>]")
    console.log("\nOptions:")
    console.log("  --timeout <seconds>  Auto-stop watchers after specified seconds (for AI assistants)")
    console.log("  --filter <pattern>   Filter logs by pattern/regex")
    console.log("  --preset <name>      Use predefined format preset (vitest, vite, tsc, eslint)")
    console.log("  --merge <services>   Merge logs from multiple services (comma-separated)")
    console.log("  --wait --until <event>  Wait for specific event pattern")
    process.exit(1)
  }

  const serviceName = args[0]
  
  // Handle merge logs from multiple services
  if (options.merge) {
    const services = (options.merge as string).split(",").map(s => s.trim())
    await showMergedLogs(services, options)
    return
  }
  
  // Handle wait for event
  if (options.wait && options.until) {
    await waitForEvent(serviceName, options.until as string, options)
    return
  }
  
  if (options.tail || options.t) {
    await showTailLogs(serviceName, options)
    return
  }
  
  if (options.interactive || options.i) {
    // Use interactive LogExplorer component
    await showInteractiveLogs(serviceName, options)
  } else {
    // Simple log output with filtering support
    const logger = createConsoleLogger("info", { colorize: true })
    const pm = new ProcessManagerClass({
      logger: logger.child("logs"),
      logDir: "./logs"
    })

    await pm.init()
    
    // Check if it's a service
    const processes = pm.list()
    const service = processes.find(p => p.name === serviceName)
    
    if (service) {
      await showServiceLogs(pm, serviceName, options)
    } else {
      // Assume it's a log file
      await showLogFile(serviceName, options)
    }
  }
}

async function showInteractiveLogs(serviceName: string, options: Record<string, string | boolean>) {
  try {
    // Parse timeout option
    const timeoutSeconds = parseInt(options.timeout as string || '0')
    const timeoutMessage = timeoutSeconds > 0 ? ` for ${timeoutSeconds}s` : ' (press \'q\' to quit)'
    
    console.log(`📝 Interactive log explorer for ${serviceName}${timeoutMessage}...`)
    console.log()

    // Create TUI transport to capture logs
    const tuiTransport = new TUITransport()
    
    // Create logger with TUI transport
    const logger = createConsoleLogger("info", { colorize: true })
    
    // Check if it's a service or log file
    const pm = new ProcessManagerClass({
      logger: logger.child("logs"),
      logDir: "./logs"
    })
    await pm.init()
    
    const processes = pm.list()
    const service = processes.find(p => p.name === serviceName)
    
    let entries: any[] = []
    
    if (service) {
      // Convert service logs to interactive entries
      const logs = pm.getLogs(serviceName, 1000)
      entries = logs.map((log, i) => ({
        id: `${serviceName}-${i}`,
        expanded: false,
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        metadata: { source: log.source },
        context: [serviceName]
      }))
    } else {
      // Try to parse as log file
      entries = await parseLogFileToEntries(serviceName)
    }
    
    // Create the LogExplorer component wrapped in a proper component structure
    const component = {
      init: Effect.succeed([{}, []] as const),
      update: () => Effect.succeed([{}, []] as const),
      view: () => LogExplorer({ 
        entries,
        showSearch: true,
        showFilters: true,
        maxEntries: 1000
      }),
      subscription: () => Effect.succeed([])
    }
    
    // Set up timeout if specified
    let timeoutHandle: NodeJS.Timeout | null = null
    const appPromise = Effect.runPromise(
      runApp(component).pipe(
        Effect.provide(LiveServices),
        Effect.catchAll(() => Effect.void),
        Effect.orDie
      )
    )

    if (timeoutSeconds > 0) {
      timeoutHandle = setTimeout(() => {
        console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), closing log explorer`)
        process.exit(0)
      }, timeoutSeconds * 1000)

      // Race between timeout and normal completion
      await Promise.race([
        appPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutSeconds * 1000))
      ]).catch(() => {
        // Timeout reached
        if (timeoutHandle) clearTimeout(timeoutHandle)
        console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), closed log explorer`)
        process.exit(0)
      })
    } else {
      await appPromise
    }

    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  } catch (error) {
    console.error(`❌ Failed to show interactive logs: ${error}`)
    // Fallback to simple log viewing
    await showLogFile(serviceName, options)
  }
}

async function showTailLogs(serviceName: string, options: Record<string, string | boolean>) {
  const logger = createConsoleLogger("info", { 
    colorize: true, 
    prettyPrint: true, 
    showEmoji: true 
  })

  const pm = new ProcessManagerClass({
    logger: logger.child("logs"),
    logDir: "./logs",
    autoSave: true
  })

  await pm.init()

  const processes = pm.list()
  const service = processes.find(p => p.name === serviceName)
  
  if (!service) {
    console.error(`❌ Service ${serviceName} not found`)
    process.exit(1)
  }

  // Parse timeout option
  const timeoutSeconds = parseInt(options.timeout as string || '0')
  const timeoutMessage = timeoutSeconds > 0 ? ` for ${timeoutSeconds}s` : ' (Ctrl+C to stop)'
  
  console.log(`📡 Following logs for ${serviceName}${timeoutMessage}...`)
  console.log()

  // Show recent logs first
  const recentLogs = pm.getLogs(serviceName, 10)
  recentLogs.forEach(log => {
    printFormattedLog(log, serviceName, options)
  })

  // Set up real-time log following
  let lastLogCount = recentLogs.length
  
  const followInterval = setInterval(() => {
    const currentLogs = pm.getLogs(serviceName)
    if (currentLogs.length > lastLogCount) {
      // Show new logs
      const newLogs = currentLogs.slice(lastLogCount)
      newLogs.forEach(log => {
        printFormattedLog(log, serviceName, options)
      })
      lastLogCount = currentLogs.length
    }
  }, 500) // Check every 500ms for new logs

  // Set up timeout if specified
  let timeoutHandle: NodeJS.Timeout | null = null
  if (timeoutSeconds > 0) {
    timeoutHandle = setTimeout(() => {
      clearInterval(followInterval)
      console.log(`\n⏰ Timeout reached (${timeoutSeconds}s), stopped following logs`)
      process.exit(0)
    }, timeoutSeconds * 1000)
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(followInterval)
    if (timeoutHandle) clearTimeout(timeoutHandle)
    console.log('\n👋 Stopped following logs')
    process.exit(0)
  })

  // Keep the process alive (until timeout or Ctrl+C)
  if (timeoutSeconds > 0) {
    await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000))
  } else {
    await new Promise(() => {}) // Never resolves, keeps following until Ctrl+C
  }
}

// Log format presets for different tools
const LOG_PRESETS: Record<string, any> = {
  vitest: {
    name: "vitest",
    patterns: {
      start: /Test Files.*Reporting/,
      stop: /Tests completed in/,
      error: /FAIL|ERROR|×/,
      warning: /WARN|⚠/,
      success: /PASS|✓|All tests passed/,
      coverage: /Coverage report/
    },
    colors: {
      error: "\x1b[31m",    // Red
      warning: "\x1b[33m",  // Yellow
      success: "\x1b[32m",  // Green
      info: "\x1b[36m"      // Cyan
    }
  },
  vite: {
    name: "vite",
    patterns: {
      start: /vite.*dev server running/,
      stop: /build completed/,
      error: /ERROR|✘/,
      warning: /WARNING|⚠/,
      success: /ready in|✓/,
      hmr: /hmr update/
    },
    colors: {
      error: "\x1b[31m",
      warning: "\x1b[33m", 
      success: "\x1b[32m",
      info: "\x1b[35m"      // Magenta
    }
  },
  tsc: {
    name: "tsc",
    patterns: {
      start: /Starting compilation/,
      stop: /Found \d+ errors|No errors found/,
      error: /error TS\d+|✘/,
      warning: /warning TS\d+/,
      success: /✓.*No errors/
    },
    colors: {
      error: "\x1b[31m",
      warning: "\x1b[33m",
      success: "\x1b[32m",
      info: "\x1b[34m"      // Blue
    }
  },
  eslint: {
    name: "eslint",
    patterns: {
      start: /Linting/,
      stop: /✓.*no problems|✗.*problems?/,
      error: /error|✗/,
      warning: /warning|⚠/,
      success: /✓.*no problems/
    },
    colors: {
      error: "\x1b[31m",
      warning: "\x1b[33m",
      success: "\x1b[32m",
      info: "\x1b[37m"
    }
  },
  bun: {
    name: "bun",
    patterns: {
      start: /\d+ tests? across/,
      stop: /\d+ pass|FAIL/,
      error: /FAIL|✗/,
      warning: /WARN/,
      success: /pass|✓/
    },
    colors: {
      error: "\x1b[31m",
      warning: "\x1b[33m",
      success: "\x1b[32m",
      info: "\x1b[37m"
    }
  },
  default: {
    name: "default",
    patterns: {},
    colors: {
      error: "\x1b[31m",
      warning: "\x1b[33m",
      success: "\x1b[32m",
      info: "\x1b[37m"
    }
  }
}

function printFormattedLog(log: any, serviceName: string, options: Record<string, string | boolean>) {
  const timestamp = log.timestamp.toLocaleTimeString()
  const level = log.level.toUpperCase().padEnd(5)
  
  // Get preset for formatting
  const presetName = options.preset as string || "default"
  const preset = LOG_PRESETS[presetName] || LOG_PRESETS.default
  
  // Apply filter if specified (now supports regex)
  const filterPattern = options.filter as string
  if (filterPattern) {
    try {
      const regex = new RegExp(filterPattern, 'i')
      if (!regex.test(log.message)) {
        return // Skip logs that don't match filter
      }
    } catch (error) {
      // Fallback to simple string match if regex is invalid
      if (!log.message.includes(filterPattern)) {
        return
      }
    }
  }
  
  // Determine color based on preset patterns
  let color = preset.colors.info
  if (preset.patterns.error?.test(log.message)) {
    color = preset.colors.error
  } else if (preset.patterns.warning?.test(log.message)) {
    color = preset.colors.warning
  } else if (preset.patterns.success?.test(log.message)) {
    color = preset.colors.success
  } else if (log.level === "error") {
    color = preset.colors.error
  } else if (log.level === "warn") {
    color = preset.colors.warning
  }
  
  console.log(`${timestamp} ${color}${level}\x1b[0m [${serviceName}] ${log.message}`)
}

async function parseLogFileToEntries(filePath: string): Promise<any[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    return lines.map((line, i) => {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(line)
        return {
          id: `file-${i}`,
          expanded: false,
          level: parsed.level || "info",
          message: parsed.message || parsed.msg || line,
          timestamp: new Date(parsed.timestamp || parsed.time || Date.now()),
          metadata: parsed,
          context: [path.basename(filePath)]
        }
      } catch {
        // Parse as plain text with basic pattern matching
        const match = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(\w+)\s+(.*)$/)
        if (match) {
          return {
            id: `file-${i}`,
            expanded: false,
            level: (match[2]?.toLowerCase() || "info") as any,
            message: match[3] || line,
            timestamp: new Date(match[1]),
            metadata: { raw: line },
            context: [path.basename(filePath)]
          }
        } else {
          return {
            id: `file-${i}`,
            expanded: false,
            level: "info" as any,
            message: line,
            timestamp: new Date(),
            metadata: { raw: line },
            context: [path.basename(filePath)]
          }
        }
      }
    })
  } catch (error) {
    throw new Error(`Failed to read log file ${filePath}: ${error}`)
  }
}

async function showLogFile(filePath: string, options: Record<string, string | boolean>) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n')
    
    const lineCount = typeof options.lines === "string" ? parseInt(options.lines) : 
                     typeof options.n === "string" ? parseInt(options.n) : 50
    
    let displayLines = lines.slice(-lineCount)
    
    // Apply filter if specified
    const filterPattern = options.filter as string
    if (filterPattern) {
      const regex = new RegExp(filterPattern, 'i')
      displayLines = displayLines.filter(line => regex.test(line))
    }
    
    console.log(`\n📝 Logs from ${filePath} (last ${lineCount} lines):\n`)
    displayLines.forEach(line => {
      if (line.trim()) {
        console.log(line)
      }
    })
    
    if (options.tail || options.follow || options.f) {
      console.log("\n🔄 Following file changes (Ctrl+C to stop)...")
      // TODO: Implement file watching
    }
  } catch (error) {
    console.error(`❌ Failed to read log file ${filePath}: ${error}`)
    process.exit(1)
  }
}

async function showMergedLogs(services: string[], options: Record<string, string | boolean>) {
  const logger = createConsoleLogger("info", { colorize: true })
  const pm = new ProcessManagerClass({
    logger: logger.child("logs"),
    logDir: "./logs"
  })

  await pm.init()
  
  console.log(`\n📝 Merged logs from services: ${services.join(", ")}\n`)
  
  // Collect logs from all services
  const allLogs: Array<{ service: string, log: any }> = []
  
  for (const serviceName of services) {
    const logs = pm.getLogs(serviceName, 100)
    for (const log of logs) {
      allLogs.push({ service: serviceName, log })
    }
  }
  
  // Sort by timestamp
  allLogs.sort((a, b) => a.log.timestamp.getTime() - b.log.timestamp.getTime())
  
  // Apply filter if specified
  const filterPattern = options.filter as string
  let filteredLogs = allLogs
  if (filterPattern) {
    const regex = new RegExp(filterPattern, 'i')
    filteredLogs = allLogs.filter(item => regex.test(item.log.message))
  }
  
  // Display logs with service names
  filteredLogs.forEach(({ service, log }) => {
    const timestamp = log.timestamp.toLocaleTimeString()
    const level = log.level.toUpperCase().padEnd(5)
    const color = log.level === "error" ? "\x1b[31m" : 
                 log.level === "warn" ? "\x1b[33m" : 
                 log.level === "debug" ? "\x1b[36m" : "\x1b[37m"
    
    console.log(`${timestamp} ${color}${level}\x1b[0m [${service}] ${log.message}`)
  })
}

async function waitForEvent(serviceName: string, eventPattern: string, options: Record<string, string | boolean>) {
  const logger = createConsoleLogger("info", { colorize: true })
  const pm = new ProcessManagerClass({
    logger: logger.child("logs"),
    logDir: "./logs"
  })

  await pm.init()
  
  const timeoutSeconds = parseInt(options.timeout as string || '30')
  console.log(`⏳ Waiting for event "${eventPattern}" in ${serviceName} (timeout: ${timeoutSeconds}s)...`)
  
  const regex = new RegExp(eventPattern, 'i')
  let found = false
  
  const unsubscribe = pm.tailLogs(serviceName, (log) => {
    if (regex.test(log.message)) {
      console.log(`✅ Event found: ${log.message}`)
      found = true
      unsubscribe()
      process.exit(0)
    }
  })
  
  // Set timeout
  setTimeout(() => {
    if (!found) {
      unsubscribe()
      console.log(`⏰ Timeout reached (${timeoutSeconds}s) - event "${eventPattern}" not found`)
      process.exit(1)
    }
  }, timeoutSeconds * 1000)
}

// =============================================================================
// Dev Commands
// =============================================================================

async function handleDev(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  if (!subcommand) {
    subcommand = "start"
  }
  
  switch (subcommand) {
    case 'start':
      await startDevEnvironment(options)
      break
      
    case 'stop':
      await stopDevEnvironment(options)
      break
      
    case 'status':
      await showDevStatus(options)
      break
      
    case 'help':
    case '--help':
      console.log("tuix dev - Development environment management")
      console.log("\nUsage:")
      console.log("  tuix dev [start|stop|status] [options]")
      console.log("\nCommands:")
      console.log("  start    Start development services (default)")
      console.log("  stop     Stop all development services") 
      console.log("  status   Show development services status")
      console.log("\nOptions:")
      console.log("  --services <list>    Comma-separated list of services (typecheck,test-watch,lint,build)")
      console.log("  --coverage, -c       Enable test coverage")
      console.log("  --interactive, -i    Start interactive monitor after starting services")
      console.log("  --timeout <seconds>  Auto-stop watchers after specified seconds")
      console.log("\nExamples:")
      console.log("  tuix dev                                    # Start typecheck and test-watch")
      console.log("  tuix dev --services typecheck,lint,build   # Start specific services")
      console.log("  tuix dev --coverage --interactive          # Start with coverage and monitoring")
      break
      
    default:
      console.error(`Unknown dev command: ${subcommand}`)
      console.log("Available commands: start, stop, status")
      console.log("Use 'tuix dev help' for detailed usage")
      process.exit(1)
  }
}

async function startDevEnvironment(options: Record<string, string | boolean>) {
  console.log("🚀 Starting development environment...")
  
  const logger = createConsoleLogger("info", { 
    colorize: true, 
    prettyPrint: true, 
    showEmoji: true 
  })

  const pm = new ProcessManagerClass({
    logger: logger.child("dev"),
    logDir: "./logs",
    autoSave: true
  })

  await pm.init()
  
  // Parse options for custom services
  const services = options.services ? 
    (options.services as string).split(',').map(s => s.trim()) :
    ['typecheck', 'test-watch']
  
  const coverage = options.coverage || options.c
  const interactive = options.interactive || options.i
  
  // Define development services with enhanced configurations
  const devServices: Record<string, any> = {
    typecheck: {
      name: "typecheck",
      command: "bun run tsc --noEmit --watch",
      autorestart: false,
      group: "quality",
      logPreset: "tsc",
      healthCheck: { pattern: "Found \\d+ errors|No errors found", timeout: 10000 }
    },
    "test-watch": {
      name: "test-watch", 
      command: coverage ? "bun test --watch --coverage" : "bun test --watch",
      autorestart: true,
      group: "testing",
      logPreset: "bun",
      healthCheck: { pattern: "\\d+ pass|\\d+ fail", timeout: 8000 }
    },
    lint: {
      name: "lint",
      command: "bun run lint --watch",
      autorestart: false,
      group: "quality",
      logPreset: "eslint",
      healthCheck: { pattern: "✓.*no problems|✗.*problems?", timeout: 8000 }
    },
    build: {
      name: "build",
      command: "bun run build --watch",
      autorestart: true,
      group: "build",
      logPreset: "vite",
      healthCheck: { pattern: "built in|build completed", timeout: 15000 }
    }
  }
  
  console.log(`📦 Services to start: ${services.join(", ")}`)
  
  // Add and start services with dependency management
  const startedServices: string[] = []
  for (const serviceName of services) {
    const serviceConfig = devServices[serviceName]
    if (!serviceConfig) {
      console.log(`⚠️  Unknown service: ${serviceName}, skipping...`)
      continue
    }
    
    const existing = pm.list().find(p => p.name === serviceName)
    if (!existing) {
      await pm.add(serviceConfig)
    }
    
    try {
      await pm.start(serviceName)
      startedServices.push(serviceName)
      console.log(`✅ Started ${serviceName}`)
      
      // Wait for health check if configured
      if (serviceConfig.healthCheck) {
        console.log(`🔍 Waiting for ${serviceName} to be ready...`)
        try {
          await waitForHealthCheck(pm, serviceName, serviceConfig.healthCheck)
          console.log(`🟢 ${serviceName} is ready`)
        } catch (error) {
          console.log(`🟡 ${serviceName} started but health check failed`)
        }
      }
    } catch (error) {
      console.log(`❌ Failed to start ${serviceName}: ${error}`)
    }
  }
  
  // Create development group
  if (startedServices.length > 0) {
    pm.createGroup({
      name: "development",
      processes: startedServices,
      startOrder: "parallel",
      stopOrder: "parallel"
    })
  }
  
  console.log("\n✨ Development environment started!")
  console.log(`📊 Started ${startedServices.length}/${services.length} services`)
  console.log("📊 Use 'tuix pm status --watch' for interactive monitoring")
  console.log("📝 Use 'tuix logs --merge " + startedServices.join(",") + "' for combined logs")
  console.log("⏹️  Use 'tuix dev stop' to stop all services")
  
  if (interactive) {
    console.log("\n🎛️  Starting interactive monitor...")
    // Start interactive monitoring
    await showInteractiveStatus(pm, undefined, options)
  }
}

async function waitForHealthCheck(pm: ProcessManagerClass, serviceName: string, healthCheck: { pattern: string, timeout: number }) {
  return new Promise<void>((resolve, reject) => {
    const regex = new RegExp(healthCheck.pattern, 'i')
    let found = false
    
    const unsubscribe = pm.tailLogs(serviceName, (log) => {
      if (regex.test(log.message)) {
        found = true
        unsubscribe()
        resolve()
      }
    })
    
    setTimeout(() => {
      if (!found) {
        unsubscribe()
        reject(new Error(`Health check timeout for ${serviceName}`))
      }
    }, healthCheck.timeout)
  })
}

async function stopDevEnvironment(options: Record<string, string | boolean>) {
  console.log("⏹️ Stopping development environment...")
  
  const logger = createConsoleLogger("info", { colorize: true })
  const pm = new ProcessManagerClass({
    logger: logger.child("dev"),
    logDir: "./logs"
  })

  await pm.init()
  await pm.stopAll()
  
  console.log("✅ Development environment stopped")
}

async function showDevStatus(options: Record<string, string | boolean>) {
  const logger = createConsoleLogger("info", { colorize: true })
  const pm = new ProcessManagerClass({
    logger: logger.child("dev"),
    logDir: "./logs"
  })

  await pm.init()
  
  const processes = pm.list()
  const stats = pm.stats()
  
  console.log("\n🔍 Development Environment Status\n")
  
  if (processes.length === 0) {
    console.log("No processes running. Use 'tuix dev start' to begin.")
    return
  }
  
  await showStatus(pm, undefined, options)
  
  console.log(`📊 System: ${(stats as any).processes.running} running, ${(stats as any).processes.stopped} stopped, ${(stats as any).processes.errored} errored`)
}

// =============================================================================
// Screenshot Commands
// =============================================================================

async function handleScreenshot(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  switch (subcommand) {
    case 'list':
    case 'ls':
      await listScreenshots(options)
      break
      
    case 'quick':
    case 'q':
      if (args.length === 0) {
        console.error("Error: Command required for quick screenshot")
        console.log("Usage: tuix screenshot quick <command>")
        process.exit(1)
      }
      await quickScreenshot(args.join(' '), options)
      break
      
    case 'create':
    case 'new':
      if (args.length === 0) {
        console.error("Error: Name required for screenshot")
        console.log("Usage: tuix screenshot create <name> --command <cmd>")
        process.exit(1)
      }
      await createScreenshot(args[0], options)
      break
      
    case 'show':
    case 'view':
      if (args.length === 0) {
        console.error("Error: Name required")
        console.log("Usage: tuix screenshot show <name>")
        process.exit(1)
      }
      await showScreenshot(args[0], options)
      break
      
    case 'delete':
    case 'rm':
      if (args.length === 0) {
        console.error("Error: Name required")
        console.log("Usage: cli-kit screenshot delete <name>")
        process.exit(1)
      }
      await deleteScreenshot(args[0], options)
      break
      
    case 'export':
      if (args.length < 2) {
        console.error("Error: Name and output file required")
        console.log("Usage: cli-kit screenshot export <name> <output>")
        process.exit(1)
      }
      await exportScreenshot(args[0], args[1], options)
      break
      
    case 'multi':
    case 'batch':
      await batchScreenshot(options)
      break
      
    default:
      console.error(`Unknown screenshot command: ${subcommand}`)
      console.log("Run 'cli-kit --help' for usage information")
      process.exit(1)
  }
}

async function listScreenshots(options: Record<string, string | boolean>) {
  const result = await Effect.runPromise(
    Screenshot.list().pipe(
      Effect.provide(LiveServices)
    )
  )
  
  if (result.length === 0) {
    console.log("No screenshots found.")
    console.log("Create one with: cli-kit screenshot create <name>")
    return
  }
  
  if (options.long || options.l) {
    // Detailed view
    result.forEach(info => {
      console.log(`📸 ${info.name}`)
      console.log(`   File: ${info.filename}`)
      console.log(`   Time: ${new Date(info.timestamp).toLocaleString()}`)
      if (info.description) console.log(`   Desc: ${info.description}`)
      if (info.app) console.log(`   App:  ${info.app}`)
      console.log(`   Size: ${(info.size / 1024).toFixed(1)} KB`)
      console.log()
    })
  } else {
    // Simple list
    const maxNameLen = Math.max(...result.map(s => s.name.length))
    result.forEach(info => {
      const time = new Date(info.timestamp).toLocaleString()
      console.log(`${info.name.padEnd(maxNameLen + 2)} ${time}`)
    })
  }
}

async function quickScreenshot(command: string, options: Record<string, string | boolean>) {
  const name = typeof options.name === 'string' ? options.name : 
               typeof options.n === 'string' ? options.n : 
               `quick-${Date.now()}`
  
  try {
    console.log(`📸 Quick capture: ${command}...`)
    
    const screenshotOptions = {
      name,
      description: typeof options.description === 'string' ? options.description :
                   typeof options.d === 'string' ? options.d :
                   `Quick capture: ${command}`
    }
    
    let result
    if (options.pty) {
      const parts = command.split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)
      
      result = await Effect.runPromise(
        Screenshot.capturePty(cmd, args, {
          ...screenshotOptions,
          duration: typeof options.duration === 'string' ? parseInt(options.duration) : 2000
        }).pipe(
          Effect.flatMap(screenshot => 
            Screenshot.save(screenshot).pipe(
              Effect.map(path => ({ screenshot, path }))
            )
          ),
          Effect.provide(LiveServices)
        )
      )
    } else {
      result = await Effect.runPromise(
        Screenshot.take(command, screenshotOptions).pipe(
          Effect.provide(LiveServices)
        )
      )
    }
    
    console.log(`✅ Saved as: ${name}`)
    
    // Always show preview for quick captures
    console.log("\n📺 Preview:")
    const formatted = formatScreenshot(result.screenshot, {
      showMetadata: false,
      showComponentTree: false,
      colorize: true
    })
    console.log(formatted)
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

async function createScreenshot(name: string, options: Record<string, string | boolean>) {
  try {
    const command = options.command || options.c
    if (!command || typeof command !== 'string') {
      console.error("Error: --command is required")
      console.log("Usage: cli-kit screenshot create <name> --command <cmd>")
      process.exit(1)
    }
    
    console.log(`📸 Capturing screenshot: ${name}...`)
    
    const screenshotOptions = {
      name,
      description: typeof options.description === 'string' ? options.description :
                   typeof options.d === 'string' ? options.d : undefined,
      includeRaw: !!options.raw
    }
    
    let result
    if (options.pty) {
      // Parse command and args
      const parts = command.split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)
      
      result = await Effect.runPromise(
        Screenshot.capturePty(cmd, args, {
          ...screenshotOptions,
          duration: typeof options.duration === 'string' ? parseInt(options.duration) : 2000
        }).pipe(
          Effect.flatMap(screenshot => 
            Screenshot.save(screenshot).pipe(
              Effect.map(path => ({ screenshot, path }))
            )
          ),
          Effect.provide(LiveServices)
        )
      )
    } else {
      result = await Effect.runPromise(
        Screenshot.take(command, screenshotOptions).pipe(
          Effect.provide(LiveServices)
        )
      )
    }
    
    console.log(`✅ Screenshot saved: ${result.path}`)
    console.log(`   Size: ${result.screenshot.metadata.dimensions.width}x${result.screenshot.metadata.dimensions.height}`)
    
    // Show screenshot if requested
    if (options.show || options.s) {
      console.log("\n📺 Preview:")
      const formatted = formatScreenshot(result.screenshot, {
        showMetadata: false,
        showComponentTree: false,
        colorize: true
      })
      console.log(formatted)
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

async function showScreenshot(name: string, options: Record<string, string | boolean>) {
  try {
    const screenshot = await Effect.runPromise(
      Screenshot.load(name).pipe(
        Effect.provide(LiveServices)
      )
    )
    
    const formatted = formatScreenshot(screenshot, {
      showMetadata: !!options.metadata || !!options.m,
      showComponentTree: !!options.tree || !!options.t,
      colorize: !options.raw && !options.r
    })
    
    console.log(formatted)
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

async function deleteScreenshot(name: string, options: Record<string, string | boolean>) {
  try {
    if (!options.force && !options.f) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>(resolve => {
        readline.question(`Delete screenshot '${name}'? (y/N) `, resolve)
      })
      readline.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log("Cancelled.")
        return
      }
    }
    
    await Effect.runPromise(
      Screenshot.delete(name).pipe(
        Effect.provide(LiveServices)
      )
    )
    
    console.log(`✅ Deleted: ${name}`)
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

async function exportScreenshot(name: string, output: string, options: Record<string, string | boolean>) {
  try {
    const screenshot = await Effect.runPromise(
      Screenshot.load(name).pipe(
        Effect.provide(LiveServices)
      )
    )
    
    const format = options.format || options.f || 'text'
    let content: string
    
    switch (format) {
      case 'json':
        content = JSON.stringify(screenshot, null, 2)
        break
      case 'text':
        content = screenshot.visual.lines.join('\n')
        break
      case 'ansi':
        content = screenshot.raw?.ansiCodes || screenshot.visual.lines.join('\n')
        break
      default:
        throw new Error(`Unknown format: ${format}`)
    }
    
    await fs.writeFile(output, content, 'utf-8')
    console.log(`✅ Exported to: ${output}`)
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

async function batchScreenshot(options: Record<string, string | boolean>) {
  try {
    let commands: Array<{name: string, command: string, description?: string}>
    
    if (options.file || options.f) {
      // Read from JSON file
      const filename = options.file || options.f
      if (typeof filename !== 'string') {
        console.error("Error: --file requires a filename")
        process.exit(1)
      }
      const content = await fs.readFile(filename, 'utf-8')
      commands = JSON.parse(content)
    } else if (options.examples) {
      // Use built-in example commands
      console.log("💡 Note: For interactive CLI-KIT examples, use individual screenshot commands with --pty flag")
      console.log("   Example: cli-kit screenshot create loading-demo --command 'bun examples/loading-screen.ts' --pty\n")
      
      commands = [
        { name: "list-examples", command: "ls -la examples/*.ts | head -15", description: "List of example files" },
        { name: "package-info", command: "cat package.json | jq '{name, version, description}'", description: "Package information" },
        { name: "help-screen", command: "./bin/cli-kit.ts --help", description: "CLI-KIT help screen" },
        { name: "screenshot-help", command: "./bin/cli-kit.ts screenshot --help", description: "Screenshot command help" }
      ]
    } else {
      console.error("❌ Error: Either --file or --examples must be specified")
      console.log("\nUsage:")
      console.log("  cli-kit screenshot multi --file commands.json")
      console.log("  cli-kit screenshot multi --examples")
      process.exit(1)
    }
    
    const prefix = typeof options.prefix === 'string' ? options.prefix :
                   typeof options.p === 'string' ? options.p : 'batch'
    
    console.log(`🎬 Capturing ${commands.length} screenshots...\n`)
    
    let successful = 0
    let failed = 0
    
    for (const cmd of commands) {
      const name = `${prefix}-${cmd.name}`
      console.log(`📸 Capturing ${name}...`)
      
      try {
        const result = await Effect.runPromise(
          Screenshot.take(cmd.command, {
            name,
            description: cmd.description
          }).pipe(
            Effect.provide(LiveServices)
          )
        )
        
        console.log(`   ✅ ${name} captured`)
        successful++
        
        if (options.show || options.s) {
          console.log("\n📺 Preview:")
          const screenshot = await Effect.runPromise(
            Screenshot.load(name).pipe(
              Effect.provide(LiveServices)
            )
          )
          const formatted = formatScreenshot(screenshot, {
            showMetadata: false,
            showComponentTree: false,
            colorize: true
          })
          console.log(formatted)
          console.log()
        }
      } catch (error) {
        console.error(`   ❌ Failed: ${error}`)
        failed++
      }
    }
    
    console.log()
    console.log(`✨ Done! Captured ${successful}/${commands.length} screenshots`)
    if (failed > 0) {
      console.log(`   ${failed} failed`)
    }
    console.log()
    console.log("View screenshots with:")
    console.log(`   cli-kit screenshot list`)
    console.log(`   cli-kit screenshot show ${prefix}-{name}`)
  } catch (error) {
    console.error(`❌ Error: ${error}`)
    process.exit(1)
  }
}

// =============================================================================
// Docs Commands
// =============================================================================

// Simple markdown parsing for terminal display
function parseMarkdownForTerminal(content: string): string {
  const lines = content.split('\n')
  const rendered: string[] = []
  
  for (const line of lines) {
    let processedLine = line
    
    // Headers
    if (line.startsWith('# ')) {
      processedLine = `\x1b[1;36m${line.slice(2)}\x1b[0m`
    } else if (line.startsWith('## ')) {
      processedLine = `\x1b[1;35m${line.slice(3)}\x1b[0m`
    } else if (line.startsWith('### ')) {
      processedLine = `\x1b[1;33m${line.slice(4)}\x1b[0m`
    } else if (line.startsWith('#### ')) {
      processedLine = `\x1b[1;32m${line.slice(5)}\x1b[0m`
    }
    
    // Code blocks
    if (line.startsWith('```')) {
      processedLine = `\x1b[2;37m${line}\x1b[0m`
    } else if (line.startsWith('    ') || line.startsWith('\t')) {
      processedLine = `\x1b[2;37m${line}\x1b[0m`
    }
    
    // Inline code
    processedLine = processedLine.replace(/`([^`]+)`/g, '\x1b[2;36m$1\x1b[0m')
    
    // Bold text
    processedLine = processedLine.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
    
    // Italic text
    processedLine = processedLine.replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m')
    
    // Links - just highlight them
    processedLine = processedLine.replace(/\[([^\]]+)\]\([^)]+\)/g, '\x1b[4;34m$1\x1b[0m')
    
    // Bullet points
    if (line.match(/^[\s]*[-*+]\s/)) {
      processedLine = processedLine.replace(/^(\s*)([-*+])(\s)/, '$1\x1b[33m•\x1b[0m$3')
    }
    
    // Numbered lists
    if (line.match(/^[\s]*\d+\.\s/)) {
      processedLine = processedLine.replace(/^(\s*)(\d+\.)(\s)/, '$1\x1b[33m$2\x1b[0m$3')
    }
    
    rendered.push(processedLine)
  }
  
  return rendered.join('\n')
}

async function handleDocs(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  const docFile = subcommand || args[0] || "README.md"
  
  // Priority order for docs lookup:
  // 1. If --path specified, use that path only
  // 2. Check node_modules/tuix/docs/ (TUIX's own docs)
  // 3. Fall back to local ./docs/ directory
  
  const customPath = options.path || options.p
  let searchPaths: string[] = []
  
  if (customPath) {
    // User specified a custom path, use only that
    searchPaths = [typeof customPath === 'string' ? customPath : "docs"]
  } else {
    // Default priority: TUIX docs first, then local docs
    searchPaths = [
      "node_modules/tuix/docs",
      "docs"
    ]
  }
  
  let lastError: any = null
  let foundPath: string | null = null
  let content: string = ""
  
  // Try each search path in order
  for (const searchPath of searchPaths) {
    try {
      const fullPath = path.isAbsolute(docFile) ? docFile : path.join(searchPath, docFile)
      content = await fs.readFile(fullPath, 'utf-8')
      foundPath = searchPath
      break
    } catch (error) {
      lastError = error
      continue
    }
  }
  
  if (foundPath && content) {
    console.log(`📚 Reading TUIX documentation: ${docFile}`)
    if (foundPath.includes('node_modules/tuix')) {
      console.log(`\x1b[2m📦 From TUIX package documentation\x1b[0m`)
    } else {
      console.log(`\x1b[2m📁 From ${foundPath}\x1b[0m`)
    }
    console.log()

    // Parse and display the markdown
    const formatted = parseMarkdownForTerminal(content)
    console.log(formatted)
    
    console.log()
    console.log(`\x1b[2m📄 End of ${path.basename(docFile)} | Use 'tuix docs' to list available files\x1b[0m`)
    return
  }
  
  // If we get here, no docs were found in any search path
  console.error(`❌ Failed to read documentation: ${lastError}`)
  
  // Fallback: list available docs from both locations
  try {
    console.log("\n📁 Available documentation:")
    
    // Try to list TUIX docs first
    for (const searchPath of searchPaths) {
      try {
        const files = await fs.readdir(searchPath, { recursive: true })
        const mdFiles = files
          .filter(file => typeof file === 'string' && file.endsWith('.md'))
          .sort()
        
        if (mdFiles.length > 0) {
          console.log(`\n  📦 ${searchPath.includes('node_modules/tuix') ? 'TUIX Documentation:' : `From ${searchPath}:`}`)
          mdFiles.forEach(file => {
            console.log(`    📄 ${file}`)
          })
        }
      } catch (listError) {
        // Ignore errors when listing directories that don't exist
        continue
      }
    }
    
    console.log(`\nUsage:`)
    console.log(`  tuix docs <file>              # Read TUIX documentation file`)
    console.log(`  tuix docs --path <path>       # Use custom docs directory`)
    console.log(`\nExamples:`)
    console.log(`  tuix docs README.md           # Read TUIX main README`)
    console.log(`  tuix docs core/errors.md      # Read TUIX error documentation`)
    console.log(`  tuix docs --path ./my-docs    # Use custom docs path`)
  } catch (listError) {
    console.error(`❌ Could not list documentation files: ${listError}`)
  }
  
  process.exit(1)
}

// =============================================================================
// Init Commands
// =============================================================================

async function handleInit(projectName: string | undefined, args: string[], options: Record<string, string | boolean>) {
  const name = projectName || args[0] || 'my-tuix-app'
  const template = (options.template || options.t || 'jsx') as string
  const jsx = options.jsx !== false // Default to true
  const force = options.force || options.f
  
  console.log(`🚀 Creating new TUIX app: ${name}`)
  console.log(`📁 Template: ${template}`)
  console.log(`⚛️  JSX: ${jsx ? 'enabled' : 'disabled'}`)
  console.log()

  // Check environment before proceeding
  if (!options['skip-health']) {
    console.log(`🔍 Checking environment...`)
    
    try {
      const { runHealthChecks, coreHealthChecks } = await import("../src/health/index.ts")
      const report = await runHealthChecks(coreHealthChecks)
      
      const criticalErrors = report.checks.filter(c => c.severity === 'error' && !c.result.success)
      
      if (criticalErrors.length > 0) {
        console.log(`❌ Environment check failed:`)
        for (const error of criticalErrors) {
          console.log(`   • ${error.result.message}`)
        }
        console.log()
        console.log(`Run 'tuix doctor' for detailed diagnostics and fixes.`)
        if (!force) {
          console.log(`Use --force to create project anyway.`)
          process.exit(1)
        }
        console.log(`⚠️  Continuing with --force...`)
      } else {
        console.log(`✅ Environment looks good!`)
      }
      console.log()
    } catch (error) {
      console.log(`⚠️  Could not run environment check: ${error}`)
      if (!force) {
        console.log(`Use --force to skip environment checks.`)
        process.exit(1)
      }
    }
  }

  try {
    // Create project directory
    const projectPath = path.resolve(name)
    
    // Check if directory already exists and handle existing projects
    let isExistingProject = false
    try {
      await fs.access(projectPath)
      
      // Directory exists - check if it's a project
      try {
        const existingPackage = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
        const pkg = JSON.parse(existingPackage)
        
        console.log(`📁 Found existing project: ${pkg.name || name}`)
        
        if (pkg.dependencies?.tuix || pkg.devDependencies?.tuix) {
          console.log(`⚛️  This is already a Tuix project!`)
          
          if (!force) {
            console.log(`Use --force to reinitialize the project.`)
            console.log(`Or run 'tuix doctor' to check project health.`)
            process.exit(1)
          }
          console.log(`⚠️  Reinitializing with --force...`)
        } else {
          console.log(`🔄 Converting existing ${pkg.type || 'Node.js'} project to Tuix...`)
        }
        
        isExistingProject = true
      } catch {
        // Has directory but no package.json
        if (!force) {
          console.error(`❌ Directory '${name}' already exists but is not a Node.js project`)
          console.log(`Use --force to initialize anyway.`)
          process.exit(1)
        }
        console.log(`⚠️  Initializing in existing directory with --force...`)
      }
    } catch {
      // Directory doesn't exist, which is what we want for new projects
    }

    await fs.mkdir(projectPath, { recursive: true })
    console.log(`📁 Created directory: ${name}`)

    // Generate package.json
    const packageJson = {
      name: name,
      version: "1.0.0",
      description: `A TUIX application created with ${template} template`,
      type: "module",
      scripts: {
        dev: jsx ? "bun app.tsx" : "bun app.ts",
        start: jsx ? "bun app.tsx" : "bun app.ts",
        build: "bun build --compile --minify --bytecode --outfile dist/app src/index.ts",
        test: "bun test"
      },
      dependencies: {
        tuix: "file:../",
        effect: "^3.0.0"
      },
      devDependencies: {
        "@types/bun": "latest",
        typescript: "^5.3.0"
      }
    }

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    )
    console.log(`📄 Created package.json`)

    // Generate tsconfig.json with JSX support
    const tsConfig = {
      compilerOptions: {
        lib: ["ES2020", "DOM"],
        target: "ES2020",
        module: "ES2020",
        moduleDetection: "force",
        jsx: jsx ? "react-jsx" : undefined,
        jsxImportSource: jsx ? "tuix" : undefined,
        allowJs: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: false,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: "."
      },
      include: jsx ? [
        "**/*.ts",
        "**/*.tsx"
      ] : [
        "**/*.ts"
      ]
    }

    // Remove undefined values
    if (!jsx) {
      delete tsConfig.compilerOptions.jsx
      delete tsConfig.compilerOptions.jsxImportSource
    }

    await fs.writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2),
      'utf-8'
    )
    console.log(`⚙️  Created tsconfig.json`)

    // Generate main app file based on template
    let appContent = ''
    let appFilename = jsx ? 'app.tsx' : 'app.ts'

    switch (template) {
      case 'jsx':
      case 'basic':
        if (jsx) {
          appContent = `#!/usr/bin/env bun

import { jsx } from "tuix/jsx"

function App() {
  return (
    <vstack>
      <text color="green" bold>🎉 Welcome to your TUIX app!</text>
      <text color="blue">Built with JSX and TypeScript</text>
      
      <panel title="Getting Started" border="rounded">
        <vstack>
          <text>• Edit this file to customize your app</text>
          <text>• Use JSX for declarative UI components</text>
          <text>• Press 'q' to quit the app</text>
        </vstack>
      </panel>
      
      <hstack>
        <button variant="primary">Primary</button>
        <button variant="secondary">Secondary</button>
        <button variant="success">Success</button>
      </hstack>
    </vstack>
  )
}

// Run the app
jsx(App).catch(console.error)
`
        } else {
          appContent = `#!/usr/bin/env bun

import { runApp } from "tuix"
import { LiveServices } from "tuix/services"
import { text, vstack, styledText, Panel } from "tuix"
import { style, Colors } from "tuix/styling"
import { Effect } from "effect"

function App() {
  return vstack(
    styledText("🎉 Welcome to your TUIX app!", style().foreground(Colors.green).bold()),
    styledText("Built with TypeScript", style().foreground(Colors.blue)),
    Panel(
      vstack(
        text("• Edit this file to customize your app"),
        text("• Use functional components"),
        text("• Press 'q' to quit the app")
      ),
      { title: "Getting Started", border: "rounded" }
    )
  )
}

const component = {
  init: Effect.succeed([{}, []] as const),
  update: () => Effect.succeed([{}, []] as const),
  view: App,
  subscription: () => Effect.succeed([])
}

Effect.runPromise(
  runApp(component).pipe(
    Effect.provide(LiveServices),
    Effect.catchAll(() => Effect.void),
    Effect.orDie
  )
).catch(console.error)
`
        }
        break

      case 'cli':
        if (jsx) {
          appContent = `#!/usr/bin/env bun

import { createJSXApp, jsxCommand } from "tuix/jsx"
import { CLIRouter, runCLI } from "tuix/cli"

// JSX command handlers
const HelloCommand = ({ name }: { name?: string }) => (
  <vstack>
    <text color="green" bold>👋 Hello, {name || 'World'}!</text>
    <text>This is a JSX-based CLI command</text>
  </vstack>
)

const InfoCommand = () => (
  <panel title="App Info" border="rounded">
    <vstack>
      <text>Name: ${name}</text>
      <text>Version: 1.0.0</text>
      <text>Built with: TUIX + JSX</text>
    </vstack>
  </panel>
)

// CLI configuration
const commands = {
  hello: jsxCommand('hello', (ctx) => <HelloCommand name={ctx.args.name} />),
  info: jsxCommand('info', () => <InfoCommand />)
}

// Run CLI
runCLI({
  name: "${name}",
  version: "1.0.0",
  description: "A JSX-based CLI application",
  commands
}).catch(console.error)
`
        } else {
          appContent = `#!/usr/bin/env bun

import { runCLI, defineCommand } from "tuix/cli"
import { text, vstack, Panel } from "tuix"
import { style, Colors } from "tuix/styling"

const commands = {
  hello: defineCommand({
    name: 'hello',
    description: 'Say hello',
    handler: async (ctx) => {
      const name = ctx.args.name || 'World'
      return vstack(
        text(\`👋 Hello, \${name}!\`, style().foreground(Colors.green).bold()),
        text("This is a TUIX CLI command")
      )
    }
  }),
  
  info: defineCommand({
    name: 'info',
    description: 'Show app info',
    handler: async () => {
      return Panel(
        vstack(
          text("Name: ${name}"),
          text("Version: 1.0.0"),
          text("Built with: TUIX")
        ),
        { title: "App Info", border: "rounded" }
      )
    }
  })
}

runCLI({
  name: "${name}",
  version: "1.0.0", 
  description: "A TUIX CLI application",
  commands
}).catch(console.error)
`
        }
        break

      default:
        console.error(`❌ Unknown template: ${template}`)
        console.log("Available templates: jsx, basic, cli")
        process.exit(1)
    }

    await fs.writeFile(
      path.join(projectPath, appFilename),
      appContent,
      'utf-8'
    )
    console.log(`📄 Created ${appFilename}`)

    // Make the app file executable
    await Bun.$`chmod +x ${path.join(projectPath, appFilename)}`

    // Generate README.md
    const readmeContent = `# ${name}

A TUIX application created with the ${template} template.

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Run the app
bun run dev

# Or run directly
./${appFilename}
\`\`\`

## Features

${jsx ? '- ⚛️  JSX-based UI components' : '- 🏗️  Functional component architecture'}
- 🎨 Rich terminal styling and layouts
- ⌨️  Keyboard and mouse input handling
- 🔧 TypeScript support
- ⚡ Fast development with Bun

## Documentation

- [TUIX Documentation](https://github.com/cinderlink/cli-kit)
${jsx ? '- [JSX Guide](https://github.com/cinderlink/cli-kit/docs/jsx.md)' : ''}
- [Examples](https://github.com/cinderlink/cli-kit/tree/main/examples)

## Commands

\`\`\`bash
bun run dev     # Run in development mode
bun run build   # Build for production
bun test        # Run tests
\`\`\`
`

    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      readmeContent,
      'utf-8'
    )
    console.log(`📄 Created README.md`)

    console.log()
    console.log(`✨ Successfully created ${name}!`)
    console.log()
    console.log(`Next steps:`)
    console.log(`  cd ${name}`)
    console.log(`  bun install`)
    console.log(`  bun run dev`)
    console.log()
    console.log(`Happy coding! 🎉`)

  } catch (error) {
    console.error(`❌ Failed to create project: ${error}`)
    process.exit(1)
  }
}

// =============================================================================
// Doctor Commands
// =============================================================================

async function handleDoctor(subcommand: string | undefined, args: string[], options: Record<string, string | boolean>) {
  const command = subcommand || 'check'
  
  try {
    const { 
      runHealthChecks, 
      coreHealthChecks, 
      projectHealthChecks, 
      getHealthCheck,
      isInTuixProject,
      detectProjectType
    } = await import("../src/health/index.ts")

    switch (command) {
      case 'check':
      case 'status':
        await runFullDiagnostics(options)
        break

      case 'fix':
        if (args.length === 0) {
          console.error("Error: Specify check name to fix")
          console.log("Usage: tuix doctor fix <check-name>")
          console.log("Run 'tuix doctor check' to see available fixes")
          process.exit(1)
        }
        await runFix(args[0], options)
        break

      case 'env':
      case 'environment':
        await checkEnvironment(options)
        break

      case 'project':
        await checkProject(options)
        break

      case 'detect':
        await detectAndReport(options)
        break

      default:
        console.error(`Unknown doctor command: ${command}`)
        console.log("Available commands: check, fix, env, project, detect")
        process.exit(1)
    }

  } catch (error) {
    console.error(`❌ Doctor command failed: ${error}`)
    process.exit(1)
  }
}

async function runFullDiagnostics(options: Record<string, string | boolean>) {
  const { 
    runHealthChecks, 
    coreHealthChecks, 
    projectHealthChecks, 
    isInTuixProject
  } = await import("../src/health/index.ts")

  console.log(`🩺 Tuix Doctor - Full Diagnostics`)
  console.log()

  // Environment checks
  console.log(`🔧 Environment Checks`)
  const envReport = await runHealthChecks(coreHealthChecks, { includeInfo: !!options.verbose })
  displayHealthReport(envReport, { compact: !options.verbose })

  // Project checks (if in a project)
  const inProject = await isInTuixProject()
  if (inProject || options.all) {
    console.log()
    console.log(`📦 Project Checks`)
    const projectReport = await runHealthChecks(projectHealthChecks, { includeInfo: !!options.verbose })
    displayHealthReport(projectReport, { compact: !options.verbose })
  }

  // Summary and recommendations
  console.log()
  const allChecks = [...coreHealthChecks, ...(inProject ? projectHealthChecks : [])]
  const fullReport = await runHealthChecks(allChecks, { includeInfo: !!options.verbose })
  
  console.log(`📊 Summary`)
  console.log(`   Total: ${fullReport.summary.total}`)
  console.log(`   ✅ Passed: ${fullReport.summary.passed}`)
  if (fullReport.summary.warnings > 0) {
    console.log(`   ⚠️  Warnings: ${fullReport.summary.warnings}`)
  }
  if (fullReport.summary.errors > 0) {
    console.log(`   ❌ Errors: ${fullReport.summary.errors}`)
  }

  // Show fixable issues
  const fixableIssues = fullReport.checks.filter(c => !c.result.success && c.fixAvailable)
  if (fixableIssues.length > 0) {
    console.log()
    console.log(`🔧 Fixable Issues:`)
    for (const issue of fixableIssues) {
      console.log(`   • ${issue.name}: ${issue.result.message}`)
      console.log(`     Fix: tuix doctor fix ${issue.name}`)
    }
  }

  console.log()
  if (fullReport.overall === 'healthy') {
    console.log(`🎉 Everything looks great! Your Tuix environment is ready.`)
  } else if (fullReport.overall === 'warnings') {
    console.log(`⚠️  There are some recommendations to improve your setup.`)
  } else {
    console.log(`❌ There are critical issues that need attention.`)
  }
}

async function runFix(checkName: string, options: Record<string, string | boolean>) {
  const { getHealthCheck } = await import("../src/health/index.ts")
  
  const check = getHealthCheck(checkName)
  if (!check) {
    console.error(`❌ Unknown check: ${checkName}`)
    process.exit(1)
  }

  if (!check.fix) {
    console.error(`❌ No automatic fix available for: ${checkName}`)
    console.log(`Description: ${check.description}`)
    process.exit(1)
  }

  console.log(`🔧 Fixing: ${check.description}`)
  
  try {
    await check.fix()
    console.log(`✅ Fix completed for: ${checkName}`)
    
    // Re-run the check to verify
    console.log(`🔍 Verifying fix...`)
    const result = await check.check()
    if (result.success) {
      console.log(`✅ Verification successful!`)
    } else {
      console.log(`⚠️  Fix may not have resolved all issues: ${result.message}`)
    }
  } catch (error) {
    console.error(`❌ Fix failed: ${error}`)
    process.exit(1)
  }
}

async function checkEnvironment(options: Record<string, string | boolean>) {
  const { runHealthChecks, coreHealthChecks } = await import("../src/health/index.ts")
  
  console.log(`🔧 Environment Health Check`)
  console.log()
  
  const report = await runHealthChecks(coreHealthChecks, { includeInfo: true })
  displayHealthReport(report, { compact: false })
}

async function checkProject(options: Record<string, string | boolean>) {
  const { runHealthChecks, projectHealthChecks, isInTuixProject } = await import("../src/health/index.ts")
  
  const inProject = await isInTuixProject()
  if (!inProject) {
    console.log(`📦 Not in a Tuix project directory`)
    console.log(`Run 'tuix init' to create a new project or navigate to an existing one.`)
    return
  }
  
  console.log(`📦 Project Health Check`)
  console.log()
  
  const report = await runHealthChecks(projectHealthChecks, { includeInfo: true })
  displayHealthReport(report, { compact: false })
}

async function detectAndReport(options: Record<string, string | boolean>) {
  const { detectProjectType } = await import("../src/health/index.ts")
  
  console.log(`🔍 Project Detection`)
  console.log()
  
  const detection = await detectProjectType()
  
  console.log(`📂 Current directory: ${process.cwd()}`)
  console.log(`📦 Project type: ${detection.type}`)
  console.log(`🔧 Package manager: ${detection.packageManager}`)
  console.log(`📝 TypeScript: ${detection.hasTypeScript ? 'Yes' : 'No'}`)
  console.log(`⚛️  JSX: ${detection.hasJSX ? 'Yes' : 'No'}`)
  
  console.log()
  
  // Recommendations based on detection
  if (detection.type === 'unknown') {
    console.log(`💡 Recommendations:`)
    console.log(`   • Run 'tuix init' to create a new Tuix project`)
  } else if (detection.type === 'node' || detection.type === 'bun') {
    console.log(`💡 Recommendations:`)
    console.log(`   • Run 'tuix init --force' to convert to Tuix project`)
    console.log(`   • Or manually add Tuix: bun add tuix`)
  } else if (detection.type === 'tuix') {
    console.log(`✅ This is a Tuix project!`)
    console.log(`   • Run 'tuix doctor check' for health status`)
  }
  
  if (detection.packageManager !== 'bun') {
    console.log()
    console.log(`⚠️  Consider switching to Bun for better performance:`)
    console.log(`   • Install Bun: curl -fsSL https://bun.sh/install | bash`)
    console.log(`   • Convert lockfile: rm package-lock.json && bun install`)
  }
}

function displayHealthReport(
  report: any, 
  options: { compact?: boolean } = {}
) {
  for (const check of report.checks) {
    const icon = check.result.success ? '✅' : 
                 check.severity === 'error' ? '❌' : 
                 check.severity === 'warning' ? '⚠️' : 'ℹ️'
    
    console.log(`${icon} ${check.name}: ${check.result.message}`)
    
    if (!options.compact) {
      if (check.result.value) {
        console.log(`   Value: ${check.result.value}`)
      }
      
      if (check.result.details && check.result.details.length > 0) {
        console.log(`   Details:`)
        for (const detail of check.result.details) {
          console.log(`     • ${detail}`)
        }
      }
      
      if (!check.result.success && check.fixAvailable) {
        console.log(`   Fix: tuix doctor fix ${check.name}`)
      }
      
      console.log()
    }
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

const parsed = parseArgs(process.argv.slice(2))

// Show help if no command or help flag
if (!parsed.command || parsed.command === 'help' || parsed.options.help || parsed.options.h) {
  showHelpSimple()
  process.exit(0)
}

// Show version
if (parsed.command === 'version' || parsed.options.version || parsed.options.v) {
  console.log("cli-kit v1.0.0")
  process.exit(0)
}

// Handle commands
switch (parsed.command) {
  case 'pm':
  case 'process':
    await handleProcessManager(parsed.subcommand, parsed.args, parsed.options)
    break
    
  case 'logs':
  case 'log':
    // For logs command, treat subcommand and args as all args
    const logArgs = parsed.subcommand ? [parsed.subcommand, ...parsed.args] : parsed.args
    await handleLogs(undefined, logArgs, parsed.options)
    break
    
  case 'dev':
    await handleDev(parsed.subcommand, parsed.args, parsed.options)
    break
    
  case 'screenshot':
  case 'ss':
    await handleScreenshot(parsed.subcommand, parsed.args, parsed.options)
    break
    
  case 'docs':
  case 'doc':
  case 'documentation':
    await handleDocs(parsed.subcommand, parsed.args, parsed.options)
    break
    
  case 'init':
  case 'create':
    await handleInit(parsed.subcommand, parsed.args, parsed.options)
    break

  case 'doctor':
  case 'health':
    await handleDoctor(parsed.subcommand, parsed.args, parsed.options)
    break
    
  default:
    console.error(`Unknown command: ${parsed.command}`)
    console.log("Run 'tuix --help' for usage information")
    process.exit(1)
}