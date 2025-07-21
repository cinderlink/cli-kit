/**
 * Log Transports
 * 
 * Various transports for outputting logs
 */

import { Effect, Queue, Stream, Schedule, Chunk, Fiber } from "effect"
import * as fs from "fs"
import * as path from "path"
import * as zlib from "zlib"
import { promisify } from "util"
import type {
  LogTransport,
  LogEntry,
  LogFormatter,
  ConsoleTransportOptions,
  FileTransportOptions,
  StreamTransportOptions,
  HttpTransportOptions,
  LogLevel,
  InteractiveLogEntry
} from "./types"
import { LogLevels } from "./types"
import { PrettyFormatter, JSONFormatter, CLIFormatter } from "./formatters"

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

export class ConsoleTransport implements LogTransport {
  private formatter: LogFormatter
  private level: number

  constructor(private options: ConsoleTransportOptions = {}) {
    this.formatter = options.format || new PrettyFormatter({
      colorize: options.colorize !== false,
      showTimestamp: options.timestamp !== false,
      showLevel: options.showLevel !== false,
      showMetadata: options.showMetadata !== false,
      showEmoji: true
    })
    this.level = options.level ? LogLevels[options.level] : LogLevels.trace
  }

  write(entry: LogEntry): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      if (LogLevels[entry.level] < this.level) return

      const formatted = this.formatter.format(entry)
      
      if (entry.level === "error" || entry.level === "fatal") {
        console.error(formatted)
      } else {
        console.log(formatted)
      }
    })
  }
}

export class FileTransport implements LogTransport {
  private formatter: LogFormatter
  private level: number
  private stream?: fs.WriteStream
  private currentSize: number = 0
  private fileIndex: number = 0

  constructor(private options: FileTransportOptions) {
    this.formatter = options.format || new JSONFormatter()
    this.level = options.level ? LogLevels[options.level] : LogLevels.trace
    this.initStream()
  }

  private initStream() {
    const filename = this.getFilename()
    this.stream = fs.createWriteStream(filename, {
      flags: this.options.options?.flags || "a",
      encoding: this.options.options?.encoding || "utf8",
      mode: this.options.options?.mode
    })

    // Get current file size
    try {
      const stats = fs.statSync(filename)
      this.currentSize = stats.size
    } catch {
      this.currentSize = 0
    }
  }

  private getFilename(): string {
    if (this.fileIndex === 0) {
      return this.options.filename
    }
    
    const parsed = path.parse(this.options.filename)
    return path.join(parsed.dir, `${parsed.name}.${this.fileIndex}${parsed.ext}`)
  }

  private async rotateLog() {
    if (!this.stream) return

    this.stream.end()
    
    // Compress old file if needed
    if (this.options.zippedArchive) {
      const oldFilename = this.getFilename()
      const compressed = await gzip(fs.readFileSync(oldFilename))
      fs.writeFileSync(`${oldFilename}.gz`, compressed)
      fs.unlinkSync(oldFilename)
    }

    // Move to next file
    this.fileIndex++
    
    // Clean up old files if maxFiles is set
    if (this.options.maxFiles && this.fileIndex > this.options.maxFiles) {
      const oldestFile = path.join(
        path.dirname(this.options.filename),
        `${path.basename(this.options.filename)}.${this.fileIndex - this.options.maxFiles}`
      )
      try {
        fs.unlinkSync(oldestFile)
        fs.unlinkSync(`${oldestFile}.gz`)
      } catch {}
    }

    this.currentSize = 0
    this.initStream()
  }

  write(entry: LogEntry): Effect.Effect<void, never, never> {
    return Effect.async((callback) => {
      if (LogLevels[entry.level] < this.level) {
        callback(Effect.succeed(undefined))
        return
      }

      const formatted = this.formatter.format(entry) + "\n"
      const size = Buffer.byteLength(formatted)

      // Check if rotation is needed
      if (this.options.maxSize) {
        const maxSize = typeof this.options.maxSize === "string" 
          ? this.parseSize(this.options.maxSize)
          : this.options.maxSize

        if (this.currentSize + size > maxSize) {
          this.rotateLog().then(() => {
            this.writeToStream(formatted, size, callback)
          })
          return
        }
      }

      this.writeToStream(formatted, size, callback)
    })
  }

  private writeToStream(
    formatted: string,
    size: number,
    callback: (effect: Effect.Effect<void, never, never>) => void
  ) {
    if (!this.stream) {
      callback(Effect.fail(new Error("Stream not initialized")))
      return
    }

    this.stream.write(formatted, (err) => {
      if (err) {
        callback(Effect.fail(err))
      } else {
        this.currentSize += size
        callback(Effect.succeed(undefined))
      }
    })
  }

  private parseSize(size: string): number {
    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      kb: 1024,
      m: 1024 * 1024,
      mb: 1024 * 1024,
      g: 1024 * 1024 * 1024,
      gb: 1024 * 1024 * 1024
    }

    const match = size.toLowerCase().match(/^(\d+)([a-z]+)?$/)
    if (!match) throw new Error(`Invalid size format: ${size}`)

    const value = parseInt(match[1]!)
    const unit = match[2]! || "b"
    
    return value * (units[unit] || 1)
  }

  close(): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      if (this.stream) {
        this.stream.end()
        this.stream = undefined
      }
    })
  }
}

export class StreamTransport implements LogTransport {
  private formatter: LogFormatter
  private level: number

  constructor(private options: StreamTransportOptions) {
    this.formatter = options.format || new JSONFormatter()
    this.level = options.level ? LogLevels[options.level] : LogLevels.trace
  }

  write(entry: LogEntry): Effect.Effect<void, never, never> {
    return Effect.async((callback) => {
      if (LogLevels[entry.level] < this.level) {
        callback(Effect.succeed(undefined))
        return
      }

      const formatted = this.formatter.format(entry) + "\n"
      
      this.options.stream.write(formatted, (err) => {
        if (err) {
          callback(Effect.fail(err))
        } else {
          callback(Effect.succeed(undefined))
        }
      })
    })
  }
}

export class HttpTransport implements LogTransport {
  private formatter: LogFormatter
  private level: number
  private queue: Queue.Queue<LogEntry> | null = null
  private batchProcessor: any = null

  constructor(private options: HttpTransportOptions) {
    this.formatter = options.format || new JSONFormatter()
    this.level = options.level ? LogLevels[options.level] : LogLevels.trace

    if (options.batch) {
      this.initBatchProcessor()
    }
  }

  private initBatchProcessor() {
    const self = this
    Effect.gen(function* (_) {
      const queue = yield* _(Queue.unbounded<LogEntry>())
      self.queue = queue

      const batchSize = self.options.batchSize || 100
      const batchInterval = self.options.batchInterval || 5000

      self.batchProcessor = yield* _(
        Stream.fromQueue(queue).pipe(
          Stream.groupedWithin(batchSize, Schedule.fixed(batchInterval)),
          Stream.tap((chunk) => self.sendBatch(Chunk.toArray(chunk))),
          Stream.runDrain,
          Effect.fork
        )
      )
    }).pipe(Effect.runPromise)
  }

  write(entry: LogEntry): Effect.Effect<void, never, never> {
    if (LogLevels[entry.level] < this.level) {
      return Effect.void
    }

    if (this.options.batch && this.queue) {
      return Queue.offer(this.queue, entry)
    } else {
      return this.send([entry])
    }
  }

  private send(entries: LogEntry[]): Effect.Effect<void, never, never> {
    return Effect.tryPromise({
      try: async () => {
        const body = entries.map(e => this.formatter.format(e)).join("\n")
        
        const response = await fetch(this.options.url, {
          method: this.options.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.options.headers
          },
          body
        })

        if (!response.ok) {
          throw new Error(`HTTP transport failed: ${response.status} ${response.statusText}`)
        }
      },
      catch: (error) => new Error(`HTTP transport error: ${error}`)
    }).pipe(Effect.asVoid)
  }

  private sendBatch(entries: LogEntry[]): Effect.Effect<void, never, never> {
    if (entries.length === 0) return Effect.void
    return this.send(entries)
  }

  close(): Effect.Effect<void, never, never> {
    if (this.batchProcessor) {
      return Fiber.interrupt(this.batchProcessor)
    }
    return Effect.void
  }
}

/**
 * Interactive TUI Transport for the log explorer
 */
export class TUITransport implements LogTransport {
  private entries: InteractiveLogEntry[] = []
  private updateCallback?: (entries: InteractiveLogEntry[]) => void

  onUpdate(callback: (entries: InteractiveLogEntry[]) => void) {
    this.updateCallback = callback
  }

  write(entry: LogEntry): Effect.Effect<void, never, never> {
    return Effect.sync(() => {
      const interactiveEntry: InteractiveLogEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random()}`,
        expanded: false
      }

      this.entries.push(interactiveEntry)
      
      // Keep only last 10000 entries
      if (this.entries.length > 10000) {
        this.entries = this.entries.slice(-10000)
      }

      if (this.updateCallback) {
        this.updateCallback([...this.entries])
      }
    })
  }

  getEntries(): InteractiveLogEntry[] {
    return [...this.entries]
  }

  clear() {
    this.entries = []
    if (this.updateCallback) {
      this.updateCallback([])
    }
  }
}

