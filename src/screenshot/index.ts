/**
 * CLI-KIT Screenshot System
 * 
 * Main entry point for screenshot functionality
 */

export * from "./types.ts"
export * from "./capture.ts"
export * from "./reconstruct.ts"
export * from "./storage.ts"
export * from "./external.ts"
export * from "./protocol.ts"

import { Effect } from "effect"
import type { View } from "@/core/types.ts"
import type { ScreenshotOptions, CliKitScreenshot } from "./types.ts"
import { captureScreenshot } from "./capture.ts"
import { captureExternalCommand, capturePtyCommand } from "./external.ts"
import { saveScreenshot, loadScreenshot, listScreenshots, deleteScreenshot } from "./storage.ts"
import { reconstructView, createVisualView } from "./reconstruct.ts"
import { CLI_KIT_SCREENSHOT_ENV, CLI_KIT_SCREENSHOT_FORMAT, CLI_KIT_SCREENSHOT_PIPE } from "./protocol.ts"

/**
 * High-level screenshot API
 */
export const Screenshot = {
  /**
   * Capture a CLI-KIT view
   */
  capture: captureScreenshot,
  
  /**
   * Capture an external command
   */
  captureCommand: (command: string, options: ScreenshotOptions) => {
    // Try to detect if it's a CLI-KIT app
    if (command.includes('cli-kit') || command.includes('.ts')) {
      // Run with enhanced protocol
      const enhancedCommand = {
        command,
        env: {
          [CLI_KIT_SCREENSHOT_ENV]: "true",
          [CLI_KIT_SCREENSHOT_FORMAT]: "enhanced",
          [CLI_KIT_SCREENSHOT_PIPE]: `/tmp/cli-kit-screenshot-${Date.now()}.pipe`
        }
      }
      return captureExternalCommand(enhancedCommand.command, {
        ...options,
        description: options.description || `Enhanced CLI-KIT screenshot of: ${command}`
      })
    } else {
      // Regular external command
      return captureExternalCommand(command, options)
    }
  },
  
  /**
   * Capture a PTY-based command (for interactive apps)
   */
  capturePty: capturePtyCommand,
  
  /**
   * Save a screenshot
   */
  save: saveScreenshot,
  
  /**
   * Load a screenshot
   */
  load: loadScreenshot,
  
  /**
   * List all screenshots
   */
  list: listScreenshots,
  
  /**
   * Delete a screenshot
   */
  delete: deleteScreenshot,
  
  /**
   * Reconstruct a view from a screenshot
   */
  reconstruct: reconstructView,
  
  /**
   * Create a visual-only view from a screenshot
   */
  createVisual: createVisualView,
  
  /**
   * Take a screenshot with a single command
   */
  take: (source: View | string, options: ScreenshotOptions) =>
    Effect.gen(function* (_) {
      let screenshot: CliKitScreenshot
      
      if (typeof source === 'string') {
        // It's a command
        screenshot = yield* _(Screenshot.captureCommand(source, options))
      } else {
        // It's a View
        screenshot = yield* _(Screenshot.capture(source, options))
      }
      
      // Save it
      const path = yield* _(Screenshot.save(screenshot))
      
      return { screenshot, path }
    })
}

/**
 * Create a formatted display of a screenshot
 */
export function formatScreenshot(screenshot: CliKitScreenshot, options?: {
  showMetadata?: boolean
  showComponentTree?: boolean
  colorize?: boolean
}): string {
  const opts = {
    showMetadata: true,
    showComponentTree: false,
    colorize: true,
    ...options
  }
  
  const lines: string[] = []
  
  if (opts.showMetadata) {
    lines.push('╭─ Screenshot Metadata ─────────────────────────╮')
    lines.push(`│ Name: ${screenshot.metadata.name.padEnd(39)} │`)
    lines.push(`│ Time: ${new Date(screenshot.metadata.timestamp).toLocaleString().padEnd(39)} │`)
    if (screenshot.metadata.app) {
      lines.push(`│ App:  ${screenshot.metadata.app.substring(0, 39).padEnd(39)} │`)
    }
    lines.push(`│ Size: ${screenshot.metadata.dimensions.width}x${screenshot.metadata.dimensions.height} `.padEnd(47) + '│')
    lines.push('╰───────────────────────────────────────────────╯')
    lines.push('')
  }
  
  // Visual output
  if (opts.colorize && screenshot.raw?.ansiCodes) {
    lines.push(screenshot.raw.ansiCodes)
  } else {
    lines.push(...screenshot.visual.lines)
  }
  
  if (opts.showComponentTree) {
    lines.push('')
    lines.push('Component Tree:')
    lines.push(JSON.stringify(screenshot.components, null, 2))
  }
  
  return lines.join('\n')
}