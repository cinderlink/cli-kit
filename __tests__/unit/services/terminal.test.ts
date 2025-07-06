/**
 * Tests for Terminal Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "bun:test"
import { Effect, Layer, Ref } from "effect"
import { TerminalService } from "@/services/terminal"
import { TerminalError } from "@/core/errors"
import type { WindowSize, TerminalCapabilities } from "@/core/types"

// Mock implementation for testing
const createMockTerminalService = (options?: {
  shouldFailWrite?: boolean
  shouldFailClear?: boolean
  shouldFailMoveCursor?: boolean
  shouldFailGetSize?: boolean
  shouldFailCapabilities?: boolean
  customCapabilities?: Partial<TerminalCapabilities>
}) => {
  let output = ""
  let cursorPosition = { x: 1, y: 1 }
  let cursorVisible = true
  let rawMode = false
  let alternateScreen = false
  let savedCursorPosition = { x: 1, y: 1 }
  let scrollOffset = 0
  let cursorShape: 'block' | 'underline' | 'bar' = 'block'
  let cursorBlinking = true
  let terminalTitle = ''
  let bellRung = false
  
  const mockService: TerminalService['Type'] = {
    clear: options?.shouldFailClear ? 
      Effect.fail(new TerminalError({ operation: "clear", cause: new Error("Clear failed") })) :
      Effect.sync(() => {
        output = ""
      }),
    
    write: (text: string) => options?.shouldFailWrite ? 
      Effect.fail(new TerminalError({ operation: "write", cause: new Error("Write failed") })) :
      Effect.sync(() => {
        output += text
      }),
    
    writeLine: (text: string) => Effect.sync(() => {
      output += text + "\n"
    }),
    
    moveCursor: (x: number, y: number) => options?.shouldFailMoveCursor ? 
      Effect.fail(new TerminalError({ operation: "moveCursor", cause: new Error("Move cursor failed") })) :
      Effect.sync(() => {
        cursorPosition = { x, y }
      }),
    
    moveCursorRelative: (dx: number, dy: number) => Effect.sync(() => {
      cursorPosition.x += dx
      cursorPosition.y += dy
    }),
    
    hideCursor: Effect.sync(() => {
      cursorVisible = false
    }),
    
    showCursor: Effect.sync(() => {
      cursorVisible = true
    }),
    
    getSize: options?.shouldFailGetSize ? 
      Effect.fail(new TerminalError({ operation: "getSize", cause: new Error("Get size failed") })) :
      Effect.succeed({ width: 80, height: 24 }),
    
    setRawMode: (enabled: boolean) => Effect.sync(() => {
      rawMode = enabled
    }),
    
    setAlternateScreen: (enabled: boolean) => Effect.sync(() => {
      alternateScreen = enabled
    }),
    
    saveCursor: Effect.sync(() => {
      savedCursorPosition = { ...cursorPosition }
    }),
    
    restoreCursor: Effect.sync(() => {
      cursorPosition = { ...savedCursorPosition }
    }),
    
    getCapabilities: options?.shouldFailCapabilities ? 
      Effect.fail(new TerminalError({ operation: "getCapabilities", cause: new Error("Get capabilities failed") })) :
      Effect.succeed({
        colors: 'truecolor',
        unicode: true,
        mouse: true,
        alternateScreen: true,
        cursorShapes: true,
        ...options?.customCapabilities
      } as TerminalCapabilities),
    
    supportsTrueColor: Effect.succeed(options?.customCapabilities?.colors ? options.customCapabilities.colors === 'truecolor' : true),
    supports256Colors: Effect.succeed(options?.customCapabilities?.colors ? (options.customCapabilities.colors === '256' || options.customCapabilities.colors === 'truecolor') : true),
    supportsUnicode: Effect.succeed(options?.customCapabilities?.unicode ?? true),
    
    clearToEndOfLine: Effect.sync(() => {
      // Mock clearing to end of line
      const lines = output.split('\n')
      if (lines.length > 0) {
        lines[lines.length - 1] = ''
        output = lines.join('\n')
      }
    }),
    
    clearToStartOfLine: Effect.sync(() => {
      // Mock clearing to start of line
      const lines = output.split('\n')
      if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1].replace(/^.*/, '')
        output = lines.join('\n')
      }
    }),
    
    clearLine: Effect.sync(() => {
      // Mock clearing entire line
      const lines = output.split('\n')
      if (lines.length > 0) {
        lines[lines.length - 1] = ''
        output = lines.join('\n')
      }
    }),
    
    clearToEndOfScreen: Effect.sync(() => {
      // Mock clearing to end of screen
      output = ''
    }),
    
    clearToStartOfScreen: Effect.sync(() => {
      // Mock clearing to start of screen
      output = ''
    }),
    
    scrollUp: (lines: number) => Effect.sync(() => {
      scrollOffset -= lines
    }),
    
    scrollDown: (lines: number) => Effect.sync(() => {
      scrollOffset += lines
    }),
    
    setTitle: (title: string) => Effect.sync(() => {
      terminalTitle = title
    }),
    
    bell: Effect.sync(() => {
      bellRung = true
    }),
    
    getCursorPosition: Effect.sync(() => cursorPosition),
    
    setCursorShape: (shape: 'block' | 'underline' | 'bar') => Effect.sync(() => {
      cursorShape = shape
    }),
    
    setCursorBlink: (enabled: boolean) => Effect.sync(() => {
      cursorBlinking = enabled
    })
  }
  
  return {
    service: mockService,
    getOutput: () => output,
    getCursorPosition: () => cursorPosition,
    isCursorVisible: () => cursorVisible,
    isRawMode: () => rawMode,
    isAlternateScreen: () => alternateScreen,
    getScrollOffset: () => scrollOffset,
    getCursorShape: () => cursorShape,
    isCursorBlinking: () => cursorBlinking,
    getTerminalTitle: () => terminalTitle,
    wasBellRung: () => bellRung,
    resetBell: () => { bellRung = false }
  }
}

describe("TerminalService", () => {
  describe("Basic Terminal Operations", () => {
    it("clears the terminal", async () => {
      const { service, getOutput } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.write("Hello"))
          yield* _(terminal.clear)
        }).pipe(Effect.provide(layer))
      )
      
      expect(getOutput()).toBe("")
    })
    
    it("writes text without newline", async () => {
      const { service, getOutput } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.write("Hello"))
          yield* _(terminal.write(" World"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getOutput()).toBe("Hello World")
    })
    
    it("writes text with newline", async () => {
      const { service, getOutput } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.writeLine("Line 1"))
          yield* _(terminal.writeLine("Line 2"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getOutput()).toBe("Line 1\nLine 2\n")
    })
  })
  
  describe("Cursor Management", () => {
    it("moves cursor to absolute position", async () => {
      const { service, getCursorPosition } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(10, 5))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getCursorPosition()).toEqual({ x: 10, y: 5 })
    })
    
    it("moves cursor relative to current position", async () => {
      const { service, getCursorPosition } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(5, 5))
          yield* _(terminal.moveCursorRelative(3, -2))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getCursorPosition()).toEqual({ x: 8, y: 3 })
    })
    
    it("hides and shows cursor", async () => {
      const { service, isCursorVisible } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.hideCursor)
          const hiddenState = isCursorVisible()
          yield* _(terminal.showCursor)
          const visibleState = isCursorVisible()
          
          expect(hiddenState).toBe(false)
          expect(visibleState).toBe(true)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("saves and restores cursor position", async () => {
      const { service, getCursorPosition } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(10, 10))
          yield* _(terminal.saveCursor)
          yield* _(terminal.moveCursor(20, 20))
          yield* _(terminal.restoreCursor)
        }).pipe(Effect.provide(layer))
      )
      
      expect(getCursorPosition()).toEqual({ x: 10, y: 10 })
    })
  })
  
  describe("Terminal State", () => {
    it("gets terminal size", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      const size = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.getSize)
        }).pipe(Effect.provide(layer))
      )
      
      expect(size).toEqual({ width: 80, height: 24 })
    })
    
    it("sets raw mode", async () => {
      const { service, isRawMode } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setRawMode(true))
          const rawEnabled = isRawMode()
          yield* _(terminal.setRawMode(false))
          const rawDisabled = isRawMode()
          
          expect(rawEnabled).toBe(true)
          expect(rawDisabled).toBe(false)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("sets alternate screen", async () => {
      const { service, isAlternateScreen } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setAlternateScreen(true))
          const altEnabled = isAlternateScreen()
          yield* _(terminal.setAlternateScreen(false))
          const altDisabled = isAlternateScreen()
          
          expect(altEnabled).toBe(true)
          expect(altDisabled).toBe(false)
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Terminal Capabilities", () => {
    it("detects terminal capabilities", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      const capabilities = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.getCapabilities)
        }).pipe(Effect.provide(layer))
      )
      
      expect(capabilities.colors).toBe('truecolor')
      expect(capabilities.unicode).toBe(true)
      expect(capabilities.mouse).toBe(true)
    })
    
    it("checks color support", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      const [trueColor, colors256] = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          const tc = yield* _(terminal.supportsTrueColor)
          const c256 = yield* _(terminal.supports256Colors)
          return [tc, c256]
        }).pipe(Effect.provide(layer))
      )
      
      expect(trueColor).toBe(true)
      expect(colors256).toBe(true)
    })
    
    it("checks unicode support", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      const unicode = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.supportsUnicode)
        }).pipe(Effect.provide(layer))
      )
      
      expect(unicode).toBe(true)
    })
  })
  
  describe("Screen Management", () => {
    it("clears lines", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      // Just test that these methods don't throw
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.clearLine)
          yield* _(terminal.clearToEndOfLine)
          yield* _(terminal.clearToStartOfLine)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("clears screen regions", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.clearToEndOfScreen)
          yield* _(terminal.clearToStartOfScreen)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("scrolls screen", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.scrollUp(5))
          yield* _(terminal.scrollDown(3))
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Advanced Features", () => {
    it("sets terminal title", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setTitle("My App"))
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("rings terminal bell", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.bell)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("gets cursor position", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      const position = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(15, 10))
          return yield* _(terminal.getCursorPosition)
        }).pipe(Effect.provide(layer))
      )
      
      expect(position).toEqual({ x: 15, y: 10 })
    })
    
    it("sets cursor shape", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setCursorShape('block'))
          yield* _(terminal.setCursorShape('underline'))
          yield* _(terminal.setCursorShape('bar'))
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("sets cursor blink", async () => {
      const { service } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setCursorBlink(true))
          yield* _(terminal.setCursorBlink(false))
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Error Handling", () => {
    it("handles write errors", async () => {
      const { service } = createMockTerminalService({ shouldFailWrite: true })
      const layer = Layer.succeed(TerminalService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.write("test"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("handles clear errors", async () => {
      const { service } = createMockTerminalService({ shouldFailClear: true })
      const layer = Layer.succeed(TerminalService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.clear)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("handles moveCursor errors", async () => {
      const { service } = createMockTerminalService({ shouldFailMoveCursor: true })
      const layer = Layer.succeed(TerminalService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(10, 10))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("handles getSize errors", async () => {
      const { service } = createMockTerminalService({ shouldFailGetSize: true })
      const layer = Layer.succeed(TerminalService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.getSize)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("handles getCapabilities errors", async () => {
      const { service } = createMockTerminalService({ shouldFailCapabilities: true })
      const layer = Layer.succeed(TerminalService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.getCapabilities)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
  })
  
  describe("Advanced Screen Operations", () => {
    it("performs advanced clearing operations", async () => {
      const { service, getOutput } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.write("Line 1\nLine 2\nLine 3"))
          yield* _(terminal.clearToEndOfLine)
          yield* _(terminal.clearToStartOfLine)
          yield* _(terminal.clearLine)
          yield* _(terminal.clearToEndOfScreen)
          yield* _(terminal.clearToStartOfScreen)
        }).pipe(Effect.provide(layer))
      )
      
      // Verify the clearing operations don't throw
      expect(getOutput()).toBe("")
    })
    
    it("handles scrolling operations", async () => {
      const { service, getScrollOffset } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.scrollUp(5))
          yield* _(terminal.scrollDown(3))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getScrollOffset()).toBe(-2) // 5 up, 3 down = -2
    })
  })
  
  describe("Terminal Title and Bell", () => {
    it("sets terminal title", async () => {
      const { service, getTerminalTitle } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setTitle("My Application"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getTerminalTitle()).toBe("My Application")
    })
    
    it("rings terminal bell", async () => {
      const { service, wasBellRung, resetBell } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      resetBell()
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.bell)
        }).pipe(Effect.provide(layer))
      )
      
      expect(wasBellRung()).toBe(true)
    })
  })
  
  describe("Cursor Shape and Blinking", () => {
    it("sets cursor shape", async () => {
      const { service, getCursorShape } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setCursorShape('block'))
          const blockShape = getCursorShape()
          yield* _(terminal.setCursorShape('underline'))
          const underlineShape = getCursorShape()
          yield* _(terminal.setCursorShape('bar'))
          const barShape = getCursorShape()
          
          expect(blockShape).toBe('block')
          expect(underlineShape).toBe('underline')
          expect(barShape).toBe('bar')
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("sets cursor blinking", async () => {
      const { service, isCursorBlinking } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.setCursorBlink(false))
          const blinkDisabled = isCursorBlinking()
          yield* _(terminal.setCursorBlink(true))
          const blinkEnabled = isCursorBlinking()
          
          expect(blinkDisabled).toBe(false)
          expect(blinkEnabled).toBe(true)
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Capability Variations", () => {
    it("handles different color support levels", async () => {
      const testCases = [
        { colors: '16' as const, expectedTrueColor: false, expected256: false },
        { colors: '256' as const, expectedTrueColor: false, expected256: true },
        { colors: 'truecolor' as const, expectedTrueColor: true, expected256: true }
      ]
      
      for (const testCase of testCases) {
        const { service } = createMockTerminalService({ 
          customCapabilities: { colors: testCase.colors } 
        })
        const layer = Layer.succeed(TerminalService, service)
        
        const [trueColor, colors256] = await Effect.runPromise(
          Effect.gen(function* (_) {
            const terminal = yield* _(TerminalService)
            const tc = yield* _(terminal.supportsTrueColor)
            const c256 = yield* _(terminal.supports256Colors)
            return [tc, c256]
          }).pipe(Effect.provide(layer))
        )
        
        expect(trueColor).toBe(testCase.expectedTrueColor)
        expect(colors256).toBe(testCase.expected256)
      }
    })
    
    it("handles unicode support variations", async () => {
      const { service } = createMockTerminalService({ 
        customCapabilities: { unicode: false } 
      })
      const layer = Layer.succeed(TerminalService, service)
      
      const unicode = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.supportsUnicode)
        }).pipe(Effect.provide(layer))
      )
      
      expect(unicode).toBe(false)
    })
    
    it("returns complete capabilities object", async () => {
      const { service } = createMockTerminalService({ 
        customCapabilities: { 
          colors: '256',
          unicode: false,
          mouse: false,
          alternateScreen: false,
          cursorShapes: false
        } 
      })
      const layer = Layer.succeed(TerminalService, service)
      
      const capabilities = await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          return yield* _(terminal.getCapabilities)
        }).pipe(Effect.provide(layer))
      )
      
      expect(capabilities.colors).toBe('256')
      expect(capabilities.unicode).toBe(false)
      expect(capabilities.mouse).toBe(false)
      expect(capabilities.alternateScreen).toBe(false)
      expect(capabilities.cursorShapes).toBe(false)
    })
  })
  
  describe("Edge Cases and Input Validation", () => {
    it("handles empty text input", async () => {
      const { service, getOutput } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.write(""))
          yield* _(terminal.writeLine(""))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getOutput()).toBe("\n")
    })
    
    it("handles negative cursor movements", async () => {
      const { service, getCursorPosition } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(10, 10))
          yield* _(terminal.moveCursorRelative(-5, -3))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getCursorPosition()).toEqual({ x: 5, y: 7 })
    })
    
    it("handles zero scroll amounts", async () => {
      const { service, getScrollOffset } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.scrollUp(0))
          yield* _(terminal.scrollDown(0))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getScrollOffset()).toBe(0)
    })
    
    it("handles multiple cursor operations", async () => {
      const { service, getCursorPosition, isCursorVisible } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          yield* _(terminal.moveCursor(5, 5))
          yield* _(terminal.saveCursor)
          yield* _(terminal.hideCursor)
          yield* _(terminal.moveCursor(20, 20))
          yield* _(terminal.restoreCursor)
          yield* _(terminal.showCursor)
        }).pipe(Effect.provide(layer))
      )
      
      expect(getCursorPosition()).toEqual({ x: 5, y: 5 })
      expect(isCursorVisible()).toBe(true)
    })
  })
  
  describe("Complex Sequences", () => {
    it("handles complex terminal operations sequence", async () => {
      const { service, getOutput, getCursorPosition, isRawMode, isAlternateScreen } = createMockTerminalService()
      const layer = Layer.succeed(TerminalService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          
          // Setup terminal
          yield* _(terminal.setRawMode(true))
          yield* _(terminal.setAlternateScreen(true))
          yield* _(terminal.clear)
          
          // Write content
          yield* _(terminal.write("Hello "))
          yield* _(terminal.writeLine("World!"))
          yield* _(terminal.write("Line 2"))
          
          // Cursor operations
          yield* _(terminal.moveCursor(1, 1))
          yield* _(terminal.moveCursorRelative(5, 0))
          
          // Cleanup
          yield* _(terminal.setRawMode(false))
          yield* _(terminal.setAlternateScreen(false))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getOutput()).toBe("Hello World!\nLine 2")
      expect(getCursorPosition()).toEqual({ x: 6, y: 1 })
      expect(isRawMode()).toBe(false)
      expect(isAlternateScreen()).toBe(false)
    })
  })
})

// Additional tests for comprehensive coverage
describe("TerminalService Integration", () => {
  it("provides correct service type", () => {
    const { service } = createMockTerminalService()
    
    // Verify all required methods exist
    expect(typeof service.clear).toBe('object')
    expect(typeof service.write).toBe('function')
    expect(typeof service.writeLine).toBe('function')
    expect(typeof service.moveCursor).toBe('function')
    expect(typeof service.moveCursorRelative).toBe('function')
    expect(typeof service.hideCursor).toBe('object')
    expect(typeof service.showCursor).toBe('object')
    expect(typeof service.getSize).toBe('object')
    expect(typeof service.setRawMode).toBe('function')
    expect(typeof service.setAlternateScreen).toBe('function')
    expect(typeof service.saveCursor).toBe('object')
    expect(typeof service.restoreCursor).toBe('object')
    expect(typeof service.getCapabilities).toBe('object')
    expect(typeof service.supportsTrueColor).toBe('object')
    expect(typeof service.supports256Colors).toBe('object')
    expect(typeof service.supportsUnicode).toBe('object')
    expect(typeof service.clearToEndOfLine).toBe('object')
    expect(typeof service.clearToStartOfLine).toBe('object')
    expect(typeof service.clearLine).toBe('object')
    expect(typeof service.clearToEndOfScreen).toBe('object')
    expect(typeof service.clearToStartOfScreen).toBe('object')
    expect(typeof service.scrollUp).toBe('function')
    expect(typeof service.scrollDown).toBe('function')
    expect(typeof service.setTitle).toBe('function')
    expect(typeof service.bell).toBe('object')
    expect(typeof service.getCursorPosition).toBe('object')
    expect(typeof service.setCursorShape).toBe('function')
    expect(typeof service.setCursorBlink).toBe('function')
  })
})