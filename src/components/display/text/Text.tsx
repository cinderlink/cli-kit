/**
 * Text Component - JSX version for styled text display
 * 
 * Rich text display with:
 * - Multiple color options
 * - Text styles (bold, italic, underline, etc.)
 * - Alignment options
 * - Truncation and wrapping
 * - Gradients and animations
 * 
 * @example
 * ```tsx
 * import { Text, Heading, Code } from 'tuix/components/display/text'
 * 
 * function MyComponent() {
 *   return (
 *     <vstack>
 *       <Heading level={1}>Welcome!</Heading>
 *       
 *       <Text color="blue" bold>
 *         Important message
 *       </Text>
 *       
 *       <Code language="typescript">
 *         const greeting = "Hello, World!"
 *       </Code>
 *     </vstack>
 *   )
 * }
 * ```
 */

import { jsx } from '../../../jsx'
import { $state, $derived } from '../../../reactivity/runes'
import { style, Colors, type Style } from '../../../styling'
import { stringWidth } from '../../../utils/string-width'

// Types
export interface TextProps {
  children: string | number | boolean
  
  // Colors
  color?: string
  background?: string
  gradient?: { from: string; to: string; direction?: 'horizontal' | 'vertical' }
  
  // Styles
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  dim?: boolean
  bright?: boolean
  inverse?: boolean
  
  // Layout
  align?: 'left' | 'center' | 'right'
  width?: number
  wrap?: boolean | 'word' | 'char'
  truncate?: boolean | number
  ellipsis?: string
  
  // Effects
  blink?: boolean
  rainbow?: boolean
  pulse?: boolean
  
  // Behavior
  selectable?: boolean
  copyable?: boolean
  
  className?: string
  style?: Style
}

/**
 * Text Component
 */
export function Text(props: TextProps): JSX.Element {
  // Convert children to string
  const content = String(props.children)
  
  // Computed style
  const textStyle = $derived(() => {
    const baseStyle: Style = {
      ...props.style
    }
    
    // Colors
    if (props.color) baseStyle.color = props.color
    if (props.background) baseStyle.background = props.background
    if (props.gradient) baseStyle.gradient = props.gradient
    
    // Text styles
    if (props.bold) baseStyle.bold = true
    if (props.italic) baseStyle.italic = true
    if (props.underline) baseStyle.underline = true
    if (props.strikethrough) baseStyle.strikethrough = true
    if (props.dim) baseStyle.dim = true
    if (props.bright) baseStyle.bright = true
    if (props.inverse) baseStyle.inverse = true
    
    // Effects
    if (props.blink) baseStyle.blink = true
    
    // Layout
    if (props.align) baseStyle.textAlign = props.align
    if (props.width) baseStyle.width = props.width
    
    return style(baseStyle)
  })
  
  // Process text
  const processedText = $derived(() => {
    let text = content
    
    // Handle truncation
    if (props.truncate && props.width) {
      const maxWidth = typeof props.truncate === 'number' ? props.truncate : props.width
      if (stringWidth(text) > maxWidth) {
        const ellipsis = props.ellipsis || '...'
        const ellipsisWidth = stringWidth(ellipsis)
        const availableWidth = maxWidth - ellipsisWidth
        
        // Truncate to fit
        while (stringWidth(text) > availableWidth && text.length > 0) {
          text = text.slice(0, -1)
        }
        text += ellipsis
      }
    }
    
    // Handle wrapping
    if (props.wrap && props.width) {
      // TODO: Implement text wrapping
    }
    
    return text
  })
  
  // Handle effects
  if (props.rainbow) {
    return <RainbowText {...props}>{content}</RainbowText>
  }
  
  if (props.pulse) {
    return <PulsingText {...props}>{content}</PulsingText>
  }
  
  return jsx('text', {
    style: textStyle.value,
    className: props.className,
    children: processedText.value
  })
}

// Effect components
function RainbowText(props: TextProps): JSX.Element {
  const colors = [
    Colors.red,
    Colors.yellow,
    Colors.green,
    Colors.cyan,
    Colors.blue,
    Colors.magenta
  ]
  
  const colorIndex = $state(0)
  
  $effect(() => {
    const interval = setInterval(() => {
      colorIndex.value = (colorIndex.value + 1) % colors.length
    }, 100)
    
    return () => clearInterval(interval)
  })
  
  return <Text {...props} color={colors[colorIndex.value]} rainbow={false} />
}

function PulsingText(props: TextProps): JSX.Element {
  const bright = $state(false)
  
  $effect(() => {
    const interval = setInterval(() => {
      bright.value = !bright.value
    }, 500)
    
    return () => clearInterval(interval)
  })
  
  return <Text {...props} bright={bright.value} pulse={false} />
}

// Specialized text components
export function Heading(props: TextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }): JSX.Element {
  const { level = 1, ...textProps } = props
  
  const styles = {
    1: { bold: true, color: Colors.white },
    2: { bold: true, color: Colors.white },
    3: { bold: true, color: Colors.gray },
    4: { color: Colors.white },
    5: { color: Colors.gray },
    6: { color: Colors.gray, dim: true }
  }
  
  return <Text {...styles[level]} {...textProps} />
}

export function Code(props: TextProps & { language?: string }): JSX.Element {
  return (
    <Text 
      color={Colors.green}
      background={Colors.black}
      style={{ padding: { horizontal: 1 } }}
      {...props}
    />
  )
}

export function Link(props: TextProps & { href?: string; onClick?: () => void }): JSX.Element {
  const hovering = $state(false)
  
  return jsx('interactive', {
    onMouseEnter: () => { hovering.value = true },
    onMouseLeave: () => { hovering.value = false },
    onClick: props.onClick,
    children: <Text 
      color={Colors.blue}
      underline={hovering.value}
      bright={hovering.value}
      {...props}
    />
  })
}

export function Label(props: TextProps): JSX.Element {
  return <Text color={Colors.gray} {...props} />
}

export function Success(props: TextProps): JSX.Element {
  return <Text color={Colors.green} {...props} />
}

export function Error(props: TextProps): JSX.Element {
  return <Text color={Colors.red} {...props} />
}

export function Warning(props: TextProps): JSX.Element {
  return <Text color={Colors.yellow} {...props} />
}

export function Info(props: TextProps): JSX.Element {
  return <Text color={Colors.blue} {...props} />
}

// Factory functions
export const text = (props: TextProps) => <Text {...props} />
export const heading = (props: TextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) => <Heading {...props} />
export const code = (props: TextProps & { language?: string }) => <Code {...props} />
export const link = (props: TextProps & { href?: string; onClick?: () => void }) => <Link {...props} />