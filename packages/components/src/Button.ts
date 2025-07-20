/**
 * Button Component - Clickable button with keyboard and mouse support
 * 
 * Inspired by interactive button patterns from Bubbletea ecosystem:
 * - Keyboard activation (Enter/Space)
 * - Mouse click support
 * - Focus states
 * - Multiple style variants
 * - Disabled state
 */

import { Effect, Option } from "effect"
import type { View, Cmd, AppServices, KeyEvent, MouseEvent } from "@tuix/core"
import { KeyUtils } from "@tuix/core"
import { style, Colors, Borders, HorizontalAlign, renderStyledSync, type Style } from "@tuix/styling"
import {
  type UIComponent,
  type ComponentStyles,
  type Focusable,
  type Sized,
  type Disableable,
  type KeyMap,
  keyBinding,
  matchKeyBinding,
  generateComponentId,
  createDefaultStyles
} from "./base"
import { stringWidth } from "@tuix/core"

// =============================================================================
// Types
// =============================================================================

/**
 * Button model
 */
export interface ButtonModel extends Focusable, Sized, Disableable {
  readonly id: string
  readonly label: string
  readonly variant: ButtonVariant
  readonly pressed: boolean
  readonly hovered: boolean
}

/**
 * Button style variants
 */
export enum ButtonVariant {
  Primary = "primary",
  Secondary = "secondary",
  Success = "success",
  Danger = "danger",
  Warning = "warning",
  Ghost = "ghost"
}

/**
 * Button messages
 */
export type ButtonMsg =
  | { _tag: "Press" }
  | { _tag: "Release" }
  | { _tag: "Click" }
  | { _tag: "MouseEnter" }
  | { _tag: "MouseLeave" }
  | { _tag: "Focus" }
  | { _tag: "Blur" }
  | { _tag: "SetLabel"; label: string }
  | { _tag: "SetDisabled"; disabled: boolean }

/**
 * Button configuration options
 */
export interface ButtonOptions {
  readonly id?: string
  readonly label?: string
  readonly variant?: ButtonVariant
  readonly width?: number
  readonly disabled?: boolean
  readonly styles?: Partial<ButtonStyles>
  readonly onClick?: () => void
}

/**
 * Button specific styles
 */
export interface ButtonStyles extends ComponentStyles {
  readonly pressed: Style
  readonly hovered: Style
  
  // Variant styles
  readonly primary: Style
  readonly secondary: Style
  readonly success: Style
  readonly danger: Style
  readonly warning: Style
  readonly ghost: Style
}

// =============================================================================
// Key Bindings
// =============================================================================

const createKeyMap = (): KeyMap<ButtonMsg> => ({
  select: keyBinding(["enter", " "], ["Enter", "Press button"], { _tag: "Click" })
})

// =============================================================================
// Button Component
// =============================================================================

export class Button implements UIComponent<ButtonModel, ButtonMsg> {
  private keyMap: KeyMap<ButtonMsg>
  private styles: ButtonStyles
  private onClick?: () => void
  private label: string
  private variant: ButtonVariant
  private width?: number
  
  constructor(options: ButtonOptions = {}) {
    this.keyMap = createKeyMap()
    this.styles = this.createStyles(options.styles)
    this.onClick = options.onClick
    this.label = options.label || "Button"
    this.variant = options.variant || ButtonVariant.Primary
    this.width = options.width
  }
  
  private createStyles(overrides?: Partial<ButtonStyles>): ButtonStyles {
    const base = createDefaultStyles()
    
    // Create base button style to reduce repetition
    const baseButtonStyle = style()
      .padding(0, 2)
      .border(Borders.Rounded)
      .align(HorizontalAlign.Center)
    
    return {
      ...base,
      base: baseButtonStyle,
      
      focused: baseButtonStyle
        .bold()
        .foreground(Colors.black)
        .background(Colors.white),
      
      pressed: baseButtonStyle
        .bold()
        .faint(),
      
      hovered: baseButtonStyle
        .bold()
        .foreground(Colors.white)
        .background(Colors.gray),
      
      disabled: baseButtonStyle
        .faint(),
      
      // Variant styles - colors only
      primary: style()
        .foreground(Colors.white)
        .background(Colors.blue),
      
      secondary: style()
        .foreground(Colors.white)
        .background(Colors.gray),
      
      success: style()
        .foreground(Colors.white)
        .background(Colors.green),
      
      danger: style()
        .foreground(Colors.white)
        .background(Colors.red),
      
      warning: style()
        .foreground(Colors.black)
        .background(Colors.yellow),
      
      ghost: style()
        .foreground(Colors.blue),
      
      ...overrides
    }
  }
  
  init(): Effect.Effect<[ButtonModel, ReadonlyArray<Cmd<ButtonMsg>>], never, AppServices> {
    return Effect.succeed([
      {
        id: generateComponentId("button"),
        label: this.label,
        variant: this.variant,
        focused: false,
        disabled: false,
        pressed: false,
        hovered: false,
        width: this.width || 0 // Auto-size based on label
      },
      []
    ])
  }
  
  update(msg: ButtonMsg, model: ButtonModel): Effect.Effect<[ButtonModel, ReadonlyArray<Cmd<ButtonMsg>>], never, AppServices> {
    return Effect.succeed((() => {
      switch (msg._tag) {
        case "Press":
          if (model.disabled) return [model, []]
          return [{ ...model, pressed: true }, []]
        
        case "Release":
          if (model.disabled) return [model, []]
          return [{ ...model, pressed: false }, []]
        
        case "Click":
          if (model.disabled) return [model, []]
          
          // Return command for onClick handler to avoid side effects in update
          const clickCmd: Cmd<ButtonMsg> = Effect.gen(function* () {
            // In a real implementation, this would emit a system message
            // For now, we avoid side effects by deferring the onClick call
            return { _tag: "Release" } as ButtonMsg
          })
          
          // Simulate press/release for visual feedback
          return [
            { ...model, pressed: false },
            this.onClick ? [clickCmd] : []
          ]
        
        case "MouseEnter":
          if (model.disabled) return [model, []]
          return [{ ...model, hovered: true }, []]
        
        case "MouseLeave":
          return [{ ...model, hovered: false, pressed: false }, []]
        
        case "Focus":
          return [{ ...model, focused: true }, []]
        
        case "Blur":
          return [{ ...model, focused: false }, []]
        
        case "SetLabel":
          return [{ ...model, label: msg.label }, []]
        
        case "SetDisabled":
          return [
            { 
              ...model, 
              disabled: msg.disabled,
              pressed: false,
              hovered: false
            }, 
            []
          ]
        
        default:
          return [model, []]
      }
    })())
  }
  
  view(model: ButtonModel): View {
    // Determine which style to use
    let buttonStyle = this.styles.base
    
    // Apply variant style
    const variantStyle = this.styles[model.variant]
    if (variantStyle) {
      buttonStyle = buttonStyle.merge(variantStyle)
    }
    
    // Apply state styles (in priority order)
    if (model.disabled) {
      buttonStyle = buttonStyle.merge(this.styles.disabled)
    } else if (model.pressed) {
      buttonStyle = buttonStyle.merge(this.styles.pressed)
    } else if (model.focused) {
      buttonStyle = buttonStyle.merge(this.styles.focused)
    } else if (model.hovered) {
      buttonStyle = buttonStyle.merge(this.styles.hovered)
    }
    
    // Calculate width using proper Unicode-aware string width
    const labelWidth = stringWidth(model.label)
    const paddingWidth = 4 // 2 chars padding on each side
    const minWidth = model.width || labelWidth + paddingWidth
    
    // Apply padding to center the label
    const totalPadding = Math.max(0, minWidth - labelWidth)
    const leftPadding = Math.floor(totalPadding / 2)
    const rightPadding = totalPadding - leftPadding
    const paddedLabel = ' '.repeat(leftPadding) + model.label + ' '.repeat(rightPadding)
    
    // Apply minimum width to style
    buttonStyle = buttonStyle.minWidth(minWidth)
    
    // Render the button
    const content = renderStyledSync(paddedLabel, buttonStyle)
    
    return {
      render: () => Effect.succeed(content),
      width: minWidth,
      height: 3 // Border + content + border
    }
  }
  
  // UIComponent interface methods
  focus(): Effect.Effect<Cmd<ButtonMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Focus" as const }))
  }
  
  blur(): Effect.Effect<Cmd<ButtonMsg>, never, never> {
    return Effect.succeed(Effect.succeed({ _tag: "Blur" as const }))
  }
  
  focused(model: ButtonModel): boolean {
    return model.focused
  }
  
  setSize(width: number): Effect.Effect<void, never, never> {
    // Size is handled in the model
    return Effect.void
  }
  
  getSize(model: ButtonModel): { width: number } {
    return { width: model.width || stringWidth(model.label) + 4 }
  }
  
  handleKey(key: KeyEvent, model: ButtonModel): ButtonMsg | null {
    if (model.disabled) return null
    
    // Check key bindings
    const boundMsg = matchKeyBinding(key, this.keyMap)
    if (boundMsg) return boundMsg
    
    return null
  }
  
  handleMouse(mouse: MouseEvent, model: ButtonModel): ButtonMsg | null {
    if (model.disabled) return null
    
    switch (mouse.type) {
      case "press":
        if (mouse.button === "left") {
          return { _tag: "Press" }
        }
        break
      
      case "release":
        if (mouse.button === "left" && model.pressed) {
          return { _tag: "Click" }
        }
        break
      
      case "motion":
        // Check if mouse is over button (would need bounds checking)
        // For now, we'll handle this at the application level
        break
    }
    
    return null
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new Button component
 */
export const button = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label: options?.label ?? label
  })
}

/**
 * Create a primary button
 */
export const primaryButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Primary
  })
}

/**
 * Create a secondary button
 */
export const secondaryButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Secondary
  })
}

/**
 * Create a success button
 */
export const successButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Success
  })
}

/**
 * Create a danger button
 */
export const dangerButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Danger
  })
}

/**
 * Create a warning button
 */
export const warningButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Warning
  })
}

/**
 * Create a ghost button (no background)
 */
export const ghostButton = (label: string, options?: ButtonOptions): Button => {
  return new Button({
    ...options,
    label,
    variant: ButtonVariant.Ghost
  })
}