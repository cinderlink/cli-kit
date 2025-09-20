/**
 * Loading Screen Demo - Large gradient text for splash screens
 * 
 * Demonstrates:
 * - Large ASCII art text with gradients
 * - Animated loading effects
 * - Professional splash screen design
 */

import { Effect, Stream } from "effect"
import { runApp } from "../src/index.ts"
import { vstack, hstack, text, styledText, box } from "../src/core/view.ts"
import { spacer } from "../src/layout/index.ts"
import type { Component, Cmd, AppServices, AppOptions, KeyEvent } from "../src/core/types.ts"
import { style, Colors, Borders } from "../src/styling/index.ts"
import { InputService } from "../src/services/index.ts"
import { LiveServices } from "../src/services/impl/index.ts"
import { 
  largeGradientText,
  largeAnimatedGradientText,
  gradientPresets,
  type GradientConfig,
  type FontStyle
} from "../src/components/LargeText.ts"

const LOADING_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

// Model
interface LoadingModel {
  readonly progress: number
  readonly loadingFrame: number
  readonly animationTime: number
  readonly currentTheme: number
  readonly isLoading: boolean
  readonly message: string
  // Component props
  readonly spacing: number
  readonly animationSpeed: number
  readonly gradientDirection: GradientConfig['direction']
  readonly font: FontStyle
  readonly scale: number
}

// Messages
type LoadingMsg = 
  | { readonly tag: "tick" }
  | { readonly tag: "nextTheme" }
  | { readonly tag: "prevTheme" }
  | { readonly tag: "toggleLoading" }
  | { readonly tag: "setProgress"; readonly value: number }
  | { readonly tag: "increaseSpacing" }
  | { readonly tag: "decreaseSpacing" }
  | { readonly tag: "increaseSpeed" }
  | { readonly tag: "decreaseSpeed" }
  | { readonly tag: "changeDirection" }
  | { readonly tag: "randomizeColors" }
  | { readonly tag: "setTheme"; readonly index: number }
  | { readonly tag: "increaseScale" }
  | { readonly tag: "decreaseScale" }
  | { readonly tag: "nextFont" }
  | { readonly tag: "prevFont" }

// Extended gradient themes
const gradientThemes: GradientConfig[] = [
  gradientPresets.neon,
  gradientPresets.sunset,
  gradientPresets.matrix,
  gradientPresets.ocean,
  gradientPresets.rainbow,
  gradientPresets.fire,
  // Extended gradient collection
  { colors: [Colors.magenta, Colors.cyan, Colors.yellow], direction: 'horizontal' },
  { colors: [Colors.red, Colors.orange, Colors.yellow], direction: 'horizontal' },
  { colors: [Colors.green, Colors.blue, Colors.purple], direction: 'horizontal' },
  { colors: [Colors.white, Colors.gray, Colors.black], direction: 'horizontal' },
  // Neon themes
  { colors: [Colors.neonPink, Colors.neonBlue, Colors.neonGreen], direction: 'diagonal' },
  { colors: [Colors.neonPurple, Colors.neonOrange, Colors.neonYellow], direction: 'vertical' },
  // Pastel themes
  { colors: [Colors.pastelPink, Colors.pastelBlue, Colors.pastelPurple], direction: 'horizontal' },
  { colors: [Colors.pastelOrange, Colors.pastelYellow, Colors.pastelGreen], direction: 'vertical' },
  // Ocean depths
  { colors: [Colors.navy, Colors.royal, Colors.sky, Colors.lightBlue], direction: 'vertical' },
  // Forest theme
  { colors: [Colors.darkGreen, Colors.forest, Colors.lime, Colors.mint], direction: 'horizontal' },
  // Sunset/sunrise
  { colors: [Colors.deepPurple, Colors.purple, Colors.pink, Colors.coral, Colors.orange], direction: 'diagonal' },
  // Gold rush
  { colors: [Colors.maroon, Colors.red, Colors.orange, Colors.gold, Colors.amber], direction: 'horizontal' },
  // Electric
  { colors: [Colors.darkPurple, Colors.indigo, Colors.violet, Colors.lightPurple], direction: 'vertical' },
  // Teal dreams
  { colors: [Colors.darkTeal, Colors.teal, Colors.lightTeal, Colors.turquoise], direction: 'diagonal' },
  // Monochrome
  { colors: [Colors.black, Colors.charcoal, Colors.darkGray, Colors.silver, Colors.white], direction: 'horizontal' }
]

const themeNames = [
  "Cyberpunk", "Sunset", "Matrix", "Ocean", "Rainbow", 
  "Fire", "Tropical", "Sunset2", "Cool", "Mono",
  "Neon Storm", "Neon Glow", "Pastel Dreams", "Pastel Spring",
  "Ocean Depths", "Forest", "Cosmic Dawn", "Gold Rush",
  "Electric", "Teal Dreams", "Monochrome"
]

const fonts: FontStyle[] = ['standard', 'big', 'ansiShadow', 'slant', '3d', 'chunky', 'graffiti', 'cyber', 'neon']
const fontNames = ['Standard', 'Big', 'ANSI Shadow', 'Slant', '3D ASCII', 'Chunky', 'Graffiti', 'Cyber', 'Neon']

const loadingScreen: Component<LoadingModel, LoadingMsg> = {
  init: Effect.succeed([
    {
      progress: 0,
      loadingFrame: 0,
      animationTime: 0,
      currentTheme: 0,
      isLoading: true,
      message: "Initializing CLI-Kit framework...",
      spacing: 1,
      animationSpeed: 0.05,
      gradientDirection: 'horizontal' as const,
      font: 'standard' as FontStyle,
      scale: 1
    },
    []
  ]),

  update: (msg: LoadingMsg, model: LoadingModel) => {
    switch (msg.tag) {
      case "tick": {
        const newProgress = model.isLoading && model.progress < 100 
          ? Math.min(100, model.progress + Math.random() * 5)
          : model.progress
          
        const newFrame = (model.loadingFrame + 1) % LOADING_FRAMES.length
        
        let newMessage = model.message
        if (newProgress > 20 && newProgress <= 40) {
          newMessage = "Loading components..."
        } else if (newProgress > 40 && newProgress <= 60) {
          newMessage = "Initializing services..."
        } else if (newProgress > 60 && newProgress <= 80) {
          newMessage = "Setting up runtime..."
        } else if (newProgress > 80 && newProgress < 100) {
          newMessage = "Almost ready..."
        } else if (newProgress >= 100) {
          newMessage = "✨ Ready! Press SPACE to continue"
        }
        
        return Effect.succeed([
          { 
            ...model, 
            progress: newProgress,
            loadingFrame: newFrame,
            animationTime: model.animationTime + 0.1,
            message: newMessage,
            isLoading: newProgress < 100
          },
          []
        ])
      }
      
      case "nextTheme": {
        return Effect.succeed([
          { ...model, currentTheme: (model.currentTheme + 1) % gradientThemes.length },
          []
        ])
      }
      
      case "prevTheme": {
        const newTheme = model.currentTheme === 0 
          ? gradientThemes.length - 1 
          : model.currentTheme - 1
        return Effect.succeed([
          { ...model, currentTheme: newTheme },
          []
        ])
      }
      
      case "toggleLoading": {
        return Effect.succeed([
          { 
            ...model, 
            isLoading: !model.isLoading,
            progress: model.isLoading ? model.progress : 0
          },
          []
        ])
      }
      
      case "setProgress": {
        return Effect.succeed([
          { ...model, progress: msg.value },
          []
        ])
      }
      
      case "increaseSpacing": {
        return Effect.succeed([
          { ...model, spacing: Math.min(5, model.spacing + 1) },
          []
        ])
      }
      
      case "decreaseSpacing": {
        return Effect.succeed([
          { ...model, spacing: Math.max(0, model.spacing - 1) },
          []
        ])
      }
      
      case "increaseSpeed": {
        return Effect.succeed([
          { ...model, animationSpeed: Math.min(0.2, model.animationSpeed + 0.01) },
          []
        ])
      }
      
      case "decreaseSpeed": {
        return Effect.succeed([
          { ...model, animationSpeed: Math.max(0, model.animationSpeed - 0.01) },
          []
        ])
      }
      
      case "changeDirection": {
        const directions: GradientConfig['direction'][] = ['horizontal', 'vertical', 'diagonal']
        const currentIndex = directions.indexOf(model.gradientDirection)
        const nextIndex = (currentIndex + 1) % directions.length
        return Effect.succeed([
          { ...model, gradientDirection: directions[nextIndex] },
          []
        ])
      }
      
      case "randomizeColors": {
        // Generate random gradient
        const numColors = Math.floor(Math.random() * 3) + 2
        const colors = Array.from({ length: numColors }, () => ({
          _tag: "RGB" as const,
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256)
        }))
        const randomGradient = { colors, direction: model.gradientDirection }
        
        // Update themes array with random gradient at custom slot
        gradientThemes[9] = randomGradient
        
        return Effect.succeed([
          { ...model, currentTheme: 9 },
          []
        ])
      }
      
      case "setTheme": {
        if (msg.index >= 0 && msg.index < gradientThemes.length) {
          return Effect.succeed([
            { ...model, currentTheme: msg.index },
            []
          ])
        }
        return Effect.succeed([model, []])
      }
      
      case "increaseScale": {
        return Effect.succeed([
          { ...model, scale: Math.min(3, model.scale + 1) },
          []
        ])
      }
      
      case "decreaseScale": {
        return Effect.succeed([
          { ...model, scale: Math.max(1, model.scale - 1) },
          []
        ])
      }
      
      case "nextFont": {
        const currentIndex = fonts.indexOf(model.font)
        const nextIndex = (currentIndex + 1) % fonts.length
        return Effect.succeed([
          { ...model, font: fonts[nextIndex] },
          []
        ])
      }
      
      case "prevFont": {
        const currentIndex = fonts.indexOf(model.font)
        const prevIndex = currentIndex === 0 ? fonts.length - 1 : currentIndex - 1
        return Effect.succeed([
          { ...model, font: fonts[prevIndex] },
          []
        ])
      }
    }
  },

  view: (model: LoadingModel) => {
    const currentGradient = gradientThemes[model.currentTheme]
    
    // Apply current direction to gradient
    const gradientWithDirection = {
      ...currentGradient,
      direction: model.gradientDirection
    }
    
    // Use animated gradient text for the logo
    const logo = largeAnimatedGradientText({
      text: "TUIX",
      gradient: gradientWithDirection,
      time: model.animationTime,
      animationSpeed: model.animationSpeed,
      spacing: model.spacing,
      font: model.font,
      scale: model.scale
    })
    
    // Progress bar
    const progressWidth = 40
    const filledWidth = Math.floor((model.progress / 100) * progressWidth)
    const emptyWidth = progressWidth - filledWidth
    
    const progressBar = hstack(
      styledText("█".repeat(filledWidth), style().foreground(Colors.green)),
      styledText("░".repeat(emptyWidth), style().foreground(Colors.gray))
    )
    
    // Loading spinner
    const spinner = model.isLoading 
      ? styledText(LOADING_FRAMES[model.loadingFrame], style().foreground(Colors.cyan))
      : styledText("✓", style().foreground(Colors.green))
    
    // Theme and settings info with selection indicators
    const fontIndex = fonts.indexOf(model.font)
    const fontName = fontIndex >= 0 ? fontNames[fontIndex] : 'Unknown'
    const themeName = themeNames[model.currentTheme] || 'Unknown'
    
    // Create selection indicators
    const selectedTheme = styledText(`[${themeName}]`, style().foreground(Colors.brightCyan).bold())
    const selectedFont = styledText(`[${fontName}]`, style().foreground(Colors.brightGreen).bold())
    
    const settingsText = hstack(
      text("Theme: "), selectedTheme,
      text(" | Font: "), selectedFont,
      text(` | Scale: ${model.scale}x | Dir: ${model.gradientDirection} | Speed: ${model.animationSpeed.toFixed(2)} | Spacing: ${model.spacing}`)
    )
    
    // Status message
    const styledMessage = styledText(model.message, style().foreground(Colors.white))
    
    // Enhanced controls help text with current values
    const controls = [
      `←/→: Font (${fontName})`,
      `↑/↓: Scale (${model.scale}x)`, 
      `j/k: Direction (${model.gradientDirection})`,
      `+/-: Speed (${model.animationSpeed.toFixed(2)})`,
      `w/s: Spacing (${model.spacing})`,
      `Tab: Theme (${themeName})`,
      "SPACE: Random",
      "r: Reset",
      "q: Quit"
    ]
    
    const controlsText = vstack(
      hstack(
        ...controls.slice(0, 5).map((ctrl, i) => [
          styledText(ctrl, style().foreground(Colors.gray)),
          i < 4 ? text(" • ") : text("")
        ]).flat()
      ),
      hstack(
        ...controls.slice(5).map((ctrl, i) => [
          styledText(ctrl, style().foreground(Colors.gray)),
          i < controls.slice(5).length - 1 ? text(" • ") : text("")
        ]).flat()
      )
    )
    
    // Layout
    return vstack(
      spacer(2),
      hstack(spacer(15), logo),
      spacer(2),
      hstack(
        spacer(15),
        styledText("A Modern TUI Framework for TypeScript", style().foreground(Colors.gray).italic())
      ),
      spacer(3),
      hstack(
        spacer(20),
        spinner,
        text(" "),
        progressBar,
        text(" "),
        styledText(`${Math.floor(model.progress)}%`, style().foreground(Colors.brightWhite))
      ),
      spacer(1),
      hstack(spacer(20), styledMessage),
      spacer(2),
      hstack(spacer(10), settingsText),
      spacer(2),
      hstack(spacer(10), controlsText)
    )
  },

  subscriptions: (model: LoadingModel) =>
    Effect.gen(function* (_) {
      const input = yield* _(InputService)
      
      // Animation timer
      const timer = Stream.repeatEffect(
        Effect.gen(function* () {
          yield* Effect.sleep(100)
          return { tag: "tick" } as LoadingMsg
        })
      )
      
      // Keyboard input
      const keyboard = input.mapKeys((key: KeyEvent) => {
        if (key.key === 'q' || (key.key === 'c' && key.ctrl)) {
          process.exit(0)
        }
        
        switch (key.key) {
          case 'left':
            return { tag: "prevFont" }
          case 'right':
            return { tag: "nextFont" }
          case 'up':
            return { tag: "increaseScale" }
          case 'down':
            return { tag: "decreaseScale" }
          case 'j':
          case 'J':
            return { tag: "changeDirection" }
          case 'k':
          case 'K':
            return { tag: "changeDirection" }
          case '+':
          case '=':
            return { tag: "increaseSpeed" }
          case '-':
          case '_':
            return { tag: "decreaseSpeed" }
          case 'w':
          case 'W':
            return { tag: "increaseSpacing" }
          case 's':
          case 'S':
            return { tag: "decreaseSpacing" }
          case 'tab':
            return { tag: "nextTheme" }
          case ' ':
            return { tag: "randomizeColors" }
          case 'r':
          case 'R':
            return { tag: "toggleLoading" }
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            const index = parseInt(key.key)
            return { tag: "setTheme", index }
          default:
            return null
        }
      })
      
      return Stream.merge(timer, keyboard)
    })
}

const config: AppOptions = {
  fps: 30,
  alternateScreen: true,
  mouse: false
}

console.log("Starting Loading Screen Demo...")

const program = runApp(loadingScreen, config).pipe(
  Effect.provide(LiveServices)
)

Effect.runPromise(program)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Loading screen error:", error)
    process.exit(1)
  })
