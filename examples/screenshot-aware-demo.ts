/**
 * Screenshot-Aware Demo
 * 
 * Demonstrates how CLI-KIT apps can detect and optimize for screenshot mode
 */

import { Effect, Stream } from "effect"
import { runApp } from "../src/index.ts"
import { vstack, hstack, text, styledText } from "../src/core/view.ts"
import { spacer } from "../src/layout/index.ts"
import type { Component, AppOptions, KeyEvent } from "../src/core/types.ts"
import { style, Colors } from "../src/styling/index.ts"
import { InputService } from "../src/services/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { largeGradientText, gradientPresets } from "../src/components/LargeText.ts"
import { isScreenshotMode, withScreenshot } from "../src/screenshot/protocol.ts"

interface DemoModel {
  readonly count: number
  readonly message: string
}

type DemoMsg = 
  | { readonly tag: "increment" }
  | { readonly tag: "decrement" }

const demoComponent: Component<DemoModel, DemoMsg> = {
  init: Effect.succeed([
    {
      count: 0,
      message: isScreenshotMode() 
        ? "📸 Screenshot Mode Active!" 
        : "Normal Mode - Press ↑/↓ to change counter"
    },
    []
  ]),

  update: (msg: DemoMsg, model: DemoModel) => {
    switch (msg.tag) {
      case "increment":
        return Effect.succeed([
          { ...model, count: model.count + 1 },
          []
        ])
      case "decrement":
        return Effect.succeed([
          { ...model, count: model.count - 1 },
          []
        ])
    }
  },

  view: (model: DemoModel) => {
    const logo = largeGradientText({
      text: "DEMO",
      gradient: gradientPresets.rainbow,
      font: 'standard',
      scale: 1
    })

    const screenshotInfo = isScreenshotMode() ? vstack(
      spacer(1),
      hstack(
        spacer(5),
        styledText("🎯 This app detected screenshot mode!", style().foreground(Colors.brightGreen).bold())
      ),
      hstack(
        spacer(5),
        styledText("Component tree and state will be captured", style().foreground(Colors.gray))
      )
    ) : text("")

    return vstack(
      spacer(2),
      hstack(spacer(5), logo),
      spacer(2),
      hstack(
        spacer(5),
        styledText(`Counter: ${model.count}`, style().foreground(Colors.brightWhite).bold())
      ),
      spacer(1),
      hstack(
        spacer(5),
        styledText(model.message, style().foreground(Colors.brightCyan))
      ),
      screenshotInfo,
      spacer(2),
      hstack(
        spacer(5),
        styledText("Press q to quit", style().foreground(Colors.gray))
      )
    )
  },

  subscriptions: (model: DemoModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      return input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0)
        }
        
        switch (key.key) {
          case 'up':
            return { tag: "increment" }
          case 'down':
            return { tag: "decrement" }
          default:
            return null
        }
      })
    })
}

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
}

// Apply screenshot awareness
const { component, config: enhancedConfig } = withScreenshot({
  appName: "Screenshot-Aware Demo",
  appVersion: "1.0.0",
  features: ["counter", "screenshot-detection"]
})(demoComponent, config)

console.log("Starting Screenshot-Aware Demo...")
if (isScreenshotMode()) {
  console.log("📸 Running in screenshot mode!")
}

const program = runApp(component, enhancedConfig).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Demo error:", error)
    process.exit(1)
  })