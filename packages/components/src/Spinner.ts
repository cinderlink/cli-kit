/**
 * Spinner Component - Animated loading indicator
 * 
 * Inspired by spinner patterns from the Bubbletea ecosystem:
 * - Multiple animation styles (dots, line, arc, box, etc.)
 * - Customizable colors and speed
 * - Smooth frame-based animation
 * - No user interaction (purely visual)
 */

import { Effect, Option } from "effect"
import type { View, Cmd, AppServices } from "@tuix/core"
import { style, Colors, type Style } from "@tuix/styling"
import { View as ViewUtils } from "@tuix/core"

const { text, styledText } = ViewUtils
import {
  type UIComponent,
  type ComponentStyles,
  generateComponentId
} from "./base"

// =============================================================================
// Types
// =============================================================================

/**
 * Spinner model
 */
export interface SpinnerModel {
  readonly id: string
  readonly style: SpinnerStyle
  readonly frame: number
  readonly speed: number // milliseconds per frame
  readonly color: Style
  readonly label?: string
}

/**
 * Spinner animation styles
 */
export enum SpinnerStyle {
  Dots = "dots",
  Line = "line",
  Arc = "arc",
  Box = "box",
  Circle = "circle",
  Bounce = "bounce",
  Pulse = "pulse",
  Points = "points"
}

/**
 * Spinner messages
 */
export type SpinnerMsg = 
  | { readonly _tag: "tick" }

/**
 * Frame definitions for each spinner style
 */
const SPINNER_FRAMES: Record<SpinnerStyle, readonly string[]> = {
  [SpinnerStyle.Dots]: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  [SpinnerStyle.Line]: ["-", "\\", "|", "/"],
  [SpinnerStyle.Arc]: ["◜", "◠", "◝", "◞", "◡", "◟"],
  [SpinnerStyle.Box]: ["◰", "◳", "◲", "◱"],
  [SpinnerStyle.Circle]: ["◐", "◓", "◑", "◒"],
  [SpinnerStyle.Bounce]: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  [SpinnerStyle.Pulse]: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  [SpinnerStyle.Points]: ["∙∙∙", "●∙∙", "∙●∙", "∙∙●", "∙∙∙"]
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Creates a new spinner component
 */
export const spinner = (options: {
  style?: SpinnerStyle
  speed?: number
  color?: Style
  label?: string
} = {}): UIComponent<SpinnerModel, SpinnerMsg> => {
  const id = generateComponentId("spinner")
  const spinnerStyle = options.style ?? SpinnerStyle.Dots
  const speed = options.speed ?? 80
  const color = options.color ?? style().foreground(Colors.cyan)
  
  return {
    // Initialize the spinner
    init() {
      const model: SpinnerModel = {
        id,
        style: spinnerStyle,
        frame: 0,
        speed,
        color,
        label: options.label
      }
      
      // Start the animation timer
      const tickCmd = Effect.succeed({
        _tag: "tick" as const
      } as SpinnerMsg).pipe(
        Effect.delay(speed)
      )
      
      return Effect.succeed([model, [tickCmd]])
    },
    
    // Update spinner frame
    update(msg: SpinnerMsg, model: SpinnerModel) {
      switch (msg._tag) {
        case "tick": {
          const frames = SPINNER_FRAMES[model.style]
          const nextFrame = (model.frame + 1) % frames.length
          const newModel = { ...model, frame: nextFrame }
          
          // Schedule next tick
          const tickCmd = Effect.succeed({
            _tag: "tick" as const
          } as SpinnerMsg).pipe(
            Effect.delay(model.speed)
          )
          
          return Effect.succeed([newModel, [tickCmd]])
        }
        default:
          return Effect.succeed([model, []])
      }
    },
    
    // Render the spinner
    view(model: SpinnerModel) {
      const frames = SPINNER_FRAMES[model.style]
      // Add bounds checking
      const frameIndex = Math.min(model.frame, frames.length - 1)
      const currentFrame = frames[frameIndex] || frames[0] || "●"
      
      if (model.label) {
        return styledText(`${currentFrame} ${model.label}`, model.color)
      } else {
        return styledText(currentFrame, model.color)
      }
    },
    
    // Focus management (spinner is not focusable)
    focus() {
      return Effect.succeed({ tag: "none" as const })
    },
    
    blur() {
      return Effect.succeed({ tag: "none" as const })
    },
    
    focused() {
      return false
    },
    
    // Size management (spinner has minimal size)
    setSize() {
      return Effect.succeed(undefined)
    },
    
    getSize(model: SpinnerModel) {
      const frames = SPINNER_FRAMES[model.style]
      const maxWidth = Math.max(...frames.map(f => f.length))
      const width = model.label ? maxWidth + 1 + model.label.length : maxWidth
      return { width, height: 1 }
    }
  }
}

// =============================================================================
// Preset Spinners
// =============================================================================

/**
 * Creates a loading spinner with default style
 */
export const loadingSpinner = (label?: string) => 
  spinner({ 
    style: SpinnerStyle.Dots, 
    color: style().foreground(Colors.blue),
    label 
  })

/**
 * Creates a processing spinner
 */
export const processingSpinner = (label?: string) => 
  spinner({ 
    style: SpinnerStyle.Arc, 
    color: style().foreground(Colors.yellow),
    label 
  })

/**
 * Creates a saving spinner
 */
export const savingSpinner = (label?: string) => 
  spinner({ 
    style: SpinnerStyle.Line, 
    color: style().foreground(Colors.green),
    label 
  })

/**
 * Creates an error spinner
 */
export const errorSpinner = (label?: string) => 
  spinner({ 
    style: SpinnerStyle.Pulse, 
    color: style().foreground(Colors.red),
    speed: 100,
    label 
  })