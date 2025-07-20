/**
 * Button Builder Functions
 * 
 * Simplified API for creating Button components
 */

import { Colors, style } from "@tuix/styling"
import { Borders } from "@tuix/styling"
import { styledBox } from "@tuix/layout"
import { View as ViewUtils } from "@tuix/core"
import type { View } from "@tuix/core"
import { Style } from "@tuix/styling"
import type { StyleProps } from "@tuix/styling"

const { text, styledText, hstack } = ViewUtils

export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  border?: string
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
 * Button variant factory - creates a function for a specific variant
 */
const createVariantButton = (variant: ButtonOptions['variant']) => 
  (label: string, onClick?: () => void): View => 
    Button(label, { variant, onClick })

/**
 * Pre-configured variant buttons
 */
export const PrimaryButton = createVariantButton('primary')
export const SecondaryButton = createVariantButton('secondary')
export const SuccessButton = createVariantButton('success')
export const DangerButton = createVariantButton('danger')
export const WarningButton = createVariantButton('warning')
export const InfoButton = createVariantButton('info')
export const GhostButton = createVariantButton('ghost')

/**
 * Button modifier factories - create functions with preset options
 */
export const IconButton = (icon: string, onClick?: () => void, options: Omit<ButtonOptions, 'icon'> = {}): View => 
  Button("", { ...options, icon, onClick })

export const SmallButton = (label: string, options: Omit<ButtonOptions, 'size'> = {}): View => 
  Button(label, { ...options, size: 'small' })

export const LargeButton = (label: string, options: Omit<ButtonOptions, 'size'> = {}): View => 
  Button(label, { ...options, size: 'large' })

export const DisabledButton = (label: string): View => 
  Button(label, { disabled: true })

export const LoadingButton = (label: string): View => 
  Button(label, { loading: true })

export const FullWidthButton = (label: string, options: Omit<ButtonOptions, 'fullWidth'> = {}): View => 
  Button(label, { ...options, fullWidth: true })

/**
 * Variant style configuration
 */
const VARIANT_STYLES = {
  primary: {
    background: Colors.blue,
    foreground: Colors.white,
    bold: true
  },
  secondary: {
    background: Colors.gray,
    foreground: Colors.white,
    bold: false
  },
  success: {
    background: Colors.green,
    foreground: Colors.white,
    bold: true
  },
  danger: {
    background: Colors.red,
    foreground: Colors.white,
    bold: true
  },
  warning: {
    background: Colors.yellow,
    foreground: Colors.black,
    bold: true
  },
  info: {
    background: Colors.cyan,
    foreground: Colors.white,
    bold: true
  },
  ghost: {
    background: undefined,
    foreground: Colors.blue,
    bold: false
  }
} as const

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

  const variantConfig = VARIANT_STYLES[variant as keyof typeof VARIANT_STYLES] || VARIANT_STYLES.primary
  
  const containerStyle = variantConfig.background 
    ? style().background(variantConfig.background).foreground(variantConfig.foreground)
    : style().foreground(variantConfig.foreground)
    
  const textStyle = variantConfig.bold
    ? style().foreground(variantConfig.foreground).bold()
    : style().foreground(variantConfig.foreground)
  
  return { containerStyle, textStyle }
}

/**
 * Size configuration
 */
const SIZE_STYLES = {
  small: { top: 0, right: 1, bottom: 0, left: 1 },
  medium: { top: 1, right: 2, bottom: 1, left: 2 },
  large: { top: 1, right: 3, bottom: 1, left: 3 }
} as const

/**
 * Get styles for button sizes
 */
function getSizeStyles(size: string) {
  const padding = SIZE_STYLES[size as keyof typeof SIZE_STYLES] || SIZE_STYLES.medium
  return { padding }
}

/**
 * Create a button group (multiple buttons arranged horizontally)
 */
export function ButtonGroup(buttons: View[], spacing: number = 1): View {
  // Create spacer based on spacing value
  const createSpacer = (width: number): View => {
    // Use proper spacing without string manipulation
    const spaces = Array(width).fill(' ').join('')
    return text(spaces)
  }
  
  const spacer = createSpacer(spacing)
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