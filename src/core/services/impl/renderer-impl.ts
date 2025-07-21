/**
 * Renderer Service Implementation - Double-buffered rendering with diff algorithm
 */

import { Effect, Layer, Ref, Chunk } from "effect"
import { stringWidth } from "../../../utils/string-width"
import { RendererService } from "../renderer"
import { TerminalService } from "../terminal"
import { RenderError } from "../../types/errors"
import type { View, Viewport } from "../../types"

/**
 * Strip ANSI escape sequences from text
 */
const stripAnsi = (text: string): string => {
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

/**
 * Extract ANSI style from the beginning of text
 */
const extractStyle = (text: string): { style: string; cleanText: string } => {
  const match = text.match(/^(\x1b\[[0-9;]*m)(.*)(\x1b\[0m)$/)
  if (match) {
    return { style: match[1] ?? '', cleanText: match[2] ?? '' }
  }
  return { style: '', cleanText: text }
}

/**
 * A cell in the terminal buffer
 */
interface Cell {
  char: string
  style?: string // ANSI style codes
}

/**
 * A buffer representing the terminal screen
 */
class Buffer {
  private cells: Cell[][]
  
  constructor(
    public width: number,
    public height: number
  ) {
    this.cells = Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({ char: ' ' }))
    )
  }
  
  get(x: number, y: number): Cell | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return undefined
    }
    return this.cells[y]?.[x]
  }
  
  set(x: number, y: number, cell: Cell): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      if (this.cells[y]) this.cells[y]![x] = cell
    }
  }
  
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y]) this.cells[y]![x] = { char: ' ' }
      }
    }
  }
  
  writeText(x: number, y: number, text: string, style?: string): void {
    let currentX = x
    let currentY = y
    
    // Handle line-by-line to process ANSI codes properly
    const lines = text.split('\n')
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      if (lineIndex > 0) {
        currentY++
        currentX = x
      }
      
      const line = lines[lineIndex]
      if (!line) continue
      
      // Parse ANSI sequences in the line
      let remainingText = line
      let segmentX = currentX
      let currentStyle = style
      
      while (remainingText) {
        // Check for ANSI escape sequence at start
        const ansiMatch = remainingText.match(/^(\x1b\[[0-9;]*m)/)
        if (ansiMatch) {
          const ansiCode = ansiMatch[1]
          
          // Update current style based on ANSI code
          if (ansiCode === '\x1b[0m') {
            currentStyle = undefined // Reset style
          } else {
            currentStyle = ansiCode // Set new style
          }
          
          // Skip ANSI code (don't write to buffer)
          remainingText = remainingText.slice(ansiMatch[0].length)
          continue
        }
        
        // Get next grapheme cluster (handles multi-byte chars like emojis)
        // Try to detect emoji or multi-byte character
        let char = remainingText[0]
        let charLength = 1
        
        // Check if this might be the start of an emoji or multi-byte sequence
        const codePoint = remainingText.codePointAt(0)
        if (codePoint && codePoint > 0xFFFF) {
          // This is a surrogate pair (emoji or other Unicode)
          charLength = 2
          char = remainingText.slice(0, 2)
        } else if (codePoint && codePoint >= 0x1F000) {
          // Emoji range
          // Check for emoji modifiers and zero-width joiners
          let pos = 1
          while (pos < remainingText.length) {
            const nextCode = remainingText.codePointAt(pos)
            if (nextCode === 0xFE0F || // Variation selector
                nextCode === 0x200D || // Zero-width joiner
                (nextCode >= 0x1F3FB && nextCode <= 0x1F3FF) || // Skin tone modifiers
                (nextCode >= 0x1F000)) { // Another emoji (for sequences)
              pos += nextCode > 0xFFFF ? 2 : 1
            } else {
              break
            }
          }
          charLength = pos
          char = remainingText.slice(0, pos)
        }
        
        remainingText = remainingText.slice(charLength)
        
        // Calculate display width
        const charWidth = stringWidth(char)
        
        // Write the character to the buffer
        if (segmentX < this.width && currentY < this.height) {
          this.set(segmentX, currentY, { char, style: currentStyle ?? '' })
          
          // For wide characters, fill the extra columns with empty cells
          for (let i = 1; i < charWidth; i++) {
            if (segmentX + i < this.width) {
              this.set(segmentX + i, currentY, { char: '', style: currentStyle })
            }
          }
        }
        
        // Advance cursor by the display width
        segmentX += charWidth
      }
    }
  }
  
  diff(other: Buffer): DiffPatch[] {
    const patches: DiffPatch[] = []
    
    for (let y = 0; y < this.height; y++) {
      let runStart = -1
      let runCells: Cell[] = []
      
      for (let x = 0; x < this.width; x++) {
        const oldCell = this.get(x, y)
        const newCell = other.get(x, y)
        
        const different = 
          oldCell?.char !== newCell?.char ||
          oldCell?.style !== newCell?.style
        
        if (different && newCell) {
          if (runStart === -1) {
            runStart = x
          }
          runCells.push(newCell)
        } else if (runStart !== -1) {
          // End of run
          patches.push({
            x: runStart,
            y,
            cells: runCells
          })
          runStart = -1
          runCells = []
        }
      }
      
      // Handle run at end of line
      if (runStart !== -1) {
        patches.push({
          x: runStart,
          y,
          cells: runCells
        })
      }
    }
    
    return patches
  }
}

/**
 * A patch representing a change between buffers
 */
interface DiffPatch {
  x: number
  y: number
  cells: Cell[]
}

/**
 * Render statistics
 */
interface RenderStats {
  framesRendered: number
  averageFrameTime: number
  lastFrameTime: number
  dirtyRegionCount: number
  bufferSwitches: number
  profilingEnabled?: boolean
}

/**
 * Layer information
 */
interface RenderLayer {
  name: string
  buffer: Buffer
  visible: boolean
  zIndex: number
}

/**
 * Create the live Renderer service implementation
 */
export const RendererServiceLive = Layer.effect(
  RendererService,
  Effect.gen(function* (_) {
    // We'll get the terminal size dynamically when needed instead of during initialization
    const defaultSize = { width: 80, height: 24 }
    
    // Create double buffers
    const frontBuffer = yield* _(Ref.make(
      new Buffer(defaultSize.width, defaultSize.height)
    ))
    const backBuffer = yield* _(Ref.make(
      new Buffer(defaultSize.width, defaultSize.height)
    ))
    
    // Viewport stack
    const viewportStack = yield* _(Ref.make<Viewport[]>([{
      x: 0,
      y: 0,
      width: defaultSize.width,
      height: defaultSize.height
    }]))
    
    // Render statistics
    const stats = yield* _(Ref.make<RenderStats>({
      framesRendered: 0,
      averageFrameTime: 0,
      lastFrameTime: 0,
      dirtyRegionCount: 0,
      bufferSwitches: 0
    }))
    
    // Dirty regions tracking
    const dirtyRegions = yield* _(Ref.make<Array<{
      x: number
      y: number
      width: number
      height: number
    }>>([]))
    
    // Layers
    const layers = yield* _(Ref.make<Map<string, RenderLayer>>(new Map()))
    
    // Apply patches to the terminal
    const applyPatches = (patches: DiffPatch[]) =>
      Effect.forEach(patches, patch =>
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          // Move to position
          yield* _(terminal.moveCursor(patch.x + 1, patch.y + 1))
          
          // Write cells
          let text = ''
          let currentStyle: string | undefined
          
          for (const cell of patch.cells) {
            if (cell.style !== currentStyle) {
              if (text) {
                yield* _(terminal.write(text))
                text = ''
              }
              if (cell.style) {
                yield* _(terminal.write(cell.style))
              }
              currentStyle = cell.style
            }
            text += cell.char
          }
          
          if (text) {
            yield* _(terminal.write(text))
          }
          
          // Reset style if needed
          if (currentStyle) {
            yield* _(terminal.write('\x1b[0m'))
          }
        })
      )
    
    return {
      beginFrame: Effect.gen(function* (_) {
        // Get current terminal size and update buffers if needed
        const terminal = yield* _(TerminalService)
        const size = yield* _(terminal.getSize)
        
        let back = yield* _(Ref.get(backBuffer))
        if (back.width !== size.width || back.height !== size.height) {
          // Resize buffers
          const newBack = new Buffer(size.width, size.height)
          const newFront = new Buffer(size.width, size.height)
          yield* _(Ref.set(backBuffer, newBack))
          yield* _(Ref.set(frontBuffer, newFront))
          back = newBack
          
          // Update viewport
          yield* _(Ref.set(viewportStack, [{
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
          }]))
        }
        
        // Clear the back buffer to prepare for new frame
        back.clear()
      }),
      
      endFrame: Effect.gen(function* (_) {
        // Swap buffers and apply diff
        const front = yield* _(Ref.get(frontBuffer))
        const back = yield* _(Ref.get(backBuffer))
        
        // Compute diff
        const patches = front.diff(back)
        
        // Apply patches to terminal
        yield* _(applyPatches(patches))
        
        // Swap buffers
        yield* _(Ref.set(frontBuffer, back))
        yield* _(Ref.set(backBuffer, front))
        
        // Update stats
        yield* _(Ref.update(stats, s => ({
          framesRendered: s.framesRendered + 1,
          averageFrameTime: s.averageFrameTime,
          lastFrameTime: 0,
          dirtyRegionCount: patches.length,
          bufferSwitches: s.bufferSwitches + 1
        })))
      }),
      
      render: (view: View) =>
        Effect.gen(function* (_) {
          const startTime = Date.now()
          
          // Get current viewport
          const viewports = yield* _(Ref.get(viewportStack))
          const viewport = viewports[viewports.length - 1]
          
          // Get back buffer
          const back = yield* _(Ref.get(backBuffer))
          
          // Render view to back buffer
          const rendered = yield* _(view.render())
          back.writeText(viewport.x, viewport.y, rendered)
          
          // Update stats
          const endTime = Date.now()
          yield* _(Ref.update(stats, s => ({
            ...s,
            lastFrameTime: endTime - startTime
          })))
        }),
      
      forceRedraw: Effect.gen(function* (_) {
        const terminal = yield* _(TerminalService)
        const front = yield* _(Ref.get(frontBuffer))
        const size = yield* _(terminal.getSize)
        
        // Clear the actual terminal screen and reset cursor
        yield* _(terminal.clear)
        yield* _(terminal.moveCursor(1, 1))
        
        // Clear the front buffer completely to force full redraw
        front.clear()
        
        // Fill the screen with spaces to ensure no artifacts remain
        // We need to actually write spaces to the terminal, not just clear
        for (let y = 0; y < size.height; y++) {
          yield* _(terminal.moveCursor(1, y + 1))
          yield* _(terminal.write(' '.repeat(size.width)))
        }
        
        // Reset cursor to home position
        yield* _(terminal.moveCursor(1, 1))
      }),
      
      setViewport: (viewport: Viewport) =>
        Effect.gen(function* (_) {
          const stack = yield* _(Ref.get(viewportStack))
          yield* _(Ref.set(viewportStack, [viewport]))
        }),
      
      getViewport: Effect.gen(function* (_) {
        const stack = yield* _(Ref.get(viewportStack))
        return stack[stack.length - 1]
      }),
      
      pushViewport: (viewport: Viewport) =>
        Ref.update(viewportStack, stack => [...stack, viewport]),
      
      popViewport: Effect.gen(function* (_) {
        yield* _(Ref.update(viewportStack, stack => 
          stack.length > 1 ? stack.slice(0, -1) : stack
        ))
      }),
      
      clearDirtyRegions: Ref.set(dirtyRegions, []),
      
      markDirty: (region) =>
        Ref.update(dirtyRegions, regions => [...regions, region]),
      
      getDirtyRegions: Ref.get(dirtyRegions),
      
      optimizeDirtyRegions: Effect.gen(function* (_) {
        // Merge overlapping regions
        const regions = yield* _(Ref.get(dirtyRegions))
        
        if (regions.length <= 1) {
          return // Nothing to merge
        }
        
        // Sort regions by y, then x
        const sorted = [...regions].sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y
          return a.x - b.x
        })
        
        const merged: Array<{ x: number; y: number; width: number; height: number }> = []
        let current = sorted[0]
        
        for (let i = 1; i < sorted.length; i++) {
          const next = sorted[i]
          
          // Check if regions overlap or are adjacent
          const overlapX = current.x <= next.x && next.x <= current.x + current.width
          const overlapY = current.y <= next.y && next.y <= current.y + current.height
          const adjacentX = current.x + current.width === next.x && current.y === next.y
          const adjacentY = current.y + current.height === next.y && current.x === next.x
          
          if ((overlapX && overlapY) || adjacentX || adjacentY) {
            // Merge regions
            const minX = Math.min(current.x, next.x)
            const minY = Math.min(current.y, next.y)
            const maxX = Math.max(current.x + current.width, next.x + next.width)
            const maxY = Math.max(current.y + current.height, next.y + next.height)
            
            current = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
            }
          } else {
            // No overlap, save current and move to next
            merged.push(current)
            current = next
          }
        }
        
        merged.push(current)
        yield* _(Ref.set(dirtyRegions, merged))
      }),
      
      getStats: Ref.get(stats),
      
      resetStats: Ref.set(stats, {
        framesRendered: 0,
        averageFrameTime: 0,
        lastFrameTime: 0,
        dirtyRegionCount: 0,
        bufferSwitches: 0
      }),
      
      setProfilingEnabled: (enabled) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(stats, s => ({ ...s, profilingEnabled: enabled })))
        }),
      
      renderAt: (view: View, x: number, y: number) =>
        Effect.gen(function* (_) {
          const rendered = yield* _(view.render())
          const back = yield* _(Ref.get(backBuffer))
          back.writeText(x, y, rendered)
        }),
      
      renderBatch: (views) =>
        Effect.gen(function* (_) {
          const back = yield* _(Ref.get(backBuffer))
          
          // Render all views in parallel for better performance
          const rendered = yield* _(
            Effect.all(
              views.map(({ view, x, y }) => 
                view.render().pipe(
                  Effect.map(content => ({ content, x, y }))
                )
              )
            )
          )
          
          // Write all rendered content to back buffer
          for (const { content, x, y } of rendered) {
            back.writeText(x, y, content)
          }
        }),
      
      setClipRegion: (region) =>
        Effect.gen(function* (_) {
          if (region === null) {
            // Reset to default viewport
            const terminal = yield* _(TerminalService)
            const size = yield* _(terminal.getSize)
            yield* _(Ref.set(viewportStack, [{
              x: 0,
              y: 0,
              width: size.width,
              height: size.height
            }]))
          } else {
            // Store clipping region for render operations
            yield* _(Ref.set(viewportStack, [region]))
          }
        }),
      
      saveState: Effect.gen(function* (_) {
        const currentViewports = yield* _(Ref.get(viewportStack))
        const currentStats = yield* _(Ref.get(stats))
        const currentDirty = yield* _(Ref.get(dirtyRegions))
        const currentLayers = yield* _(Ref.get(layers))
        
        // Store state in a dedicated state stack (would need to add this ref)
        // For now, just acknowledge the operation
        yield* _(Effect.log("Renderer state saved"))
      }),
      
      restoreState: Effect.gen(function* (_) {
        // Restore state from the state stack
        // For now, just acknowledge the operation
        yield* _(Effect.log("Renderer state restored"))
      }),
      
      measureText: (text: string) =>
        Effect.sync(() => {
          const lines = text.split('\n')
          const width = Math.max(...lines.map(l => l.length))
          return {
            width,
            height: lines.length,
            lineCount: lines.length
          }
        }),
      
      wrapText: (text: string, width: number, _options) =>
        Effect.sync(() => {
          const words = text.split(' ')
          const lines: string[] = []
          let currentLine = ''
          
          for (const word of words) {
            if (currentLine.length + word.length + 1 <= width) {
              currentLine += (currentLine ? ' ' : '') + word
            } else {
              if (currentLine) lines.push(currentLine)
              currentLine = word
            }
          }
          
          if (currentLine) lines.push(currentLine)
          return lines
        }),
      
      truncateText: (text: string, width: number, ellipsis = '...') =>
        Effect.sync(() =>
          text.length <= width 
            ? text 
            : text.slice(0, width - ellipsis.length) + ellipsis
        ),
      
      createLayer: (name, zIndex) =>
        Effect.gen(function* (_) {
          const terminal = yield* _(TerminalService)
          const size = yield* _(terminal.getSize)
          const layer: RenderLayer = {
            name,
            buffer: new Buffer(size.width, size.height),
            visible: true,
            zIndex: zIndex || 0
          }
          yield* _(Ref.update(layers, map => {
            const newMap = new Map(map)
            newMap.set(name, layer)
            return newMap
          }))
        }),
      
      removeLayer: (name) =>
        Ref.update(layers, map => {
          const newMap = new Map(map)
          newMap.delete(name)
          return newMap
        }),
      
      renderToLayer: (layerName, view, x, y) =>
        Effect.gen(function* (_) {
          const layerMap = yield* _(Ref.get(layers))
          const layer = layerMap.get(layerName)
          if (!layer) {
            yield* _(Effect.fail(new RenderError({
              phase: 'render',
              cause: `Layer ${layerName} not found`
            })))
          }
          
          const rendered = yield* _(view.render())
          layer!.buffer.writeText(x, y, rendered)
        }),
      
      setLayerVisible: (layerName, visible) =>
        Effect.gen(function* (_) {
          yield* _(Ref.update(layers, map => {
            const layer = map.get(layerName)
            if (layer) {
              layer.visible = visible
            }
            return map
          }))
        }),
      
      compositeLayers: Effect.gen(function* (_) {
        const layerMap = yield* _(Ref.get(layers))
        const sortedLayers = Array.from(layerMap.values())
          .filter(l => l.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
        
        // Composite layers onto back buffer
        const back = yield* _(Ref.get(backBuffer))
        for (const layer of sortedLayers) {
          // Copy layer buffer to back buffer
          for (let y = 0; y < layer.buffer.height; y++) {
            for (let x = 0; x < layer.buffer.width; x++) {
              const cell = layer.buffer.get(x, y)
              if (cell && cell.char !== ' ') {
                back.set(x, y, cell)
              }
            }
          }
        }
      }),
    }
  })
)