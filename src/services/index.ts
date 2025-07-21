/**
 * Services Module - Core service layer for the TUIX framework
 * 
 * This module provides the service layer that abstracts terminal operations,
 * input handling, rendering, and storage. All services are defined as Effect
 * Context interfaces, enabling dependency injection and testability.
 * 
 * ## Service Categories:
 * 
 * ### Terminal Services
 * - **TerminalService**: Low-level terminal operations (cursor, screen, raw mode)
 * - **InputService**: Keyboard and mouse input handling with event streams
 * - **RendererService**: View rendering pipeline with frame management
 * 
 * ### State & Storage
 * - **StorageService**: Persistent state management with JSON serialization
 * - **FocusService**: Focus management for component trees
 * 
 * ### Component Services
 * - **HitTestService**: Mouse event hit testing for interactive components
 * - **MouseRouterService**: Mouse event routing to focused components
 * 
 * ## Architecture:
 * 
 * Services follow the Effect Context pattern:
 * - Defined as Context.Tag interfaces
 * - Implemented separately from interface definitions
 * - Composed using Effect layers for dependency injection
 * - Fully testable with mock implementations
 * 
 * @example
 * ```typescript
 * import { TerminalService, InputService } from '@/services'
 * 
 * const program = Effect.gen(function* (_) {
 *   const terminal = yield* _(TerminalService)
 *   const input = yield* _(InputService)
 *   
 *   yield* _(terminal.clear)
 *   yield* _(terminal.write('Hello, World!'))
 *   
 *   const keyEvents = yield* _(input.keyEvents)
 *   // Process key events...
 * })
 * ```
 * 
 * @module services
 */

// Service interfaces from core
export * from "../core/services/terminal"
export * from "../core/services/input"
export * from "../core/services/renderer"
export * from "../core/services/storage"

// Services that remain in this module
export * from "./hit-test"
export * from "./mouse-router"
export * from "./focus"

// Re-export common types from core
export type {
  TerminalError,
  InputError,
  RenderError,
  StorageError,
  AppError,
  KeyEvent,
  MouseEvent,
  WindowSize,
  View,
  Viewport,
  TerminalCapabilities,
  AppServices,
  Component,
  Cmd
} from "../core/types"