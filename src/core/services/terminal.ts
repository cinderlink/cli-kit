/**
 * Terminal Service - Low-level terminal operations and state management
 *
 * This service provides an abstraction over terminal operations, handling
 * ANSI escape sequences, terminal state, and cross-platform compatibility.
 */

import { Effect, Context } from 'effect'
import type { TerminalError, WindowSize, TerminalCapabilities } from '@core/types'

export type { TerminalError, WindowSize, TerminalCapabilities }

/**
 * The TerminalService interface defines all low-level terminal operations.
 * This is implemented as an Effect service for dependency injection and testing.
 */
export class TerminalService extends Context.Tag('TerminalService')<
  TerminalService,
  {
    // =============================================================================
    // Basic Terminal Operations
    // =============================================================================

    /**
     * Clear the entire terminal screen.
     */
    readonly clear: Effect.Effect<void, TerminalError, never>

    /**
     * Write text to the terminal without newline.
     * Handles ANSI escape sequences and unicode characters.
     */
    readonly write: (text: string) => Effect.Effect<void, TerminalError, never>

    /**
     * Write text to the terminal with newline.
     */
    readonly writeLine: (text: string) => Effect.Effect<void, TerminalError, never>

    /**
     * Move the cursor to the specified position (1-indexed).
     */
    readonly moveCursor: (x: number, y: number) => Effect.Effect<void, TerminalError, never>

    /**
     * Move the cursor relative to current position.
     */
    readonly moveCursorRelative: (
      dx: number,
      dy: number
    ) => Effect.Effect<void, TerminalError, never>

    /**
     * Hide the cursor from view.
     */
    readonly hideCursor: Effect.Effect<void, TerminalError, never>

    /**
     * Show the cursor.
     */
    readonly showCursor: Effect.Effect<void, TerminalError, never>

    // =============================================================================
    // Terminal State Management
    // =============================================================================

    /**
     * Get the current terminal size.
     */
    readonly getSize: Effect.Effect<WindowSize, TerminalError, never>

    /**
     * Set raw mode on/off. In raw mode, input is not line-buffered and
     * special keys are passed through to the application.
     */
    readonly setRawMode: (enabled: boolean) => Effect.Effect<void, TerminalError, never>

    /**
     * Enable/disable alternate screen buffer. The alternate screen allows
     * full-screen applications without scrolling the main terminal buffer.
     */
    readonly setAlternateScreen: (enabled: boolean) => Effect.Effect<void, TerminalError, never>

    /**
     * Save the current cursor position.
     */
    readonly saveCursor: Effect.Effect<void, TerminalError, never>

    /**
     * Restore the previously saved cursor position.
     */
    readonly restoreCursor: Effect.Effect<void, TerminalError, never>

    // =============================================================================
    // Terminal Capabilities
    // =============================================================================

    /**
     * Detect and return terminal capabilities.
     * This includes color support, unicode support, mouse support, etc.
     */
    readonly getCapabilities: Effect.Effect<TerminalCapabilities, TerminalError, never>

    /**
     * Check if the terminal supports true color (24-bit).
     */
    readonly supportsTrueColor: Effect.Effect<boolean, TerminalError, never>

    /**
     * Check if the terminal supports 256 colors.
     */
    readonly supports256Colors: Effect.Effect<boolean, TerminalError, never>

    /**
     * Check if the terminal supports unicode characters.
     */
    readonly supportsUnicode: Effect.Effect<boolean, TerminalError, never>

    // =============================================================================
    // Screen Management
    // =============================================================================

    /**
     * Clear from cursor to end of line.
     */
    readonly clearToEndOfLine: Effect.Effect<void, TerminalError, never>

    /**
     * Clear from cursor to beginning of line.
     */
    readonly clearToStartOfLine: Effect.Effect<void, TerminalError, never>

    /**
     * Clear the entire current line.
     */
    readonly clearLine: Effect.Effect<void, TerminalError, never>

    /**
     * Clear from cursor to end of screen.
     */
    readonly clearToEndOfScreen: Effect.Effect<void, TerminalError, never>

    /**
     * Clear from cursor to beginning of screen.
     */
    readonly clearToStartOfScreen: Effect.Effect<void, TerminalError, never>

    /**
     * Scroll the screen up by the specified number of lines.
     */
    readonly scrollUp: (lines: number) => Effect.Effect<void, TerminalError, never>

    /**
     * Scroll the screen down by the specified number of lines.
     */
    readonly scrollDown: (lines: number) => Effect.Effect<void, TerminalError, never>

    // =============================================================================
    // Advanced Features
    // =============================================================================

    /**
     * Set the terminal window title.
     */
    readonly setTitle: (title: string) => Effect.Effect<void, TerminalError, never>

    /**
     * Ring the terminal bell (audible or visual).
     */
    readonly bell: Effect.Effect<void, TerminalError, never>

    /**
     * Request cursor position from terminal.
     * Returns the current cursor position as reported by the terminal.
     */
    readonly getCursorPosition: Effect.Effect<{ x: number; y: number }, TerminalError, never>

    /**
     * Set cursor shape/style.
     */
    readonly setCursorShape: (
      shape: 'block' | 'underline' | 'bar'
    ) => Effect.Effect<void, TerminalError, never>

    /**
     * Enable/disable cursor blinking.
     */
    readonly setCursorBlink: (enabled: boolean) => Effect.Effect<void, TerminalError, never>
  }
>() {}
