/**
 * Plugins module constants
 * 
 * This file contains all constant values used throughout the plugins module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * Plugin system constants
 */
export const PLUGIN_CONSTANTS = {
  /** Plugin discovery and loading */
  PLUGIN_EXTENSIONS: ['.ts', '.js', '.mts', '.mjs'] as const,
  PLUGIN_FILE_PATTERNS: [
    '*.plugin.ts',
    '*.plugin.js', 
    '*-plugin.ts',
    '*-plugin.js',
    'plugin.ts',
    'plugin.js'
  ] as const,
  
  /** Plugin loading timeouts */
  PLUGIN_LOAD_TIMEOUT: 15000, // 15 seconds
  PLUGIN_INIT_TIMEOUT: 10000, // 10 seconds
  PLUGIN_DESTROY_TIMEOUT: 5000, // 5 seconds
  
  /** Plugin limits */
  MAX_PLUGINS: 200,
  MAX_PLUGIN_NAME_LENGTH: 100,
  MAX_PLUGIN_DESCRIPTION_LENGTH: 500,
} as const;

/**
 * Plugin lifecycle constants
 */
export const LIFECYCLE_CONSTANTS = {
  /** Lifecycle phases */
  PHASES: [
    'initialize',
    'configure',
    'register',
    'activate',
    'deactivate',
    'cleanup',
    'destroy'
  ] as const,
  
  /** Phase timeouts */
  PHASE_TIMEOUTS: {
    initialize: 5000,
    configure: 3000,
    register: 2000,
    activate: 2000,
    deactivate: 1000,
    cleanup: 3000,
    destroy: 2000,
  } as const,
  
  /** State transitions */
  VALID_TRANSITIONS: {
    unloaded: ['loading'],
    loading: ['loaded', 'error'],
    loaded: ['initializing', 'unloading'],
    initializing: ['initialized', 'error'],
    initialized: ['configuring', 'destroying'],
    configuring: ['configured', 'error'],
    configured: ['registering', 'destroying'],
    registering: ['registered', 'error'], 
    registered: ['activating', 'destroying'],
    activating: ['active', 'error'],
    active: ['deactivating', 'destroying'],
    deactivating: ['deactivated', 'error'],
    deactivated: ['destroying', 'activating'],
    destroying: ['destroyed', 'error'],
    destroyed: ['unloading'],
    unloading: ['unloaded'],
    error: ['destroying', 'unloading']
  } as const,
} as const;

/**
 * Plugin dependency constants
 */
export const DEPENDENCY_CONSTANTS = {
  /** Dependency resolution */
  MAX_DEPENDENCY_DEPTH: 20,
  DEPENDENCY_RESOLUTION_TIMEOUT: 30000,
  
  /** Version constraints */
  VERSION_PATTERN: /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/,
  SEMVER_RANGES: ['^', '~', '>=', '<=', '>', '<', '='] as const,
  
  /** Dependency types */
  DEPENDENCY_TYPES: [
    'required',
    'optional', 
    'peer',
    'dev'
  ] as const,
} as const;

/**
 * Plugin API constants
 */
export const API_CONSTANTS = {
  /** API version */
  API_VERSION: '1.0.0',
  MIN_SUPPORTED_API_VERSION: '0.9.0',
  
  /** Hook priorities */
  HOOK_PRIORITIES: {
    HIGHEST: 1000,
    HIGH: 750,
    NORMAL: 500,
    LOW: 250,
    LOWEST: 0,
  } as const,
  
  /** Hook types */
  HOOK_TYPES: [
    'init',
    'configure',
    'command',
    'preCommand',
    'postCommand',
    'error',
    'cleanup'
  ] as const,
  
  /** Extension points */
  EXTENSION_POINTS: [
    'commands',
    'config',
    'middleware',
    'services',
    'components',
    'themes'
  ] as const,
} as const;

/**
 * Plugin configuration constants
 */
export const CONFIG_CONSTANTS = {
  /** Configuration schema validation */
  MAX_CONFIG_DEPTH: 10,
  MAX_CONFIG_SIZE: 1024 * 1024, // 1MB
  
  /** Configuration file names */
  CONFIG_FILE_NAMES: [
    'plugin.config.ts',
    'plugin.config.js',
    'plugin.json',
    'package.json'
  ] as const,
  
  /** Environment variable prefixes */
  ENV_PREFIX: 'TUIX_PLUGIN_',
  
  /** Default configuration values */
  DEFAULT_ENABLED: true,
  DEFAULT_PRIORITY: 500,
} as const;

/**
 * Plugin security constants  
 */
export const SECURITY_CONSTANTS = {
  /** Permission types */
  PERMISSION_TYPES: [
    'filesystem',
    'network',
    'process',
    'environment',
    'system'
  ] as const,
  
  /** Sandbox limits */
  MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  MAX_CPU_TIME: 30000, // 30 seconds
  MAX_FILE_OPERATIONS: 1000,
  MAX_NETWORK_REQUESTS: 100,
  
  /** Security levels */
  SECURITY_LEVELS: [
    'unrestricted',
    'standard',
    'restricted',
    'sandbox'
  ] as const,
} as const;

/**
 * Plugin registry constants
 */
export const REGISTRY_CONSTANTS = {
  /** Registry URLs */
  DEFAULT_REGISTRY_URL: 'https://registry.tuix.dev',
  FALLBACK_REGISTRY_URL: 'https://npm.tuix.dev',
  
  /** Package naming */
  PACKAGE_NAME_PATTERN: /^@?[a-z0-9]([a-z0-9-]*[a-z0-9])?\/[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
  SCOPED_PACKAGE_PATTERN: /^@[a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-._~]+$/,
  
  /** Download and caching */
  DOWNLOAD_TIMEOUT: 60000, // 1 minute
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
} as const;

/**
 * Plugin error constants
 */
export const ERROR_CONSTANTS = {
  /** Error codes */
  ERROR_CODES: {
    PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
    PLUGIN_LOAD_FAILED: 'PLUGIN_LOAD_FAILED',
    PLUGIN_INIT_FAILED: 'PLUGIN_INIT_FAILED',
    DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
    DEPENDENCY_CONFLICT: 'DEPENDENCY_CONFLICT',
    VERSION_MISMATCH: 'VERSION_MISMATCH',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    TIMEOUT: 'TIMEOUT',
    INVALID_CONFIG: 'INVALID_CONFIG',
  } as const,
  
  /** Error message templates */
  ERROR_MESSAGES: {
    PLUGIN_NOT_FOUND: 'Plugin "{name}" not found',
    PLUGIN_LOAD_FAILED: 'Failed to load plugin "{name}": {error}',
    DEPENDENCY_MISSING: 'Plugin "{name}" requires dependency "{dependency}"',
    VERSION_MISMATCH: 'Plugin "{name}" requires version {required}, got {actual}',
  } as const,
  
  /** Error context limits */
  MAX_ERROR_STACK_SIZE: 50,
  MAX_ERROR_MESSAGE_LENGTH: 1000,
} as const;

/**
 * Plugin development constants
 */
export const DEV_CONSTANTS = {
  /** Development mode detection */
  IS_DEV_MODE: process.env.NODE_ENV === 'development' || 
               process.env.TUIX_DEV === 'true',
  
  /** Hot reload constants */
  HOT_RELOAD_ENABLED: process.env.TUIX_HOT_RELOAD !== 'false',
  HOT_RELOAD_DEBOUNCE: 500, // milliseconds
  
  /** Development tooling */
  DEV_TOOLS_PORT: 9229,
  DEV_INSPECTOR_ENABLED: process.env.TUIX_INSPECTOR === 'true',
  
  /** Development logging */
  DEV_LOG_LEVEL: 'debug',
  DEV_VERBOSE: process.env.TUIX_VERBOSE === 'true',
} as const;

/**
 * Plugin testing constants
 */
export const TESTING_CONSTANTS = {
  /** Test environment detection */
  IS_TEST_ENV: process.env.NODE_ENV === 'test' ||
               process.env.JEST_WORKER_ID !== undefined ||
               process.env.VITEST !== undefined,
  
  /** Test timeouts */
  TEST_PLUGIN_LOAD_TIMEOUT: 10000,
  TEST_HOOK_TIMEOUT: 5000,
  
  /** Mock plugin constants */
  MOCK_PLUGIN_PREFIX: 'mock-',
  MAX_MOCK_PLUGINS: 50,
} as const;