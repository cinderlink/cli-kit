/**
 * Log Index Implementation
 * 
 * This module provides indexing capabilities for fast log retrieval and searching.
 * Maintains metadata about log files and enables efficient queries.
 * 
 * @module plugins/core/log-index
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { LogEntry, LogLevelString } from './types'

/**
 * Log file index entry
 */
export interface LogFileIndex {
  /** File path */
  readonly filePath: string
  /** File size in bytes */
  readonly size: number
  /** Creation timestamp */
  readonly created: Date
  /** Last modification timestamp */
  readonly modified: Date
  /** Whether file is compressed */
  readonly compressed: boolean
  /** Number of log entries */
  readonly entryCount: number
  /** Time range of logs in this file */
  readonly timeRange: {
    start: Date
    end: Date
  }
  /** Log levels present in this file */
  readonly levels: LogLevelString[]
  /** Byte offsets for quick seeking */
  readonly offsets: LogEntryOffset[]
}

/**
 * Log entry offset for quick seeking
 */
export interface LogEntryOffset {
  /** Byte offset in file */
  readonly offset: number
  /** Entry timestamp */
  readonly timestamp: Date
  /** Entry log level */
  readonly level: LogLevelString
  /** Entry line number */
  readonly lineNumber: number
}

/**
 * Log search query
 */
export interface LogSearchOptions {
  /** Start time filter */
  since?: Date
  /** End time filter */
  until?: Date
  /** Log level filter */
  levels?: LogLevelString[]
  /** Text search in message */
  textSearch?: string
  /** Maximum results */
  limit?: number
  /** Results offset */
  offset?: number
}

/**
 * Log index manager for efficient log retrieval
 */
export class LogIndex {
  private indexPath: string
  private index: Map<string, LogFileIndex> = new Map()
  private isLoaded = false

  constructor(indexPath: string) {
    this.indexPath = indexPath
  }

  /**
   * Load index from disk
   */
  async load(): Promise<void> {
    if (this.isLoaded) {
      return
    }

    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8')
      const indexObject = JSON.parse(indexData)
      
      // Convert plain objects back to Map
      for (const [filePath, indexEntry] of Object.entries(indexObject)) {
        this.index.set(filePath, {
          ...indexEntry as any,
          created: new Date((indexEntry as any).created),
          modified: new Date((indexEntry as any).modified),
          timeRange: {
            start: new Date((indexEntry as any).timeRange.start),
            end: new Date((indexEntry as any).timeRange.end),
          },
          offsets: (indexEntry as any).offsets.map((offset: any) => ({
            ...offset,
            timestamp: new Date(offset.timestamp),
          })),
        })
      }
      
      this.isLoaded = true
      
    } catch (error) {
      // Index file doesn't exist or is corrupted - start fresh
      this.index.clear()
      this.isLoaded = true
    }
  }

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    try {
      // Ensure index directory exists
      const indexDir = path.dirname(this.indexPath)
      await fs.mkdir(indexDir, { recursive: true })
      
      // Convert Map to plain object for JSON serialization
      const indexObject = Object.fromEntries(this.index.entries())
      
      await fs.writeFile(this.indexPath, JSON.stringify(indexObject, null, 2))
      
    } catch (error) {
      console.error('Failed to save log index:', error)
    }
  }

  /**
   * Add or update log file in index
   */
  async indexLogFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      const compressed = filePath.endsWith('.gz')
      
      // Analyze the log file
      const analysis = await this.analyzeLogFile(filePath, compressed)
      
      const indexEntry: LogFileIndex = {
        filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        compressed,
        entryCount: analysis.entryCount,
        timeRange: analysis.timeRange,
        levels: analysis.levels,
        offsets: analysis.offsets,
      }
      
      this.index.set(filePath, indexEntry)
      
    } catch (error) {
      console.error(`Failed to index log file ${filePath}:`, error)
    }
  }

  /**
   * Remove log file from index
   */
  removeLogFile(filePath: string): void {
    this.index.delete(filePath)
  }

  /**
   * Find log files matching search criteria
   */
  searchLogFiles(options: LogSearchOptions): LogFileIndex[] {
    const results: LogFileIndex[] = []
    
    for (const indexEntry of this.index.values()) {
      let matches = true
      
      // Time range filter
      if (options.since && indexEntry.timeRange.end < options.since) {
        matches = false
      }
      if (options.until && indexEntry.timeRange.start > options.until) {
        matches = false
      }
      
      // Level filter
      if (options.levels && options.levels.length > 0) {
        const hasMatchingLevel = options.levels.some(level => 
          indexEntry.levels.includes(level)
        )
        if (!hasMatchingLevel) {
          matches = false
        }
      }
      
      if (matches) {
        results.push(indexEntry)
      }
    }
    
    // Sort by file creation time (newest first)
    results.sort((a, b) => b.created.getTime() - a.created.getTime())
    
    return results
  }

  /**
   * Get index statistics
   */
  getStats() {
    const totalFiles = this.index.size
    let totalSize = 0
    let totalEntries = 0
    let compressedFiles = 0
    
    for (const indexEntry of this.index.values()) {
      totalSize += indexEntry.size
      totalEntries += indexEntry.entryCount
      if (indexEntry.compressed) {
        compressedFiles++
      }
    }
    
    return {
      totalFiles,
      totalSize,
      totalEntries,
      compressedFiles,
      isLoaded: this.isLoaded,
      indexPath: this.indexPath,
    }
  }

  /**
   * Clean up index (remove entries for non-existent files)
   */
  async cleanup(): Promise<void> {
    const filesToRemove: string[] = []
    
    for (const filePath of this.index.keys()) {
      try {
        await fs.access(filePath)
      } catch {
        filesToRemove.push(filePath)
      }
    }
    
    for (const filePath of filesToRemove) {
      this.index.delete(filePath)
    }
    
    if (filesToRemove.length > 0) {
      await this.save()
    }
  }

  /**
   * Analyze log file to extract metadata
   */
  private async analyzeLogFile(filePath: string, compressed: boolean): Promise<{
    entryCount: number
    timeRange: { start: Date; end: Date }
    levels: LogLevelString[]
    offsets: LogEntryOffset[]
  }> {
    // For now, provide a basic implementation
    // In production, this would parse the file line by line
    const stats = await fs.stat(filePath)
    
    return {
      entryCount: 0, // Would be calculated by parsing
      timeRange: {
        start: stats.birthtime,
        end: stats.mtime,
      },
      levels: ['info', 'warn', 'error'], // Would be detected from content
      offsets: [], // Would be built during parsing
    }
  }
}

/**
 * Log retrieval service using the index
 */
export class LogRetriever {
  private index: LogIndex

  constructor(index: LogIndex) {
    this.index = index
  }

  /**
   * Retrieve log entries matching search criteria
   */
  async searchLogs(options: LogSearchOptions): Promise<LogEntry[]> {
    // Find relevant log files
    const relevantFiles = this.index.searchLogFiles(options)
    
    const allEntries: LogEntry[] = []
    
    // For each relevant file, extract matching entries
    for (const fileIndex of relevantFiles) {
      try {
        const entries = await this.extractLogEntries(fileIndex, options)
        allEntries.push(...entries)
      } catch (error) {
        console.error(`Failed to extract logs from ${fileIndex.filePath}:`, error)
      }
    }
    
    // Sort by timestamp
    allEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Apply limit and offset
    let results = allEntries
    if (options.offset) {
      results = results.slice(options.offset)
    }
    if (options.limit) {
      results = results.slice(0, options.limit)
    }
    
    return results
  }

  /**
   * Extract log entries from a specific file
   */
  private async extractLogEntries(fileIndex: LogFileIndex, options: LogSearchOptions): Promise<LogEntry[]> {
    // This is a placeholder implementation
    // In production, this would:
    // 1. Read the file (decompress if needed)
    // 2. Parse log entries line by line
    // 3. Filter based on options
    // 4. Return matching entries
    
    return []
  }
}