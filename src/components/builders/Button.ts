/**
 * Button Builder Functions
 * 
 * Simplified API for creating Button components
 */

import { Colors, style } from "../../styling/index"
import { Borders } from "../../styling/borders"
import { styledBox } from "../../layout/box"
import { text, styledText, hstack } from "../../core/view"
import type { View } from "../../core/types"
import type { BorderStyle } from "../../styling/types"
import type { StyleProps } from "../../styling/types"

export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  border?: BorderStyle
  icon?: string
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Create a button with text
 */
export function Button(label: string, options: ButtonOptions = {}): View {
  const {
    variant = 'primary',
    size = 'medium',
    disabled = false,
    border = Borders.Rounded,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    onClick,
    className
  } = options

  // Get variant styles
  const variantStyles = getVariantStyles(variant, disabled)
  
  // Get size styles
  const sizeStyles = getSizeStyles(size)
  
  // Build button content
  let buttonContent: View
  
  if (loading) {
    buttonContent = styledText("⟳ Loading...", variantStyles.textStyle)
  } else if (icon) {
    const iconView = styledText(icon, variantStyles.textStyle)
    const textView = styledText(label, variantStyles.textStyle)
    
    buttonContent = iconPosition === 'left' 
      ? hstack(iconView, text(" "), textView)
      : hstack(textView, text(" "), iconView)
  } else {
    buttonContent = styledText(label, variantStyles.textStyle)
  }
  
  // Apply button styling
  return styledBox(buttonContent, {
    border,
    padding: sizeStyles.padding,
    style: variantStyles.containerStyle,
    className,
    onClick: disabled ? undefined : onClick
  })
}

/**
 * Create a primary button (default styling)
 */
export function PrimaryButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'primary', onClick })
}

/**
 * Create a secondary button
 */
export function SecondaryButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'secondary', onClick })
}

/**
 * Create a success button (green)
 */
export function SuccessButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'success', onClick })
}

/**
 * Create a danger button (red)
 */
export function DangerButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'danger', onClick })
}

/**
 * Create a warning button (yellow)
 */
export function WarningButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'warning', onClick })
}

/**
 * Create an info button (blue)
 */
export function InfoButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'info', onClick })
}

/**
 * Create a ghost button (transparent background)
 */
export function GhostButton(label: string, onClick?: () => void): View {
  return Button(label, { variant: 'ghost', onClick })
}

/**
 * Create an icon button
 */
export function IconButton(icon: string, onClick?: () => void, options: Omit<ButtonOptions, 'icon'> = {}): View {
  return Button("", { ...options, icon, onClick })
}

/**
 * Create a small button
 */
export function SmallButton(label: string, options: Omit<ButtonOptions, 'size'> = {}): View {
  return Button(label, { ...options, size: 'small' })
}

/**
 * Create a large button
 */
export function LargeButton(label: string, options: Omit<ButtonOptions, 'size'> = {}): View {
  return Button(label, { ...options, size: 'large' })
}

/**
 * Create a disabled button
 */
export function DisabledButton(label: string): View {
  return Button(label, { disabled: true })
}

/**
 * Create a loading button
 */
export function LoadingButton(label: string): View {
  return Button(label, { loading: true })
}

/**
 * Create a full-width button
 */
export function FullWidthButton(label: string, options: Omit<ButtonOptions, 'fullWidth'> = {}): View {
  return Button(label, { ...options, fullWidth: true })
}

/**
 * Get styles for button variants
 */
function getVariantStyles(variant: string, disabled: boolean) {
  if (disabled) {
    return {
      containerStyle: style().background(Colors.gray).foreground(Colors.darkGray),
      textStyle: style().foreground(Colors.darkGray)
    }
  }

  switch (variant) {
    case 'primary':
      return {
        containerStyle: style().background(Colors.blue).foreground(Colors.white),
        textStyle: style().foreground(Colors.white).bold()
      }
      
    case 'secondary':
      return {
        containerStyle: style().background(Colors.gray).foreground(Colors.white),
        textStyle: style().foreground(Colors.white)
      }
      
    case 'success':
      return {
        containerStyle: style().background(Colors.green).foreground(Colors.white),
        textStyle: style().foreground(Colors.white).bold()
      }
      
    case 'danger':
      return {
        containerStyle: style().background(Colors.red).foreground(Colors.white),
        textStyle: style().foreground(Colors.white).bold()
      }
      
    case 'warning':
      return {
        containerStyle: style().background(Colors.yellow).foreground(Colors.black),
        textStyle: style().foreground(Colors.black).bold()
      }
      
    case 'info':
      return {
        containerStyle: style().background(Colors.cyan).foreground(Colors.white),
        textStyle: style().foreground(Colors.white).bold()
      }
      
    case 'ghost':
      return {
        containerStyle: style().foreground(Colors.blue),
        textStyle: style().foreground(Colors.blue)
      }
      
    default:
      return {
        containerStyle: style().background(Colors.blue).foreground(Colors.white),
        textStyle: style().foreground(Colors.white).bold()
      }
  }
}

/**
 * Get styles for button sizes
 */
function getSizeStyles(size: string) {
  switch (size) {
    case 'small':
      return {
        padding: { top: 0, right: 1, bottom: 0, left: 1 }
      }
      
    case 'medium':
      return {
        padding: { top: 1, right: 2, bottom: 1, left: 2 }
      }
      
    case 'large':
      return {
        padding: { top: 1, right: 3, bottom: 1, left: 3 }
      }
      
    default:
      return {
        padding: { top: 1, right: 2, bottom: 1, left: 2 }
      }
  }
}

/**
 * Create a button group (multiple buttons arranged horizontally)
 */
export function ButtonGroup(buttons: View[], spacing: number = 1): View {
  const spacer = text(" ".repeat(spacing))
  const spacedButtons: View[] = []
  
  buttons.forEach((button, index) => {
    spacedButtons.push(button)
    if (index < buttons.length - 1) {
      spacedButtons.push(spacer)
    }
  })
  
  return hstack(...spacedButtons)
}

/**
 * Create a submit/cancel button pair
 */
export function SubmitCancelButtons(
  onSubmit?: () => void,
  onCancel?: () => void,
  submitLabel: string = "Submit",
  cancelLabel: string = "Cancel"
): View {
  return ButtonGroup([
    PrimaryButton(submitLabel, onSubmit),
    SecondaryButton(cancelLabel, onCancel)
  ])
}

/**
 * Create a yes/no button pair
 */
export function YesNoButtons(
  onYes?: () => void,
  onNo?: () => void
): View {
  return ButtonGroup([
    SuccessButton("Yes", onYes),
    DangerButton("No", onNo)
  ])
}