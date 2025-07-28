/**
 * Debug Logger Transport
 *
 * Captures logger output for display in debug console
 */

import type { LogTransport, LogEntry } from '@logger/types'
import { debug } from '../core/store'
import { DEBUG_LEVELS } from '../constants'

export class DebugTransport implements LogTransport {
  name = 'debug'

  async write(entry: LogEntry): Promise<void> {
    // Map log levels to debug levels
    const debugLevel =
      {
        fatal: DEBUG_LEVELS.ERROR,
        error: DEBUG_LEVELS.ERROR,
        warn: DEBUG_LEVELS.WARN,
        info: DEBUG_LEVELS.INFO,
        debug: DEBUG_LEVELS.DEBUG,
        trace: DEBUG_LEVELS.DEBUG,
      }[entry.level] || DEBUG_LEVELS.DEBUG

    debug.logger(
      entry.message,
      {
        level: entry.level,
        timestamp: entry.timestamp,
        metadata: entry.metadata,
        fields: entry.fields,
      },
      {
        source: entry.logger || 'default',
      }
    )
  }

  async close(): Promise<void> {
    // Nothing to close
  }
}
