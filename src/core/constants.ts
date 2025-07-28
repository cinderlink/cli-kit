/**
 * Core module constants
 *
 * This file contains all constant values used throughout the core module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * Core runtime constants
 */
export const CORE_CONSTANTS = {
  /** Maximum number of concurrent operations */
  MAX_CONCURRENT_OPERATIONS: 100,

  /** Default timeout for async operations (milliseconds) */
  DEFAULT_TIMEOUT: 5000,

  /** Maximum retry attempts for failed operations */
  MAX_RETRY_ATTEMPTS: 3,
} as const

/**
 * View and rendering constants
 */
export const VIEW_CONSTANTS = {
  /** Default viewport dimensions */
  DEFAULT_VIEWPORT_WIDTH: 80,
  DEFAULT_VIEWPORT_HEIGHT: 24,

  /** Cache limits */
  MAX_CACHE_SIZE: 1000,
  CACHE_TTL: 300000, // 5 minutes

  /** Update throttling */
  RENDER_THROTTLE_MS: 16, // 60fps
} as const

/**
 * Event system constants
 */
export const EVENT_CONSTANTS = {
  /** Maximum event queue size */
  MAX_EVENT_QUEUE_SIZE: 10000,

  /** Event timeout */
  EVENT_TIMEOUT: 1000,

  /** Maximum event listeners per event type */
  MAX_LISTENERS_PER_EVENT: 100,
} as const

/**
 * Service constants
 */
export const SERVICE_CONSTANTS = {
  /** Service startup timeout */
  SERVICE_STARTUP_TIMEOUT: 10000,

  /** Service shutdown timeout */
  SERVICE_SHUTDOWN_TIMEOUT: 5000,

  /** Health check interval */
  HEALTH_CHECK_INTERVAL: 30000,
} as const

/**
 * Terminal constants
 */
export const TERMINAL_CONSTANTS = {
  /** ANSI escape codes */
  ESC: '\x1b',
  CSI: '\x1b[',

  /** Terminal capabilities */
  SUPPORTS_COLOR: process.env.NO_COLOR === undefined,
  SUPPORTS_UNICODE: process.env.TERM !== 'dumb',

  /** Input buffer size */
  INPUT_BUFFER_SIZE: 4096,
} as const

/**
 * Error constants
 */
export const ERROR_CONSTANTS = {
  /** Error code ranges */
  CORE_ERROR_RANGE: [1000, 1999],
  SERVICE_ERROR_RANGE: [2000, 2999],
  VIEW_ERROR_RANGE: [3000, 3999],

  /** Default error messages */
  UNKNOWN_ERROR: 'An unknown error occurred',
  TIMEOUT_ERROR: 'Operation timed out',
  VALIDATION_ERROR: 'Invalid input provided',
} as const

/**
 * Debug and development constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug environment variable */
  DEBUG_ENV_VAR: 'TUIX_DEBUG',

  /** Log levels */
  LOG_LEVELS: ['error', 'warn', 'info', 'debug', 'trace'] as const,

  /** Performance timing thresholds */
  SLOW_OPERATION_THRESHOLD: 100, // milliseconds
  VERY_SLOW_OPERATION_THRESHOLD: 1000, // milliseconds
} as const
