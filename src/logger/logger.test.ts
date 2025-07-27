import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { Effect, Layer } from "effect"
import { 
  Logger,
  createConsoleLogger,
  createDevelopmentLogger,
  ConsoleTransport,
  FileTransport,
  PrettyFormatter,
  JSONFormatter,
  TuixLogger,
  makeLoggerLayer,
  log,
  type LogEntry,
  type LogLevel,
  type LogTransport
} from "./index"

describe("Logger", () => {
  describe("basic logging", () => {
    test("should log info message", async () => {
      const messages: string[] = []
      
      // Create a custom transport that captures messages
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            messages.push(entry.message)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new TestTransport()]
      })
      
      await Effect.runPromise(logger.info("Test info message"))
      
      expect(messages).toContain("Test info message")
    })

    test("should log error message", async () => {
      const messages: string[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            messages.push(entry.message)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "error",
        transports: [new TestTransport()]
      })
      
      await Effect.runPromise(logger.error("Test error message"))
      
      expect(messages).toContain("Test error message")
    })
    
    test("should respect log level filtering", async () => {
      const messages: string[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            messages.push(`${entry.level}: ${entry.message}`)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "warn",
        transports: [new TestTransport()]
      })
      
      await Effect.runPromise(
        Effect.all([
          logger.debug("Debug message"),
          logger.info("Info message"),
          logger.warn("Warn message"),
          logger.error("Error message")
        ])
      )
      
      expect(messages).not.toContain("debug: Debug message")
      expect(messages).not.toContain("info: Info message")
      expect(messages).toContain("warn: Warn message")
      expect(messages).toContain("error: Error message")
    })
  })

  describe("child loggers", () => {
    test("should create child logger with context", async () => {
      const entries: LogEntry[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            entries.push(entry)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new TestTransport()]
      })
      
      const childLogger = logger.child("component")
      await Effect.runPromise(childLogger.info("Child message"))
      
      expect(entries).toHaveLength(1)
      expect(entries[0].context).toContain("component")
    })
    
    test("should create child logger with metadata", async () => {
      const entries: LogEntry[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            entries.push(entry)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new TestTransport()]
      })
      
      const childLogger = logger.child({ userId: "123", module: "auth" })
      await Effect.runPromise(childLogger.info("Action performed"))
      
      expect(entries).toHaveLength(1)
      expect(entries[0].metadata).toMatchObject({ userId: "123", module: "auth" })
    })
  })

  describe("structured logging", () => {
    test("should include metadata in log entries", async () => {
      const entries: LogEntry[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            entries.push(entry)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new TestTransport()]
      })
      
      await Effect.runPromise(
        logger.info("User action", { action: "login", userId: "456" })
      )
      
      expect(entries).toHaveLength(1)
      expect(entries[0].metadata).toMatchObject({
        action: "login",
        userId: "456"
      })
    })
    
    test("should include error details", async () => {
      const entries: LogEntry[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            entries.push(entry)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "error",
        transports: [new TestTransport()]
      })
      
      const testError = new Error("Test error")
      await Effect.runPromise(
        logger.error("Operation failed", testError, { operation: "save" })
      )
      
      expect(entries).toHaveLength(1)
      expect(entries[0].error).toBe(testError)
      expect(entries[0].metadata).toMatchObject({ operation: "save" })
    })
  })

  describe("transport behavior", () => {
    test("should write to multiple transports", async () => {
      const transport1Messages: string[] = []
      const transport2Messages: string[] = []
      
      class TestTransport1 implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            transport1Messages.push(entry.message)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      class TestTransport2 implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            transport2Messages.push(entry.message)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new TestTransport1(), new TestTransport2()]
      })
      
      await Effect.runPromise(logger.info("Test message"))
      
      expect(transport1Messages).toContain("Test message")
      expect(transport2Messages).toContain("Test message")
    })
    
    test("should not fail on transport errors", async () => {
      class FailingTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.fail(new Error("Transport failed"))
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const logger = new TuixLogger({
        level: "info",
        transports: [new FailingTransport()]
      })
      
      // Should not throw
      await expect(
        Effect.runPromise(logger.info("Test message"))
      ).resolves.toBeUndefined()
    })
  })

  describe("layer integration", () => {
    test("should work with makeLoggerLayer", async () => {
      const messages: string[] = []
      
      class TestTransport implements LogTransport {
        write(entry: LogEntry): Effect.Effect<void, never, never> {
          return Effect.sync(() => {
            messages.push(entry.message)
          })
        }
        close(): Effect.Effect<void, never, never> {
          return Effect.void
        }
      }
      
      const loggerLayer = makeLoggerLayer({
        level: "info",
        transports: [new TestTransport()]
      })
      
      await Effect.runPromise(
        Effect.gen(function* () {
          yield* log.info("Test with layer")
        }).pipe(
          Effect.provide(loggerLayer)
        )
      )
      
      expect(messages).toContain("Test with layer")
    })
  })

  describe("console logger factory", () => {
    test("should create console logger with default options", () => {
      const logger = createConsoleLogger()
      expect(logger).toBeInstanceOf(TuixLogger)
    })
    
    test("should create console logger with custom level", () => {
      const logger = createConsoleLogger("debug")
      expect(logger).toBeInstanceOf(TuixLogger)
    })
  })
})