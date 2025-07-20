/**
 * Storage Service - Configuration and state persistence
 * 
 * This service handles saving and loading application state, configuration,
 * and other persistent data using Bun's optimized file operations.
 */

import { Effect, Context } from "effect"
import { z } from "zod"
import type { StorageError } from "@tuix/core"

/**
 * The StorageService interface defines persistent storage operations.
 * It uses Zod schemas for type-safe serialization/deserialization.
 */
export class StorageService extends Context.Tag("StorageService")<
  StorageService,
  {
    // =============================================================================
    // State Management
    // =============================================================================

    /**
     * Save application state with a key.
     * State is automatically serialized to JSON.
     */
    readonly saveState: <T>(
      key: string,
      data: T,
      options?: {
        readonly schema?: z.ZodSchema<T>
        readonly pretty?: boolean
      }
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Load application state by key.
     * Returns null if the key doesn't exist.
     */
    readonly loadState: <T>(
      key: string,
      schema: z.ZodSchema<T>
    ) => Effect.Effect<T | null, StorageError, never>

    /**
     * Clear (delete) state by key.
     */
    readonly clearState: (key: string) => Effect.Effect<void, StorageError, never>

    /**
     * Check if state exists for a key.
     */
    readonly hasState: (key: string) => Effect.Effect<boolean, StorageError, never>

    /**
     * List all state keys.
     */
    readonly listStateKeys: Effect.Effect<ReadonlyArray<string>, StorageError, never>

    // =============================================================================
    // Configuration Management
    // =============================================================================

    /**
     * Load configuration from standard locations.
     * Checks multiple paths in order: user config, global config, defaults.
     */
    readonly loadConfig: <T>(
      appName: string,
      schema: z.ZodSchema<T>,
      defaults: T
    ) => Effect.Effect<T, StorageError, never>

    /**
     * Save configuration to user config directory.
     */
    readonly saveConfig: <T>(
      appName: string,
      config: T,
      schema: z.ZodSchema<T>
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Get the path to the user config file.
     */
    readonly getConfigPath: (appName: string) => Effect.Effect<string, StorageError, never>

    /**
     * Watch configuration file for changes.
     */
    readonly watchConfig: <T>(
      appName: string,
      schema: z.ZodSchema<T>
    ) => Effect.Effect<
      Effect.Effect<T, StorageError, never>, // Stream of config changes
      StorageError,
      never
    >

    // =============================================================================
    // Cache Management
    // =============================================================================

    /**
     * Store data in cache with expiration.
     */
    readonly setCache: <T>(
      key: string,
      data: T,
      ttlSeconds?: number
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Get data from cache.
     * Returns null if not found or expired.
     */
    readonly getCache: <T>(
      key: string,
      schema: z.ZodSchema<T>
    ) => Effect.Effect<T | null, StorageError, never>

    /**
     * Clear cache entry.
     */
    readonly clearCache: (key: string) => Effect.Effect<void, StorageError, never>

    /**
     * Clear all expired cache entries.
     */
    readonly clearExpiredCache: Effect.Effect<void, StorageError, never>

    /**
     * Get cache statistics.
     */
    readonly getCacheStats: Effect.Effect<{
      readonly totalEntries: number
      readonly expiredEntries: number
      readonly totalSize: number
    }, StorageError, never>

    // =============================================================================
    // File Operations
    // =============================================================================

    /**
     * Read a file as text with optional schema validation.
     */
    readonly readTextFile: <T = string>(
      path: string,
      schema?: z.ZodSchema<T>
    ) => Effect.Effect<T, StorageError, never>

    /**
     * Write text to a file.
     */
    readonly writeTextFile: (
      path: string,
      content: string,
      options?: {
        readonly createDirs?: boolean
        readonly backup?: boolean
      }
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Read a file as JSON with schema validation.
     */
    readonly readJsonFile: <T>(
      path: string,
      schema: z.ZodSchema<T>
    ) => Effect.Effect<T, StorageError, never>

    /**
     * Write data to a JSON file.
     */
    readonly writeJsonFile: <T>(
      path: string,
      data: T,
      options?: {
        readonly pretty?: boolean
        readonly createDirs?: boolean
        readonly backup?: boolean
      }
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Check if a file exists.
     */
    readonly fileExists: (path: string) => Effect.Effect<boolean, StorageError, never>

    /**
     * Create a directory and all parent directories.
     */
    readonly createDirectory: (path: string) => Effect.Effect<void, StorageError, never>

    /**
     * Get file stats (size, modified time, etc.).
     */
    readonly getFileStats: (path: string) => Effect.Effect<{
      readonly size: number
      readonly modified: Date
      readonly created: Date
      readonly isFile: boolean
      readonly isDirectory: boolean
    }, StorageError, never>

    // =============================================================================
    // Backup and Restore
    // =============================================================================

    /**
     * Create a backup of a file.
     */
    readonly createBackup: (
      filePath: string,
      backupSuffix?: string
    ) => Effect.Effect<string, StorageError, never>

    /**
     * Restore a file from backup.
     */
    readonly restoreBackup: (
      filePath: string,
      backupPath: string
    ) => Effect.Effect<void, StorageError, never>

    /**
     * List all backups for a file.
     */
    readonly listBackups: (
      filePath: string
    ) => Effect.Effect<ReadonlyArray<string>, StorageError, never>

    /**
     * Clean up old backups, keeping only the specified number.
     */
    readonly cleanupBackups: (
      filePath: string,
      keepCount: number
    ) => Effect.Effect<void, StorageError, never>

    // =============================================================================
    // Transaction Support
    // =============================================================================

    /**
     * Begin a transaction for atomic file operations.
     */
    readonly beginTransaction: Effect.Effect<string, StorageError, never> // Returns transaction ID

    /**
     * Add a file operation to the current transaction.
     */
    readonly addToTransaction: (
      transactionId: string,
      operation: 'write' | 'delete',
      path: string,
      content?: string
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Commit a transaction, applying all operations atomically.
     */
    readonly commitTransaction: (
      transactionId: string
    ) => Effect.Effect<void, StorageError, never>

    /**
     * Rollback a transaction, discarding all operations.
     */
    readonly rollbackTransaction: (
      transactionId: string
    ) => Effect.Effect<void, StorageError, never>
  }
>() {}

// =============================================================================
// Storage Utilities
// =============================================================================

/**
 * Utilities for working with storage operations.
 */
export const StorageUtils = {
  /**
   * Get standard config directory paths for different platforms.
   */
  getConfigPaths: (appName: string) => {
    const home = process.env.HOME || process.env.USERPROFILE || '~'
    const platform = process.platform
    
    switch (platform) {
      case 'darwin': // macOS
        return [
          `${home}/Library/Application Support/${appName}/config.json`,
          `${home}/.config/${appName}/config.json`,
          `${home}/.${appName}rc`
        ]
      case 'win32': // Windows
        const appData = process.env.APPDATA || `${home}/AppData/Roaming`
        return [
          `${appData}/${appName}/config.json`,
          `${home}/.config/${appName}/config.json`,
          `${home}/.${appName}rc`
        ]
      default: // Linux and others
        const xdgConfig = process.env.XDG_CONFIG_HOME || `${home}/.config`
        return [
          `${xdgConfig}/${appName}/config.json`,
          `${home}/.config/${appName}/config.json`,
          `${home}/.${appName}rc`
        ]
    }
  },

  /**
   * Get standard data directory paths for different platforms.
   */
  getDataPaths: (appName: string) => {
    const home = process.env.HOME || process.env.USERPROFILE || '~'
    const platform = process.platform
    
    switch (platform) {
      case 'darwin': // macOS
        return [
          `${home}/Library/Application Support/${appName}`,
          `${home}/.local/share/${appName}`
        ]
      case 'win32': // Windows
        const appData = process.env.APPDATA || `${home}/AppData/Roaming`
        return [
          `${appData}/${appName}`,
          `${home}/.local/share/${appName}`
        ]
      default: // Linux and others
        const xdgData = process.env.XDG_DATA_HOME || `${home}/.local/share`
        return [
          `${xdgData}/${appName}`,
          `${home}/.local/share/${appName}`
        ]
    }
  },

  /**
   * Get standard cache directory paths for different platforms.
   */
  getCachePaths: (appName: string) => {
    const home = process.env.HOME || process.env.USERPROFILE || '~'
    const platform = process.platform
    
    switch (platform) {
      case 'darwin': // macOS
        return [
          `${home}/Library/Caches/${appName}`,
          `${home}/.cache/${appName}`
        ]
      case 'win32': // Windows
        const localAppData = process.env.LOCALAPPDATA || `${home}/AppData/Local`
        return [
          `${localAppData}/${appName}/Cache`,
          `${home}/.cache/${appName}`
        ]
      default: // Linux and others
        const xdgCache = process.env.XDG_CACHE_HOME || `${home}/.cache`
        return [
          `${xdgCache}/${appName}`,
          `${home}/.cache/${appName}`
        ]
    }
  },

  /**
   * Generate a backup filename with timestamp.
   */
  generateBackupName: (originalPath: string, suffix?: string): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const customSuffix = suffix || timestamp
    return `${originalPath}.backup.${customSuffix}`
  },

  /**
   * Validate that a path is safe (no directory traversal attacks).
   */
  isSafePath: (path: string): boolean => {
    const normalized = path.replace(/\\/g, '/')
    return !normalized.includes('../') && !normalized.includes('/..')
  },

  /**
   * Ensure a directory exists, creating it if necessary.
   */
  ensureDirectory: async (path: string): Promise<void> => {
    try {
      await Bun.file(path).exists()
    } catch {
      // Directory doesn't exist, create it
      const parts = path.split('/')
      let current = ''
      
      for (const part of parts) {
        current += part + '/'
        try {
          await Bun.file(current).exists()
        } catch {
          // Create directory using mkdir
          await Bun.spawn(['mkdir', '-p', current])
        }
      }
    }
  }
} as const