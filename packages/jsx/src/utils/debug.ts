/**
 * Debug utilities for JSX runtime
 * Provides controlled debug logging that respects TUIX_DEBUG env var
 */

// Debug logging that respects TUIX_DEBUG env var
const DEBUG = process.env.TUIX_DEBUG === 'true'

/**
 * Debug logger interface
 */
export interface DebugLogger {
  (message: string, ...args: any[]): void
  enabled: boolean
}

/**
 * Core debug function with timestamp
 */
export const debug = (message: string, ...args: any[]): void => {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [TUIX JSX] ${message}`, ...args)
  }
}

/**
 * Create a namespaced debug logger
 */
export function createDebugLogger(namespace: string): DebugLogger {
  const logger = (message: string, ...args: any[]) => {
    if (DEBUG) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [TUIX JSX:${namespace}] ${message}`, ...args)
    }
  }
  
  logger.enabled = DEBUG
  return logger
}

/**
 * Check if debug mode is enabled
 */
export const isDebugEnabled = (): boolean => DEBUG