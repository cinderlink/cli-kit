/**
 * Bun-native Log Transports with Effect.ts integration
 * 
 * High-performance logging using Bun's native APIs and streams
 */

import { Effect, Queue, Stream, Schedule, Chunk, Fiber } from "effect"
import { join } from "path"
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

// Bun-native console transport
export class BunConsoleTransport implements LogTransport {
  private formatter: LogFormatter
  private options: ConsoleTransportOptions

  constructor(options: ConsoleTransportOptions = {}) {
    this.options = options
    this.formatter = this.createFormatter()
  }

  private createFormatter(): LogFormatter {
    return new PrettyFormatter({
      colorize: this.options.colorize ?? true,
      showEmoji: this.options.showEmoji ?? true,
      prettyPrint: this.options.prettyPrint ?? true
    })
  }

  async write(entry: LogEntry): Promise<void> {
    const formatted = await this.formatter.format(entry)
    
    // Use Bun's optimized console output
    if (entry.level === 'error') {
      console.error(formatted)
    } else {
      console.log(formatted)
    }
  }

  // Effect-based log processing
  processLogs(logs: Stream.Stream<LogEntry>): Effect.Effect<void> {
    return Stream.runForEach(logs, (entry) => 
      Effect.promise(() => this.write(entry))
    )
  }
}

// Bun-native file transport with streaming
export class BunFileTransport implements LogTransport {
  private formatter: LogFormatter
  private options: FileTransportOptions
  private writeQueue: Queue.Queue<LogEntry>
  private writerFiber: Fiber.RuntimeFiber<void, never> | null = null

  constructor(options: FileTransportOptions) {
    this.options = options
    this.formatter = new JSONFormatter()
    
    // Initialize write queue for batching
    this.writeQueue = Effect.runSync(Queue.bounded<LogEntry>(1000))
    this.startWriter()
  }

  private startWriter(): void {
    const writerEffect = Effect.gen(function* (_) {
      const stream = Stream.fromQueue(this.writeQueue)
      
      // Batch writes for better performance
      const batchedStream = Stream.chunks(
        Stream.buffer(stream, { capacity: 100, strategy: 'dropping' })
      )
      
      yield* _(Stream.runForEach(batchedStream, (chunk) =>
        this.writeBatch(Chunk.toArray(chunk))
      ))
    }.bind(this))

    this.writerFiber = Effect.runFork(writerEffect)
  }

  private writeBatch(entries: LogEntry[]): Effect.Effect<void> {
    return Effect.tryPromise({
      try: async () => {
        // Ensure directory exists
        await Bun.$`mkdir -p ${this.options.dirname || 'logs'}`.quiet()
        
        // Format all entries
        const formatted = await Promise.all(
          entries.map(entry => this.formatter.format(entry))
        )
        
        const content = formatted.join('\n') + '\n'
        const filePath = join(this.options.dirname || 'logs', this.options.filename || 'app.log')
        
        // Use Bun's optimized file writing
        await Bun.write(filePath, content, { flag: 'a' })
        
        // Handle log rotation if needed
        if (this.options.maxSize) {
          await this.checkRotation(filePath)
        }
      },
      catch: (error) => new Error(`Failed to write log batch: ${error}`)
    })
  }

  private async checkRotation(filePath: string): Promise<void> {
    const file = Bun.file(filePath)
    const size = file.size
    
    if (size > (this.options.maxSize! * 1024 * 1024)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const rotatedPath = `${filePath}.${timestamp}`
      
      // Use Bun's move operation
      await Bun.$`mv ${filePath} ${rotatedPath}`.quiet()
      
      // Compress old log if enabled
      if (this.options.compress) {
        await Bun.$`gzip ${rotatedPath}`.quiet()
      }
      
      // Clean up old files
      if (this.options.maxFiles) {
        await this.cleanupOldLogs(filePath)
      }
    }
  }

  private async cleanupOldLogs(basePath: string): Promise<void> {
    const dir = this.options.dirname || 'logs'
    const basename = this.options.filename || 'app.log'
    
    // List old log files
    const result = await Bun.$`find ${dir} -name "${basename}.*" -type f | sort -r`.text()
    const files = result.trim().split('\n').filter(Boolean)
    
    // Remove excess files
    if (files.length > this.options.maxFiles!) {
      const filesToRemove = files.slice(this.options.maxFiles!)
      for (const file of filesToRemove) {
        await Bun.$`rm -f ${file}`.quiet()
      }
    }
  }

  async write(entry: LogEntry): Promise<void> {
    // Queue the entry for batch processing
    await Effect.runPromise(Queue.offer(this.writeQueue, entry))
  }

  processLogs(logs: Stream.Stream<LogEntry>): Effect.Effect<void> {
    return Stream.runForEach(logs, (entry) => 
      Queue.offer(this.writeQueue, entry)
    )
  }

  async close(): Promise<void> {
    if (this.writerFiber) {
      await Effect.runPromise(Fiber.interrupt(this.writerFiber))
    }
  }
}

// Bun-native HTTP transport for remote logging
export class BunHttpTransport implements LogTransport {
  private formatter: LogFormatter
  private options: HttpTransportOptions
  private batchQueue: Queue.Queue<LogEntry>
  private batcherFiber: Fiber.RuntimeFiber<void, never> | null = null

  constructor(options: HttpTransportOptions) {
    this.options = options
    this.formatter = new JSONFormatter()
    
    this.batchQueue = Effect.runSync(Queue.bounded<LogEntry>(1000))
    this.startBatcher()
  }

  private startBatcher(): void {
    const batcherEffect = Effect.gen(function* (_) {
      const stream = Stream.fromQueue(this.batchQueue)
      
      // Batch logs every 5 seconds or 100 entries
      const batchedStream = Stream.chunks(
        Stream.buffer(
          Stream.take(stream, 100),
          { capacity: 100, strategy: 'dropping' }
        )
      )
      
      const scheduledStream = Stream.schedule(
        batchedStream,
        Schedule.fixed('5 seconds')
      )
      
      yield* _(Stream.runForEach(scheduledStream, (chunk) =>
        this.sendBatch(Chunk.toArray(chunk))
      ))
    }.bind(this))

    this.batcherFiber = Effect.runFork(batcherEffect)
  }

  private sendBatch(entries: LogEntry[]): Effect.Effect<void> {
    return Effect.tryPromise({
      try: async () => {
        if (entries.length === 0) return
        
        const formatted = await Promise.all(
          entries.map(entry => this.formatter.format(entry))
        )
        
        const payload = {
          logs: formatted,
          timestamp: new Date().toISOString(),
          source: this.options.source || 'tuix',
          batch_size: entries.length
        }
        
        // Use fetch with Bun's optimizations
        const response = await fetch(this.options.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.options.headers || {})
          },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      },
      catch: (error) => new Error(`Failed to send log batch: ${error}`)
    })
  }

  async write(entry: LogEntry): Promise<void> {
    await Effect.runPromise(Queue.offer(this.batchQueue, entry))
  }

  processLogs(logs: Stream.Stream<LogEntry>): Effect.Effect<void> {
    return Stream.runForEach(logs, (entry) => 
      Queue.offer(this.batchQueue, entry)
    )
  }

  async close(): Promise<void> {
    if (this.batcherFiber) {
      await Effect.runPromise(Fiber.interrupt(this.batcherFiber))
    }
  }
}

// Bun-native stream transport for piping to other processes
export class BunStreamTransport implements LogTransport {
  private formatter: LogFormatter
  private options: StreamTransportOptions
  private writer: WritableStreamDefaultWriter<Uint8Array>

  constructor(options: StreamTransportOptions) {
    this.options = options
    this.formatter = new JSONFormatter()
    
    // Create a writable stream to the target
    const writable = new WritableStream({
      write: (chunk) => {
        if (options.stream?.write) {
          options.stream.write(chunk)
        }
      }
    })
    
    this.writer = writable.getWriter()
  }

  async write(entry: LogEntry): Promise<void> {
    const formatted = await this.formatter.format(entry)
    const encoder = new TextEncoder()
    const chunk = encoder.encode(formatted + '\n')
    
    await this.writer.write(chunk)
  }

  processLogs(logs: Stream.Stream<LogEntry>): Effect.Effect<void> {
    return Stream.runForEach(logs, (entry) => 
      Effect.promise(() => this.write(entry))
    )
  }

  async close(): Promise<void> {
    await this.writer.close()
  }
}

// Factory function for creating transports
export const createBunTransport = (
  type: 'console' | 'file' | 'http' | 'stream',
  options: any
): LogTransport => {
  switch (type) {
    case 'console':
      return new BunConsoleTransport(options)
    case 'file':
      return new BunFileTransport(options)
    case 'http':
      return new BunHttpTransport(options)
    case 'stream':
      return new BunStreamTransport(options)
    default:
      throw new Error(`Unknown transport type: ${type}`)
  }
}