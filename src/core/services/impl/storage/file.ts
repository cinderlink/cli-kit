/**
 * File Storage Operations
 *
 * Low-level file system operations
 */

import { Effect } from 'effect'
import { StorageError } from '../../../types/errors'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { z } from 'zod'

/**
 * File system operations
 */
export class FileStorage {
  /**
   * Read a text file
   */
  readTextFile<T>(filePath: string, schema?: z.ZodSchema<T>): Effect<T | string, StorageError> {
    return Effect.gen(function* (_) {
      const content = yield* _(
        Effect.tryPromise({
          try: () => fs.readFile(filePath, 'utf8'),
          catch: (error: unknown) => {
            const err = error as NodeJS.ErrnoException
            if (err.code === 'ENOENT') {
              return new StorageError({
                message: `File not found: ${filePath}`,
                path: filePath,
                code: 'NOT_FOUND',
              })
            }
            return new StorageError({
              message: `Failed to read file: ${filePath}`,
              path: filePath,
              cause: error,
            })
          },
        })
      )

      if (schema) {
        try {
          return schema.parse(content)
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Invalid file content: ${filePath}`,
                path: filePath,
                cause: error,
              })
            )
          )
        }
      }

      return content
    })
  }

  /**
   * Write a text file
   */
  writeTextFile(
    filePath: string,
    content: string,
    options?: {
      readonly createDirs?: boolean
      readonly backup?: boolean
    }
  ): Effect<void, StorageError> {
    return Effect.gen(
      function* (_) {
        // Create backup if requested
        if (options?.backup) {
          const exists = yield* _(this.fileExists(filePath))
          if (exists) {
            yield* _(this.createBackup(filePath))
          }
        }

        // Create directories if requested
        if (options?.createDirs) {
          const dir = path.dirname(filePath)
          yield* _(
            Effect.tryPromise({
              try: () => fs.mkdir(dir, { recursive: true }),
              catch: error =>
                new StorageError({
                  message: `Failed to create directory: ${dir}`,
                  path: dir,
                  cause: error,
                }),
            })
          )
        }

        // Write file
        yield* _(
          Effect.tryPromise({
            try: () => fs.writeFile(filePath, content, 'utf8'),
            catch: error =>
              new StorageError({
                message: `Failed to write file: ${filePath}`,
                path: filePath,
                cause: error,
              }),
          })
        )
      }.bind(this)
    )
  }

  /**
   * Read a JSON file
   */
  readJsonFile<T>(filePath: string, schema: z.ZodSchema<T>): Effect<T, StorageError> {
    return Effect.gen(
      function* (_) {
        const content = yield* _(this.readTextFile(filePath))

        try {
          const parsed = JSON.parse(content as string)
          return schema.parse(parsed)
        } catch (error) {
          return yield* _(
            Effect.fail(
              new StorageError({
                message: `Invalid JSON in file: ${filePath}`,
                path: filePath,
                cause: error,
              })
            )
          )
        }
      }.bind(this)
    )
  }

  /**
   * Write a JSON file
   */
  writeJsonFile<T>(
    filePath: string,
    data: T,
    options?: {
      readonly pretty?: boolean
      readonly createDirs?: boolean
      readonly backup?: boolean
    }
  ): Effect<void, StorageError> {
    return Effect.gen(
      function* (_) {
        const content = JSON.stringify(data, null, options?.pretty ? 2 : undefined)
        yield* _(this.writeTextFile(filePath, content, options))
      }.bind(this)
    )
  }

  /**
   * Check if a file exists
   */
  fileExists(filePath: string): Effect<boolean, never> {
    return Effect.tryPromise({
      try: async () => {
        await fs.access(filePath)
        return true
      },
      catch: () => false,
    })
  }

  /**
   * Create a directory
   */
  createDirectory(dirPath: string): Effect<void, StorageError> {
    return Effect.tryPromise({
      try: () => fs.mkdir(dirPath, { recursive: true }),
      catch: error =>
        new StorageError({
          message: `Failed to create directory: ${dirPath}`,
          path: dirPath,
          cause: error,
        }),
    })
  }

  /**
   * Get file statistics
   */
  getFileStats(filePath: string): Effect<
    {
      size: number
      created: Date
      modified: Date
      isDirectory: boolean
    },
    StorageError
  > {
    return Effect.gen(function* (_) {
      const stats = yield* _(
        Effect.tryPromise({
          try: () => fs.stat(filePath),
          catch: (error: unknown) => {
            const err = error as NodeJS.ErrnoException
            if (err.code === 'ENOENT') {
              return new StorageError({
                message: `File not found: ${filePath}`,
                path: filePath,
                code: 'NOT_FOUND',
              })
            }
            return new StorageError({
              message: `Failed to get file stats: ${filePath}`,
              path: filePath,
              cause: error,
            })
          },
        })
      )

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
      }
    })
  }

  /**
   * Create a backup of a file
   */
  createBackup(filePath: string, backupSuffix?: string): Effect<string, StorageError> {
    return Effect.gen(function* (_) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const suffix = backupSuffix ?? `.backup-${timestamp}`
      const backupPath = filePath + suffix

      yield* _(
        Effect.tryPromise({
          try: () => fs.copyFile(filePath, backupPath),
          catch: error =>
            new StorageError({
              message: `Failed to create backup: ${filePath}`,
              path: filePath,
              cause: error,
            }),
        })
      )

      return backupPath
    })
  }

  /**
   * Restore a backup
   */
  restoreBackup(filePath: string, backupPath: string): Effect<void, StorageError> {
    return Effect.tryPromise({
      try: () => fs.copyFile(backupPath, filePath),
      catch: error =>
        new StorageError({
          message: `Failed to restore backup: ${backupPath} -> ${filePath}`,
          path: backupPath,
          cause: error,
        }),
    })
  }

  /**
   * List backup files for a given file
   */
  listBackups(filePath: string): Effect<string[], StorageError> {
    return Effect.gen(function* (_) {
      const dir = path.dirname(filePath)
      const basename = path.basename(filePath)

      const files = yield* _(
        Effect.tryPromise({
          try: () => fs.readdir(dir),
          catch: error =>
            new StorageError({
              message: `Failed to list directory: ${dir}`,
              path: dir,
              cause: error,
            }),
        })
      )

      return files
        .filter(f => f.startsWith(basename) && f.includes('.backup'))
        .sort()
        .reverse() // Most recent first
    })
  }

  /**
   * Clean up old backup files
   */
  cleanupBackups(filePath: string, keepCount: number): Effect<number, StorageError> {
    return Effect.gen(
      function* (_) {
        const backups = yield* _(this.listBackups(filePath))

        if (backups.length <= keepCount) {
          return 0
        }

        const toDelete = backups.slice(keepCount)
        const dir = path.dirname(filePath)

        let deleted = 0
        for (const backup of toDelete) {
          const backupPath = path.join(dir, backup)
          yield* _(
            Effect.tryPromise({
              try: async () => {
                await fs.unlink(backupPath)
                deleted++
              },
              catch: () => {}, // Ignore errors
            })
          )
        }

        return deleted
      }.bind(this)
    )
  }
}
