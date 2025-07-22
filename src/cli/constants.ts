/**
 * CLI module constants
 * 
 * This file contains all constant values used throughout the CLI module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * CLI runtime constants
 */
export const CLI_CONSTANTS = {
  /** Default CLI name */
  DEFAULT_CLI_NAME: 'tuix-cli',
  
  /** Command execution timeout */
  COMMAND_TIMEOUT: 30000, // 30 seconds
  
  /** Maximum command nesting depth */
  MAX_COMMAND_DEPTH: 10,
  
  /** Default help command names */
  HELP_COMMANDS: ['help', '-h', '--help'] as const,
} as const;

/**
 * Argument parsing constants
 */
export const PARSER_CONSTANTS = {
  /** Argument prefixes */
  LONG_FLAG_PREFIX: '--',
  SHORT_FLAG_PREFIX: '-',
  
  /** Value separators */
  KEY_VALUE_SEPARATOR: '=',
  
  /** Special argument patterns */
  END_OF_OPTIONS: '--',
  STDIN_INDICATOR: '-',
  
  /** Validation limits */
  MAX_ARGUMENT_LENGTH: 4096,
  MAX_ARGUMENTS: 1000,
} as const;

/**
 * Plugin system constants
 */
export const PLUGIN_CONSTANTS = {
  /** Plugin discovery patterns */
  PLUGIN_FILE_PATTERNS: [
    '*.plugin.ts',
    '*.plugin.js',
    '*-plugin.ts',
    '*-plugin.js'
  ] as const,
  
  /** Plugin loading timeout */
  PLUGIN_LOAD_TIMEOUT: 10000,
  
  /** Maximum plugins per CLI */
  MAX_PLUGINS: 100,
  
  /** Plugin lifecycle timeouts */
  PLUGIN_INIT_TIMEOUT: 5000,
  PLUGIN_DESTROY_TIMEOUT: 3000,
} as const;

/**
 * Command registry constants
 */
export const REGISTRY_CONSTANTS = {
  /** Command name validation */
  VALID_COMMAND_NAME_PATTERN: /^[a-z][a-z0-9-]*$/,
  MAX_COMMAND_NAME_LENGTH: 50,
  
  /** Reserved command names */
  RESERVED_COMMANDS: [
    'help', 'version', 'completion', 
    'config', 'plugin', 'debug'
  ] as const,
  
  /** Command cache limits */
  COMMAND_CACHE_SIZE: 1000,
  COMMAND_CACHE_TTL: 600000, // 10 minutes
} as const;

/**
 * Help system constants
 */
export const HELP_CONSTANTS = {
  /** Help display limits */
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_EXAMPLE_COUNT: 10,
  
  /** Help formatting */
  HELP_INDENT: '  ',
  HELP_SECTION_SPACING: 1,
  
  /** Help content defaults */
  DEFAULT_USAGE_FORMAT: 'Usage: {name} {command} [options] [args]',
  DEFAULT_NO_DESCRIPTION: 'No description available',
} as const;

/**
 * Configuration constants
 */
export const CONFIG_CONSTANTS = {
  /** Configuration file names (in order of precedence) */
  CONFIG_FILE_NAMES: [
    'tuix.config.ts',
    'tuix.config.js',
    'tuix.config.json',
    '.tuix.json'
  ] as const,
  
  /** Environment variable prefixes */
  ENV_PREFIX: 'TUIX_',
  CLI_ENV_PREFIX: 'TUIX_CLI_',
  
  /** Configuration validation */
  MAX_CONFIG_DEPTH: 10,
  MAX_CONFIG_SIZE: 1024 * 1024, // 1MB
} as const;

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  /** Exit codes */
  EXIT_SUCCESS: 0,
  EXIT_GENERAL_ERROR: 1,
  EXIT_COMMAND_NOT_FOUND: 127,
  EXIT_INVALID_ARGUMENT: 2,
  EXIT_PERMISSION_DENIED: 126,
  EXIT_TIMEOUT: 124,
  
  /** Error message templates */
  COMMAND_NOT_FOUND: 'Command "{command}" not found',
  INVALID_ARGUMENT: 'Invalid argument: {argument}',
  MISSING_REQUIRED: 'Missing required {type}: {name}',
  
  /** Error context limits */
  MAX_ERROR_CONTEXT_LENGTH: 500,
  MAX_SUGGESTION_COUNT: 5,
} as const;

/**
 * Input handling constants
 */
export const INPUT_CONSTANTS = {
  /** Key codes */
  CTRL_C: '\u0003',
  CTRL_D: '\u0004',
  ESC: '\u001b',
  ENTER: '\r',
  NEWLINE: '\n',
  TAB: '\t',
  BACKSPACE: '\u0008',
  DELETE: '\u007f',
  
  /** Input buffer limits */
  INPUT_HISTORY_SIZE: 1000,
  INPUT_LINE_MAX_LENGTH: 4096,
  
  /** Completion constants */
  COMPLETION_MAX_SUGGESTIONS: 20,
  COMPLETION_TIMEOUT: 1000,
} as const;

/**
 * Logging and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug scopes */
  DEBUG_SCOPES: [
    'cli:parser',
    'cli:registry',
    'cli:plugin',
    'cli:runner',
    'cli:config'
  ] as const,
  
  /** Performance monitoring */
  SLOW_COMMAND_THRESHOLD: 1000, // 1 second
  MEMORY_WARNING_THRESHOLD: 100 * 1024 * 1024, // 100MB
  
  /** Debug output formatting */
  DEBUG_TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss.SSS',
  DEBUG_INDENT: '│ ',
} as const;