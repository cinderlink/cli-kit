/**
 * Mouse Demo - Simple demonstration of mouse event capture
 * 
 * This demonstrates that mouse events are being captured and processed
 * by the runtime, even without the full coordinate-to-component routing.
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { View } from "@/index.ts"
const { vstack, text, styledText, box } = View
import type { Component, AppOptions } from "@/core/types.ts"
import { style, Colors } from "@/styling/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"

// =============================================================================
// Model
// =============================================================================

interface Model {
  readonly mouseEvents: Array<string>
  readonly clickCount: number
}

// =============================================================================
// Messages
// =============================================================================

type Msg = 
  | { readonly tag: "addMouseEvent"; readonly event: string }

// =============================================================================
// Component
// =============================================================================

const mouseDemoComponent: Component<Model, Msg> = {
  init: Effect.succeed([{ mouseEvents: [], clickCount: 0 }, []]),
  
  update(msg: Msg, model: Model) {
    switch (msg.tag) {
      case "addMouseEvent": {
        const newEvents = [...model.mouseEvents, msg.event].slice(-10) // Keep last 10 events
        const newClickCount = msg.event.includes('press') ? model.clickCount + 1 : model.clickCount
        
        return Effect.succeed([{
          ...model,
          mouseEvents: newEvents,
          clickCount: newClickCount
        }, []])
      }
    }
  },
  
  view(model: Model) {
    const title = styledText("Mouse Event Demo", style().foreground(Colors.brightWhite))
    const subtitle = styledText("Move mouse and click - events captured by runtime", style().foreground(Colors.gray))
    
    const eventsList = model.mouseEvents.length > 0 
      ? model.mouseEvents.map(event => styledText(`• ${event}`, style().foreground(Colors.white)))
      : [styledText("No mouse events captured yet", style().foreground(Colors.gray))]
    
    const stats = [
      styledText(`Total clicks captured: ${model.clickCount}`, style().foreground(Colors.cyan)),
      styledText(`Recent events (last 10):`, style().foreground(Colors.yellow))
    ]
    
    const instructions = [
      styledText("Instructions:", style().foreground(Colors.yellow)),
      styledText("• Move mouse around", style().foreground(Colors.gray)),
      styledText("• Click left mouse button", style().foreground(Colors.gray)),
      styledText("• Check console for debug output", style().foreground(Colors.gray)),
      styledText("• Press Ctrl+C to exit", style().foreground(Colors.gray))
    ]
    
    return vstack(
      title,
      subtitle,
      text(""),
      vstack(...stats),
      text(""),
      box(
        vstack(...eventsList),
        {
          width: 60,
          height: Math.max(12, eventsList.length + 2),
          padding: { top: 0, right: 1, bottom: 0, left: 1 }
        }
      ),
      text(""),
      vstack(...instructions)
    )
  }
}

// =============================================================================
// Main
// =============================================================================

const config: AppOptions = {
  fps: 30,
  debug: true, // Enable debug logging to see mouse events in console
  mouse: true,
  alternateScreen: false
}

console.log("Mouse Demo Starting...")
console.log("Mouse tracking enabled - you should see mouse events in console")
console.log("Note: Component routing not implemented yet, but events are captured")

const program = runApp(mouseDemoComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })