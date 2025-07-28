/**
 * JSX module constants
 *
 * This file contains all constant values used throughout the JSX module.
 * Constants are grouped by functionality and follow the naming convention
 * of SCREAMING_SNAKE_CASE for immutable values.
 */

/**
 * JSX runtime constants
 */
export const JSX_CONSTANTS = {
  /** JSX fragment symbol */
  FRAGMENT_TYPE: Symbol.for('jsx.fragment'),

  /** Component lifecycle timeouts */
  COMPONENT_MOUNT_TIMEOUT: 5000,
  COMPONENT_UNMOUNT_TIMEOUT: 3000,

  /** Maximum component nesting depth */
  MAX_COMPONENT_DEPTH: 100,

  /** JSX transformation constants */
  JSX_NAMESPACE: 'tuix',
  JSX_PRAGMA: 'createElement',
  JSX_FRAGMENT: 'Fragment',
} as const

/**
 * Component system constants
 */
export const COMPONENT_CONSTANTS = {
  /** Component name validation */
  VALID_COMPONENT_NAME_PATTERN: /^[A-Z][A-Za-z0-9]*$/,
  MAX_COMPONENT_NAME_LENGTH: 100,

  /** Props validation */
  MAX_PROPS_DEPTH: 10,
  MAX_PROPS_SIZE: 1024 * 1024, // 1MB

  /** Component lifecycle states */
  LIFECYCLE_STATES: [
    'initializing',
    'mounting',
    'mounted',
    'updating',
    'unmounting',
    'unmounted',
    'error',
  ] as const,

  /** Component cache limits */
  COMPONENT_CACHE_SIZE: 1000,
  COMPONENT_CACHE_TTL: 300000, // 5 minutes
} as const

/**
 * Rendering constants
 */
export const RENDER_CONSTANTS = {
  /** Render modes */
  RENDER_MODES: ['sync', 'async', 'lazy'] as const,

  /** Render scheduling */
  RENDER_BATCH_SIZE: 50,
  RENDER_BATCH_TIMEOUT: 16, // ~60fps

  /** Virtual DOM constants */
  VDOM_NODE_TYPES: ['element', 'text', 'fragment', 'component', 'portal'] as const,

  /** Reconciliation limits */
  MAX_RECONCILE_DEPTH: 1000,
  MAX_RECONCILE_OPERATIONS: 10000,
} as const

/**
 * Event system constants
 */
export const EVENT_CONSTANTS = {
  /** Event types */
  COMPONENT_EVENTS: ['mount', 'unmount', 'update', 'error', 'render'] as const,

  /** Event propagation */
  MAX_EVENT_BUBBLING_DEPTH: 50,
  EVENT_TIMEOUT: 1000,

  /** Event handler limits */
  MAX_EVENT_HANDLERS: 100,
  MAX_EVENT_PAYLOAD_SIZE: 1024 * 1024, // 1MB
} as const

/**
 * State management constants
 */
export const STATE_CONSTANTS = {
  /** State update batching */
  STATE_BATCH_SIZE: 100,
  STATE_BATCH_TIMEOUT: 0, // Immediate

  /** State validation */
  MAX_STATE_DEPTH: 20,
  MAX_STATE_SIZE: 10 * 1024 * 1024, // 10MB

  /** Store constants */
  STORE_UPDATE_TIMEOUT: 1000,
  MAX_STORE_SUBSCRIBERS: 1000,
} as const

/**
 * Hook system constants
 */
export const HOOK_CONSTANTS = {
  /** Hook types */
  HOOK_TYPES: ['state', 'effect', 'context', 'reducer', 'memo', 'callback', 'ref'] as const,

  /** Hook limits */
  MAX_HOOKS_PER_COMPONENT: 100,
  HOOK_DEPENDENCY_MAX_DEPTH: 10,

  /** Effect cleanup timeout */
  EFFECT_CLEANUP_TIMEOUT: 3000,

  /** Hook debugging */
  HOOK_DEBUG_STACK_SIZE: 20,
} as const

/**
 * Context system constants
 */
export const CONTEXT_CONSTANTS = {
  /** Context provider nesting */
  MAX_CONTEXT_DEPTH: 50,

  /** Context value validation */
  MAX_CONTEXT_VALUE_SIZE: 1024 * 1024, // 1MB

  /** Context update batching */
  CONTEXT_UPDATE_BATCH_SIZE: 50,
  CONTEXT_UPDATE_TIMEOUT: 0, // Immediate

  /** Default context values */
  DEFAULT_CONTEXT_NAME: 'UnnamedContext',
} as const

/**
 * Error handling constants
 */
export const ERROR_CONSTANTS = {
  /** Error boundary constants */
  MAX_ERROR_BOUNDARY_DEPTH: 10,
  ERROR_RECOVERY_TIMEOUT: 5000,

  /** Error types */
  ERROR_TYPES: ['render', 'mount', 'unmount', 'update', 'hook', 'context'] as const,

  /** Error reporting limits */
  MAX_ERROR_STACK_SIZE: 50,
  MAX_ERROR_MESSAGE_LENGTH: 1000,

  /** Development error constants */
  DEV_ERROR_OVERLAY_TIMEOUT: 10000,
} as const

/**
 * Development and debugging constants
 */
export const DEBUG_CONSTANTS = {
  /** Debug modes */
  DEBUG_MODES: ['render', 'lifecycle', 'hooks', 'context', 'performance'] as const,

  /** Performance thresholds */
  SLOW_RENDER_THRESHOLD: 16, // 1 frame at 60fps
  SLOW_MOUNT_THRESHOLD: 100,
  SLOW_UPDATE_THRESHOLD: 50,

  /** Dev tools constants */
  DEVTOOLS_COMPONENT_LIMIT: 10000,
  DEVTOOLS_HISTORY_SIZE: 1000,

  /** Debug output formatting */
  DEBUG_COMPONENT_INDENT: '  ',
  DEBUG_PROP_MAX_DISPLAY_LENGTH: 100,
} as const

/**
 * Server-side rendering constants
 */
export const SSR_CONSTANTS = {
  /** SSR timeouts */
  SSR_RENDER_TIMEOUT: 10000,
  SSR_HYDRATION_TIMEOUT: 5000,

  /** SSR streaming */
  SSR_CHUNK_SIZE: 8192,
  SSR_BUFFER_SIZE: 64 * 1024, // 64KB

  /** Hydration constants */
  HYDRATION_MISMATCH_TOLERANCE: 0,
  MAX_HYDRATION_RETRIES: 3,
} as const

/**
 * Testing constants
 */
export const TESTING_CONSTANTS = {
  /** Test environment detection */
  IS_TEST_ENV:
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.VITEST !== undefined,

  /** Test timeouts */
  TEST_RENDER_TIMEOUT: 5000,
  TEST_ASYNC_TIMEOUT: 10000,

  /** Mock constants */
  MOCK_COMPONENT_PREFIX: 'Mock',
  MAX_MOCK_CALL_STACK: 1000,
} as const
