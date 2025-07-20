/**
 * Bun-native file system utilities with Effect.ts integration
 */

import { Effect } from 'effect'
import { join } from 'path'

// Bun-native file existence check
export const exists = (path: string): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: async () => {
      const file = Bun.file(path)
      return await file.exists()
    },
    catch: () => false
  })

// Bun-native directory creation
export const ensureDir = (dirPath: string): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.$`mkdir -p ${dirPath}`.quiet()
    },
    catch: (error) => new Error(`Failed to create directory ${dirPath}: ${error}`)
  })

// Bun-native file reading
export const readText = (filePath: string): Effect.Effect<string> =>
  Effect.tryPromise({
    try: async () => {
      const file = Bun.file(filePath)
      return await file.text()
    },
    catch: (error) => new Error(`Failed to read file ${filePath}: ${error}`)
  })

// Bun-native file writing
export const writeText = (filePath: string, content: string): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.write(filePath, content)
    },
    catch: (error) => new Error(`Failed to write file ${filePath}: ${error}`)
  })

// Bun-native file append
export const appendText = (filePath: string, content: string): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.write(filePath, content, { flag: 'a' })
    },
    catch: (error) => new Error(`Failed to append to file ${filePath}: ${error}`)
  })

// Bun-native JSON read/write
export const readJSON = <T>(filePath: string): Effect.Effect<T> =>
  Effect.tryPromise({
    try: async () => {
      const file = Bun.file(filePath)
      return await file.json()
    },
    catch: (error) => new Error(`Failed to read JSON from ${filePath}: ${error}`)
  })

export const writeJSON = (filePath: string, data: any): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.write(filePath, JSON.stringify(data, null, 2))
    },
    catch: (error) => new Error(`Failed to write JSON to ${filePath}: ${error}`)
  })

// Bun-native directory listing
export const listDir = (dirPath: string): Effect.Effect<string[]> =>
  Effect.tryPromise({
    try: async () => {
      const result = await Bun.$`ls ${dirPath}`.text()
      return result.trim().split('\n').filter(Boolean)
    },
    catch: (error) => new Error(`Failed to list directory ${dirPath}: ${error}`)
  })

// Bun-native file removal
export const remove = (path: string): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.$`rm -f ${path}`.quiet()
    },
    catch: (error) => new Error(`Failed to remove ${path}: ${error}`)
  })

// Bun-native recursive directory removal
export const removeDir = (dirPath: string): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.$`rm -rf ${dirPath}`.quiet()
    },
    catch: (error) => new Error(`Failed to remove directory ${dirPath}: ${error}`)
  })

// Process-related utilities
export const killProcess = (pid: number, signal: string = 'TERM'): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await Bun.$`kill -${signal} ${pid}`.quiet()
    },
    catch: (error) => new Error(`Failed to kill process ${pid}: ${error}`)
  })

export const processExists = (pid: number): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: async () => {
      const result = await Bun.$`kill -0 ${pid}`.nothrow().quiet()
      return result.exitCode === 0
    },
    catch: () => false
  })

// Path utilities that work with Bun
export const resolvePath = (...paths: string[]): string => {
  return join(...paths)
}

export const getAbsolutePath = (path: string): string => {
  return path.startsWith('/') ? path : join(process.cwd(), path)
}