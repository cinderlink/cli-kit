/**
 * Logger module constants
 * 
 * This file contains all constant values used throughout the logger module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * Log level constants
 */
export const LOG_LEVEL_CONSTANTS = {
  /** Log levels in order of severity */
  LEVELS: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const,
  
  /** Numeric log levels */
  LEVEL_VALUES: {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  } as const,
  
  /** Default log level */
  DEFAULT_LEVEL: 'info' as const,
  
  /** Environment variable for log level */
  LEVEL_ENV_VAR: 'TUIX_LOG_LEVEL',
} as const;

/**
 * Transport constants
 */
export const TRANSPORT_CONSTANTS = {
  /** Built-in transport types */
  TRANSPORT_TYPES: [
    'console',
    'file',
    'stream',
    'syslog',
    'http',
    'webhook'
  ] as const,
  
  /** Transport configuration limits */
  MAX_TRANSPORTS: 20,
  MAX_TRANSPORT_NAME_LENGTH: 100,
  
  /** Transport timeouts */
  TRANSPORT_FLUSH_TIMEOUT: 5000, // 5 seconds
  TRANSPORT_CLOSE_TIMEOUT: 3000, // 3 seconds
  TRANSPORT_RETRY_TIMEOUT: 1000, // 1 second
  
  /** Batch processing */
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_BATCH_TIMEOUT: 1000, // 1 second
  MAX_BATCH_SIZE: 10000,
} as const;

/**
 * Formatter constants
 */
export const FORMATTER_CONSTANTS = {
  /** Built-in formatter types */
  FORMATTER_TYPES: [
    'json',
    'text',
    'structured',
    'simple',
    'detailed',
    'compact'
  ] as const,
  
  /** Timestamp formats */
  TIMESTAMP_FORMATS: {
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    simple: 'YYYY-MM-DD HH:mm:ss',
    compact: 'HH:mm:ss.SSS',
    epoch: 'x', // Unix timestamp
  } as const,
  
  /** Default timestamp format */
  DEFAULT_TIMESTAMP_FORMAT: 'iso' as const,
  
  /** Message truncation */
  MAX_MESSAGE_LENGTH: 10000,
  MAX_STACK_LINES: 50,
} as const;

/**
 * File transport constants
 */
export const FILE_TRANSPORT_CONSTANTS = {
  /** Default file paths */
  DEFAULT_LOG_DIR: './logs',
  DEFAULT_LOG_FILE: 'tuix.log',
  DEFAULT_ERROR_FILE: 'tuix-error.log',
  
  /** File rotation */
  DEFAULT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  DEFAULT_MAX_FILES: 5,
  DEFAULT_ROTATION_FORMAT: 'YYYY-MM-DD',
  
  /** File permissions */
  DEFAULT_FILE_MODE: 0o644,
  DEFAULT_DIR_MODE: 0o755,
  
  /** Write options */
  WRITE_BUFFER_SIZE: 64 * 1024, // 64KB
  WRITE_FLUSH_INTERVAL: 1000, // 1 second
  MAX_WRITE_RETRIES: 3,
} as const;

/**
 * Console transport constants
 */
export const CONSOLE_TRANSPORT_CONSTANTS = {
  /** Color configuration */
  COLORS_ENABLED: process.env.NO_COLOR === undefined && 
                  process.env.FORCE_COLOR !== '0' &&
                  process.stdout.isTTY,
  
  /** Color mappings */
  LEVEL_COLORS: {
    trace: 'gray',
    debug: 'cyan',
    info: 'green',
    warn: 'yellow',
    error: 'red',
    fatal: 'magenta'
  } as const,
  
  /** Console streams */
  DEFAULT_STDOUT_LEVELS: ['trace', 'debug', 'info'] as const,
  DEFAULT_STDERR_LEVELS: ['warn', 'error', 'fatal'] as const,
  
  /** Formatting options */
  INDENT_SIZE: 2,
  MAX_CONSOLE_WIDTH: 120,
} as const;

/**
 * HTTP transport constants
 */
export const HTTP_TRANSPORT_CONSTANTS = {
  /** HTTP configuration */
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 1000, // 1 second
  
  /** HTTP headers */
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'User-Agent': 'tuix-logger/1.0.0'
  } as const,
  
  /** Batch configuration */
  DEFAULT_HTTP_BATCH_SIZE: 50,
  DEFAULT_HTTP_BATCH_TIMEOUT: 5000, // 5 seconds
  MAX_HTTP_PAYLOAD_SIZE: 1024 * 1024, // 1MB
} as const;

/**
 * Performance constants
 */
export const PERFORMANCE_CONSTANTS = {
  /** Memory limits */
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  MEMORY_CHECK_INTERVAL: 30000, // 30 seconds
  
  /** Queue limits */
  MAX_LOG_QUEUE_SIZE: 10000,
  QUEUE_HIGH_WATERMARK: 8000,
  QUEUE_LOW_WATERMARK: 2000,
  
  /** Performance monitoring */
  SLOW_TRANSPORT_THRESHOLD: 100, // milliseconds
  VERY_SLOW_TRANSPORT_THRESHOLD: 1000, // milliseconds
  
  /** Throttling */
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_LOGS: 10000,
} as const;

/**
 * Context and metadata constants
 */
export const CONTEXT_CONSTANTS = {
  /** Context key limits */
  MAX_CONTEXT_KEYS: 100,
  MAX_CONTEXT_KEY_LENGTH: 100,
  MAX_CONTEXT_VALUE_LENGTH: 1000,
  
  /** Built-in context keys */
  BUILT_IN_KEYS: [
    'timestamp',
    'level',
    'message',
    'logger',
    'module',
    'function',
    'line',
    'pid',
    'hostname',
    'version'
  ] as const,
  
  /** Sensitive data patterns */
  SENSITIVE_PATTERNS: [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /private/i
  ] as const,
  
  /** Context serialization */
  MAX_OBJECT_DEPTH: 10,
  CIRCULAR_REF_PLACEHOLDER: '[Circular]',
} as const;

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  /** Error types */
  ERROR_TYPES: [
    'transport_error',
    'formatter_error',
    'serialization_error',
    'file_error',
    'network_error',
    'timeout_error'
  ] as const,
  
  /** Error recovery */
  MAX_ERROR_RECOVERY_ATTEMPTS: 3,
  ERROR_RECOVERY_DELAY: 5000, // 5 seconds
  
  /** Error reporting */
  MAX_ERROR_MESSAGE_LENGTH: 2000,
  MAX_ERROR_STACK_SIZE: 100,
  ERROR_REPORTING_ENABLED: true,
  
  /** Fallback behavior */
  FALLBACK_TRANSPORT: 'console',
  FALLBACK_LEVEL: 'error',
} as const;

/**
 * Structured logging constants
 */
export const STRUCTURED_LOG_CONSTANTS = {
  /** Field naming conventions */
  FIELD_NAMING: 'camelCase' as const,
  TIMESTAMP_FIELD: 'timestamp',
  LEVEL_FIELD: 'level',
  MESSAGE_FIELD: 'message',
  ERROR_FIELD: 'error',
  
  /** Schema validation */
  SCHEMA_VALIDATION_ENABLED: false,
  MAX_SCHEMA_DEPTH: 5,
  
  /** Data types */
  SUPPORTED_TYPES: [
    'string',
    'number',
    'boolean',
    'object',
    'array',
    'null',
    'undefined'
  ] as const,
} as const;

/**
 * Development and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug modes */
  DEBUG_MODES: [
    'logger:transport',
    'logger:formatter',
    'logger:performance',
    'logger:queue',
    'logger:error'
  ] as const,
  
  /** Development features */
  DEV_MODE: process.env.NODE_ENV === 'development',
  VERBOSE_ENABLED: process.env.TUIX_VERBOSE === 'true',
  
  /** Debug output */
  DEBUG_INDENT: '  ',
  DEBUG_MAX_OBJECT_DEPTH: 5,
  DEBUG_TIMESTAMP_FORMAT: 'HH:mm:ss.SSS',
  
  /** Performance profiling */
  PROFILING_ENABLED: process.env.TUIX_PROFILE === 'true',
  PROFILE_SAMPLE_RATE: 0.01, // 1%
} as const;

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  /** Data sanitization */
  SANITIZE_ENABLED: true,
  SANITIZE_REPLACEMENT: '[REDACTED]',
  
  /** File permissions */
  SECURE_FILE_MODE: 0o600,
  SECURE_DIR_MODE: 0o700,
  
  /** Network security */
  ALLOW_HTTP: false, // Force HTTPS in production
  VERIFY_SSL: true,
  
  /** Input validation */
  MAX_INPUT_SIZE: 100 * 1024, // 100KB
  ALLOW_EVAL: false,
  ALLOW_FUNCTION_CONSTRUCTOR: false,
} as const;

/**
 * Bun-specific constants
 */
export const BUN_CONSTANTS = {
  /** Bun runtime detection */
  IS_BUN: typeof Bun !== 'undefined',
  
  /** Bun file API */
  USE_BUN_FILE_API: typeof Bun !== 'undefined' && typeof Bun.file === 'function',
  
  /** Bun streaming */
  USE_BUN_STREAMS: typeof Bun !== 'undefined' && typeof Bun.write === 'function',
  
  /** Bun performance features */
  BUN_BUFFER_SIZE: 64 * 1024, // 64KB
  BUN_ASYNC_WRITE: true,
} as const;

/**
 * Component integration constants
 */
export const COMPONENT_CONSTANTS = {
  /** Component logging */
  COMPONENT_LOG_LEVEL: 'debug' as const,
  COMPONENT_PERFORMANCE_TRACKING: true,
  
  /** Live dashboard */
  DASHBOARD_UPDATE_INTERVAL: 1000, // 1 second
  DASHBOARD_MAX_ENTRIES: 1000,
  DASHBOARD_RETENTION_TIME: 300000, // 5 minutes
  
  /** Log streaming */
  STREAM_BUFFER_SIZE: 100,
  STREAM_THROTTLE_MS: 100,
  MAX_CONCURRENT_STREAMS: 10,
} as const;