/**
 * Process Manager module constants
 * 
 * This file contains all constant values used throughout the process-manager module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * Process lifecycle constants
 */
export const PROCESS_CONSTANTS = {
  /** Process states */
  STATES: [
    'idle',
    'starting',
    'running', 
    'stopping',
    'stopped',
    'crashed',
    'restarting'
  ] as const,
  
  /** Process timeouts */
  START_TIMEOUT: 30000, // 30 seconds
  STOP_TIMEOUT: 10000, // 10 seconds
  KILL_TIMEOUT: 5000, // 5 seconds
  RESTART_DELAY: 2000, // 2 seconds
  
  /** Process limits */
  MAX_PROCESSES: 100,
  MAX_PROCESS_NAME_LENGTH: 100,
  MAX_COMMAND_LENGTH: 4096,
  
  /** Default process configuration */
  DEFAULT_RESTART_ATTEMPTS: 3,
  DEFAULT_RESTART_DELAY: 1000,
  DEFAULT_MEMORY_LIMIT: 512 * 1024 * 1024, // 512MB
} as const;

/**
 * Stream handling constants
 */
export const STREAM_CONSTANTS = {
  /** Stream types */
  STREAM_TYPES: ['stdout', 'stderr', 'stdin'] as const,
  
  /** Buffer limits */
  STREAM_BUFFER_SIZE: 64 * 1024, // 64KB
  MAX_STREAM_BUFFER_SIZE: 10 * 1024 * 1024, // 10MB
  STREAM_HIGH_WATER_MARK: 16 * 1024, // 16KB
  
  /** Stream timeouts */
  STREAM_TIMEOUT: 5000, // 5 seconds
  PIPE_TIMEOUT: 3000, // 3 seconds
  
  /** Encoding and formatting */
  DEFAULT_ENCODING: 'utf8' as const,
  LINE_SEPARATOR: '\n',
  CARRIAGE_RETURN: '\r',
} as const;

/**
 * Monitoring constants
 */
export const MONITORING_CONSTANTS = {
  /** Health check intervals */
  HEALTH_CHECK_INTERVAL: 5000, // 5 seconds
  PROCESS_STATS_INTERVAL: 1000, // 1 second
  CLEANUP_INTERVAL: 30000, // 30 seconds
  
  /** Resource monitoring */
  CPU_SAMPLE_INTERVAL: 1000, // 1 second
  MEMORY_CHECK_INTERVAL: 2000, // 2 seconds
  
  /** Thresholds */
  HIGH_CPU_THRESHOLD: 80, // 80%
  HIGH_MEMORY_THRESHOLD: 90, // 90%
  CRASH_THRESHOLD: 5, // crashes per hour
  
  /** History retention */
  STATS_HISTORY_SIZE: 3600, // 1 hour of second-by-second stats
  LOG_HISTORY_SIZE: 10000, // 10k log entries
  EVENT_HISTORY_SIZE: 1000, // 1k events
} as const;

/**
 * Signal handling constants
 */
export const SIGNAL_CONSTANTS = {
  /** Supported signals */
  SUPPORTED_SIGNALS: [
    'SIGTERM',
    'SIGKILL', 
    'SIGINT',
    'SIGHUP',
    'SIGQUIT',
    'SIGUSR1',
    'SIGUSR2'
  ] as const,
  
  /** Signal timeouts */
  SIGTERM_TIMEOUT: 10000, // 10 seconds
  SIGKILL_TIMEOUT: 5000, // 5 seconds
  
  /** Default shutdown sequence */
  SHUTDOWN_SIGNALS: ['SIGTERM', 'SIGKILL'] as const,
  SHUTDOWN_DELAYS: [10000, 5000] as const, // milliseconds
} as const;

/**
 * File system constants
 */
export const FILE_SYSTEM_CONSTANTS = {
  /** Process file locations */
  PROCESS_DIR: '.tuix/processes',
  PID_FILE_EXTENSION: '.pid',
  LOG_FILE_EXTENSION: '.log',
  CONFIG_FILE_EXTENSION: '.json',
  
  /** File permissions */
  PID_FILE_MODE: 0o644,
  LOG_FILE_MODE: 0o644,
  CONFIG_FILE_MODE: 0o644,
  PROCESS_DIR_MODE: 0o755,
  
  /** File operations */
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  FILE_ROTATION_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 5,
  FILE_CHECK_INTERVAL: 60000, // 1 minute
} as const;

/**
 * Environment constants
 */
export const ENVIRONMENT_CONSTANTS = {
  /** Environment variable prefixes */
  PROCESS_ENV_PREFIX: 'TUIX_PROCESS_',
  MANAGER_ENV_PREFIX: 'TUIX_PM_',
  
  /** Special environment variables */
  PROCESS_NAME_VAR: 'TUIX_PROCESS_NAME',
  PROCESS_ID_VAR: 'TUIX_PROCESS_ID',
  MANAGER_PID_VAR: 'TUIX_PM_PID',
  
  /** Environment limits */
  MAX_ENV_VARS: 1000,
  MAX_ENV_VAR_LENGTH: 32768, // 32KB
  
  /** Path handling */
  PATH_SEPARATOR: require('path').sep,
  DEFAULT_SHELL: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
} as const;

/**
 * IPC (Inter-Process Communication) constants
 */
export const IPC_CONSTANTS = {
  /** IPC types */
  IPC_TYPES: ['pipe', 'socket', 'tcp', 'udp'] as const,
  
  /** Message types */
  MESSAGE_TYPES: [
    'status',
    'command',
    'response',
    'event',
    'log',
    'error',
    'heartbeat'
  ] as const,
  
  /** IPC limits */
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  MAX_PENDING_MESSAGES: 1000,
  MESSAGE_TIMEOUT: 30000, // 30 seconds
  
  /** Connection settings */
  CONNECTION_TIMEOUT: 10000, // 10 seconds
  HEARTBEAT_INTERVAL: 5000, // 5 seconds
  RECONNECT_DELAY: 2000, // 2 seconds
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  /** Error types */
  ERROR_TYPES: [
    'spawn_error',
    'timeout_error',
    'signal_error',
    'permission_error',
    'resource_error',
    'stream_error',
    'ipc_error'
  ] as const,
  
  /** Exit codes */
  EXIT_CODES: {
    SUCCESS: 0,
    GENERAL_ERROR: 1,
    MISUSE: 2,
    CANNOT_EXECUTE: 126,
    COMMAND_NOT_FOUND: 127,
    INVALID_EXIT: 128,
    SIGKILL: 137,
    SIGTERM: 143,
  } as const,
  
  /** Error recovery */
  MAX_ERROR_RECOVERY_ATTEMPTS: 3,
  ERROR_RECOVERY_DELAY: 5000, // 5 seconds
  
  /** Error reporting */
  MAX_ERROR_MESSAGE_LENGTH: 2000,
  MAX_ERROR_STACK_SIZE: 100,
} as const;

/**
 * Performance constants
 */
export const PERFORMANCE_CONSTANTS = {
  /** Resource limits */
  MAX_MEMORY_USAGE: 1024 * 1024 * 1024, // 1GB for manager
  MAX_CPU_USAGE: 50, // 50% CPU
  
  /** Queue limits */
  MAX_COMMAND_QUEUE: 1000,
  MAX_EVENT_QUEUE: 5000,
  QUEUE_PROCESS_BATCH_SIZE: 10,
  
  /** Performance monitoring */
  SLOW_OPERATION_THRESHOLD: 1000, // 1 second
  VERY_SLOW_OPERATION_THRESHOLD: 5000, // 5 seconds
  
  /** Optimization settings */
  ENABLE_PROCESS_POOLING: false,
  ENABLE_LAZY_LOADING: true,
  ENABLE_CACHING: true,
} as const;

/**
 * Bun-specific constants
 */
export const BUN_CONSTANTS = {
  /** Bun runtime detection */
  IS_BUN: typeof Bun !== 'undefined',
  
  /** Bun spawn options */
  BUN_SPAWN_OPTIONS: {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
    cwd: process.cwd(),
  } as const,
  
  /** Bun file system operations */
  USE_BUN_FS: typeof Bun !== 'undefined' && typeof Bun.file === 'function',
  BUN_FILE_OPTIONS: {
    encoding: 'utf-8'
  } as const,
  
  /** Bun process features */
  BUN_SHELL_SUPPORT: true,
  BUN_ASYNC_SPAWN: true,
} as const;

/**
 * Component integration constants
 */
export const COMPONENT_CONSTANTS = {
  /** Process monitoring components */
  MONITOR_UPDATE_INTERVAL: 1000, // 1 second
  MONITOR_MAX_PROCESSES: 50,
  
  /** Status view configuration */
  STATUS_REFRESH_RATE: 2000, // 2 seconds
  STATUS_HISTORY_SIZE: 100,
  
  /** Stream viewer settings */
  STREAM_VIEWER_BUFFER_SIZE: 1000,
  STREAM_VIEWER_AUTO_SCROLL: true,
  STREAM_VIEWER_MAX_LINES: 10000,
} as const;

/**
 * Security constants
 */
export const SECURITY_CONSTANTS = {
  /** Permission checks */
  CHECK_PERMISSIONS: true,
  ALLOW_SHELL_COMMANDS: true,
  SANDBOX_MODE: false,
  
  /** Process isolation */
  ISOLATE_PROCESSES: false,
  USE_SEPARATE_GROUPS: false,
  
  /** Security limits */
  MAX_CHILD_PROCESSES: 50,
  MAX_OPEN_FILES: 1000,
  MAX_NETWORK_CONNECTIONS: 100,
} as const;

/**
 * Development and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug modes */
  DEBUG_MODES: [
    'process:spawn',
    'process:lifecycle',
    'process:streams',
    'process:signals',
    'process:monitoring'
  ] as const,
  
  /** Development features */
  DEV_MODE: process.env.NODE_ENV === 'development',
  VERBOSE_LOGGING: process.env.TUIX_VERBOSE === 'true',
  
  /** Debug output formatting */
  DEBUG_TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss.SSS',
  DEBUG_INDENT: '  ',
  DEBUG_MAX_OBJECT_DEPTH: 5,
  
  /** Process debugging */
  ENABLE_PROCESS_DEBUGGING: process.env.TUIX_DEBUG_PROCESSES === 'true',
  DEBUG_SIGNAL_HANDLING: process.env.TUIX_DEBUG_SIGNALS === 'true',
} as const;

/**
 * Template and configuration constants
 */
export const TEMPLATE_CONSTANTS = {
  /** Template types */
  TEMPLATE_TYPES: [
    'web-server',
    'worker',
    'cron-job',
    'daemon',
    'batch-job'
  ] as const,
  
  /** Template defaults */
  DEFAULT_TEMPLATE: 'daemon',
  TEMPLATE_CONFIG_VERSION: '1.0.0',
  
  /** Template validation */
  MAX_TEMPLATE_SIZE: 1024 * 1024, // 1MB
  REQUIRED_TEMPLATE_FIELDS: [
    'name',
    'command',
    'type'
  ] as const,
} as const;