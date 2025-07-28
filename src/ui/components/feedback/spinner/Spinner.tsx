/**
 * Spinner Component - JSX version for loading indicators
 *
 * Animated loading indicators with multiple styles:
 * - Various spinner types (dots, line, circle, etc.)
 * - Customizable colors and sizes
 * - Optional loading text
 * - Smooth animations
 *
 * @example
 * ```tsx
 * import { Spinner } from 'tuix/components/feedback/spinner'
 *
 * function LoadingScreen() {
 *   return (
 *     <Center>
 *       <Spinner type="dots" color="blue" />
 *       <Text>Loading data...</Text>
 *     </Center>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import { $state, $effect } from '@core/update/reactivity/runes'
import { text } from '@core/view/primitives/view'
import { style, Colors } from '@core/terminal/ansi/styles'

// Types
export type SpinnerType = 'dots' | 'line' | 'circle' | 'bounce' | 'pulse' | 'wave'
export type SpinnerSize = 'small' | 'medium' | 'large'

export interface SpinnerProps {
  type?: SpinnerType
  color?: string
  size?: SpinnerSize
  text?: string
  speed?: number
  className?: string
}

// Spinner frames for different types
const SPINNER_FRAMES = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  circle: ['◐', '◓', '◑', '◒'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  pulse: ['·', '•', '●', '•'],
  wave: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
}

/**
 * Spinner Component
 */
export function Spinner(props: SpinnerProps): JSX.Element {
  // Configuration
  const type = props.type || 'dots'
  const color = props.color || Colors.blue
  const size = props.size || 'medium'
  const speed = props.speed || 80

  // State
  const frameIndex = $state(0)
  const frames = SPINNER_FRAMES[type]

  // Animation effect
  $effect(() => {
    const interval = setInterval(() => {
      frameIndex.value = (frameIndex.value + 1) % frames.length
    }, speed)

    return () => clearInterval(interval)
  })

  // Size styles
  const sizeStyles = {
    small: { fontSize: 12 },
    medium: { fontSize: 16 },
    large: { fontSize: 24 },
  }

  // Render
  const spinnerStyle = style({
    color,
    ...sizeStyles[size],
  })

  if (props.text) {
    return jsx('hstack', {
      gap: 1,
      className: props.className,
      children: [
        jsx('text', {
          style: spinnerStyle,
          children: frames[frameIndex.value],
        }),
        jsx('text', {
          children: props.text,
        }),
      ],
    })
  }

  return jsx('text', {
    style: spinnerStyle,
    className: props.className,
    children: frames[frameIndex.value],
  })
}

// Factory functions for common spinner patterns
export const spinner = (props: SpinnerProps) => <Spinner {...props} />

export const loadingSpinner = (props: Omit<SpinnerProps, 'text'>) => (
  <Spinner {...props} text="Loading..." />
)

export const savingSpinner = (props: Omit<SpinnerProps, 'text'>) => (
  <Spinner {...props} text="Saving..." />
)

export const processingSpinner = (props: Omit<SpinnerProps, 'text'>) => (
  <Spinner {...props} text="Processing..." />
)

// Spinner with custom message
export function SpinnerWithMessage(
  props: SpinnerProps & {
    message: string
    messageColor?: string
  }
): JSX.Element {
  const { message, messageColor = Colors.gray, ...spinnerProps } = props

  return jsx('vstack', {
    align: 'center',
    gap: 1,
    children: [
      <Spinner {...spinnerProps} />,
      jsx('text', {
        style: style({ color: messageColor }),
        children: message,
      }),
    ],
  })
}

// Full-screen loading overlay
export function LoadingOverlay(props: {
  loading: boolean
  message?: string
  spinnerProps?: SpinnerProps
  children?: JSX.Element
}): JSX.Element {
  if (!props.loading) {
    return props.children || jsx('text', { children: '' })
  }

  return jsx('box', {
    style: style({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    children: jsx('vstack', {
      align: 'center',
      gap: 2,
      children: [
        <Spinner size="large" {...props.spinnerProps} />,
        props.message &&
          jsx('text', {
            style: style({ color: Colors.white }),
            children: props.message,
          }),
      ].filter(Boolean),
    }),
  })
}
