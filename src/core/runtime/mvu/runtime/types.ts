/**
 * Runtime Types and Interfaces
 * 
 * Core type definitions for the MVU runtime system
 */

import type { Effect, Duration, Context } from "effect"
import type { View, Component, Update, UpdateResult } from "../../../types"
import type { KeyEvent } from "../../../terminal/input/keys"

/**
 * System messages produced by the runtime
 * These are internal messages that drive the application lifecycle
 */
export type SystemMsg<Msg> = 
  | { readonly _tag: "Init" }
  | { readonly _tag: "KeyPress"; readonly key: KeyEvent }
  | { readonly _tag: "MouseMove"; readonly x: number; readonly y: number }
  | { readonly _tag: "MouseClick"; readonly x: number; readonly y: number; readonly button: number }
  | { readonly _tag: "WindowResize"; readonly width: number; readonly height: number }
  | { readonly _tag: "Quit" }
  | { readonly _tag: "UserMsg"; readonly msg: Msg }
  | { readonly _tag: "Batch"; readonly msgs: ReadonlyArray<Msg> }
  | { readonly _tag: "Timer"; readonly id: string }
  | { readonly _tag: "Subscription"; readonly source: string; readonly data: unknown }
  | { readonly _tag: "CommandComplete"; readonly id: string; readonly result: unknown }
  | { readonly _tag: "CommandError"; readonly id: string; readonly error: unknown }
  | { readonly _tag: "RenderComplete"; readonly duration: number }
  | { readonly _tag: "UpdateComplete"; readonly duration: number }
  | { readonly _tag: "Error"; readonly error: unknown; readonly context: string }
  | { readonly _tag: "Debug"; readonly message: string; readonly data?: unknown }

/**
 * Runtime configuration options
 * Controls various aspects of the application runtime behavior
 */
export interface RuntimeConfig {
  /**
   * Target frames per second for rendering
   * @default 60
   */
  readonly fps?: number
  
  /**
   * Enable mouse support
   * @default false
   */
  readonly enableMouse?: boolean
  
  /**
   * Run in fullscreen mode
   * @default true
   */
  readonly fullscreen?: boolean
  
  /**
   * Enable debug logging
   * @default false
   */
  readonly debug?: boolean
  
  /**
   * Custom error handler
   */
  readonly onError?: (error: unknown) => Effect<void>
  
  /**
   * Custom quit handler
   */
  readonly onQuit?: () => Effect<void>
  
  /**
   * Buffer size for message queue
   * @default 1000
   */
  readonly messageBufferSize?: number
  
  /**
   * Timeout for update operations
   * @default 5 seconds
   */
  readonly updateTimeout?: Duration.Duration
  
  /**
   * Timeout for command operations  
   * @default 30 seconds
   */
  readonly commandTimeout?: Duration.Duration
  
  /**
   * Maximum concurrent commands
   * @default 10
   */
  readonly maxConcurrentCommands?: number
  
  /**
   * Enable performance monitoring
   * @default false
   */
  readonly performanceMonitoring?: boolean
  
  /**
   * Custom context for dependency injection
   */
  readonly context?: Context<unknown>
}

/**
 * Runtime state tracking
 */
export interface RuntimeState<Model> {
  model: Model
  isRunning: boolean
  frameCount: number
  lastRenderTime: number
  commandCount: number
  activeCommands: Set<string>
}

/**
 * Runtime metrics for monitoring
 */
export interface RuntimeMetrics {
  frameRate: number
  updateDuration: number
  renderDuration: number
  commandsQueued: number
  commandsActive: number
  messagesQueued: number
  memoryUsage: number
}

/**
 * Runtime error class
 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "RuntimeError"
  }
}