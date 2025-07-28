/**
 * Config module constants
 *
 * This file contains all constant values used throughout the config module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * Configuration file constants
 */
export const CONFIG_FILE_CONSTANTS = {
  /** Configuration file names in order of precedence */
  CONFIG_FILENAMES: [
    'tuix.config.ts',
    'tuix.config.js',
    'tuix.config.mjs',
    'tuix.config.json',
    '.tuixrc.ts',
    '.tuixrc.js',
    '.tuixrc.json',
    '.tuix.json',
  ] as const,

  /** Configuration directories to search */
  CONFIG_DIRS: [process.cwd(), require('os').homedir(), '/etc/tuix'] as const,

  /** File patterns for configuration discovery */
  CONFIG_PATTERNS: ['tuix.config.*', '.tuixrc.*', '.tuix.*'] as const,
} as const

/**
 * Environment variable constants
 */
export const ENV_CONSTANTS = {
  /** Environment variable prefixes */
  TUIX_PREFIX: 'TUIX_',
  CONFIG_PREFIX: 'TUIX_CONFIG_',

  /** Special environment variables */
  CONFIG_FILE: 'TUIX_CONFIG_FILE',
  CONFIG_DIR: 'TUIX_CONFIG_DIR',
  NO_CONFIG: 'TUIX_NO_CONFIG',
  DEBUG_CONFIG: 'TUIX_DEBUG_CONFIG',

  /** Environment parsing patterns */
  BOOLEAN_VALUES: {
    true: ['true', '1', 'yes', 'on', 'enabled'],
    false: ['false', '0', 'no', 'off', 'disabled', ''],
  } as const,

  /** Environment variable limits */
  MAX_ENV_VALUE_LENGTH: 32768, // 32KB
  MAX_ENV_VARIABLES: 1000,
} as const

/**
 * Configuration validation constants
 */
export const VALIDATION_CONSTANTS = {
  /** Schema validation limits */
  MAX_SCHEMA_DEPTH: 20,
  MAX_SCHEMA_PROPERTIES: 1000,
  MAX_ARRAY_LENGTH: 10000,

  /** Value size limits */
  MAX_STRING_LENGTH: 10000,
  MAX_OBJECT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CONFIG_SIZE: 50 * 1024 * 1024, // 50MB

  /** Validation timeouts */
  VALIDATION_TIMEOUT: 10000, // 10 seconds
  ASYNC_VALIDATION_TIMEOUT: 30000, // 30 seconds
} as const

/**
 * Configuration loading constants
 */
export const LOADING_CONSTANTS = {
  /** File loading timeouts */
  FILE_LOAD_TIMEOUT: 10000,
  ASYNC_CONFIG_TIMEOUT: 15000,

  /** Cache configuration */
  CONFIG_CACHE_TTL: 300000, // 5 minutes
  CONFIG_CACHE_SIZE: 100,

  /** Module resolution */
  MODULE_EXTENSIONS: ['.ts', '.js', '.mjs', '.json'] as const,
  REQUIRE_TIMEOUT: 5000,

  /** File watching */
  WATCH_DEBOUNCE: 500, // milliseconds
  WATCH_ENABLED: process.env.TUIX_WATCH_CONFIG !== 'false',
} as const

/**
 * Configuration merging constants
 */
export const MERGE_CONSTANTS = {
  /** Merge strategies */
  MERGE_STRATEGIES: ['replace', 'merge', 'append', 'prepend', 'deep'] as const,

  /** Merge limits */
  MAX_MERGE_DEPTH: 50,
  MAX_MERGE_OPERATIONS: 10000,

  /** Array merging behavior */
  ARRAY_MERGE_STRATEGIES: ['replace', 'concat', 'unique', 'merge'] as const,
} as const

/**
 * Configuration sources constants
 */
export const SOURCE_CONSTANTS = {
  /** Source types */
  SOURCE_TYPES: ['file', 'environment', 'argument', 'remote', 'default'] as const,

  /** Source priorities */
  SOURCE_PRIORITIES: {
    argument: 1000,
    environment: 800,
    file: 600,
    remote: 400,
    default: 200,
  } as const,

  /** Remote source configuration */
  REMOTE_TIMEOUT: 30000,
  REMOTE_RETRY_ATTEMPTS: 3,
  REMOTE_RETRY_DELAY: 1000,
} as const

/**
 * Configuration transformation constants
 */
export const TRANSFORM_CONSTANTS = {
  /** Transform types */
  TRANSFORM_TYPES: [
    'string',
    'number',
    'boolean',
    'array',
    'object',
    'date',
    'regex',
    'function',
  ] as const,

  /** String transformations */
  STRING_TRANSFORMS: [
    'trim',
    'lowercase',
    'uppercase',
    'camelcase',
    'kebabcase',
    'snakecase',
  ] as const,

  /** Number parsing */
  NUMBER_PATTERNS: {
    integer: /^-?\d+$/,
    float: /^-?\d+(\.\d+)?$/,
    scientific: /^-?\d+(\.\d+)?[eE][+-]?\d+$/,
    hex: /^0[xX][0-9a-fA-F]+$/,
    octal: /^0[oO][0-7]+$/,
    binary: /^0[bB][01]+$/,
  } as const,
} as const

/**
 * JSX configuration constants
 */
export const JSX_CONFIG_CONSTANTS = {
  /** JSX-specific configuration keys */
  JSX_KEYS: ['components', 'providers', 'context', 'hooks', 'middleware'] as const,

  /** Component registration limits */
  MAX_COMPONENTS: 1000,
  MAX_COMPONENT_NAME_LENGTH: 100,

  /** Provider configuration */
  MAX_PROVIDERS: 50,
  PROVIDER_TIMEOUT: 5000,

  /** Context configuration */
  MAX_CONTEXTS: 100,
  CONTEXT_VALUE_SIZE_LIMIT: 1024 * 1024, // 1MB
} as const

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  /** Error types */
  ERROR_TYPES: [
    'file_not_found',
    'parse_error',
    'validation_error',
    'schema_error',
    'merge_error',
    'transform_error',
    'timeout_error',
  ] as const,

  /** Error codes */
  ERROR_CODES: {
    CONFIG_FILE_NOT_FOUND: 'CONFIG_FILE_NOT_FOUND',
    CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',
    CONFIG_VALIDATION_ERROR: 'CONFIG_VALIDATION_ERROR',
    CONFIG_SCHEMA_ERROR: 'CONFIG_SCHEMA_ERROR',
    CONFIG_MERGE_ERROR: 'CONFIG_MERGE_ERROR',
    CONFIG_TIMEOUT: 'CONFIG_TIMEOUT',
  } as const,

  /** Error recovery */
  MAX_ERROR_RECOVERY_ATTEMPTS: 3,
  ERROR_RECOVERY_DELAY: 1000,

  /** Error reporting limits */
  MAX_ERROR_MESSAGE_LENGTH: 2000,
  MAX_ERROR_STACK_SIZE: 100,
} as const

/**
 * Development and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug modes */
  DEBUG_MODES: [
    'config:load',
    'config:merge',
    'config:validate',
    'config:transform',
    'config:watch',
  ] as const,

  /** Debug output limits */
  DEBUG_MAX_OBJECT_DEPTH: 10,
  DEBUG_MAX_STRING_LENGTH: 1000,

  /** Performance monitoring */
  SLOW_CONFIG_LOAD_THRESHOLD: 1000, // milliseconds
  SLOW_VALIDATION_THRESHOLD: 500,
  SLOW_MERGE_THRESHOLD: 100,

  /** Development features */
  HOT_RELOAD_ENABLED: process.env.NODE_ENV === 'development',
  CONFIG_INSPECTOR_PORT: 9230,
} as const

/**
 * Schema definition constants
 */
export const SCHEMA_CONSTANTS = {
  /** Built-in schema types */
  SCHEMA_TYPES: [
    'string',
    'number',
    'integer',
    'boolean',
    'array',
    'object',
    'null',
    'any',
  ] as const,

  /** Schema validation keywords */
  VALIDATION_KEYWORDS: [
    'required',
    'optional',
    'default',
    'enum',
    'pattern',
    'minLength',
    'maxLength',
    'minimum',
    'maximum',
  ] as const,

  /** Schema composition */
  COMPOSITION_KEYWORDS: ['allOf', 'anyOf', 'oneOf', 'not'] as const,
} as const

/**
 * Performance constants
 */
export const PERFORMANCE_CONSTANTS = {
  /** Memory limits */
  MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  MEMORY_CHECK_INTERVAL: 10000, // 10 seconds

  /** CPU limits */
  MAX_CPU_TIME: 30000, // 30 seconds
  CPU_CHECK_INTERVAL: 1000, // 1 second

  /** Concurrency limits */
  MAX_CONCURRENT_LOADS: 10,
  MAX_CONCURRENT_VALIDATIONS: 5,

  /** Optimization settings */
  LAZY_LOADING_ENABLED: true,
  CACHING_ENABLED: true,
  COMPRESSION_ENABLED: false,
} as const
