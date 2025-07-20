/**
 * Test Harness for CLI-Kit Applications
 * 
 * A lightweight harness using child_process (no PTY dependency required)
 */

import { Effect, Ref } from "effect"
import { spawn, type ChildProcess } from "child_process"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

export interface HarnessOptions {
  readonly command: string
  readonly args?: string[]
  readonly env?: Record<string, string>
  readonly cwd?: string
  readonly screenshotDir?: string
}

export interface TestSession {
  readonly start: () => Effect.Effect<void, Error, never>
  readonly stop: () => Effect.Effect<void, Error, never>
  readonly sendInput: (text: string) => Effect.Effect<void, Error, never>
  readonly waitForOutput: (text: string, timeout?: number) => Effect.Effect<void, Error, never>
  readonly getOutput: () => Effect.Effect<string, Error, never>
  readonly saveScreenshot: (name: string) => Effect.Effect<string, Error, never>
}

class HarnessImpl implements TestSession {
  private process: ChildProcess | null = null
  private outputRef = Ref.unsafeMake("")
  private screenshotCount = 0
  
  constructor(private options: HarnessOptions) {
    if (options.screenshotDir) {
      mkdirSync(options.screenshotDir, { recursive: true })
    }
  }
  
  start(): Effect.Effect<void, Error, never> {
    return Effect.gen((function* (this: HarnessImpl, _: Effect.Adapter) {
      if (this.process) {
        yield* _(Effect.fail(new Error("Process already started")))
      }
      
      this.process = spawn(this.options.command, this.options.args || [], {
        cwd: this.options.cwd || process.cwd(),
        env: { ...process.env, ...this.options.env, FORCE_COLOR: "1" },
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      // Capture output
      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        Effect.runSync(Ref.update(this.outputRef, current => current + text))
      })
      
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        Effect.runSync(Ref.update(this.outputRef, current => current + text))
      })
      
      // Wait for process to start
      yield* _(Effect.sleep(500))
    }).bind(this))
  }
  
  stop(): Effect.Effect<void, Error, never> {
    return Effect.gen((function* (this: HarnessImpl, _: Effect.Adapter) {
      if (!this.process) {
        yield* _(Effect.fail(new Error("Process not started")))
      }
      
      this.process!.kill('SIGTERM')
      this.process = null
      
      yield* _(Effect.sleep(100))
    }).bind(this))
  }
  
  sendInput(text: string): Effect.Effect<void, Error, never> {
    return Effect.gen((function* (this: HarnessImpl, _: Effect.Adapter) {
      if (!this.process || !this.process.stdin) {
        yield* _(Effect.fail(new Error("Process not started or stdin not available")))
      }
      
      this.process!.stdin!.write(text)
      yield* _(Effect.sleep(100))
    }).bind(this))
  }
  
  waitForOutput(text: string, timeout: number = 5000): Effect.Effect<void, Error, never> {
    return Effect.gen((function* (this: HarnessImpl, _: Effect.Adapter) {
      const startTime = Date.now()
      
      while (true) {
        const output = yield* _(Ref.get(this.outputRef))
        if (output.includes(text)) {
          return
        }
        
        if (Date.now() - startTime > timeout) {
          const currentOutput = yield* _(Ref.get(this.outputRef))
          yield* _(Effect.fail(new Error(
            `Timeout waiting for text: "${text}"\nCurrent output:\n${currentOutput}`
          )))
        }
        
        yield* _(Effect.sleep(100))
      }
    }).bind(this))
  }
  
  getOutput(): Effect.Effect<string, Error, never> {
    return Ref.get(this.outputRef)
  }
  
  saveScreenshot(name: string): Effect.Effect<string, Error, never> {
    return Effect.gen((function* (this: HarnessImpl, _: Effect.Adapter) {
      const output = yield* _(this.getOutput())
      const filename = `${name}-${Date.now()}.txt`
      const filepath = this.options.screenshotDir 
        ? join(this.options.screenshotDir, filename)
        : filename
      
      writeFileSync(filepath, output)
      return filepath
    }).bind(this))
  }
}

export const createHarness = (options: HarnessOptions): TestSession => {
  return new HarnessImpl(options)
}

export const runSimpleTest = <R, E, A>(
  options: HarnessOptions,
  test: (harness: TestSession) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | Error, R> =>
  Effect.gen(function* (_) {
    const harness = createHarness(options)
    
    yield* _(harness.start())
    
    try {
      return yield* _(test(harness))
    } finally {
      yield* _(harness.stop())
    }
  })