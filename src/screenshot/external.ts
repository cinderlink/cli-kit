/**
 * External Command Screenshot Capture
 * 
 * Captures output from non-TUIX terminal commands
 */

import { Effect } from "effect"
import { exec } from "child_process"
import { promisify } from "util"
import type { TuixScreenshot, ScreenshotOptions } from "./types.ts"
import stripAnsi from "strip-ansi"

const execAsync = promisify(exec)

/**
 * Capture screenshot of an external command
 */
export function captureExternalCommand(
  command: string,
  options: ScreenshotOptions
): Effect.Effect<TuixScreenshot, Error> {
  return Effect.tryPromise({
    try: async () => {
      // Execute the command and capture output
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          FORCE_COLOR: '1',  // Try to force color output
          COLUMNS: '80',     // Set terminal width
          LINES: '24'        // Set terminal height
        }
      })
      
      const output = stdout + (stderr ? `\n${stderr}` : '')
      
      // Parse the output
      const lines = output.split('\n')
      const cleanLines = lines.map(line => stripAnsi(line))
      
      // Extract ANSI styles (simplified for now)
      const styles = extractAnsiStyles(lines)
      
      const screenshot: TuixScreenshot = {
        metadata: {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          name: options.name,
          description: options.description || `Screenshot of: ${command}`,
          app: command,
          dimensions: {
            width: 80,
            height: lines.length
          }
        },
        visual: {
          lines: cleanLines,
          styles
        },
        components: {
          type: 'custom',
          props: {
            source: 'external',
            command
          },
          content: output
        },
        raw: options.includeRaw ? { ansiCodes: output } : undefined
      }
      
      return screenshot
    },
    catch: (error) => new Error(`Failed to capture external command: ${error}`)
  })
}

/**
 * Capture screenshot of a running process (PTY mode)
 */
export function capturePtyCommand(
  command: string,
  args: string[],
  options: ScreenshotOptions & { duration?: number }
): Effect.Effect<TuixScreenshot, Error> {
  return Effect.tryPromise({
    try: async () => {
      const pty = await import('node-pty')
      
      return new Promise<TuixScreenshot>((resolve, reject) => {
        const term = pty.spawn(command, args, {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: process.cwd(),
          env: process.env as any
        })
        
        let output = ''
        const startTime = Date.now()
        const duration = options.duration || 2000 // Default 2 seconds
        
        term.on('data', (data) => {
          output += data
        })
        
        term.on('exit', () => {
          cleanup()
        })
        
        const cleanup = () => {
          term.kill()
          
          const lines = output.split('\n')
          const cleanLines = lines.map(line => stripAnsi(line))
          const styles = extractAnsiStyles(lines)
          
          const screenshot: TuixScreenshot = {
            metadata: {
              version: "1.0.0",
              timestamp: new Date().toISOString(),
              name: options.name,
              description: options.description || `PTY screenshot of: ${command} ${args.join(' ')}`,
              app: `${command} ${args.join(' ')}`,
              dimensions: {
                width: 80,
                height: 24
              }
            },
            visual: {
              lines: cleanLines,
              styles
            },
            components: {
              type: 'custom',
              props: {
                source: 'pty',
                command,
                args
              },
              content: output
            },
            raw: options.includeRaw ? { ansiCodes: output } : undefined
          }
          
          resolve(screenshot)
        }
        
        // Auto-cleanup after duration
        setTimeout(() => {
          cleanup()
        }, duration)
      })
    },
    catch: (error) => new Error(`Failed to capture PTY command: ${error}`)
  })
}

/**
 * Extract ANSI styles from lines (simplified version)
 */
function extractAnsiStyles(lines: string[]): any[] {
  // This is a placeholder - in production we'd use a proper ANSI parser
  // like 'ansi-to-json' or similar
  const styles: any[] = []
  
  lines.forEach((line, lineIndex) => {
    const segments: any[] = []
    let position = 0
    
    // Simple pattern matching for common ANSI codes
    const ansiPattern = /\x1b\[([0-9;]+)m([^\x1b]*)/g
    let match
    
    while ((match = ansiPattern.exec(line)) !== null) {
      const codes = match[1].split(';').map(Number)
      const text = match[2]
      
      if (text) {
        const style: any = {}
        
        codes.forEach(code => {
          if (code === 1) style.bold = true
          else if (code === 3) style.italic = true
          else if (code === 4) style.underline = true
          else if (code >= 30 && code <= 37) {
            const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
            style.foreground = colors[code - 30]
          }
          else if (code >= 90 && code <= 97) {
            const colors = ['brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
            style.foreground = colors[code - 90]
          }
        })
        
        segments.push({
          start: position,
          end: position + text.length,
          style
        })
        
        position += text.length
      }
    }
    
    if (segments.length > 0) {
      styles.push({
        line: lineIndex,
        segments
      })
    }
  })
  
  return styles
}
