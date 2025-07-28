/**
 * Event Channel Constants
 *
 * Centralized definition of all event channel names to prevent circular dependencies
 * between domain modules while maintaining type safety.
 */

/**
 * Core system event channels
 */
export const CoreEventChannels = {
  SCOPE: 'scope-events',
  MODULE: 'module-events',
  LIFECYCLE: 'lifecycle-events',
} as const

/**
 * JSX domain event channels
 */
export const JSXEventChannels = {
  RENDER: 'jsx-render',
  LIFECYCLE: 'jsx-lifecycle',
  SCOPE: 'jsx-scope',
  PLUGIN: 'jsx-plugin',
  COMMAND: 'jsx-command',
} as const

/**
 * CLI domain event channels
 */
export const CLIEventChannels = {
  COMMAND: 'cli-command',
  PARSE: 'cli-parse',
  ROUTE: 'cli-route',
  PLUGIN: 'cli-plugin',
  HELP: 'cli-help',
} as const

/**
 * Service layer event channels
 */
export const ServiceEventChannels = {
  INPUT: 'input-events',
  RENDER: 'render-events',
  STORAGE: 'storage-events',
  TERMINAL: 'terminal-events',
} as const

/**
 * All event channels type union
 */
export type EventChannel =
  | (typeof CoreEventChannels)[keyof typeof CoreEventChannels]
  | (typeof JSXEventChannels)[keyof typeof JSXEventChannels]
  | (typeof CLIEventChannels)[keyof typeof CLIEventChannels]
  | (typeof ServiceEventChannels)[keyof typeof ServiceEventChannels]
