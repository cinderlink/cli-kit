/**
 * Button Component - JSX version with interactive states
 * 
 * A versatile button component with:
 * - Multiple variants (primary, secondary, success, danger, etc.)
 * - Size options (small, medium, large)
 * - Loading and disabled states
 * - Keyboard and mouse interaction
 * - Icon support
 * 
 * @example
 * ```tsx
 * import { Button } from 'tuix/components/forms/button'
 * 
 * function MyApp() {
 *   const loading = $state(false)
 *   
 *   return (
 *     <vstack>
 *       <Button onClick={() => console.log('Clicked!')}>
 *         Click Me
 *       </Button>
 *       
 *       <Button 
 *         variant="primary"
 *         loading={loading.value}
 *         onClick={async () => {
 *           loading.value = true
 *           await doSomething()
 *           loading.value = false
 *         }}
 *       >
 *         Submit
 *       </Button>
 *     </vstack>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import { $state, $derived } from '@core/update/reactivity/runes'
import type { View } from '@core/view/primitives/view'
import { text, hstack, vstack } from '@core/view/primitives/view'
import { style, Colors } from '@core/terminal/ansi/styles'

// Types
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonProps {
  children: string | JSX.Element
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: () => void | Promise<void>
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: string | JSX.Element
  iconPosition?: 'left' | 'right'
  autoFocus?: boolean
  className?: string
  type?: 'button' | 'submit' | 'cancel'
}

/**
 * Button Component
 */
export function Button(props: ButtonProps): JSX.Element {
  // Internal state
  const focused = $state(props.autoFocus || false)
  const pressed = $state(false)
  const hovering = $state(false)
  
  // Configuration
  const variant = props.variant || 'secondary'
  const size = props.size || 'medium'
  const disabled = props.disabled || props.loading
  
  // Derived styles
  const buttonStyle = $derived(() => {
    const baseStyle = getVariantStyle(variant)
    const sizeStyle = getSizeStyle(size)
    const stateStyle = getStateStyle(focused.value, pressed.value, hovering.value, disabled)
    
    return style({
      ...baseStyle,
      ...sizeStyle,
      ...stateStyle,
      width: props.fullWidth ? '100%' : undefined,
      cursor: disabled ? 'not-allowed' : 'pointer'
    })
  })
  
  // Event handlers
  async function handleClick() {
    if (disabled) return
    
    pressed.value = true
    
    try {
      await props.onClick?.()
    } finally {
      pressed.value = false
    }
  }
  
  function handleKeyPress(key: string) {
    if (disabled) return
    
    if (key === 'Enter' || key === ' ') {
      handleClick()
    }
  }
  
  // Render content
  function renderContent(): JSX.Element {
    const content = props.loading ? renderLoadingSpinner() : props.children
    
    if (!props.icon) {
      return typeof content === 'string' 
        ? jsx('text', { children: content })
        : content
    }
    
    const icon = typeof props.icon === 'string'
      ? jsx('text', { children: props.icon })
      : props.icon
      
    const elements = props.iconPosition === 'right' 
      ? [content, icon]
      : [icon, content]
      
    return jsx('hstack', {
      gap: 1,
      children: elements
    })
  }
  
  function renderLoadingSpinner(): JSX.Element {
    return jsx('spinner', {
      type: 'dots',
      size: 'small'
    })
  }
  
  // Main render
  return jsx('interactive', {
    onKeyPress: handleKeyPress,
    onMouseEnter: () => { hovering.value = true },
    onMouseLeave: () => { hovering.value = false },
    onFocus: () => {
      focused.value = true
      props.onFocus?.()
    },
    onBlur: () => {
      focused.value = false
      props.onBlur?.()
    },
    onClick: handleClick,
    focusable: !disabled,
    className: props.className,
    children: jsx('box', {
      style: buttonStyle.value,
      children: renderContent()
    })
  })
}

// Style helpers
function getVariantStyle(variant: ButtonVariant) {
  const variants = {
    primary: {
      background: Colors.blue,
      color: Colors.white,
      borderColor: Colors.blue
    },
    secondary: {
      background: Colors.gray,
      color: Colors.white,
      borderColor: Colors.gray
    },
    success: {
      background: Colors.green,
      color: Colors.white,
      borderColor: Colors.green
    },
    danger: {
      background: Colors.red,
      color: Colors.white,
      borderColor: Colors.red
    },
    warning: {
      background: Colors.yellow,
      color: Colors.black,
      borderColor: Colors.yellow
    },
    info: {
      background: Colors.cyan,
      color: Colors.white,
      borderColor: Colors.cyan
    },
    ghost: {
      background: 'transparent',
      color: Colors.white,
      borderColor: Colors.gray
    }
  }
  
  return variants[variant]
}

function getSizeStyle(size: ButtonSize) {
  const sizes = {
    small: {
      padding: { horizontal: 2, vertical: 0 },
      minHeight: 1
    },
    medium: {
      padding: { horizontal: 3, vertical: 1 },
      minHeight: 3
    },
    large: {
      padding: { horizontal: 4, vertical: 2 },
      minHeight: 5
    }
  }
  
  return sizes[size]
}

function getStateStyle(focused: boolean, pressed: boolean, hovering: boolean, disabled: boolean) {
  const stateStyle: any = {
    border: 'single',
    opacity: disabled ? 0.5 : 1
  }
  
  if (pressed) {
    stateStyle.transform = 'scale(0.95)'
  }
  
  if (focused) {
    stateStyle.borderStyle = 'double'
    stateStyle.borderColor = Colors.white
  }
  
  if (hovering && !disabled) {
    stateStyle.brightness = 1.2
  }
  
  return stateStyle
}

// Factory functions
export const button = (props: ButtonProps) => <Button {...props} />
export const primaryButton = (props: ButtonProps) => <Button {...props} variant="primary" />
export const secondaryButton = (props: ButtonProps) => <Button {...props} variant="secondary" />
export const successButton = (props: ButtonProps) => <Button {...props} variant="success" />
export const dangerButton = (props: ButtonProps) => <Button {...props} variant="danger" />
export const warningButton = (props: ButtonProps) => <Button {...props} variant="warning" />
export const infoButton = (props: ButtonProps) => <Button {...props} variant="info" />
export const ghostButton = (props: ButtonProps) => <Button {...props} variant="ghost" />

// Common button groups
export function ButtonGroup({ children }: { children: JSX.Element[] }): JSX.Element {
  return jsx('hstack', {
    gap: 2,
    children
  })
}

export function SubmitCancelButtons(props: {
  onSubmit: () => void
  onCancel: () => void
  submitText?: string
  cancelText?: string
  loading?: boolean
}): JSX.Element {
  return (
    <ButtonGroup>
      <Button 
        variant="primary" 
        onClick={props.onSubmit}
        loading={props.loading}
      >
        {props.submitText || 'Submit'}
      </Button>
      <Button 
        variant="secondary" 
        onClick={props.onCancel}
        disabled={props.loading}
      >
        {props.cancelText || 'Cancel'}
      </Button>
    </ButtonGroup>
  )
}