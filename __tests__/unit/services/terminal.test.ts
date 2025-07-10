/**
 * Tests for Terminal Service
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"
import { Effect, Context, Layer } from "effect"
import { TerminalService } from "@/services/terminal"
import { TerminalServiceLive } from "@/services/impl/terminal-impl"
import { TerminalError } from "@/core/errors"
import type { WindowSize, TerminalCapabilities } from "@/core/types"

describe("Terminal Service", () => {
  let originalStdout: any
  let originalStderr: any
  let mockWrite: any
  let mockColumns: number
  let mockRows: number

  beforeEach(() => {
    // Mock process.stdout and process.stderr
    originalStdout = process.stdout
    originalStderr = process.stderr
    mockWrite = mock(() => true)
    mockColumns = 80
    mockRows = 24

    process.stdout = {
      write: mockWrite,
      columns: mockColumns,
      rows: mockRows,
      isTTY: true
    } as any

    process.stderr = {
      write: mock(() => true),
      isTTY: true
    } as any
  })

  afterEach(() => {
    process.stdout = originalStdout
    process.stderr = originalStderr
  })

  describe("basic operations", () => {
    it("clears the screen", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.clear
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Should write ANSI clear sequence
      expect(mockWrite).toHaveBeenCalledWith("\x1b[2J\x1b[H")
    })

    it("writes text without newline", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.write("Hello, World!")
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("Hello, World!")
    })

    it("writes text with newline", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.writeLine("Hello, World!")
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("Hello, World!\n")
    })

    it("moves cursor to absolute position", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.moveCursor(10, 5)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // ANSI sequence for cursor position (1-indexed)
      expect(mockWrite).toHaveBeenCalledWith("\x1b[5;10H")
    })

    it("moves cursor relatively", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          
          // Test all directions
          yield* terminal.moveCursorRelative(3, 0)   // Right
          yield* terminal.moveCursorRelative(-2, 0)  // Left
          yield* terminal.moveCursorRelative(0, 4)   // Down
          yield* terminal.moveCursorRelative(0, -1)  // Up
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[3C")  // Right
      expect(mockWrite).toHaveBeenCalledWith("\x1b[2D")  // Left (back)
      expect(mockWrite).toHaveBeenCalledWith("\x1b[4B")  // Down
      expect(mockWrite).toHaveBeenCalledWith("\x1b[1A")  // Up
    })

    it("handles cursor visibility", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.hideCursor
          yield* terminal.showCursor
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[?25l") // Hide
      expect(mockWrite).toHaveBeenCalledWith("\x1b[?25h") // Show
    })
  })

  describe("state management", () => {
    it("gets terminal size", async () => {
      const size = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.getSize
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(size).toEqual({ width: 80, height: 24 })
    })

    it("handles missing terminal size", async () => {
      process.stdout.columns = undefined
      process.stdout.rows = undefined

      const size = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.getSize
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Should return default size
      expect(size).toEqual({ width: 80, height: 24 })
    })

    it("sets raw mode", async () => {
      const setRawModeMock = mock(() => {})
      process.stdin = {
        setRawMode: setRawModeMock,
        isTTY: true
      } as any

      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setRawMode(true)
          yield* terminal.setRawMode(false)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(setRawModeMock).toHaveBeenCalledWith(true)
      expect(setRawModeMock).toHaveBeenCalledWith(false)
    })

    it("handles non-TTY for raw mode", async () => {
      process.stdin = { isTTY: false } as any

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setRawMode(true)
          return "success"
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Should succeed silently on non-TTY
      expect(result).toBe("success")
    })

    it("manages alternate screen buffer", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setAlternateScreen(true)
          yield* terminal.setAlternateScreen(false)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[?1049h") // Enable
      expect(mockWrite).toHaveBeenCalledWith("\x1b[?1049l") // Disable
    })

    it("saves and restores cursor position", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.saveCursor
          yield* terminal.restoreCursor
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b7")  // Save
      expect(mockWrite).toHaveBeenCalledWith("\x1b8")  // Restore
    })
  })

  describe("capabilities detection", () => {
    it("detects terminal capabilities from environment", async () => {
      // Set up environment for true color support
      process.env.COLORTERM = "truecolor"
      process.env.TERM = "xterm-256color"
      process.env.LANG = "en_US.UTF-8"

      const capabilities = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.getCapabilities
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(capabilities.colors).toBe("truecolor")
      expect(capabilities.unicode).toBe(true)
      expect(capabilities.alternateScreen).toBe(true)
    })

    it("detects 256 color support", async () => {
      delete process.env.COLORTERM
      process.env.TERM = "xterm-256color"

      const capabilities = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.getCapabilities
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(capabilities.colors).toBe("256")
    })

    it("detects basic 16 color support", async () => {
      delete process.env.COLORTERM
      process.env.TERM = "xterm"

      const capabilities = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.getCapabilities
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(capabilities.colors).toBe("16")
    })

    it("checks individual color support methods", async () => {
      process.env.COLORTERM = "truecolor"
      process.env.TERM = "xterm-256color"

      const [trueColor, colors256] = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* Effect.all([
            terminal.supportsTrueColor,
            terminal.supports256Colors
          ])
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(trueColor).toBe(true)
      expect(colors256).toBe(true)
    })

    it("checks unicode support", async () => {
      process.env.LANG = "en_US.UTF-8"

      const unicode = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.supportsUnicode
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(unicode).toBe(true)
    })

    it("handles non-unicode locale", async () => {
      process.env.LANG = "C"

      const unicode = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.supportsUnicode
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(unicode).toBe(false)
    })
  })

  describe("screen management", () => {
    it("clears line regions", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.clearToEndOfLine
          yield* terminal.clearToStartOfLine
          yield* terminal.clearLine
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[0K") // To EOL
      expect(mockWrite).toHaveBeenCalledWith("\x1b[1K") // To SOL
      expect(mockWrite).toHaveBeenCalledWith("\x1b[2K") // Entire line
    })

    it("clears screen regions", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.clearToEndOfScreen
          yield* terminal.clearToStartOfScreen
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[0J") // To EOS
      expect(mockWrite).toHaveBeenCalledWith("\x1b[1J") // To SOS
    })

    it("scrolls the terminal", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.scrollUp(5)
          yield* terminal.scrollDown(3)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[5S") // Scroll up
      expect(mockWrite).toHaveBeenCalledWith("\x1b[3T") // Scroll down
    })
  })

  describe("advanced features", () => {
    it("sets terminal title", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setTitle("My TUI App")
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b]0;My TUI App\x07")
    })

    it("rings terminal bell", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.bell
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x07")
    })

    it("gets cursor position", async () => {
      // This is tricky to test as it requires terminal response
      // For now, we'll test that it makes the request
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          // The implementation might timeout or fail in tests
          const result = yield* terminal.getCursorPosition.pipe(
            Effect.either
          )
          
          // We expect it to fail in test environment
          expect(result._tag).toBe("Left")
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Should have sent the cursor position request
      expect(mockWrite).toHaveBeenCalledWith("\x1b[6n")
    })

    it("sets cursor shape", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setCursorShape('block')
          yield* terminal.setCursorShape('underline')
          yield* terminal.setCursorShape('bar')
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(mockWrite).toHaveBeenCalledWith("\x1b[1 q") // Block
      expect(mockWrite).toHaveBeenCalledWith("\x1b[3 q") // Underline
      expect(mockWrite).toHaveBeenCalledWith("\x1b[5 q") // Bar
    })

    it("sets cursor blink", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          yield* terminal.setCursorBlink(true)
          yield* terminal.setCursorBlink(false)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Blink is controlled via cursor shape codes
      expect(mockWrite).toHaveBeenCalledTimes(2)
    })
  })

  describe("error handling", () => {
    it("handles write errors", async () => {
      mockWrite.mockImplementation(() => {
        throw new Error("Write failed")
      })

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.write("test").pipe(Effect.either)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(TerminalError)
        expect(result.left.message).toContain("Write failed")
      }
    })

    it("handles non-TTY terminals", async () => {
      process.stdout.isTTY = false

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.clear.pipe(Effect.either)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Should fail for non-TTY
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.message).toContain("Not a TTY")
      }
    })

    it("handles missing stdout", async () => {
      process.stdout = undefined as any

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          return yield* terminal.write("test").pipe(Effect.either)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left.fatal).toBe(true)
      }
    })
  })

  describe("integration scenarios", () => {
    it("performs full screen setup and teardown", async () => {
      await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          
          // Setup
          yield* terminal.setAlternateScreen(true)
          yield* terminal.hideCursor
          yield* terminal.clear
          
          // Do some work
          yield* terminal.moveCursor(10, 5)
          yield* terminal.write("Hello, TUI!")
          
          // Teardown
          yield* terminal.clear
          yield* terminal.showCursor
          yield* terminal.setAlternateScreen(false)
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      // Verify sequence
      const calls = mockWrite.mock.calls.map((call: any) => call[0])
      expect(calls).toContain("\x1b[?1049h") // Enter alternate screen
      expect(calls).toContain("\x1b[?25l")   // Hide cursor
      expect(calls).toContain("\x1b[2J\x1b[H") // Clear
      expect(calls).toContain("Hello, TUI!")
      expect(calls).toContain("\x1b[?25h")   // Show cursor
      expect(calls).toContain("\x1b[?1049l") // Leave alternate screen
    })

    it("handles terminal resize gracefully", async () => {
      const sizes = await Effect.runPromise(
        Effect.gen(function* () {
          const terminal = yield* TerminalService
          
          const size1 = yield* terminal.getSize
          
          // Simulate resize
          process.stdout.columns = 120
          process.stdout.rows = 40
          
          const size2 = yield* terminal.getSize
          
          return [size1, size2]
        }).pipe(
          Effect.provide(TerminalServiceLive)
        )
      )

      expect(sizes[0]).toEqual({ width: 80, height: 24 })
      expect(sizes[1]).toEqual({ width: 120, height: 40 })
    })
  })
})