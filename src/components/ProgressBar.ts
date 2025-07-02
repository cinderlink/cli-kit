/**
 * ProgressBar Component - Visual progress indicator with percentage
 * 
 * Inspired by progress bar patterns from the Bubbletea ecosystem:
 * - Determinate and indeterminate modes
 * - Customizable width and characters
 * - Smooth animations
 * - Percentage display
 * - Color gradients based on progress
 */

import { Effect, Option } from "effect"
import type { View, Cmd, AppServices } from "@/core/types.ts"
import { style, Colors, type Style } from "@/styling/index.ts"
import { text } from "@/core/view.ts"
import {
  type UIComponent,
  generateComponentId
} from "./base.ts"

// =============================================================================
// Types
// =============================================================================

/**
 * ProgressBar model
 */
export interface ProgressBarModel {
  readonly id: string
  readonly progress: number // 0.0 to 1.0
  readonly width: number
  readonly showPercentage: boolean
  readonly indeterminate: boolean
  readonly indeterminateFrame: number
  readonly style: ProgressBarStyle
}

/**
 * ProgressBar style configuration
 */
export interface ProgressBarStyle {
  readonly emptyChar: string
  readonly fillChar: string
  readonly leftBracket: string
  readonly rightBracket: string
  readonly indeterminateChar: string
  readonly colors: {
    readonly empty: Style
    readonly fill: Style
    readonly brackets: Style
    readonly percentage: Style
  }
}

/**
 * ProgressBar messages
 */
export type ProgressBarMsg = 
  | { readonly tag: "setProgress"; readonly progress: number }
  | { readonly tag: "animateIndeterminate" }

// =============================================================================
// Default Styles
// =============================================================================

export const defaultProgressBarStyle: ProgressBarStyle = {
  emptyChar: "░",
  fillChar: "█",
  leftBracket: "[",
  rightBracket: "]",
  indeterminateChar: "▓",
  colors: {
    empty: style(Colors.Gray),
    fill: style(Colors.Blue),
    brackets: style(Colors.White),
    percentage: style(Colors.White)
  }
}

export const fancyProgressBarStyle: ProgressBarStyle = {
  emptyChar: "─",
  fillChar: "━",
  leftBracket: "┤",
  rightBracket: "├",
  indeterminateChar: "◼",
  colors: {
    empty: style(Colors.Gray),
    fill: style(Colors.Cyan),
    brackets: style(Colors.BrightWhite),
    percentage: style(Colors.BrightCyan)
  }
}

export const asciiProgressBarStyle: ProgressBarStyle = {
  emptyChar: "-",
  fillChar: "#",
  leftBracket: "[",
  rightBracket: "]",
  indeterminateChar: "=",
  colors: {
    empty: style(Colors.Gray),
    fill: style(Colors.Green),
    brackets: style(Colors.White),
    percentage: style(Colors.Green)
  }
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Creates a new progress bar component
 */
export const progressBar = (options: {
  width?: number
  showPercentage?: boolean
  indeterminate?: boolean
  style?: ProgressBarStyle
  initialProgress?: number
} = {}): UIComponent<ProgressBarModel, ProgressBarMsg> => {
  const id = generateComponentId("progressbar")
  const width = options.width ?? 20
  const showPercentage = options.showPercentage ?? true
  const indeterminate = options.indeterminate ?? false
  const progressStyle = options.style ?? defaultProgressBarStyle
  const initialProgress = options.initialProgress ?? 0
  
  return {
    // Initialize the progress bar
    init() {
      const model: ProgressBarModel = {
        id,
        progress: initialProgress,
        width,
        showPercentage,
        indeterminate,
        indeterminateFrame: 0,
        style: progressStyle
      }
      
      const cmds = indeterminate ? [
        Effect.succeed({
          tag: "animateIndeterminate" as const
        } as ProgressBarMsg).pipe(
          Effect.delay(100)
        )
      ] : []
      
      return Effect.succeed([model, cmds])
    },
    
    // Update progress bar state
    update(msg: ProgressBarMsg, model: ProgressBarModel) {
      switch (msg.tag) {
        case "setProgress": {
          const newProgress = Math.max(0, Math.min(1, msg.progress))
          return Effect.succeed([{ ...model, progress: newProgress }, []])
        }
        
        case "animateIndeterminate": {
          const newFrame = (model.indeterminateFrame + 1) % (model.width * 2)
          const newModel = { ...model, indeterminateFrame: newFrame }
          
          // Schedule next animation frame
          const nextCmd = Effect.succeed({
            tag: "animateIndeterminate" as const
          } as ProgressBarMsg).pipe(
            Effect.delay(100)
          )
          
          return Effect.succeed([newModel, [nextCmd]])
        }
      }
    },
    
    // Render the progress bar
    view(model: ProgressBarModel) {
      const { width, progress, showPercentage, indeterminate, indeterminateFrame, style } = model
      
      let bar: string
      
      if (indeterminate) {
        // Create sliding animation for indeterminate progress
        const position = indeterminateFrame % (width * 2)
        const slidePosition = position < width ? position : width * 2 - position
        
        bar = Array.from({ length: width }, (_, i) => {
          const distance = Math.abs(i - slidePosition)
          if (distance <= 2) {
            return style.indeterminateChar
          }
          return style.emptyChar
        }).join("")
      } else {
        // Create determinate progress bar
        const filled = Math.floor(progress * width)
        const empty = width - filled
        
        bar = style.fillChar.repeat(filled) + style.emptyChar.repeat(empty)
      }
      
      // Build the complete progress bar
      const progressBar = [
        style.leftBracket,
        bar,
        style.rightBracket
      ].join("")
      
      // Add percentage if enabled
      let display = progressBar
      if (showPercentage && !indeterminate) {
        const percentage = Math.floor(progress * 100)
        display = `${progressBar} ${percentage}%`
      }
      
      // Apply colors based on progress
      let fillColor = style.colors.fill
      if (!indeterminate && progress >= 1.0) {
        fillColor = style(Colors.Green)
      } else if (!indeterminate && progress >= 0.8) {
        fillColor = style(Colors.Yellow)
      }
      
      return text(display, fillColor)
    },
    
    // Focus management (progress bar is not focusable)
    focus() {
      return Effect.succeed({ tag: "none" as const })
    },
    
    blur() {
      return Effect.succeed({ tag: "none" as const })
    },
    
    focused() {
      return false
    },
    
    // Size management
    setSize(width: number) {
      // Progress bar width can be adjusted
      return Effect.succeed(undefined)
    },
    
    getSize(model: ProgressBarModel) {
      const width = model.width + 2 // brackets
      const extraWidth = model.showPercentage ? 5 : 0 // " 100%"
      return { width: width + extraWidth, height: 1 }
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a simple progress bar with default settings
 */
export const simpleProgressBar = (width?: number) => 
  progressBar({ width, style: defaultProgressBarStyle })

/**
 * Creates a fancy progress bar with unicode characters
 */
export const fancyProgressBar = (width?: number) => 
  progressBar({ width, style: fancyProgressBarStyle })

/**
 * Creates an ASCII-only progress bar
 */
export const asciiProgressBar = (width?: number) => 
  progressBar({ width, style: asciiProgressBarStyle })

/**
 * Creates an indeterminate progress bar (loading animation)
 */
export const loadingBar = (width?: number) => 
  progressBar({ 
    width, 
    indeterminate: true,
    showPercentage: false,
    style: {
      ...defaultProgressBarStyle,
      indeterminateChar: "▓",
      colors: {
        ...defaultProgressBarStyle.colors,
        fill: style(Colors.Cyan)
      }
    }
  })

/**
 * Helper to create a progress update message
 */
export const setProgress = (progress: number): ProgressBarMsg => ({
  tag: "setProgress",
  progress
})