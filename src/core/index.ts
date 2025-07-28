/**
 * Core Module - Unified type system and runtime for the TUIX framework
 *
 * This module serves as the primary entry point for the TUIX framework, providing
 * a comprehensive Model-View-Update (MVU) architecture enhanced with Effect.ts for
 * type-safe, composable terminal UI applications.
 *
 * ## Architecture Overview:
 *
 * ### MVU Pattern Implementation
 * - **Model**: Immutable application state management
 * - **View**: Pure rendering functions for terminal output
 * - **Update**: State transition functions triggered by messages
 * - **Commands**: Asynchronous operations producing messages
 * - **Subscriptions**: Continuous streams of external events
 *
 * ### Effect.ts Integration
 * - Comprehensive error handling with typed error channels
 * - Resource-safe operations with automatic cleanup
 * - Dependency injection through Context system
 * - Structured concurrency with fiber management
 *
 * ### Key Components
 * - **Runtime**: Application lifecycle and event loop management
 * - **Types**: Complete type system for MVU architecture
 * - **Schemas**: Runtime validation with Zod integration
 * - **Views**: Rendering primitives and layout utilities
 * - **Errors**: Comprehensive error handling and recovery
 * - **Keys**: Keyboard input processing and event handling
 *
 * @example
 * ```typescript
 * import { Component, runApp, Effect } from '@/core'
 *
 * // Define your component
 * const myComponent: Component<MyModel, MyMsg> = {
 *   init: Effect.succeed([initialModel, []]),
 *   update: (msg, model) => Effect.succeed([newModel, commands]),
 *   view: (model) => ({ render: () => Effect.succeed(viewString) })
 * }
 *
 * // Run the application
 * const program = runApp(myComponent, { fps: 60, enableMouse: true })
 * await Effect.runPromise(Effect.provide(program, services))
 * ```
 *
 * @module core
 */

// =============================================================================
// Core Types and Interfaces
// =============================================================================

/**
 * Complete type system for MVU architecture
 *
 * Exports all fundamental types including Component, View, Cmd, Sub,
 * and service interfaces for building type-safe TUI applications.
 */
export * from './types'

/**
 * Runtime validation schemas
 *
 * Zod schemas for validating input data, configuration, and runtime
 * type checking. Provides both validation functions and type inference.
 */
export * as Schemas from './types/schemas'

// =============================================================================
// Error Handling System
// =============================================================================

/**
 * Comprehensive error handling with recovery strategies
 *
 * Exports all error types, utility functions, and recovery mechanisms
 * for robust error handling throughout the application.
 */
export {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  ConfigError,
  ComponentError,
  ApplicationError,
  ValidationError,
  ErrorUtils,
  withErrorBoundary,
  withRecovery,
  RecoveryStrategies,
} from './types/errors'

// =============================================================================
// External Dependencies
// =============================================================================

/**
 * Effect.ts primitives for functional programming
 *
 * Re-exports commonly used Effect types for convenient access
 * without needing separate imports in consumer code.
 */
export { Effect, Context, Layer, Stream, Queue, Ref } from 'effect'

/**
 * Zod schema builder
 *
 * Re-exports Zod as 'Schema' for convenient schema construction
 * and validation in application code.
 */
export { z as Schema } from 'zod'

/**
 * Core constants
 */
export * from './constants'

// =============================================================================
// Application Runtime
// =============================================================================

/**
 * Application runtime and execution environment
 *
 * Provides the main Runtime class and convenience functions for
 * running TUIX applications with proper lifecycle management.
 */
export { Runtime, runApp } from './runtime/mvu/runtime'
export type { RuntimeConfig, SystemMsg } from './runtime/mvu/runtime'

/**
 * Keyboard input processing utilities
 *
 * Comprehensive keyboard handling with cross-platform compatibility
 * and convenient utility functions for common key operations.
 */
export { KeyUtils } from './terminal/input/keys'
export type { KeyEvent, KeyType } from './terminal/input/keys'

// =============================================================================
// View System
// =============================================================================

/**
 * View rendering primitives and layout utilities
 *
 * Complete set of functions for creating, composing, and styling
 * views in terminal UI applications.
 */
export * as View from './view/primitives/view'

/**
 * High-performance view caching system
 *
 * LRU-based caching for view rendering optimization,
 * improving performance in complex UI applications.
 */
export * as ViewCache from './view/view-cache'

// =============================================================================
// Event System
// =============================================================================

/**
 * Event bus for inter-module communication
 *
 * Provides a typed, Effect-based event bus for coordination
 * between different modules without tight coupling.
 */
export { EventBus, getGlobalEventBus } from './model/events/event-bus'
export type { BaseEvent, EventHandler } from './model/events/event-bus'

// =============================================================================
// Context System
// =============================================================================

/**
 * Core context abstractions for cross-cutting concerns
 *
 * Provides context utilities for component state management
 * and cross-module communication patterns.
 */
export {
  ComponentContext,
  ComponentContextRef,
  useComponentContext,
  withComponentContext,
  type ComponentContextValue,
} from './context'
