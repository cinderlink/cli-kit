/**
 * Tests for Renderer Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "bun:test"
import { Effect, Layer } from "effect"
import { RendererService } from "@/services/renderer"
import { RenderError } from "@/core/errors"
import type { View, Viewport } from "@/core/types"

// Mock implementation for testing
const createMockRendererService = () => {
  let buffer = ""
  let dirtyRegions: Array<{ x: number, y: number, width: number, height: number }> = []
  let viewportStack: Viewport[] = []
  let currentViewport: Viewport = { x: 0, y: 0, width: 80, height: 24 }
  let frameStarted = false
  let renderingEnabled = true
  let renderStats = {
    frameCount: 0,
    lastFrameTime: 0,
    averageFrameTime: 0
  }
  let profilingEnabled = false
  let clipRegion: { x: number; y: number; width: number; height: number } | null = null
  let savedStates: Array<{ viewport: Viewport; clipRegion: typeof clipRegion }> = []
  let layers: Map<string, { zIndex: number; visible: boolean; content: string }> = new Map()
  
  const mockService: RendererService['Type'] = {
    render: (view: View) => Effect.gen(function* (_) {
      if (!renderingEnabled) return
      
      const content = yield* _(view.render())
      buffer = content
      dirtyRegions.push({
        x: currentViewport.x,
        y: currentViewport.y,
        width: view.width || currentViewport.width,
        height: view.height || currentViewport.height
      })
    }),
    
    beginFrame: Effect.sync(() => {
      frameStarted = true
      renderStats.frameCount++
      const frameTime = performance.now()
      renderStats.lastFrameTime = frameTime
      renderStats.averageFrameTime = (renderStats.averageFrameTime + frameTime) / 2
    }),
    
    endFrame: Effect.sync(() => {
      if (!frameStarted) throw new RenderError({ 
        phase: "paint",
        operation: "endFrame",
        context: { reason: "No frame started" }
      })
      frameStarted = false
      // Clear dirty regions after rendering
      dirtyRegions = []
    }),
    
    forceRedraw: Effect.sync(() => {
      dirtyRegions = [{
        x: 0,
        y: 0,
        width: currentViewport.width,
        height: currentViewport.height
      }]
    }),
    
    setViewport: (viewport: Viewport) => Effect.sync(() => {
      currentViewport = viewport
    }),
    
    getViewport: Effect.sync(() => currentViewport),
    
    pushViewport: (viewport: Viewport) => Effect.sync(() => {
      viewportStack.push(currentViewport)
      currentViewport = viewport
    }),
    
    popViewport: Effect.sync(() => {
      if (viewportStack.length === 0) {
        throw new RenderError({ 
          phase: "layout",
          operation: "popViewport",
          context: { reason: "Viewport stack is empty" }
        })
      }
      currentViewport = viewportStack.pop()!
    }),
    
    clearDirtyRegions: Effect.sync(() => {
      dirtyRegions = []
    }),
    
    markDirty: (region) => Effect.sync(() => {
      dirtyRegions.push(region)
    }),
    
    getDirtyRegions: Effect.sync(() => [...dirtyRegions]),
    
    optimizeDirtyRegions: Effect.sync(() => {
      // Mock optimization by merging overlapping regions
      const optimized: typeof dirtyRegions = []
      for (const region of dirtyRegions) {
        const overlapping = optimized.find(r => 
          region.x < r.x + r.width && 
          region.x + region.width > r.x &&
          region.y < r.y + r.height && 
          region.y + region.height > r.y
        )
        if (overlapping) {
          // Merge regions
          const minX = Math.min(region.x, overlapping.x)
          const minY = Math.min(region.y, overlapping.y)
          const maxX = Math.max(region.x + region.width, overlapping.x + overlapping.width)
          const maxY = Math.max(region.y + region.height, overlapping.y + overlapping.height)
          overlapping.x = minX
          overlapping.y = minY
          overlapping.width = maxX - minX
          overlapping.height = maxY - minY
        } else {
          optimized.push({ ...region })
        }
      }
      dirtyRegions = optimized
    }),
    
    getStats: Effect.sync(() => ({
      framesRendered: renderStats.frameCount,
      averageFrameTime: renderStats.averageFrameTime,
      lastFrameTime: renderStats.lastFrameTime,
      dirtyRegionCount: dirtyRegions.length,
      bufferSwitches: 0
    })),
    
    resetStats: Effect.sync(() => {
      renderStats = {
        frameCount: 0,
        lastFrameTime: 0,
        averageFrameTime: 0
      }
    }),
    
    setProfilingEnabled: (enabled: boolean) => Effect.sync(() => {
      profilingEnabled = enabled
    }),
    
    renderAt: (view: View, x: number, y: number) => Effect.gen(function* (_) {
      if (!renderingEnabled) return
      
      const content = yield* _(view.render())
      buffer = content
      dirtyRegions.push({
        x: x,
        y: y,
        width: view.width || 10,
        height: view.height || 1
      })
    }),
    
    renderBatch: (views: ReadonlyArray<{ view: View; x: number; y: number }>) => 
      Effect.gen(function* (_) {
        if (!renderingEnabled) return
        
        let combinedBuffer = ""
        for (const { view, x, y } of views) {
          const content = yield* _(view.render())
          combinedBuffer += content
          dirtyRegions.push({
            x: x,
            y: y,
            width: view.width || 10,
            height: view.height || 1
          })
        }
        buffer = combinedBuffer
      }),
    
    setClipRegion: (region: { x: number; y: number; width: number; height: number } | null) =>
      Effect.sync(() => {
        clipRegion = region
      }),
    
    saveState: Effect.sync(() => {
      savedStates.push({
        viewport: { ...currentViewport },
        clipRegion: clipRegion ? { ...clipRegion } : null
      })
    }),
    
    restoreState: Effect.sync(() => {
      if (savedStates.length === 0) {
        throw new RenderError({
          phase: "layout",
          operation: "restoreState",
          context: { reason: "No saved state available" }
        })
      }
      const state = savedStates.pop()!
      currentViewport = state.viewport
      clipRegion = state.clipRegion
    }),
    
    measureText: (text: string) => Effect.sync(() => {
      const lines = text.split('\n')
      const maxWidth = Math.max(...lines.map(line => line.length))
      return {
        width: maxWidth,
        height: lines.length,
        lineCount: lines.length
      }
    }),
    
    wrapText: (text: string, width: number, options?: any) => Effect.sync(() => {
      const breakLongWords = options?.breakLongWords ?? false
      const preserveIndentation = options?.preserveIndentation ?? false
      
      const lines = text.split('\n')
      const result: string[] = []
      
      for (const line of lines) {
        if (line.length <= width) {
          result.push(line)
          continue
        }
        
        const indent = preserveIndentation ? line.match(/^\s*/)?.[0] || '' : ''
        const words = line.trim().split(/\s+/)
        let currentLine = indent
        
        for (const word of words) {
          const spaceNeeded = currentLine === indent ? 0 : 1
          
          if (currentLine.length + spaceNeeded + word.length <= width) {
            currentLine += (currentLine === indent ? '' : ' ') + word
          } else {
            if (currentLine !== indent) {
              result.push(currentLine)
              currentLine = indent
            }
            
            if (breakLongWords && word.length > width - indent.length) {
              for (let i = 0; i < word.length; i += width - indent.length) {
                result.push(indent + word.slice(i, i + width - indent.length))
              }
            } else {
              currentLine = indent + word
            }
          }
        }
        
        if (currentLine !== indent) {
          result.push(currentLine)
        }
      }
      
      return result
    }),
    
    truncateText: (text: string, width: number, ellipsis = "...") =>
      Effect.sync(() => {
        if (text.length <= width) return text
        if (width <= ellipsis.length) return ellipsis.slice(0, width)
        return text.slice(0, width - ellipsis.length) + ellipsis
      }),
    
    createLayer: (name: string, zIndex: number) => Effect.sync(() => {
      if (layers.has(name)) {
        throw new RenderError({
          phase: "layout",
          operation: "createLayer",
          context: { layerName: name, reason: "Layer already exists" }
        })
      }
      layers.set(name, { zIndex, visible: true, content: "" })
    }),
    
    removeLayer: (name: string) => Effect.sync(() => {
      if (!layers.has(name)) {
        throw new RenderError({
          phase: "layout",
          operation: "removeLayer",
          context: { layerName: name, reason: "Layer does not exist" }
        })
      }
      layers.delete(name)
    }),
    
    renderToLayer: (layerName: string, view: View, x: number, y: number) =>
      Effect.gen(function* (_) {
        if (!layers.has(layerName)) {
          throw new RenderError({
            phase: "render",
            operation: "renderToLayer",
            context: { layerName, reason: "Layer does not exist" }
          })
        }
        
        const content = yield* _(view.render())
        const layer = layers.get(layerName)!
        layers.set(layerName, { ...layer, content })
        
        dirtyRegions.push({
          x: x,
          y: y,
          width: view.width || 10,
          height: view.height || 1
        })
      }),
    
    setLayerVisible: (layerName: string, visible: boolean) =>
      Effect.sync(() => {
        if (!layers.has(layerName)) {
          throw new RenderError({
            phase: "layout",
            operation: "setLayerVisible",
            context: { layerName, reason: "Layer does not exist" }
          })
        }
        
        const layer = layers.get(layerName)!
        layers.set(layerName, { ...layer, visible })
      }),
    
    compositeLayers: Effect.sync(() => {
      const sortedLayers = Array.from(layers.entries())
        .filter(([_, layer]) => layer.visible)
        .sort((a, b) => a[1].zIndex - b[1].zIndex)
      
      buffer = sortedLayers.map(([_, layer]) => layer.content).join('')
    })
  }
  
  return {
    service: mockService,
    getBuffer: () => buffer,
    getDirtyRegions: () => dirtyRegions,
    getViewportStack: () => viewportStack,
    getCurrentViewport: () => currentViewport,
    getRenderStats: () => renderStats,
    getProfilingEnabled: () => profilingEnabled,
    getClipRegion: () => clipRegion,
    getSavedStates: () => savedStates,
    getLayers: () => layers
  }
}

// Mock view helper
const createMockView = (content: string, width: number = 10, height: number = 1): View => ({
  render: () => Effect.succeed(content),
  width,
  height
})

describe("RendererService", () => {
  describe("Core Rendering", () => {
    it("renders a view", async () => {
      const { service, getBuffer } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const view = createMockView("Hello, World!")
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.render(view))
        }).pipe(Effect.provide(layer))
      )
      
      expect(getBuffer()).toBe("Hello, World!")
    })
    
    it("manages frame lifecycle", async () => {
      const { service, getRenderStats } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
        }).pipe(Effect.provide(layer))
      )
      
      expect(getRenderStats().frameCount).toBe(1)
    })
    
    it("throws error when ending frame without beginning", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.endFrame)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("forces complete redraw", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.forceRedraw)
        }).pipe(Effect.provide(layer))
      )
      
      const regions = getDirtyRegions()
      expect(regions).toHaveLength(1)
      expect(regions[0]).toEqual({ x: 0, y: 0, width: 80, height: 24 })
    })
  })
  
  describe("Viewport Management", () => {
    it("sets and gets viewport", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const newViewport: Viewport = { x: 10, y: 5, width: 60, height: 20 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.setViewport(newViewport))
          const current = yield* _(renderer.getViewport)
          
          expect(current).toEqual(newViewport)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("pushes and pops viewport", async () => {
      const { service, getViewportStack } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const viewport1: Viewport = { x: 0, y: 0, width: 80, height: 24 }
      const viewport2: Viewport = { x: 10, y: 10, width: 50, height: 10 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Push new viewport
          yield* _(renderer.pushViewport(viewport2))
          const current = yield* _(renderer.getViewport)
          expect(current).toEqual(viewport2)
          
          // Pop back to original
          yield* _(renderer.popViewport)
          const restored = yield* _(renderer.getViewport)
          expect(restored).toEqual(viewport1)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles empty viewport stack error", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.popViewport)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
  })
  
  describe("Buffer Management", () => {
    it("tracks dirty regions", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const region = { x: 5, y: 5, width: 10, height: 10 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.markDirty(region))
          const regions = yield* _(renderer.getDirtyRegions)
          
          expect(regions).toContain(region)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("clears dirty regions", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.markDirty({ x: 0, y: 0, width: 5, height: 5 }))
          yield* _(renderer.clearDirtyRegions)
          const regions = yield* _(renderer.getDirtyRegions)
          
          expect(regions).toHaveLength(0)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("adds dirty regions when rendering", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const view = createMockView("Test", 20, 5)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.render(view))
        }).pipe(Effect.provide(layer))
      )
      
      const regions = getDirtyRegions()
      expect(regions).toHaveLength(1)
      expect(regions[0].width).toBe(20)
      expect(regions[0].height).toBe(5)
    })
  })
  
  describe("Advanced Rendering Features", () => {
    it("renders at specific position", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const view = createMockView("Positioned", 8, 1)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.renderAt(view, 5, 10))
        }).pipe(Effect.provide(layer))
      )
      
      const regions = getDirtyRegions()
      expect(regions).toHaveLength(1)
      expect(regions[0]).toEqual({ x: 5, y: 10, width: 8, height: 1 })
    })
    
    it("renders batch of views", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const views = [
        { view: createMockView("View1", 5, 1), x: 0, y: 0 },
        { view: createMockView("View2", 5, 1), x: 10, y: 5 },
        { view: createMockView("View3", 5, 1), x: 20, y: 10 }
      ]
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.renderBatch(views))
        }).pipe(Effect.provide(layer))
      )
      
      const regions = getDirtyRegions()
      expect(regions).toHaveLength(3)
      expect(regions[0]).toEqual({ x: 0, y: 0, width: 5, height: 1 })
      expect(regions[1]).toEqual({ x: 10, y: 5, width: 5, height: 1 })
      expect(regions[2]).toEqual({ x: 20, y: 10, width: 5, height: 1 })
    })
    
    it("sets and clears clip region", async () => {
      const { service, getClipRegion } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const clipRegion = { x: 10, y: 10, width: 50, height: 20 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.setClipRegion(clipRegion))
          expect(getClipRegion()).toEqual(clipRegion)
          
          yield* _(renderer.setClipRegion(null))
          expect(getClipRegion()).toBeNull()
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("saves and restores rendering state", async () => {
      const { service, getSavedStates, getClipRegion } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const viewport1: Viewport = { x: 0, y: 0, width: 80, height: 24 }
      const viewport2: Viewport = { x: 10, y: 10, width: 60, height: 14 }
      const clipRegion = { x: 5, y: 5, width: 30, height: 10 }
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Set initial state
          yield* _(renderer.setViewport(viewport1))
          yield* _(renderer.setClipRegion(clipRegion))
          
          // Save state
          yield* _(renderer.saveState)
          expect(getSavedStates()).toHaveLength(1)
          
          // Change state
          yield* _(renderer.setViewport(viewport2))
          yield* _(renderer.setClipRegion(null))
          
          // Restore state
          yield* _(renderer.restoreState)
          const currentViewport = yield* _(renderer.getViewport)
          expect(currentViewport).toEqual(viewport1)
          expect(getClipRegion()).toEqual(clipRegion)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles restore state error when no saved state", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.restoreState)
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
  })
  
  describe("Performance Monitoring", () => {
    it("tracks render statistics", async () => {
      const { service, getRenderStats } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Render some frames
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
          
          const stats = yield* _(renderer.getStats)
          expect(stats.framesRendered).toBe(2)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("resets statistics", async () => {
      const { service, getRenderStats } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Render a frame
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
          
          // Reset stats
          yield* _(renderer.resetStats)
          
          const stats = yield* _(renderer.getStats)
          expect(stats.framesRendered).toBe(0)
        }).pipe(Effect.provide(layer))
      )
    })
    
  })
  
  describe("Text Operations", () => {
    it("measures text correctly", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const tests = [
        { text: "Hello", expected: { width: 5, height: 1, lineCount: 1 } },
        { text: "Hello\nWorld", expected: { width: 5, height: 2, lineCount: 2 } },
        { text: "Short\nVery long line\nMed", expected: { width: 14, height: 3, lineCount: 3 } },
        { text: "", expected: { width: 0, height: 1, lineCount: 1 } }
      ]
      
      for (const test of tests) {
        const result = await Effect.runPromise(
          Effect.gen(function* (_) {
            const renderer = yield* _(RendererService)
            return yield* _(renderer.measureText(test.text))
          }).pipe(Effect.provide(layer))
        )
        expect(result).toEqual(test.expected)
      }
    })
    
    it("wraps text to specified width", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          return yield* _(renderer.wrapText("This is a long line that should be wrapped", 10))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result).toEqual([
        "This is a",
        "long line",
        "that",
        "should be",
        "wrapped"
      ])
    })
    
    it("wraps text with break long words option", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          return yield* _(renderer.wrapText("SuperLongWordThatShouldBeBreken", 10, {
            breakLongWords: true
          }))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result).toEqual([
        "SuperLongW",
        "ordThatSho",
        "uldBeBreke",
        "n"
      ])
    })
    
    it("wraps text preserving indentation", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          return yield* _(renderer.wrapText("    This is indented text that should wrap", 15, {
            preserveIndentation: true
          }))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result).toEqual([
        "    This is",
        "    indented",
        "    text that",
        "    should wrap"
      ])
    })
    
    it("truncates text with ellipsis", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const tests = [
        { text: "Hello World", width: 8, ellipsis: "...", expected: "Hello..." },
        { text: "Short", width: 10, ellipsis: "...", expected: "Short" },
        { text: "VeryLongText", width: 5, ellipsis: "…", expected: "Very…" },
        { text: "Text", width: 2, ellipsis: "...", expected: ".." }
      ]
      
      for (const test of tests) {
        const result = await Effect.runPromise(
          Effect.gen(function* (_) {
            const renderer = yield* _(RendererService)
            return yield* _(renderer.truncateText(test.text, test.width, test.ellipsis))
          }).pipe(Effect.provide(layer))
        )
        expect(result).toBe(test.expected)
      }
    })
  })
  
  describe("Layer Management", () => {
    it("creates and manages layers", async () => {
      const { service, getLayers } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Create layers
          yield* _(renderer.createLayer("background", 1))
          yield* _(renderer.createLayer("foreground", 10))
          yield* _(renderer.createLayer("overlay", 100))
          
          const layers = getLayers()
          expect(layers.size).toBe(3)
          expect(layers.get("background")).toEqual({ zIndex: 1, visible: true, content: "" })
          expect(layers.get("foreground")).toEqual({ zIndex: 10, visible: true, content: "" })
          expect(layers.get("overlay")).toEqual({ zIndex: 100, visible: true, content: "" })
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles duplicate layer creation error", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.createLayer("test", 1))
          yield* _(renderer.createLayer("test", 2)) // Should fail
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("removes layers", async () => {
      const { service, getLayers } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          yield* _(renderer.createLayer("temp", 1))
          expect(getLayers().size).toBe(1)
          
          yield* _(renderer.removeLayer("temp"))
          expect(getLayers().size).toBe(0)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles remove non-existent layer error", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.removeLayer("nonexistent"))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("renders to layer", async () => {
      const { service, getLayers } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const view = createMockView("Layer content", 12, 1)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          yield* _(renderer.createLayer("test", 1))
          yield* _(renderer.renderToLayer("test", view, 5, 5))
          
          const layers = getLayers()
          expect(layers.get("test")?.content).toBe("Layer content")
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles render to non-existent layer error", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const view = createMockView("Content", 7, 1)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.renderToLayer("nonexistent", view, 0, 0))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("sets layer visibility", async () => {
      const { service, getLayers } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          yield* _(renderer.createLayer("test", 1))
          expect(getLayers().get("test")?.visible).toBe(true)
          
          yield* _(renderer.setLayerVisible("test", false))
          expect(getLayers().get("test")?.visible).toBe(false)
          
          yield* _(renderer.setLayerVisible("test", true))
          expect(getLayers().get("test")?.visible).toBe(true)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles set visibility on non-existent layer error", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      const result = await Effect.runPromiseExit(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          yield* _(renderer.setLayerVisible("nonexistent", false))
        }).pipe(Effect.provide(layer))
      )
      
      expect(result._tag).toBe("Failure")
    })
    
    it("composites layers in correct z-order", async () => {
      const { service, getLayers, getBuffer } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Create layers with different z-indices
          yield* _(renderer.createLayer("background", 1))
          yield* _(renderer.createLayer("foreground", 10))
          yield* _(renderer.createLayer("overlay", 5))
          
          // Render to layers
          yield* _(renderer.renderToLayer("background", createMockView("BG"), 0, 0))
          yield* _(renderer.renderToLayer("foreground", createMockView("FG"), 0, 0))
          yield* _(renderer.renderToLayer("overlay", createMockView("OV"), 0, 0))
          
          // Composite layers
          yield* _(renderer.compositeLayers)
          
          // Should be in z-order: background(1), overlay(5), foreground(10)
          expect(getBuffer()).toBe("BGOVFG")
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("composites only visible layers", async () => {
      const { service, getBuffer } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          yield* _(renderer.createLayer("layer1", 1))
          yield* _(renderer.createLayer("layer2", 2))
          yield* _(renderer.createLayer("layer3", 3))
          
          yield* _(renderer.renderToLayer("layer1", createMockView("L1"), 0, 0))
          yield* _(renderer.renderToLayer("layer2", createMockView("L2"), 0, 0))
          yield* _(renderer.renderToLayer("layer3", createMockView("L3"), 0, 0))
          
          // Hide middle layer
          yield* _(renderer.setLayerVisible("layer2", false))
          
          yield* _(renderer.compositeLayers)
          
          // Should only have layer1 and layer3
          expect(getBuffer()).toBe("L1L3")
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Dirty Region Optimization", () => {
    it("optimizes overlapping dirty regions", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Add overlapping dirty regions
          yield* _(renderer.markDirty({ x: 0, y: 0, width: 10, height: 10 }))
          yield* _(renderer.markDirty({ x: 5, y: 5, width: 10, height: 10 }))
          
          // Before optimization
          expect(getDirtyRegions()).toHaveLength(2)
          
          // Optimize regions
          yield* _(renderer.optimizeDirtyRegions)
          
          // After optimization should have merged regions
          const optimized = getDirtyRegions()
          expect(optimized).toHaveLength(1)
          expect(optimized[0]).toEqual({ x: 0, y: 0, width: 15, height: 15 })
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("preserves non-overlapping dirty regions", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Add non-overlapping dirty regions
          yield* _(renderer.markDirty({ x: 0, y: 0, width: 5, height: 5 }))
          yield* _(renderer.markDirty({ x: 10, y: 10, width: 5, height: 5 }))
          
          // Optimize regions
          yield* _(renderer.optimizeDirtyRegions)
          
          // Should preserve both regions
          const optimized = getDirtyRegions()
          expect(optimized).toHaveLength(2)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("handles complex overlapping scenarios", async () => {
      const { service, getDirtyRegions } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Add multiple overlapping regions
          yield* _(renderer.markDirty({ x: 0, y: 0, width: 10, height: 10 }))
          yield* _(renderer.markDirty({ x: 5, y: 5, width: 10, height: 10 }))
          yield* _(renderer.markDirty({ x: 8, y: 8, width: 10, height: 10 }))
          yield* _(renderer.markDirty({ x: 20, y: 20, width: 5, height: 5 })) // Separate region
          
          // Optimize regions
          yield* _(renderer.optimizeDirtyRegions)
          
          // Should merge the overlapping ones and keep the separate one
          const optimized = getDirtyRegions()
          expect(optimized).toHaveLength(2)
          
          // Find the merged region (should be the larger one)
          const mergedRegion = optimized.find(r => r.width > 10)
          expect(mergedRegion).toBeDefined()
          expect(mergedRegion).toEqual({ x: 0, y: 0, width: 18, height: 18 })
          
          // Find the separate region
          const separateRegion = optimized.find(r => r.width === 5)
          expect(separateRegion).toBeDefined()
          expect(separateRegion).toEqual({ x: 20, y: 20, width: 5, height: 5 })
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
  describe("Profiling and Statistics", () => {
    it("enables and disables profiling", async () => {
      const { service, getProfilingEnabled } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          expect(getProfilingEnabled()).toBe(false)
          
          yield* _(renderer.setProfilingEnabled(true))
          expect(getProfilingEnabled()).toBe(true)
          
          yield* _(renderer.setProfilingEnabled(false))
          expect(getProfilingEnabled()).toBe(false)
        }).pipe(Effect.provide(layer))
      )
    })
    
    it("provides detailed frame statistics", async () => {
      const { service } = createMockRendererService()
      const layer = Layer.succeed(RendererService, service)
      
      await Effect.runPromise(
        Effect.gen(function* (_) {
          const renderer = yield* _(RendererService)
          
          // Initially no frames
          let stats = yield* _(renderer.getStats)
          expect(stats.framesRendered).toBe(0)
          
          // Render some frames
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
          yield* _(renderer.beginFrame)
          yield* _(renderer.endFrame)
          
          stats = yield* _(renderer.getStats)
          expect(stats.framesRendered).toBe(2)
          expect(stats.lastFrameTime).toBeGreaterThan(0)
          expect(stats.averageFrameTime).toBeGreaterThan(0)
        }).pipe(Effect.provide(layer))
      )
    })
  })
  
})

// Import RenderUtils separately for testing
import { RenderUtils } from "@/services/renderer"

describe("RenderUtils", () => {
  describe("emptyView", () => {
    it("creates an empty view with specified dimensions", async () => {
      const view = RenderUtils.emptyView(5, 3)
      
      expect(view.width).toBe(5)
      expect(view.height).toBe(3)
      
      const content = await Effect.runPromise(view.render())
      expect(content).toBe(' '.repeat(15)) // 5 * 3 = 15 spaces
    })
    
    it("handles zero dimensions", async () => {
      const view = RenderUtils.emptyView(0, 0)
      
      expect(view.width).toBe(0)
      expect(view.height).toBe(0)
      
      const content = await Effect.runPromise(view.render())
      expect(content).toBe('')
    })
  })
  
  describe("textView", () => {
    it("creates a view from simple string", async () => {
      const view = RenderUtils.textView("Hello, World!")
      
      const content = await Effect.runPromise(view.render())
      expect(content).toBe("Hello, World!")
    })
    
    it("handles empty string", async () => {
      const view = RenderUtils.textView("")
      
      const content = await Effect.runPromise(view.render())
      expect(content).toBe("")
    })
    
    it("handles multi-line string", async () => {
      const view = RenderUtils.textView("Line 1\nLine 2\nLine 3")
      
      const content = await Effect.runPromise(view.render())
      expect(content).toBe("Line 1\nLine 2\nLine 3")
    })
  })
  
  describe("joinHorizontal", () => {
    it("joins multiple views horizontally", async () => {
      const view1 = RenderUtils.textView("AAA\nAAA")
      const view2 = RenderUtils.textView("BBB\nBBB")
      const view3 = RenderUtils.textView("CCC\nCCC")
      
      const joined = RenderUtils.joinHorizontal([view1, view2, view3])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("AAABBBCCC\nAAABBBCCC")
    })
    
    it("handles views with different heights", async () => {
      const view1 = RenderUtils.textView("A\nA\nA")
      const view2 = RenderUtils.textView("B\nB")
      const view3 = RenderUtils.textView("C")
      
      const joined = RenderUtils.joinHorizontal([view1, view2, view3])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("ABC\nAB\nA")
    })
    
    it("handles empty views array", async () => {
      const joined = RenderUtils.joinHorizontal([])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("")
    })
    
    it("handles single view", async () => {
      const view = RenderUtils.textView("Single")
      const joined = RenderUtils.joinHorizontal([view])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("Single")
    })
  })
  
  describe("joinVertical", () => {
    it("joins multiple views vertically", async () => {
      const view1 = RenderUtils.textView("First")
      const view2 = RenderUtils.textView("Second")
      const view3 = RenderUtils.textView("Third")
      
      const joined = RenderUtils.joinVertical([view1, view2, view3])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("First\nSecond\nThird")
    })
    
    it("handles views with newlines", async () => {
      const view1 = RenderUtils.textView("Line 1A\nLine 1B")
      const view2 = RenderUtils.textView("Line 2A\nLine 2B")
      
      const joined = RenderUtils.joinVertical([view1, view2])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("Line 1A\nLine 1B\nLine 2A\nLine 2B")
    })
    
    it("handles empty views array", async () => {
      const joined = RenderUtils.joinVertical([])
      const content = await Effect.runPromise(joined.render())
      
      expect(content).toBe("")
    })
  })
  
  describe("addPadding", () => {
    it("adds padding around a view", async () => {
      const view = { ...RenderUtils.textView("AB\nCD"), width: 2, height: 2 }
      const padded = RenderUtils.addPadding(view, { top: 1, right: 2, bottom: 1, left: 1 })
      
      expect(padded.width).toBe(5) // 2 + 1 + 2 = 5
      expect(padded.height).toBe(4) // 2 + 1 + 1 = 4
      
      const content = await Effect.runPromise(padded.render())
      const lines = content.split('\n')
      
      expect(lines).toHaveLength(4)
      expect(lines[0]).toBe("     ") // Empty line with padding
      expect(lines[1]).toBe(" AB  ") // Left padding + content + right padding
      expect(lines[2]).toBe(" CD  ") // Left padding + content + right padding
      expect(lines[3]).toBe("     ") // Empty line with padding
    })
    
    it("handles zero padding", async () => {
      const view = RenderUtils.textView("Test")
      const padded = RenderUtils.addPadding(view, { top: 0, right: 0, bottom: 0, left: 0 })
      
      const content = await Effect.runPromise(padded.render())
      expect(content).toBe("Test")
    })
    
    it("handles view without width/height", async () => {
      const view = RenderUtils.textView("Test")
      const padded = RenderUtils.addPadding(view, { top: 1, right: 1, bottom: 1, left: 1 })
      
      expect(padded.width).toBeUndefined()
      expect(padded.height).toBeUndefined()
    })
  })
  
  describe("clipView", () => {
    it("clips a view to specified dimensions", async () => {
      const view = RenderUtils.textView("ABCDEFGHIJ\n1234567890\nLongLineHere")
      const clipped = RenderUtils.clipView(view, 5, 2)
      
      expect(clipped.width).toBe(5)
      expect(clipped.height).toBe(2)
      
      const content = await Effect.runPromise(clipped.render())
      expect(content).toBe("ABCDE\n12345")
    })
    
    it("handles view smaller than clip dimensions", async () => {
      const view = RenderUtils.textView("AB\nCD")
      const clipped = RenderUtils.clipView(view, 10, 10)
      
      const content = await Effect.runPromise(clipped.render())
      expect(content).toBe("AB\nCD")
    })
    
    it("handles single line view", async () => {
      const view = RenderUtils.textView("LongSingleLine")
      const clipped = RenderUtils.clipView(view, 4, 1)
      
      const content = await Effect.runPromise(clipped.render())
      expect(content).toBe("Long")
    })
    
    it("handles empty view", async () => {
      const view = RenderUtils.textView("")
      const clipped = RenderUtils.clipView(view, 5, 3)
      
      const content = await Effect.runPromise(clipped.render())
      expect(content).toBe("")
    })
    
    it("handles zero clip dimensions", async () => {
      const view = RenderUtils.textView("Content")
      const clipped = RenderUtils.clipView(view, 0, 0)
      
      const content = await Effect.runPromise(clipped.render())
      expect(content).toBe("")
    })
  })
})