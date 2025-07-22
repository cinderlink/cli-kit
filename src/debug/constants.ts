/**
 * Debug Module Constants
 */

export const DEBUG_DEFAULTS = {
  MAX_EVENTS: parseInt(process.env.TUIX_DEBUG_MAX_EVENTS || '1000', 10),
  AUTO_WRAP: process.env.TUIX_DEBUG_AUTO_WRAP !== 'false',
  CAPTURE_LOGGER: process.env.TUIX_DEBUG_CAPTURE_LOGGER !== 'false',
  CAPTURE_PERFORMANCE: process.env.TUIX_DEBUG_CAPTURE_PERFORMANCE !== 'false'
} as const

export const DEBUG_CATEGORIES = {
  SCOPE: 'scope',
  JSX: 'jsx',
  RENDER: 'render',
  LIFECYCLE: 'lifecycle',
  MATCH: 'match',
  PERFORMANCE: 'performance',
  ERROR: 'error',
  SYSTEM: 'system',
  LOGGER: 'logger'
} as const

export const DEBUG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const

export const CATEGORY_ICONS = {
  scope: '🔍',
  jsx: '⚛️',
  render: '🎨',
  lifecycle: '♻️',
  match: '✓',
  performance: '⚡',
  error: '❌',
  system: '⚙️',
  logger: '📝'
} as const

export const LEVEL_COLORS = {
  debug: 'gray',
  info: 'blue',
  warn: 'yellow',
  error: 'red'
} as const