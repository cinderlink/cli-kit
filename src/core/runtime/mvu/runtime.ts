/**
 * Application Runtime - The heart of the TUIX framework
 *
 * This module implements the complete application runtime system, coordinating
 * between input handling, state updates, and rendering cycles using Effect's
 * sophisticated fiber system for concurrent, composable operations.
 *
 * ## Architecture Overview:
 *
 * ### MVU Loop Implementation
 * - **Input Processing**: Keyboard, mouse, and system events
 * - **State Management**: Immutable state transitions via update functions
 * - **Command Execution**: Asynchronous side effects managed as fibers
 * - **Subscription Handling**: Continuous event streams (input, timers, etc.)
 * - **Rendering Pipeline**: Efficient view rendering with caching
 *
 * ### Fiber-Based Concurrency
 * - Separate fibers for input, update, render, and command execution
 * - Graceful shutdown and resource cleanup
 * - Structured concurrency with automatic cancellation
 * - Error boundaries and recovery strategies
 *
 * ### Performance Optimization
 * - Configurable frame rate limiting
 * - Efficient message queuing and batching
 * - Resource pooling and reuse
 * - Minimal allocation patterns
 *
 * ### Service Integration
 * - Terminal operations (clear, write, cursor control)
 * - Input event processing (keyboard, mouse, resize)
 * - Rendering pipeline management
 * - Storage operations for persistence
 *
 * @example
 * ```typescript
 * import { createRuntime, RuntimeConfig } from './runtime'
 *
 * const config: RuntimeConfig = {
 *   fps: 60,
 *   enableMouse: true,
 *   fullscreen: true
 * }
 *
 * const program = Effect.gen(function* (_) {
 *   const runtime = yield* _(createRuntime(config))
 *   yield* _(runtime.run(myComponent))
 * })
 * ```
 *
 * @module
 */

// Re-export everything from the runtime module
export * from './runtime/index'
