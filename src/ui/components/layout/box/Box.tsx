/**
 * Box Component - JSX version for flexible container layouts
 *
 * A fundamental layout component that provides:
 * - Flexible box model with padding and margins
 * - Border styles and colors
 * - Background colors and gradients
 * - Alignment and justification
 * - Responsive sizing
 *
 * @example
 * ```tsx
 * import { Box } from 'tuix/components/layout/box'
 *
 * function MyLayout() {
 *   return (
 *     <Box
 *       padding={2}
 *       border="rounded"
 *       borderColor="blue"
 *       background="gray"
 *     >
 *       <text>Content inside a box</text>
 *     </Box>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import { $state, $derived } from '@core/update/reactivity/runes'
import type { View } from '@core/view/primitives/view'
import { style, Colors, type Style } from '@core/terminal/ansi/styles'
import type { BorderStyle } from '@core/terminal/ansi/styles/borders'

// Types
export interface BoxProps {
  children?: JSX.Element | JSX.Element[]

  // Sizing
  width?: number | string
  height?: number | string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number

  // Spacing
  padding?:
    | number
    | {
        top?: number
        right?: number
        bottom?: number
        left?: number
        horizontal?: number
        vertical?: number
      }
  margin?:
    | number
    | {
        top?: number
        right?: number
        bottom?: number
        left?: number
        horizontal?: number
        vertical?: number
      }

  // Border
  border?: BorderStyle | boolean
  borderColor?: string
  borderStyle?: 'single' | 'double' | 'rounded' | 'thick'

  // Background
  background?: string
  gradient?: { from: string; to: string; direction?: 'horizontal' | 'vertical' | 'diagonal' }

  // Layout
  align?: 'left' | 'center' | 'right' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  direction?: 'horizontal' | 'vertical'
  gap?: number
  wrap?: boolean

  // Behavior
  scrollable?: boolean
  focusable?: boolean
  onClick?: () => void
  onFocus?: () => void
  onBlur?: () => void

  // Styling
  style?: Style
  className?: string
  hidden?: boolean
  opacity?: number
}

/**
 * Box Component
 */
export function Box(props: BoxProps): JSX.Element {
  // Internal state
  const focused = $state(false)
  const hovering = $state(false)

  // Computed style
  const boxStyle = $derived(() => {
    const baseStyle: Style = {
      ...props.style,
    }

    // Sizing
    if (props.width !== undefined) baseStyle.width = props.width
    if (props.height !== undefined) baseStyle.height = props.height
    if (props.minWidth !== undefined) baseStyle.minWidth = props.minWidth
    if (props.minHeight !== undefined) baseStyle.minHeight = props.minHeight
    if (props.maxWidth !== undefined) baseStyle.maxWidth = props.maxWidth
    if (props.maxHeight !== undefined) baseStyle.maxHeight = props.maxHeight

    // Padding
    if (props.padding !== undefined) {
      if (typeof props.padding === 'number') {
        baseStyle.padding = props.padding
      } else {
        baseStyle.padding = props.padding
      }
    }

    // Margin
    if (props.margin !== undefined) {
      if (typeof props.margin === 'number') {
        baseStyle.margin = props.margin
      } else {
        baseStyle.margin = props.margin
      }
    }

    // Border
    if (props.border) {
      baseStyle.border = props.border === true ? 'single' : props.border
    }
    if (props.borderColor) baseStyle.borderColor = props.borderColor
    if (props.borderStyle) baseStyle.borderStyle = props.borderStyle

    // Background
    if (props.background) baseStyle.background = props.background
    if (props.gradient) {
      baseStyle.gradient = props.gradient
    }

    // Layout
    if (props.align) baseStyle.align = props.align
    if (props.justify) baseStyle.justify = props.justify
    if (props.gap !== undefined) baseStyle.gap = props.gap
    if (props.wrap !== undefined) baseStyle.wrap = props.wrap

    // Visibility
    if (props.hidden) baseStyle.display = 'none'
    if (props.opacity !== undefined) baseStyle.opacity = props.opacity

    // State styles
    if (focused.value && props.focusable) {
      baseStyle.borderColor = Colors.blue
      baseStyle.borderStyle = 'double'
    }

    if (hovering.value && props.onClick) {
      baseStyle.brightness = 1.1
    }

    return style(baseStyle)
  })

  // Render container
  const Container = props.direction === 'horizontal' ? 'hstack' : 'vstack'

  if (props.focusable || props.onClick) {
    return jsx('interactive', {
      focusable: props.focusable,
      onClick: props.onClick,
      onFocus: () => {
        focused.value = true
        props.onFocus?.()
      },
      onBlur: () => {
        focused.value = false
        props.onBlur?.()
      },
      onMouseEnter: () => {
        hovering.value = true
      },
      onMouseLeave: () => {
        hovering.value = false
      },
      className: props.className,
      children: jsx(Container, {
        style: boxStyle.value,
        gap: props.gap,
        wrap: props.wrap,
        children: props.children,
      }),
    })
  }

  return jsx(Container, {
    style: boxStyle.value,
    gap: props.gap,
    wrap: props.wrap,
    className: props.className,
    children: props.children,
  })
}

// Factory functions for common box patterns
export const box = (props: BoxProps) => <Box {...props} />

export const card = (props: BoxProps) => (
  <Box
    padding={2}
    border="rounded"
    borderColor={Colors.gray}
    background={Colors.black}
    {...props}
  />
)

export const panel = (props: BoxProps & { title?: string }) => {
  const { title, children, ...boxProps } = props

  return (
    <Box border="single" borderColor={Colors.gray} {...boxProps}>
      {title && (
        <Box padding={{ horizontal: 1 }} borderColor={Colors.gray} margin={{ bottom: 1 }}>
          <text bold>{title}</text>
        </Box>
      )}
      {children}
    </Box>
  )
}

export const centerBox = (props: BoxProps) => (
  <Box align="center" justify="center" width="100%" height="100%" {...props} />
)

export const scrollBox = (props: BoxProps) => (
  <Box scrollable border="single" borderColor={Colors.gray} {...props} />
)
