/**
 * File Log Output
 * 
 * This module provides file-based log output with rotation, compression,
 * and efficient storage management.
 * 
 * @module plugins/core/outputs/file-output
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as zlib from 'zlib'
import { createWriteStream, WriteStream, createReadStream } from 'fs'
import { pipeline } from 'stream/promises'
import { LogOutput, LogEntry, LoggerConfig, LogRotationError, parseSize, formatSize } from '../types'
import { LogIndex } from '../log-index'

/**
 * File output implementation with rotation support
 */
export class FileLogOutput implements LogOutput {
  private config: LoggerConfig
  private currentFile: string
  private writeStream: WriteStream | null = null
  private bytesWritten = 0
  private rotationTimer: NodeJS.Timer | null = null
  private isInitialized = false
  private logIndex: LogIndex | null = null

  constructor(config: LoggerConfig) {
    this.config = config
    
    // Determine log file path
    if (config.file?.path) {
      this.currentFile = path.resolve(config.file.path)
    } else {
      // Default to logs directory
      const logDir = path.join(process.cwd(), 'logs')
      this.currentFile = path.join(logDir, 'tuix.log')
    }
    
    // Initialize log index if indexing is enabled
    if (config.file?.enableIndexing !== false) {
      const indexPath = path.join(path.dirname(this.currentFile), 'log-index.json')
      this.logIndex = new LogIndex(indexPath)
    }
  }

  /**
   * Initialize file output
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Ensure log directory exists
      await this.createLogDirectory()
      
      // Open log file for writing
      await this.openLogFile()
      
      // Schedule rotation checks if configured
      this.scheduleRotation()
      
      // Initialize log index
      if (this.logIndex) {
        await this.logIndex.load()
        await this.logIndex.indexLogFile(this.currentFile)
      }
      
      this.isInitialized = true
      
    } catch (error) {
      throw new Error(`Failed to initialize file output: ${error}`)
    }
  }

  /**
   * Write log entry to file
   */
  write(entry: LogEntry): void {
    if (!this.writeStream || !this.isInitialized) {
      console.error('File output not initialized, cannot write log entry')
      return
    }

    try {
      const formatted = this.format(entry) + '\n'
      const bytes = Buffer.byteLength(formatted, 'utf8')
      
      this.writeStream.write(formatted)
      this.bytesWritten += bytes
      
      // Check if rotation is needed
      if (this.shouldRotate()) {
        // Schedule rotation on next tick to avoid blocking
        setImmediate(() => this.rotateLog().catch(error => {
          console.error('Log rotation failed:', error)
        }))
      }
      
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  /**
   * Check if entry should be logged to file
   */
  shouldLog(entry: LogEntry): boolean {
    // File logs all entries by default
    return true
  }

  /**
   * Flush pending writes
   */
  async flush(): Promise<void> {
    if (!this.writeStream) {
      return
    }

    return new Promise<void>((resolve, reject) => {
      if (this.writeStream) {
        this.writeStream.end(() => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Cleanup file output
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // Cancel rotation timer
      if (this.rotationTimer) {
        clearInterval(this.rotationTimer)
        this.rotationTimer = null
      }
      
      // Flush and close file
      if (this.writeStream) {
        await this.flush()
        this.writeStream.end()
        this.writeStream = null
      }
      
      this.isInitialized = false
      
    } catch (error) {
      throw new Error(`Failed to destroy file output: ${error}`)
    }
  }

  // =============================================================================
  // Private Implementation Methods
  // =============================================================================

  /**
   * Create log directory if it doesn't exist
   */
  private async createLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.currentFile)
    
    try {
      await fs.access(logDir)
    } catch {
      await fs.mkdir(logDir, { recursive: true })
    }
  }

  /**
   * Open log file for writing
   */
  private async openLogFile(): Promise<void> {
    const append = this.config.file?.append ?? true
    const encoding = (this.config.file?.encoding as BufferEncoding) ?? 'utf8'
    
    this.writeStream = createWriteStream(this.currentFile, {
      flags: append ? 'a' : 'w',
      encoding,
    })
    
    // Reset bytes written if we're starting fresh
    if (!append) {
      this.bytesWritten = 0
    } else {
      // Get current file size
      try {
        const stats = await fs.stat(this.currentFile)
        this.bytesWritten = stats.size
      } catch {
        this.bytesWritten = 0
      }
    }
  }

  /**
   * Format log entry for file output
   */
  private format(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(entry)
      
      case 'structured':
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message} ${JSON.stringify(entry.metadata)}`
      
      case 'text':
      default:
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`
    }
  }

  /**
   * Check if log rotation is needed
   */
  private shouldRotate(): boolean {
    if (!this.config.rotation) {
      return false
    }

    const maxSize = parseSize(this.config.rotation.maxSize || '100MB')
    return this.bytesWritten >= maxSize
  }

  /**
   * Perform log rotation
   */
  private async rotateLog(): Promise<void> {
    if (!this.writeStream) {
      return
    }

    try {
      // Close current file
      await this.flush()
      this.writeStream.end()
      
      // Generate rotated filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const ext = path.extname(this.currentFile)
      const base = path.basename(this.currentFile, ext)
      const dir = path.dirname(this.currentFile)
      const rotatedFile = path.join(dir, `${base}.${timestamp}${ext}`)
      
      // Rename current file
      await fs.rename(this.currentFile, rotatedFile)
      
      // Update index for rotated file
      if (this.logIndex) {
        await this.logIndex.indexLogFile(rotatedFile)
      }
      
      // Compress if configured
      if (this.config.rotation?.compression) {
        await this.compressLogFile(rotatedFile)
        // Update index after compression
        if (this.logIndex) {
          this.logIndex.removeLogFile(rotatedFile)
          await this.logIndex.indexLogFile(`${rotatedFile}.gz`)
        }
      }
      
      // Clean up old files
      await this.cleanupOldLogs()
      
      // Open new log file
      await this.openLogFile()
      
    } catch (error) {
      console.error('Log rotation failed:', error)
      throw new LogRotationError(`Log rotation failed: ${error}`, error)
    }
  }

  /**
   * Compress log file using gzip
   */
  private async compressLogFile(filePath: string): Promise<void> {
    try {
      const compressedPath = `${filePath}.gz`
      const readStream = createReadStream(filePath)
      const writeStream = createWriteStream(compressedPath)
      const gzipStream = zlib.createGzip({
        level: zlib.constants.Z_BEST_COMPRESSION,
        chunkSize: 16 * 1024, // 16KB chunks
      })

      // Compress the file
      await pipeline(readStream, gzipStream, writeStream)
      
      // Remove the original file after successful compression
      await fs.unlink(filePath)
      
      console.log(`Compressed log file: ${filePath} -> ${compressedPath}`)
      
    } catch (error) {
      console.error(`Failed to compress log file ${filePath}:`, error)
      // Don't throw - compression failure shouldn't stop logging
    }
  }

  /**
   * Clean up old log files
   */
  private async cleanupOldLogs(): Promise<void> {
    const maxFiles = this.config.rotation?.maxFiles ?? 5
    const logDir = path.dirname(this.currentFile)
    
    try {
      const files = await fs.readdir(logDir)
      const logFiles = []
      
      // Find all log files
      for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.log.gz')) {
          const filePath = path.join(logDir, file)
          const stats = await fs.stat(filePath)
          logFiles.push({
            name: file,
            path: filePath,
            mtime: stats.mtime,
          })
        }
      }
      
      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      
      // Remove excess files
      const filesToRemove = logFiles.slice(maxFiles)
      for (const file of filesToRemove) {
        await fs.unlink(file.path)
        // Remove from index
        if (this.logIndex) {
          this.logIndex.removeLogFile(file.path)
        }
      }
      
      // Save updated index
      if (this.logIndex && filesToRemove.length > 0) {
        await this.logIndex.save()
      }
      
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  /**
   * Schedule rotation checks
   */
  private scheduleRotation(): void {
    if (!this.config.rotation) {
      return
    }

    // Check for rotation every minute
    this.rotationTimer = setInterval(() => {
      if (this.shouldRotate()) {
        this.rotateLog().catch(error => {
          console.error('Scheduled rotation failed:', error)
        })
      }
    }, 60000)
  }

  /**
   * Get file output statistics
   */
  getStats() {
    return {
      type: 'file',
      currentFile: this.currentFile,
      bytesWritten: this.bytesWritten,
      bytesWrittenFormatted: formatSize(this.bytesWritten),
      isInitialized: this.isInitialized,
      rotationEnabled: !!this.config.rotation,
      maxSize: this.config.rotation?.maxSize,
      maxFiles: this.config.rotation?.maxFiles,
    }
  }
}