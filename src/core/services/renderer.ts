/**
 * Renderer Service - High-performance terminal rendering
 *
 * This service manages the rendering pipeline, including double buffering,
 * dirty region tracking, and efficient screen updates.
 */

import { Effect, Context } from 'effect'
import type { RenderError, View, Viewport } from '../core/types'

/**
 * The RendererService interface defines the rendering pipeline.
 * It handles efficient screen updates with minimal terminal I/O.
 */
export class RendererService extends Context.Tag('RendererService')<
  RendererService,
  {
    // =============================================================================
    // Core Rendering
    // =============================================================================

    /**
     * Render a view to the terminal.
     * This is the main rendering function that handles the entire pipeline.
     */
    readonly render: (view: View) => Effect.Effect<void, RenderError, never>

    /**
     * Begin a new frame for rendering.
     * This sets up the back buffer and prepares for rendering operations.
     */
    readonly beginFrame: Effect.Effect<void, RenderError, never>

    /**
     * End the current frame and flush changes to the terminal.
     * This swaps buffers and writes only the changed regions.
     */
    readonly endFrame: Effect.Effect<void, RenderError, never>

    /**
     * Force a complete re-render of the entire screen.
     * Use sparingly as this is expensive.
     */
    readonly forceRedraw: Effect.Effect<void, RenderError, never>

    // =============================================================================
    // Viewport Management
    // =============================================================================

    /**
     * Set the active viewport for rendering.
     * Only content within the viewport will be rendered.
     */
    readonly setViewport: (viewport: Viewport) => Effect.Effect<void, RenderError, never>

    /**
     * Get the current viewport.
     */
    readonly getViewport: Effect.Effect<Viewport, RenderError, never>

    /**
     * Push a new viewport onto the stack.
     * Useful for nested rendering contexts.
     */
    readonly pushViewport: (viewport: Viewport) => Effect.Effect<void, RenderError, never>

    /**
     * Pop the current viewport from the stack.
     */
    readonly popViewport: Effect.Effect<void, RenderError, never>

    // =============================================================================
    // Buffer Management
    // =============================================================================

    /**
     * Clear all dirty regions.
     * This marks the entire screen as clean.
     */
    readonly clearDirtyRegions: Effect.Effect<void, never, never>

    /**
     * Mark a rectangular region as dirty (needs redrawing).
     */
    readonly markDirty: (region: {
      x: number
      y: number
      width: number
      height: number
    }) => Effect.Effect<void, never, never>

    /**
     * Get the current dirty regions.
     */
    readonly getDirtyRegions: Effect.Effect<
      ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
      never,
      never
    >

    /**
     * Optimize dirty regions by merging overlapping areas.
     */
    readonly optimizeDirtyRegions: Effect.Effect<void, never, never>

    // =============================================================================
    // Performance Monitoring
    // =============================================================================

    /**
     * Get rendering performance statistics.
     */
    readonly getStats: Effect.Effect<
      {
        readonly framesRendered: number
        readonly averageFrameTime: number
        readonly lastFrameTime: number
        readonly dirtyRegionCount: number
        readonly bufferSwitches: number
      },
      never,
      never
    >

    /**
     * Reset performance statistics.
     */
    readonly resetStats: Effect.Effect<void, never, never>

    /**
     * Enable/disable performance profiling.
     */
    readonly setProfilingEnabled: (enabled: boolean) => Effect.Effect<void, never, never>

    // =============================================================================
    // Advanced Rendering Features
    // =============================================================================

    /**
     * Render a view to a specific position without affecting the viewport.
     */
    readonly renderAt: (view: View, x: number, y: number) => Effect.Effect<void, RenderError, never>

    /**
     * Render multiple views in a single operation.
     * More efficient than multiple render calls.
     */
    readonly renderBatch: (
      views: ReadonlyArray<{ view: View; x: number; y: number }>
    ) => Effect.Effect<void, RenderError, never>

    /**
     * Create a clipping region that restricts rendering.
     */
    readonly setClipRegion: (
      region: {
        x: number
        y: number
        width: number
        height: number
      } | null
    ) => Effect.Effect<void, RenderError, never>

    /**
     * Save the current rendering state (viewport, clip region, etc.).
     */
    readonly saveState: Effect.Effect<void, RenderError, never>

    /**
     * Restore the previously saved rendering state.
     */
    readonly restoreState: Effect.Effect<void, RenderError, never>

    // =============================================================================
    // Text Measurement
    // =============================================================================

    /**
     * Measure the display width of text, accounting for ANSI escape sequences
     * and unicode characters.
     */
    readonly measureText: (text: string) => Effect.Effect<
      {
        readonly width: number
        readonly height: number
        readonly lineCount: number
      },
      RenderError,
      never
    >

    /**
     * Wrap text to fit within a specified width.
     */
    readonly wrapText: (
      text: string,
      width: number,
      options?: {
        readonly breakLongWords?: boolean
        readonly preserveIndentation?: boolean
      }
    ) => Effect.Effect<ReadonlyArray<string>, RenderError, never>

    /**
     * Truncate text to fit within a specified width, adding ellipsis if needed.
     */
    readonly truncateText: (
      text: string,
      width: number,
      ellipsis?: string
    ) => Effect.Effect<string, RenderError, never>

    // =============================================================================
    // Layer Management
    // =============================================================================

    /**
     * Create a new rendering layer.
     * Layers allow for compositing multiple views with different z-orders.
     */
    readonly createLayer: (name: string, zIndex: number) => Effect.Effect<void, RenderError, never>

    /**
     * Remove a rendering layer.
     */
    readonly removeLayer: (name: string) => Effect.Effect<void, RenderError, never>

    /**
     * Render a view to a specific layer.
     */
    readonly renderToLayer: (
      layerName: string,
      view: View,
      x: number,
      y: number
    ) => Effect.Effect<void, RenderError, never>

    /**
     * Set the visibility of a layer.
     */
    readonly setLayerVisible: (
      layerName: string,
      visible: boolean
    ) => Effect.Effect<void, RenderError, never>

    /**
     * Composite all layers and render to the terminal.
     */
    readonly compositeLayers: Effect.Effect<void, RenderError, never>
  }
>() {}

// =============================================================================
// Rendering Utilities
// =============================================================================

// =============================================================================
// View Processing Helpers
// =============================================================================

/**
 * Render all views and split into lines
 */
const renderAndSplitViews = (views: ReadonlyArray<View>) =>
  Effect.gen(function* (_) {
    const rendered = yield* _(Effect.all(views.map(view => view.render())))
    return rendered.map(text => text.split('\n'))
  })

/**
 * Create padding lines
 */
const createPaddingLines = (count: number, width: number): string[] =>
  Array(count).fill(' '.repeat(width))

/**
 * Process content lines with horizontal padding
 */
const addHorizontalPadding = (lines: string[], left: number, right: number): string[] =>
  lines.map(line => ' '.repeat(left) + line + ' '.repeat(right))

/**
 * Utilities for working with views and rendering.
 */
export const RenderUtils = {
  /**
   * Create an empty view with specified dimensions.
   */
  emptyView: (width: number, height: number): View => ({
    render: () => Effect.succeed(' '.repeat(width * height)),
    width,
    height,
  }),

  /**
   * Create a view from a simple string.
   */
  textView: (text: string): View => ({
    render: () => Effect.succeed(text),
  }),

  /**
   * Combine multiple views horizontally.
   */
  joinHorizontal: (views: ReadonlyArray<View>): View => ({
    render: () =>
      Effect.gen(function* (_) {
        const lines = yield* _(renderAndSplitViews(views))
        const maxLines = Math.max(...lines.map(l => l.length), 0)

        const result: string[] = []
        for (let i = 0; i < maxLines; i++) {
          const line = lines.map(l => l[i] || '').join('')
          result.push(line)
        }

        return result.join('\n')
      }),
  }),

  /**
   * Combine multiple views vertically.
   */
  joinVertical: (views: ReadonlyArray<View>): View => ({
    render: () =>
      Effect.gen(function* (_) {
        const rendered = yield* _(Effect.all(views.map(view => view.render())))
        return rendered.join('\n')
      }),
  }),

  /**
   * Add padding around a view.
   */
  addPadding: (
    view: View,
    padding: { top: number; right: number; bottom: number; left: number }
  ): View => ({
    render: () =>
      Effect.gen(function* (_) {
        const content = yield* _(view.render())
        const lines = content.split('\n')

        // Add horizontal padding
        const paddedLines = addHorizontalPadding(lines, padding.left, padding.right)

        // Add vertical padding
        const lineWidth = (lines[0]?.length || 0) + padding.left + padding.right
        const topPadding = createPaddingLines(padding.top, lineWidth)
        const bottomPadding = createPaddingLines(padding.bottom, lineWidth)

        return [...topPadding, ...paddedLines, ...bottomPadding].join('\n')
      }),
    width: view.width ? view.width + padding.left + padding.right : undefined,
    height: view.height ? view.height + padding.top + padding.bottom : undefined,
  }),

  /**
   * Clip a view to specified dimensions.
   */
  clipView: (view: View, width: number, height: number): View => ({
    render: () =>
      Effect.gen(function* (_) {
        const content = yield* _(view.render())
        const lines = content.split('\n').slice(0, height)

        return lines.map(line => line.slice(0, width)).join('\n')
      }),
    width,
    height,
  }),
} as const
