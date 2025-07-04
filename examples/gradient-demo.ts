#!/usr/bin/env bun

import { Effect, Stream } from "effect"
import { 
  runApp,
  View,
  type Component,
  type Cmd,
  type AppOptions,
  type AppServices,
  type KeyEvent
} from "../src/index.ts"
import { InputService } from "../src/services/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { 
  style, 
  Colors, 
  Borders,
  textGradient,
  backgroundGradient,
  rainbowGradient,
  sunsetGradient,
  oceanGradient,
  fireGradient,
  pastelGradient,
  createGradient,
  animatedGradient,
  createRainbowText,
  createNeonEffect,
  createTypewriter,
  createMatrixEffect,
  generatePattern
} from "../src/styling/index.ts"
import { styledBox } from "../src/layout/box.ts"

// Model for the demo app
interface AppModel {
  currentDemo: number
  animationTime: number
  showInstructions: boolean
  terminalSize: { width: number; height: number }
}

type AppMsg = 
  | { _tag: "NextDemo" }
  | { _tag: "PrevDemo" }
  | { _tag: "ToggleInstructions" }
  | { _tag: "AnimationTick" }
  | { _tag: "UpdateTerminalSize"; width: number; height: number }
  | { _tag: "Quit" }

const gradientDemo: Component<AppModel, AppMsg> = {
  init: Effect.succeed([
    {
      currentDemo: 0,
      animationTime: 0,
      showInstructions: true,
      terminalSize: { width: 80, height: 24 }
    },
    []
  ]),

  update: (msg: AppMsg, model: AppModel) => {
    switch (msg._tag) {
      case "NextDemo":
        return Effect.succeed([
          { ...model, currentDemo: (model.currentDemo + 1) % 7 },
          []
        ])
      
      case "PrevDemo":
        return Effect.succeed([
          { ...model, currentDemo: model.currentDemo === 0 ? 6 : model.currentDemo - 1 },
          []
        ])
      
      case "ToggleInstructions":
        return Effect.succeed([
          { ...model, showInstructions: !model.showInstructions },
          []
        ])
      
      case "AnimationTick":
        return Effect.succeed([
          { ...model, animationTime: model.animationTime + 0.1 },
          []
        ])
      
      case "UpdateTerminalSize":
        return Effect.succeed([
          { ...model, terminalSize: { width: msg.width, height: msg.height } },
          []
        ])
      
      case "Quit":
        return Effect.succeed([model, [Effect.succeed({ _tag: "Quit" } as any)]])
    }
  },

  view: (model: AppModel) => {
    const { text, styledText, vstack, hstack } = View
    
    const demos = [
      "Rainbow Text Gradient",
      "Sunset Gradient",
      "Ocean Gradient", 
      "Fire Gradient",
      "Animated Rainbow",
      "Neon Effect",
      "Matrix Effect"
    ]
    
    const titleStyle = style().foreground(Colors.brightBlue).bold()
    
    // Header
    const header = styledBox(
      vstack(
        styledText("🌈 Gradient & Advanced Styling Demo", titleStyle),
        text(""),
        styledText(`Demo ${model.currentDemo + 1}/7: ${demos[model.currentDemo]}`, style().foreground(Colors.yellow)),
        text(""),
        styledText("Controls: ←→ Navigate • Space: Toggle instructions • q: Quit", style().foreground(Colors.gray))
      ),
      {
        border: Borders.Rounded,
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        minWidth: 70,
        style: style().background(Colors.black).foreground(Colors.white)
      }
    )
    
    // Demo content
    let demoContent: any
    
    switch (model.currentDemo) {
      case 0: // Rainbow Text Gradient
        const rainbowStyles = createRainbowText("RAINBOW GRADIENT TEXT!", model.animationTime)
        const rainbowChars = "RAINBOW GRADIENT TEXT!".split('')
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              ...rainbowChars.map((char, i) => 
                styledText(char, rainbowStyles[i] ?? style())
              )
            ),
            View.empty,
            styledText("Animated rainbow colors cycling through the text", style().foreground(Colors.gray)),
            View.empty,
            styledText("Features:", style().foreground(Colors.yellow).bold()),
            styledText("• Dynamic color cycling", style().foreground(Colors.gray)),
            styledText("• Smooth rainbow transitions", style().foreground(Colors.gray)),
            styledText("• Time-based animation", style().foreground(Colors.gray))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 1: // Sunset Gradient
        const sunsetGrad = sunsetGradient('horizontal')
        const sunsetText = "SUNSET ON THE HORIZON"
        const sunsetStyles = textGradient({ gradient: sunsetGrad, text: sunsetText })
        const sunsetChars = sunsetText.split('')
        
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              ...sunsetChars.map((char, i) => 
                styledText(char, sunsetStyles[i] ?? style())
              )
            ),
            View.empty,
            styledText("Red-orange to yellow gradient like a sunset", style().foreground(Colors.gray)),
            View.empty,
            styledText("Gradient stops:", style().foreground(Colors.yellow).bold()),
            styledText("• Start: Red-Orange (#FF5E4D)", style().foreground({ _tag: "RGB", r: 255, g: 94, b: 77 })),
            styledText("• Middle: Orange (#FF9A00)", style().foreground({ _tag: "RGB", r: 255, g: 154, b: 0 })),
            styledText("• End: Yellow (#FFCE54)", style().foreground({ _tag: "RGB", r: 255, g: 206, b: 84 }))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 2: // Ocean Gradient
        const oceanGrad = oceanGradient('horizontal')
        const oceanText = "DEEP BLUE SEA WAVES"
        const oceanStyles = textGradient({ gradient: oceanGrad, text: oceanText })
        const oceanChars = oceanText.split('')
        
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              ...oceanChars.map((char, i) => 
                styledText(char, oceanStyles[i] ?? style())
              )
            ),
            View.empty,
            styledText("Turquoise to deep blue like ocean depths", style().foreground(Colors.gray)),
            View.empty,
            styledText("Gradient stops:", style().foreground(Colors.yellow).bold()),
            styledText("• Surface: Turquoise (#40E0D0)", style().foreground({ _tag: "RGB", r: 64, g: 224, b: 208 })),
            styledText("• Mid: Steel Blue (#4682B4)", style().foreground({ _tag: "RGB", r: 70, g: 130, b: 180 })),
            styledText("• Deep: Midnight Blue (#191970)", style().foreground({ _tag: "RGB", r: 25, g: 25, b: 112 }))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 3: // Fire Gradient
        const fireGrad = fireGradient('horizontal')
        const fireText = "BLAZING HOT FLAMES"
        const fireStyles = textGradient({ gradient: fireGrad, text: fireText })
        const fireChars = fireText.split('')
        
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              ...fireChars.map((char, i) => 
                styledText(char, fireStyles[i] ?? style())
              )
            ),
            View.empty,
            styledText("Yellow to dark red like burning flames", style().foreground(Colors.gray)),
            View.empty,
            styledText("Gradient stops:", style().foreground(Colors.yellow).bold()),
            styledText("• Core: Yellow (#FFFF00)", style().foreground({ _tag: "RGB", r: 255, g: 255, b: 0 })),
            styledText("• Hot: Orange (#FFA500)", style().foreground({ _tag: "RGB", r: 255, g: 165, b: 0 })),
            styledText("• Flame: Red-Orange (#FF4500)", style().foreground({ _tag: "RGB", r: 255, g: 69, b: 0 })),
            styledText("• Base: Dark Red (#8B0000)", style().foreground({ _tag: "RGB", r: 139, g: 0, b: 0 }))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 4: // Animated Rainbow
        const animatedRainbow = animatedGradient(rainbowGradient(), model.animationTime, 0.5)
        const animText = "ANIMATED GRADIENT FLOW"
        const animStyles = textGradient({ gradient: animatedRainbow, text: animText })
        const animChars = animText.split('')
        
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              ...animChars.map((char, i) => 
                styledText(char, animStyles[i] ?? style())
              )
            ),
            View.empty,
            styledText("Animated rainbow gradient that flows over time", style().foreground(Colors.gray)),
            View.empty,
            styledText("Animation features:", style().foreground(Colors.yellow).bold()),
            styledText("• Continuous color shifting", style().foreground(Colors.gray)),
            styledText("• Smooth gradient animation", style().foreground(Colors.gray)),
            styledText("• Configurable speed and direction", style().foreground(Colors.gray)),
            View.empty,
            styledText("Watch the colors flow across the text!", style().foreground(Colors.brightCyan))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 5: // Neon Effect
        const neonText = "NEON LIGHTS"
        const neonColor = { _tag: "RGB" as const, r: 0, g: 255, b: 255 } // Cyan
        const neonEffect = createNeonEffect(neonText, neonColor, model.animationTime)
        
        demoContent = styledBox(
          vstack(
            View.empty,
            hstack(
              text("      "),
              styledText(neonText, neonEffect.mainStyle.foreground(neonColor).bold())
            ),
            View.empty,
            styledText("Simulated neon sign with glow effect", style().foreground(Colors.gray)),
            View.empty,
            styledText(`Flicker intensity: ${Math.round(neonEffect.flickerIntensity * 100)}%`, style().foreground(Colors.yellow)),
            View.empty,
            styledText("Neon features:", style().foreground(Colors.yellow).bold()),
            styledText("• Bright glowing appearance", style().foreground(Colors.gray)),
            styledText("• Realistic flicker simulation", style().foreground(Colors.gray)),
            styledText("• Customizable glow colors", style().foreground(Colors.gray)),
            styledText("• Dynamic brightness variation", style().foreground(Colors.gray))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 12,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      case 6: // Matrix Effect
        const matrixDrops = createMatrixEffect(30, 8, model.animationTime, 0.15)
        const matrixLines = Array(8).fill(' '.repeat(30)).map((line, y) => {
          let chars = line.split('')
          matrixDrops.forEach(drop => {
            if (drop.y === y && drop.x < chars.length) {
              chars[drop.x] = drop.char
            }
          })
          return chars.join('')
        })
        
        demoContent = styledBox(
          vstack(
            View.empty,
            styledText("MATRIX DIGITAL RAIN", style().foreground(Colors.brightGreen).bold()),
            View.empty,
            ...matrixLines.map(line => 
              styledText(line, style().foreground(Colors.green))
            ),
            View.empty,
            styledText("Simulated Matrix-style digital rain effect", style().foreground(Colors.gray)),
            View.empty,
            styledText("Matrix features:", style().foreground(Colors.yellow).bold()),
            styledText("• Falling digital characters", style().foreground(Colors.gray)),
            styledText("• Randomized patterns", style().foreground(Colors.gray)),
            styledText("• Configurable density and speed", style().foreground(Colors.gray))
          ),
          {
            border: Borders.Rounded,
            padding: { top: 1, right: 2, bottom: 1, left: 2 },
            minWidth: 70,
            minHeight: 18,
            style: style().background(Colors.black).foreground(Colors.white)
          }
        )
        break
      
      default:
        demoContent = text("Demo not implemented")
    }
    
    // Instructions panel
    const instructions = model.showInstructions ? styledBox(
      vstack(
        styledText("Available Gradient Types:", style().foreground(Colors.brightBlue).bold()),
        text(""),
        styledText("🌈 Rainbow: Full spectrum cycling", style().foreground(Colors.gray)),
        styledText("🌅 Sunset: Warm orange to yellow", style().foreground(Colors.gray)),
        styledText("🌊 Ocean: Turquoise to deep blue", style().foreground(Colors.gray)),
        styledText("🔥 Fire: Yellow to dark red", style().foreground(Colors.gray)),
        styledText("✨ Animated: Moving gradients", style().foreground(Colors.gray)),
        styledText("💡 Neon: Glowing effects", style().foreground(Colors.gray)),
        styledText("💻 Matrix: Digital rain", style().foreground(Colors.gray)),
        text(""),
        styledText("Press Space to toggle this panel", style().foreground(Colors.yellow))
      ),
      {
        border: Borders.Rounded,
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        minWidth: 35,
        style: style().background(Colors.black).foreground(Colors.white)
      }
    ) : text("")
    
    // Layout
    if (model.showInstructions) {
      return vstack(
        header,
        text(""),
        hstack(
          demoContent,
          text("  "),
          instructions
        )
      )
    } else {
      return vstack(
        header,
        text(""),
        demoContent
      )
    }
  },

  subscriptions: (model: AppModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      // Animation timer
      const animationTimer = Stream.repeatEffect(
        Effect.gen(function* () {
          yield* Effect.sleep(100) // 100ms intervals
          return { _tag: "AnimationTick" } as AppMsg
        })
      )
      
      // Keyboard input
      const keyboardInput = input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0)
        }
        
        switch (key.key) {
          case 'left':
          case 'h':
            return { _tag: "PrevDemo" }
          case 'right':
          case 'l':
            return { _tag: "NextDemo" }
          case ' ':
            return { _tag: "ToggleInstructions" }
          case 'escape':
            process.exit(0)
          default:
            return null
        }
      })
      
      return Stream.merge(animationTimer, keyboardInput)
    })
}

const config: AppOptions = {
  fps: 30,
  debug: false,
  mouse: false,
  alternateScreen: true
}

console.log("Starting Gradient & Advanced Styling Demo...")
console.log("This example demonstrates gradient effects and advanced text styling")

const program = runApp(gradientDemo, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })