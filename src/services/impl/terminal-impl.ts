/**
 * Terminal Service Implementation - Real terminal operations using Bun APIs
 */

import { Effect, Layer, Ref } from "effect"
import { TerminalService } from "../terminal.ts"
import { TerminalError } from "@/core/errors.ts"
import type { TerminalCapabilities } from "@/core/types.ts"

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
 * Create the live Terminal service implementation
 */
export const TerminalServiceLive = Layer.effect(
  TerminalService,
  Effect.gen(function* (_) {
    const isRawMode = yield* _(Ref.make(false))
    const isAlternateScreen = yield* _(Ref.make(false))
    const capitalize = (operation: string) =>
      operation.charAt(0).toUpperCase() + operation.slice(1)

    const ensureStdout = (operation: string): NodeJS.WriteStream => {
      const current = process.stdout as NodeJS.WriteStream | undefined
      if (!current) {
        throw new TerminalError({
          operation,
          fatal: true,
          message: `${capitalize(operation)} failed: STDOUT is not available`
        })
      }
      if (current.isTTY === false) {
        throw new TerminalError({
          operation,
          fatal: true,
          message: `${capitalize(operation)} failed: Not a TTY terminal`
        })
      }
      return current
    }

    const writeSequence = (operation: string, data: string) =>
      Effect.try({
        try: () => {
          const stream = ensureStdout(operation)
          stream.write(data)
        },
        catch: (error) =>
          error instanceof TerminalError
            ? error
            : new TerminalError({
                operation,
                cause: error,
                message: `${capitalize(operation)} failed: ${error instanceof Error ? error.message : String(error)}`
              })
      })

    const detectCapabilities = (): TerminalCapabilities => {
      const env = process.env
      const term = env.TERM?.toLowerCase() ?? ""
      const colorterm = env.COLORTERM?.toLowerCase() ?? ""
      const colors: TerminalCapabilities["colors"] = colorterm.includes("truecolor") ||
        colorterm.includes("24bit") ||
        term.includes("truecolor") ||
        term.includes("24bit")
        ? "truecolor"
        : term.includes("256color")
          ? "256"
          : "16"

      const locale = env.LC_ALL ?? env.LC_CTYPE ?? env.LANG ?? ""
      const unicode = /utf-?8/i.test(locale)
      const mouse = !!process.stdout && process.stdout.isTTY !== false

      return {
        colors,
        unicode,
        mouse,
        alternateScreen: true,
        cursorShapes: true
      }
    }

    const currentSize = () => {
      const current = process.stdout as NodeJS.WriteStream | undefined
      return {
        width: current?.columns ?? 80,
        height: current?.rows ?? 24
      }
    }

    return {
      // Basic Terminal Operations
      clear: writeSequence("clear", ANSI.clear),

      write: (text: string) => writeSequence("write", text),

      writeLine: (text: string) => writeSequence("write", `${text}\n`),

      moveCursor: (x: number, y: number) => writeSequence("moveCursor", ANSI.cursorTo(x, y)),

      moveCursorRelative: (dx: number, dy: number) =>
        Effect.gen(function* (_) {
          if (dx > 0) yield* _(writeSequence("moveCursor", ANSI.cursorForward(dx)))
          else if (dx < 0) yield* _(writeSequence("moveCursor", ANSI.cursorBack(-dx)))

          if (dy > 0) yield* _(writeSequence("moveCursor", ANSI.cursorDown(dy)))
          else if (dy < 0) yield* _(writeSequence("moveCursor", ANSI.cursorUp(-dy)))
        }),

      hideCursor: writeSequence("hideCursor", ANSI.cursorHide),

      showCursor: writeSequence("showCursor", ANSI.cursorShow),

      // Terminal State Management
      getSize: Effect.sync(currentSize),

      setRawMode: (enabled: boolean) =>
        Effect.gen(function* (_) {
          const currentRawMode = yield* _(Ref.get(isRawMode))
          if (currentRawMode === enabled) return

          const currentStdin = process.stdin as NodeJS.ReadStream | undefined
          if (!currentStdin || typeof currentStdin.setRawMode !== "function" || currentStdin.isTTY === false) {
            yield* _(Ref.set(isRawMode, false))
            return
          }

          yield* _(Effect.try({
            try: () => {
              currentStdin.setRawMode(enabled)
            },
            catch: (error) => new TerminalError({
              operation: "setRawMode",
              cause: error,
              message: `SetRawMode failed: ${error instanceof Error ? error.message : String(error)}`
            })
          }))

          yield* _(Ref.set(isRawMode, enabled))
        }),

      setAlternateScreen: (enabled: boolean) =>
        Effect.gen(function* (_) {
          const current = yield* _(Ref.get(isAlternateScreen))
          if (current === enabled) return

          yield* _(writeSequence("alternateScreen", enabled ? ANSI.alternateScreenEnable : ANSI.alternateScreenDisable))
          yield* _(Ref.set(isAlternateScreen, enabled))
        }),

      saveCursor: writeSequence("saveCursor", ANSI.cursorSave),

      restoreCursor: writeSequence("restoreCursor", ANSI.cursorRestore),

      // Terminal Capabilities
      getCapabilities: Effect.sync(detectCapabilities),

      supportsTrueColor: Effect.sync(() => detectCapabilities().colors === "truecolor"),

      supports256Colors: Effect.sync(() => {
        const colors = detectCapabilities().colors
        return colors === "256" || colors === "truecolor"
      }),

      supportsUnicode: Effect.sync(() => detectCapabilities().unicode),

      // Screen Management
      clearToEndOfLine: writeSequence("clearLine", ANSI.clearToEOL),

      clearToStartOfLine: writeSequence("clearLine", ANSI.clearToSOL),

      clearLine: writeSequence("clearLine", ANSI.clearLine),

      clearToEndOfScreen: writeSequence("clearScreen", ANSI.clearToEOS),

      clearToStartOfScreen: writeSequence("clearScreen", ANSI.clearToSOS),

      scrollUp: (lines: number) => writeSequence("scroll", ANSI.scrollUp(lines)),

      scrollDown: (lines: number) => writeSequence("scroll", ANSI.scrollDown(lines)),

      // Advanced Features
      setTitle: (title: string) => writeSequence("setTitle", ANSI.setTitle(title)),

      bell: writeSequence("bell", ANSI.bell),

      getCursorPosition: Effect.gen(function* (_) {
        yield* _(writeSequence("cursorPosition", ANSI.requestCursorPosition))
        yield* _(Effect.logWarning("getCursorPosition not fully implemented"))
        yield* _(Effect.fail(new TerminalError({
          operation: "cursorPosition",
          message: "Cursor position query not supported in this environment"
        })))
      }),
      
      setCursorShape: (shape: 'block' | 'underline' | 'bar') =>
        writeSequence(
          "cursorShape",
          shape === 'block' ? ANSI.cursorBlock :
          shape === 'underline' ? ANSI.cursorUnderline :
          ANSI.cursorBar
        ),

      setCursorBlink: (enabled: boolean) =>
        writeSequence("cursorBlink", enabled ? ANSI.cursorBlinkingBlock : ANSI.cursorBlock),
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
      alternateScreen: true,
      cursorShapes: true,
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
