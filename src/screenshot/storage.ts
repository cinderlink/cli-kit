/**
 * Screenshot Storage Management
 * 
 * Handles saving, loading, and managing .cks files
 */

import { Effect } from "effect"
import * as fs from "fs/promises"
import * as path from "path"
import type { TuixScreenshot } from "./types.ts"

const SCREENSHOT_DIR = ".tuix/screenshots"
const SCREENSHOT_EXT = ".cks"

/**
 * Ensure screenshot directory exists
 */
export function ensureScreenshotDir(baseDir: string = process.cwd()): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: async () => {
      const dir = path.join(baseDir, SCREENSHOT_DIR)
      await fs.mkdir(dir, { recursive: true })
      return dir
    },
    catch: (error) => new Error(`Failed to create screenshot directory: ${error}`)
  })
}

/**
 * Save a screenshot to disk
 */
export function saveScreenshot(
  screenshot: TuixScreenshot,
  baseDir?: string
): Effect.Effect<string, Error> {
  return Effect.gen(function* (_) {
    const dir = yield* _(ensureScreenshotDir(baseDir))
    const filename = `${screenshot.metadata.name}${SCREENSHOT_EXT}`
    const filepath = path.join(dir, filename)
    
    yield* _(Effect.tryPromise({
      try: () => fs.writeFile(
        filepath,
        JSON.stringify(screenshot, null, 2),
        'utf-8'
      ),
      catch: (error) => new Error(`Failed to save screenshot: ${error}`)
    }))
    
    return filepath
  })
}

/**
 * Load a screenshot from disk
 */
export function loadScreenshot(
  name: string,
  baseDir?: string
): Effect.Effect<TuixScreenshot, Error> {
  return Effect.tryPromise({
    try: async () => {
      const dir = path.join(baseDir || process.cwd(), SCREENSHOT_DIR)
      const filename = name.endsWith(SCREENSHOT_EXT) ? name : `${name}${SCREENSHOT_EXT}`
      const filepath = path.join(dir, filename)
      
      const content = await fs.readFile(filepath, 'utf-8')
      return JSON.parse(content) as TuixScreenshot
    },
    catch: (error) => new Error(`Failed to load screenshot: ${error}`)
  })
}

/**
 * List all screenshots
 */
export function listScreenshots(
  baseDir?: string
): Effect.Effect<ScreenshotInfo[], Error> {
  return Effect.tryPromise({
    try: async () => {
      const dir = path.join(baseDir || process.cwd(), SCREENSHOT_DIR)
      
      try {
        const files = await fs.readdir(dir)
        const screenshots: ScreenshotInfo[] = []
        
        for (const file of files) {
          if (file.endsWith(SCREENSHOT_EXT)) {
            const filepath = path.join(dir, file)
            const stats = await fs.stat(filepath)
            
            // Try to read metadata
            try {
              const content = await fs.readFile(filepath, 'utf-8')
              const screenshot = JSON.parse(content) as TuixScreenshot
              
              screenshots.push({
                name: screenshot.metadata.name,
                filename: file,
                description: screenshot.metadata.description,
                app: screenshot.metadata.app,
                timestamp: screenshot.metadata.timestamp,
                size: stats.size,
                path: filepath
              })
            } catch {
              // If we can't parse, just include basic info
              screenshots.push({
                name: file.replace(SCREENSHOT_EXT, ''),
                filename: file,
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
                path: filepath
              })
            }
          }
        }
        
        return screenshots.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist yet
          return []
        }
        throw error
      }
    },
    catch: (error) => new Error(`Failed to list screenshots: ${error}`)
  })
}

/**
 * Delete a screenshot
 */
export function deleteScreenshot(
  name: string,
  baseDir?: string
): Effect.Effect<void, Error> {
  return Effect.tryPromise({
    try: async () => {
      const dir = path.join(baseDir || process.cwd(), SCREENSHOT_DIR)
      const filename = name.endsWith(SCREENSHOT_EXT) ? name : `${name}${SCREENSHOT_EXT}`
      const filepath = path.join(dir, filename)
      
      await fs.unlink(filepath)
    },
    catch: (error) => new Error(`Failed to delete screenshot: ${error}`)
  })
}

/**
 * Export screenshot to different formats
 */
export function exportScreenshot(
  screenshot: TuixScreenshot,
  format: 'json' | 'text' | 'ansi',
  outputPath?: string
): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: async () => {
      let content: string
      
      switch (format) {
        case 'json':
          content = JSON.stringify(screenshot, null, 2)
          break
          
        case 'text':
          // Export as plain text
          content = screenshot.visual.lines.join('\n')
          break
          
        case 'ansi':
          // Export with ANSI codes if available
          content = screenshot.raw?.ansiCodes || screenshot.visual.lines.join('\n')
          break
          
        default:
          throw new Error(`Unknown export format: ${format}`)
      }
      
      if (outputPath) {
        await fs.writeFile(outputPath, content, 'utf-8')
        return outputPath
      } else {
        return content
      }
    },
    catch: (error) => new Error(`Failed to export screenshot: ${error}`)
  })
}

export interface ScreenshotInfo {
  readonly name: string
  readonly filename: string
  readonly description?: string
  readonly app?: string
  readonly timestamp: string
  readonly size: number
  readonly path: string
}
