/**
 * @since 1.0.0
 */
import { Effect, Equal, Layer, Option, Ref, pipe } from 'effect'

import type { AnsiStyle } from '@core/terminal/ansi/styles/types'
import { stringWidth } from '@core/terminal/output/string/width'
import { RendererService } from '@core/services/renderer'
import { TerminalService } from '@core/services/terminal'
import type { View } from '@core/types/core'
import { RenderError } from '@core/types/errors'
import type { Viewport } from '@core/types/schemas'
import { toAnsiStyleCode } from 'tuix/core/terminal/ansi/styles/render'

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

/**
 * Represents a single character cell on the screen.
 *
 * @internal
 */
interface Cell {
  /** The character to be rendered */
  readonly char: string
  /** The style to be applied to the character */
  readonly style: Option.Option<AnsiStyle>
}

/**
 * Represents a patch of changes to be applied to the screen.
 *
 * @internal
 */
interface DiffPatch {
  /** The x-coordinate of the patch */
  readonly x: number
  /** The y-coordinate of the patch */
  readonly y: number
  /** The cells to be rendered in the patch */
  readonly cells: ReadonlyArray<Cell>
}

/**
 * Represents a layer to be rendered on the screen.
 *
 * @internal
 */
interface RenderLayer {
  /** The unique ID of the layer */
  readonly id: number
  /** The name of the layer */
  readonly name: string
  /** The z-index of the layer */
  readonly zIndex: number
  /** Whether the layer is visible */
  readonly visible: boolean
  /** The buffer containing the layer's content */
  readonly buffer: Buffer
  /** The viewport of the layer */
  readonly viewport: Viewport
}

/**
 * Render statistics
 *
 * @internal
 */
interface RenderStats {
  framesRendered: number
  averageFrameTime: number
  lastFrameTime: number
  dirtyRegionCount: number
  bufferSwitches: number
  forcedRedraws: number
}

/**
 * Represents the state of the renderer.
 *
 * @internal
 */
interface RenderState {
  layers: RenderLayer[]
  viewports: Viewport[]
  stats: RenderStats
}

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

/**
 * The live implementation of the [RendererService](cci:2://file:///Users/aewing/Projects/cinderlink/cli-kit/src/core/types/core.ts:368:0-438:6).
 *
 * @since 1.0.0
 * @category layers
 */
export const RendererServiceLive = Layer.effect(
  RendererService,
  Effect.gen(function* (_) {
    const terminal = yield* _(TerminalService)

    // Get terminal info
    const defaultSize = yield* _(terminal.getSize)

    // Create double buffers
    const frontBuffer = yield* _(
      Ref.make(new Buffer(defaultSize.width ?? 0, defaultSize.height ?? 0))
    )
    const backBuffer = yield* _(
      Ref.make(new Buffer(defaultSize.width ?? 0, defaultSize.height ?? 0))
    )

    // Create state
    const initialState: RenderState = {
      layers: [
        {
          id: 0,
          name: 'main',
          zIndex: 0,
          visible: true,
          buffer: new Buffer(defaultSize.width ?? 0, defaultSize.height ?? 0),
          viewport: { x: 0, y: 0, width: defaultSize.width ?? 0, height: defaultSize.height ?? 0 },
        },
      ],
      viewports: [{ x: 0, y: 0, width: defaultSize.width ?? 0, height: defaultSize.height ?? 0 }],
      stats: {
        framesRendered: 0,
        averageFrameTime: 0,
        lastFrameTime: 0,
        dirtyRegionCount: 0,
        bufferSwitches: 0,
        forcedRedraws: 0,
      },
    }
    const state = yield* _(Ref.make(initialState))

    const measureText = (
      text: string
    ): Effect.Effect<{ width: number; height: number; lineCount: number }, never, never> =>
      Effect.succeed({
        width: stringWidth(text),
        height: 1, // Assuming single line for basic measurement
        lineCount: 1,
      })

    const beginFrame = Effect.gen(function* (_) {
      // Get current terminal size and update buffers if needed
      const size = yield* _(terminal.getSize)
      const back = yield* _(Ref.get(backBuffer))
      if (size.width !== back.width || size.height !== back.height) {
        // Resize buffers
        const newBack = new Buffer(size.width, size.height)
        const newFront = new Buffer(size.width, size.height)
        yield* _(Ref.set(backBuffer, newBack))
        yield* _(Ref.set(frontBuffer, newFront))
      }

      // Clear the back buffer to prepare for new frame
      back.clear()
    }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'paint', cause }))))

    const endFrame = Effect.gen(function* (_) {
      const front = yield* _(Ref.get(frontBuffer))
      const back = yield* _(Ref.get(backBuffer))

      // Composite layers into back buffer
      yield* _(compositeLayers)

      // Diff front and back buffers
      const diff = front.diff(back)

      if (diff.length > 0) {
        yield* _(applyPatches(diff))
        yield* _(
          Ref.update(state, s => ({
            ...s,
            stats: { ...s.stats, dirtyRegionCount: s.stats.dirtyRegionCount + 1 },
          }))
        )
      }

      // Swap buffers
      yield* _(Ref.set(frontBuffer, back))
      yield* _(Ref.set(backBuffer, front))

      yield* _(
        Ref.update(state, s => ({
          ...s,
          stats: {
            ...s.stats,
            framesRendered: s.stats.framesRendered + 1,
            bufferSwitches: s.stats.bufferSwitches + 1,
          },
        }))
      )
    })

    const render = (view: View): Effect.Effect<void, RenderError, never> =>
      Effect.gen(function* (_) {
        const s = yield* _(Ref.get(state))
        const mainLayer = s.layers.find(l => l.name === 'main')
        if (mainLayer) {
          const rendered = yield* _(view.render())
          mainLayer.buffer.writeText(0, 0, rendered)
        }
      }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'paint', cause }))))

    const forceRedraw: Effect.Effect<void, RenderError, never> = Effect.gen(function* (_) {
      yield* _(
        Ref.update(state, s => ({
          ...s,
          stats: { ...s.stats, forcedRedraws: s.stats.forcedRedraws + 1 },
        }))
      )
      // Forcing a redraw is not yet implemented
    }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'paint', cause }))))

    const getStats: Effect.Effect<RenderStats, never, never> = Ref.get(state).pipe(
      Effect.map(s => s.stats)
    )

    const getViewports: Effect.Effect<ReadonlyArray<Viewport>, never, never> = Ref.get(state).pipe(
      Effect.map(s => s.viewports)
    )

    const pushViewport = (size: Partial<Viewport>): Effect.Effect<void, RenderError, never> =>
      Effect.gen(function* (_) {
        const termSize = yield* _(terminal.getSize)
        const s = yield* _(Ref.get(state))
        const current = s.viewports[s.viewports.length - 1] ?? {
          x: 0,
          y: 0,
          width: termSize.width ?? 0,
          height: termSize.height ?? 0,
        }
        const newViewport: Viewport = {
          x: size.x ?? current.x,
          y: size.y ?? current.y,
          width: size.width ?? current.width,
          height: size.height ?? current.height,
        }
        yield* _(Ref.update(state, s => ({ ...s, viewports: [...s.viewports, newViewport] })))
      }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'layout', cause }))))

    const popViewport: Effect.Effect<void, never, never> = Ref.update(state, s => ({
      ...s,
      viewports: s.viewports.slice(0, -1),
    }))

    const getLayers: Effect.Effect<ReadonlyArray<RenderLayer>, never, never> = Ref.get(state).pipe(
      Effect.map(s => s.layers)
    )

    const updateLayers = (layers: ReadonlyArray<RenderLayer>): Effect.Effect<void, never, never> =>
      Ref.update(state, s => ({ ...s, layers: [...layers] }))

    const saveState: Effect.Effect<RenderState, never, never> = Ref.get(state)

    const restoreState = (s: RenderState): Effect.Effect<void, RenderError, never> =>
      Ref.set(state, s).pipe(
        Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'layout', cause })))
      )

    const renderViewToLayer = (
      view: View,
      layerId: number
    ): Effect.Effect<void, RenderError, never> =>
      Effect.gen(function* (_) {
        const s = yield* _(Ref.get(state))
        const layer = s.layers.find((l: RenderLayer) => l.id === layerId)

        if (layer) {
          const rendered = yield* _(view.render())
          layer.buffer.writeText(0, 0, rendered)
        }
      }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'paint', cause }))))

    const compositeLayers: Effect.Effect<void, RenderError, never> = Effect.gen(function* (_) {
      const s = yield* _(Ref.get(state))
      const back = yield* _(Ref.get(backBuffer))
      const sortedLayers = [...s.layers].sort((a, b) => a.zIndex - b.zIndex)

      for (const layer of sortedLayers) {
        if (layer.visible) {
          back.composite(layer.buffer, layer.viewport.x, layer.viewport.y)
        }
      }
    }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'composite', cause }))))

    const applyPatches = (
      patches: ReadonlyArray<DiffPatch>
    ): Effect.Effect<void, RenderError, never> =>
      Effect.gen(function* (_) {
        let currentStyle: Option.Option<AnsiStyle> = Option.none()
        const caps = yield* _(terminal.getCapabilities)

        for (const patch of patches) {
          yield* _(terminal.moveCursor(patch.x, patch.y))

          let line = ''
          for (const cell of patch.cells) {
            if (!Equal.equals(cell.style, currentStyle)) {
              if (line.length > 0) {
                yield* _(terminal.write(line))
                line = ''
              }
              const styleCode = pipe(
                cell.style,
                Option.map(s => toAnsiStyleCode(s, caps.colorProfile)),
                Option.getOrElse(() => toAnsiStyleCode({}, caps.colorProfile))
              )
              yield* _(terminal.write(styleCode))
              currentStyle = cell.style
            }
            line += cell.char
          }

          if (line.length > 0) {
            yield* _(terminal.write(line))
          }
        }
      }).pipe(Effect.catchAll(cause => Effect.fail(new RenderError({ phase: 'composite', cause }))))

    return RendererService.of({
      beginFrame,
      endFrame,
      render,
      forceRedraw,
      getStats,
      getViewports,
      pushViewport,
      popViewport,
      getLayers,
      updateLayers,
      saveState,
      restoreState,
      renderViewToLayer,
      compositeLayers,
      measureText,
    })
  })
)
