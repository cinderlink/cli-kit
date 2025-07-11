#!/usr/bin/env bun

/**
 * TUIX Command Line Tool
 * 
 * Main binary for TUIX framework utilities
 */

import { Effect } from "effect"
import { Screenshot, formatScreenshot } from "../src/screenshot/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { showHelpSimple } from "./cli-kit-help-simple.ts"
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
  case 'screenshot':
  case 'ss':
    await handleScreenshot(parsed.subcommand, parsed.args, parsed.options)
    break
    
  case 'create':
    console.log(`🚧 Creating new CLI-KIT app: ${parsed.subcommand || 'my-app'}`)
    console.log(`   Template: ${parsed.options.template || parsed.options.t || 'basic'}`)
    console.log(`   (This feature is coming soon!)`)
    break
    
  default:
    console.error(`Unknown command: ${parsed.command}`)
    console.log("Run 'cli-kit --help' for usage information")
    process.exit(1)
}