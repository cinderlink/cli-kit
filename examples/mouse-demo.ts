/**
 * Mouse Demo - Simple demonstration of mouse event capture
 * 
 * This demonstrates that mouse events are being captured and processed
 * by the runtime, even without the full coordinate-to-component routing.
 */

import { Effect, Stream } from "effect"
import { runApp } from "@/index.ts"
import { vstack, text, box } from "@/core/view.ts"
import type { Component, RuntimeConfig } from "@/core/types.ts"
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
    const title = text("Mouse Event Demo", style(Colors.BrightWhite))
    const subtitle = text("Move mouse and click - events captured by runtime", style(Colors.Gray))
    
    const eventsList = model.mouseEvents.length > 0 
      ? model.mouseEvents.map(event => text(`• ${event}`, style(Colors.White)))
      : [text("No mouse events captured yet", style(Colors.Gray))]
    
    const stats = [
      text(`Total clicks captured: ${model.clickCount}`, style(Colors.Cyan)),
      text(`Recent events (last 10):`, style(Colors.Yellow))
    ]
    
    const instructions = [
      text("Instructions:", style(Colors.Yellow)),
      text("• Move mouse around", style(Colors.Gray)),
      text("• Click left mouse button", style(Colors.Gray)),
      text("• Check console for debug output", style(Colors.Gray)),
      text("• Press Ctrl+C to exit", style(Colors.Gray))
    ]
    
    return vstack(
      title,
      subtitle,
      text("", style()),
      vstack(...stats),
      text("", style()),
      box(
        vstack(...eventsList),
        {
          width: 60,
          height: Math.max(12, eventsList.length + 2),
          padding: { top: 0, right: 1, bottom: 0, left: 1 }
        }
      ),
      text("", style()),
      vstack(...instructions)
    )
  }
}

// =============================================================================
// Main
// =============================================================================

const config: RuntimeConfig = {
  fps: 30,
  debug: true, // Enable debug logging to see mouse events in console
  quitOnEscape: true,
  quitOnCtrlC: true,
  enableMouse: true,
  fullscreen: false
}

console.log("Mouse Demo Starting...")
console.log("Mouse tracking enabled - you should see mouse events in console")
console.log("Note: Component routing not implemented yet, but events are captured")

const program = runApp(mouseDemoComponent, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })