/**
 * Terminal Service Implementation - Real terminal operations using Bun APIs
 */

import { Effect, Layer, Ref } from "effect"
import { TerminalService } from "../terminal"
import { TerminalError } from "../../core/errors"
import type { WindowSize, TerminalCapabilities } from "../../core/types"

// ANSI Escape Sequences
const ESC = '\x1b'
const CSI = `${ESC}[`

const ANSI = {
  // Cursor Movement
  cursorTo: (x: number, y: number) => `${CSI}${y};${x}H`,
  cursorUp: (n: number) => `${CSI}${n}A`,
  cursorDown: (n: number) => `${CSI}${n}B`,
  cursorForward: (n: number) => `${CSI}${n}C`,
  cursorBack: (n: number) => `${CSI}${n}D`,
  
  // Cursor Visibility
  cursorHide: `${CSI}?25l`,
  cursorShow: `${CSI}?25h`,
  cursorSave: `${ESC}7`,
  cursorRestore: `${ESC}8`,
  
  // Screen
  clear: `${CSI}2J${CSI}H`,
  clearLine: `${CSI}2K`,
  clearToEOL: `${CSI}0K`,
  clearToSOL: `${CSI}1K`,
  clearToEOS: `${CSI}0J`,
  clearToSOS: `${CSI}1J`,
  
  // Scrolling
  scrollUp: (n: number) => `${CSI}${n}S`,
  scrollDown: (n: number) => `${CSI}${n}T`,
  
  // Modes
  alternateScreenEnable: `${CSI}?1049h`,
  alternateScreenDisable: `${CSI}?1049l`,
  mouseTrackingEnable: `${CSI}?1000h`,
  mouseTrackingDisable: `${CSI}?1000l`,
  
  // Styling
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  
  // Other
  bell: '\x07',
  setTitle: (title: string) => `${ESC}]0;${title}\x07`,
  requestCursorPosition: `${CSI}6n`,
  
  // Cursor Shapes
  cursorBlock: `${CSI}1 q`,
  cursorUnderline: `${CSI}3 q`,
  cursorBar: `${CSI}5 q`,
  cursorBlinkingBlock: `${CSI}0 q`,
  cursorBlinkingUnderline: `${CSI}4 q`,
  cursorBlinkingBar: `${CSI}6 q`,
} as const

/**
 * Platform abstraction for terminal operations
 */
interface PlatformTerminal {
  readonly stdout: {
    readonly columns?: number
    readonly rows?: number
    write: (data: string) => void
  }
  readonly stdin: {
    readonly isTTY?: boolean
    setRawMode?: (enabled: boolean) => void
  }
  readonly env: Record<string, string | undefined>
  readonly platform: string
}

/**
 * Get platform-specific terminal interface
 */
const getPlatform = (): PlatformTerminal => ({
  stdout: process.stdout,
  stdin: process.stdin,
  env: process.env,
  platform: process.platform
})

/**
 * Create the live Terminal service implementation
 */
export const TerminalServiceLive = Layer.effect(
  TerminalService,
  Effect.gen(function* (_) {
    const platform = getPlatform()
    const isRawMode = yield* _(Ref.make(false))
    const isAlternateScreen = yield* _(Ref.make(false))
    
    // Helper to write to stdout
    const write = (data: string) =>
      Effect.try({
        try: () => {
          platform.stdout.write(data)
        },
        catch: (error) => new TerminalError({ 
          operation: "write",
          cause: error 
        })
      })
    
    // Helper to detect terminal capabilities
    const detectCapabilities = (): TerminalCapabilities => {
      const env = platform.env
      const colorSupport = (() => {
        if (env.COLORTERM === 'truecolor') return 'truecolor'
        if (env.TERM?.includes('256color')) return '256'
        if (env.TERM && !env.NO_COLOR) return 'basic'
        return 'none'
      })()
      
      return {
        colors: colorSupport,
        unicode: platform.platform !== 'win32', // Simplified check
        mouse: true, // Most modern terminals support mouse
        clipboard: false, // Requires additional setup
        sixel: false, // Image protocol support
        kitty: env.TERM === 'xterm-kitty',
        iterm2: env.TERM_PROGRAM === 'iTerm.app',
        windowTitle: true,
        columns: platform.stdout.columns || 80,
        rows: platform.stdout.rows || 24,
      }
    }
    
    return {
      // Basic Terminal Operations
      clear: write(ANSI.clear),
      
      write: (text: string) => write(text),
      
      writeLine: (text: string) => write(text + '\n'),
      
      moveCursor: (x: number, y: number) => write(ANSI.cursorTo(x, y)),
      
      moveCursorRelative: (dx: number, dy: number) =>
        Effect.gen(function* (_) {
          if (dx > 0) yield* _(write(ANSI.cursorForward(dx)))
          else if (dx < 0) yield* _(write(ANSI.cursorBack(-dx)))
          
          if (dy > 0) yield* _(write(ANSI.cursorDown(dy)))
          else if (dy < 0) yield* _(write(ANSI.cursorUp(-dy)))
        }),
      
      hideCursor: write(ANSI.cursorHide),
      
      showCursor: write(ANSI.cursorShow),
      
      // Terminal State Management
      getSize: Effect.sync(() => ({
        width: platform.stdout.columns || 80,
        height: platform.stdout.rows || 24,
      })),
      
      setRawMode: (enabled: boolean) =>
        Effect.gen(function* (_) {
          const currentRawMode = yield* _(Ref.get(isRawMode))
          if (currentRawMode === enabled) return
          
          yield* _(Effect.try({
            try: () => {
              if (platform.stdin.isTTY && platform.stdin.setRawMode) {
                platform.stdin.setRawMode(enabled)
              }
            },
            catch: (error) => new TerminalError({
              operation: "setRawMode",
              cause: error
            })
          }))
          
          yield* _(Ref.set(isRawMode, enabled))
        }),
      
      setAlternateScreen: (enabled: boolean) =>
        Effect.gen(function* (_) {
          const current = yield* _(Ref.get(isAlternateScreen))
          if (current === enabled) return
          
          yield* _(write(enabled ? ANSI.alternateScreenEnable : ANSI.alternateScreenDisable))
          yield* _(Ref.set(isAlternateScreen, enabled))
        }),
      
      saveCursor: write(ANSI.cursorSave),
      
      restoreCursor: write(ANSI.cursorRestore),
      
      // Terminal Capabilities
      getCapabilities: Effect.sync(detectCapabilities),
      
      supportsTrueColor: Effect.sync(() => 
        detectCapabilities().colors === 'truecolor'
      ),
      
      supports256Colors: Effect.sync(() => {
        const colors = detectCapabilities().colors
        return colors === '256' || colors === 'truecolor'
      }),
      
      supportsUnicode: Effect.sync(() => 
        detectCapabilities().unicode
      ),
      
      // Screen Management
      clearToEndOfLine: write(ANSI.clearToEOL),
      
      clearToStartOfLine: write(ANSI.clearToSOL),
      
      clearLine: write(ANSI.clearLine),
      
      clearToEndOfScreen: write(ANSI.clearToEOS),
      
      clearToStartOfScreen: write(ANSI.clearToSOS),
      
      scrollUp: (lines: number) => write(ANSI.scrollUp(lines)),
      
      scrollDown: (lines: number) => write(ANSI.scrollDown(lines)),
      
      // Advanced Features
      setTitle: (title: string) => write(ANSI.setTitle(title)),
      
      bell: write(ANSI.bell),
      
      getCursorPosition: Effect.gen(function* (_) {
        // Implementation for cursor position retrieval
        // This requires sending ANSI escape sequence and reading response
        try {
          yield* _(write(ANSI.requestCursorPosition))
          // In a full implementation, we would:
          // 1. Set stdin to raw mode temporarily
          // 2. Write the cursor position request sequence
          // 3. Read the response from stdin
          // 4. Parse the response (format: \x1b[row;colR)
          // 5. Restore previous stdin mode
          // For now, return current size as fallback
          const size = yield* _(Effect.sync(() => ({
            width: platform.stdout.columns || 80,
            height: platform.stdout.rows || 24,
          })))
          return { x: 1, y: 1 } // Would be parsed from stdin response
        } catch {
          // Fallback if cursor position cannot be determined
          return { x: 1, y: 1 }
        }
      }),
      
      setCursorShape: (shape: 'block' | 'underline' | 'bar') =>
        write(
          shape === 'block' ? ANSI.cursorBlock :
          shape === 'underline' ? ANSI.cursorUnderline :
          ANSI.cursorBar
        ),
      
      setCursorBlink: (enabled: boolean) =>
        write(enabled ? ANSI.cursorBlinkingBlock : ANSI.cursorBlock),
    }
  })
)

/**
 * Create a test/mock Terminal service for testing
 */
export const TerminalServiceTest = Layer.succeed(
  TerminalService,
  {
    clear: Effect.void,
    write: (_text: string) => Effect.void,
    writeLine: (_text: string) => Effect.void,
    moveCursor: (_x: number, _y: number) => Effect.void,
    moveCursorRelative: (_dx: number, _dy: number) => Effect.void,
    hideCursor: Effect.void,
    showCursor: Effect.void,
    getSize: Effect.succeed({ width: 80, height: 24 }),
    setRawMode: (_enabled: boolean) => Effect.void,
    setAlternateScreen: (_enabled: boolean) => Effect.void,
    saveCursor: Effect.void,
    restoreCursor: Effect.void,
    getCapabilities: Effect.succeed({
      colors: 'truecolor',
      unicode: true,
      mouse: true,
      clipboard: false,
      sixel: false,
      kitty: false,
      iterm2: false,
      windowTitle: true,
      columns: 80,
      rows: 24,
    }),
    supportsTrueColor: Effect.succeed(true),
    supports256Colors: Effect.succeed(true),
    supportsUnicode: Effect.succeed(true),
    clearToEndOfLine: Effect.void,
    clearToStartOfLine: Effect.void,
    clearLine: Effect.void,
    clearToEndOfScreen: Effect.void,
    clearToStartOfScreen: Effect.void,
    scrollUp: (_lines: number) => Effect.void,
    scrollDown: (_lines: number) => Effect.void,
    setTitle: (_title: string) => Effect.void,
    bell: Effect.void,
    getCursorPosition: Effect.succeed({ x: 1, y: 1 }),
    setCursorShape: (_shape: 'block' | 'underline' | 'bar') => Effect.void,
    setCursorBlink: (_enabled: boolean) => Effect.void,
  }
)