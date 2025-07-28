/**
 * E2E Test Harness for CLI-Kit Applications
 *
 * This module provides utilities for testing CLI applications by:
 * - Capturing terminal output
 * - Simulating keyboard input
 * - Taking screenshots of terminal state
 * - Recording and replaying sessions
 */

import { Effect, Stream, Queue, Fiber, Ref } from 'effect'
import { spawn, type ChildProcess } from 'child_process'
import * as pty from 'node-pty'
import { writeFileSync } from 'fs'
import { join } from 'path'

// =============================================================================
// Types
// =============================================================================

export interface TestHarnessOptions {
  readonly command: string
  readonly args?: string[]
  readonly env?: Record<string, string>
  readonly cols?: number
  readonly rows?: number
  readonly cwd?: string
  readonly recordSession?: boolean
  readonly screenshotDir?: string
}

export interface KeySequence {
  readonly key: string
  readonly delay?: number // ms to wait after key
}

export interface TerminalSnapshot {
  readonly timestamp: number
  readonly content: string
  readonly cursorX: number
  readonly cursorY: number
  readonly cols: number
  readonly rows: number
}

export interface TestSession {
  readonly start: () => Effect.Effect<void, Error, never>
  readonly stop: () => Effect.Effect<void, Error, never>
  readonly sendKey: (key: string) => Effect.Effect<void, Error, never>
  readonly sendKeys: (keys: KeySequence[]) => Effect.Effect<void, Error, never>
  readonly waitForText: (text: string, timeout?: number) => Effect.Effect<void, Error, never>
  readonly screenshot: (name?: string) => Effect.Effect<string, Error, never>
  readonly getOutput: () => Effect.Effect<string, Error, never>
  readonly clearOutput: () => Effect.Effect<void, Error, never>
}

// =============================================================================
// Implementation
// =============================================================================

class TestHarnessImpl implements TestSession {
  private ptyProcess: pty.IPty | null = null
  private output: string = ''
  private outputRef = Ref.unsafeMake('')
  private screenshotCount = 0

  constructor(private options: TestHarnessOptions) {}

  start(): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(
      function* (_) {
        if (self.ptyProcess) {
          yield* _(Effect.fail(new Error('Test harness already started')))
        }

        // Create pseudo-terminal
        self.ptyProcess = pty.spawn(self.options.command, self.options.args || [], {
          cols: self.options.cols || 80,
          rows: self.options.rows || 24,
          cwd: self.options.cwd || process.cwd(),
          env: { ...process.env, ...self.options.env },
        })

        // Capture output
        self.ptyProcess.on('data', (data: string) => {
          self.output += data
          Effect.runSync(Ref.update(self.outputRef, current => current + data))
        })

        // Wait a bit for process to start
        yield* _(Effect.sleep(100))
      }.bind(this)
    )
  }

  stop(): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(
      function* (_) {
        if (!self.ptyProcess) {
          yield* _(Effect.fail(new Error('Test harness not started')))
        }

        self.ptyProcess.kill()
        self.ptyProcess = null

        // Save final output if recording
        if (self.options.recordSession) {
          const timestamp = new Date().toISOString()
          const filename = `session-${timestamp}.txt`
          writeFileSync(filename, self.output)
        }
      }.bind(this)
    )
  }

  sendKey(key: string): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(function* (_) {
      if (!self.ptyProcess) {
        yield* _(Effect.fail(new Error('Test harness not started')))
      }

      // Handle special keys
      const keyMap: Record<string, string> = {
        enter: '\r',
        tab: '\t',
        backspace: '\x7f',
        escape: '\x1b',
        up: '\x1b[A',
        down: '\x1b[B',
        right: '\x1b[C',
        left: '\x1b[D',
        home: '\x1b[H',
        end: '\x1b[F',
        pageup: '\x1b[5~',
        pagedown: '\x1b[6~',
        delete: '\x1b[3~',
        'ctrl+c': '\x03',
        'ctrl+d': '\x04',
        'ctrl+z': '\x1a',
      }

      const sequence = keyMap[key.toLowerCase()] || key
      self.ptyProcess.write(sequence)

      // Small delay to let the app process the key
      yield* _(Effect.sleep(50))
    })
  }

  sendKeys(keys: KeySequence[]): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(function* (_) {
      for (const { key, delay } of keys) {
        yield* _(self.sendKey(key))
        if (delay) {
          yield* _(Effect.sleep(delay))
        }
      }
    })
  }

  waitForText(text: string, timeout: number = 5000): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(function* (_) {
      const startTime = Date.now()

      while (true) {
        const currentOutput = yield* _(Ref.get(self.outputRef))
        if (currentOutput.includes(text)) {
          return
        }

        if (Date.now() - startTime > timeout) {
          yield* _(Effect.fail(new Error(`Timeout waiting for text: ${text}`)))
        }

        yield* _(Effect.sleep(100))
      }
    })
  }

  screenshot(name?: string): Effect.Effect<string, Error, never> {
    const self = this
    return Effect.gen(function* (_) {
      if (!self.ptyProcess) {
        yield* _(Effect.fail(new Error('Test harness not started')))
      }

      // Get current terminal state
      const snapshot: TerminalSnapshot = {
        timestamp: Date.now(),
        content: self.output,
        cursorX: 0, // Would need to parse from output
        cursorY: 0,
        cols: self.options.cols || 80,
        rows: self.options.rows || 24,
      }

      // Generate filename
      const filename = name || `screenshot-${self.screenshotCount++}.txt`
      const filepath = self.options.screenshotDir
        ? join(self.options.screenshotDir, filename)
        : filename

      // Save screenshot (text representation for now)
      writeFileSync(filepath, JSON.stringify(snapshot, null, 2))

      return filepath
    })
  }

  getOutput(): Effect.Effect<string, Error, never> {
    return Ref.get(this.outputRef)
  }

  clearOutput(): Effect.Effect<void, Error, never> {
    const self = this
    return Effect.gen(function* (_) {
      self.output = ''
      yield* _(Ref.set(self.outputRef, ''))
    })
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a test harness for a CLI application
 */
export const createTestHarness = (options: TestHarnessOptions): TestSession => {
  return new TestHarnessImpl(options)
}

/**
 * Run a test scenario with automatic cleanup
 */
export const runTest = <R, E, A>(
  options: TestHarnessOptions,
  test: (harness: TestSession) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | Error, R> =>
  Effect.gen(function* (_) {
    const harness = createTestHarness(options)

    yield* _(harness.start())

    try {
      return yield* _(test(harness))
    } finally {
      yield* _(harness.stop())
    }
  })

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Capture a series of screenshots while performing actions
 */
export const captureScreenshots = (
  harness: TestSession,
  actions: Array<{ action: Effect.Effect<void, Error, never>; name: string }>
): Effect.Effect<string[], Error, never> =>
  Effect.gen(function* (_) {
    const screenshots: string[] = []

    for (const { action, name } of actions) {
      yield* _(action)
      const path = yield* _(harness.screenshot(name))
      screenshots.push(path)
    }

    return screenshots
  })

/**
 * Create a test script from user actions
 */
export const recordScript = (
  harness: TestSession,
  outputFile: string
): Effect.Effect<void, Error, never> =>
  Effect.gen(function* (_) {
    // This would record all interactions and generate a replayable script
    // For now, just save the session
    const output = yield* _(harness.getOutput())
    writeFileSync(outputFile, output)
  })
