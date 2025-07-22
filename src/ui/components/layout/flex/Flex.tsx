/**
 * Flex Component - JSX version for flexible layouts
 * 
 * Provides flexbox-like layouts for terminal UIs:
 * - Row and column layouts
 * - Alignment and justification
 * - Gap spacing
 * - Wrapping support
 * - Flex grow/shrink
 * 
 * @example
 * ```tsx
 * import { Flex, Row, Column } from 'tuix/components/layout/flex'
 * 
 * function MyLayout() {
 *   return (
 *     <Column gap={2}>
 *       <Row justify="between">
 *         <text>Left</text>
 *         <text>Right</text>
 *       </Row>
 *       
 *       <Flex direction="row" wrap gap={1}>
 *         {items.map(item => <Box key={item}>{item}</Box>)}
 *       </Flex>
 *     </Column>
 *   )
 * }
 * ```
 */

import { jsx } from '@jsx/runtime'
import type { View } from '@core/view/primitives/view'
import { Box, type BoxProps } from '@ui/components/layout/box'

// Types
export interface FlexProps extends Omit<BoxProps, 'direction'> {
  direction?: 'row' | 'column'
  reverse?: boolean
  wrap?: boolean | 'reverse'
  gap?: number
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
}

export interface FlexItemProps extends BoxProps {
  grow?: number
  shrink?: number
  basis?: number | string
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch' | 'baseline'
}

/**
 * Flex Component
 */
export function Flex(props: FlexProps): JSX.Element {
  const {
    direction = 'row',
    reverse = false,
    wrap = false,
    gap,
    align,
    justify,
    children,
    ...boxProps
  } = props
  
  const finalDirection = reverse 
    ? (direction === 'row' ? 'row-reverse' : 'column-reverse')
    : direction
    
  const container = direction === 'row' ? 'hstack' : 'vstack'
  
  return jsx(container, {
    ...boxProps,
    gap,
    wrap: wrap === true ? true : wrap === 'reverse' ? 'reverse' : false,
    align,
    justify,
    children
  })
}

/**
 * FlexItem Component - Child of Flex with grow/shrink properties
 */
export function FlexItem(props: FlexItemProps): JSX.Element {
  const {
    grow,
    shrink,
    basis,
    alignSelf,
    children,
    ...boxProps
  } = props
  
  const style: any = {
    ...boxProps.style
  }
  
  if (grow !== undefined) style.flexGrow = grow
  if (shrink !== undefined) style.flexShrink = shrink
  if (basis !== undefined) style.flexBasis = basis
  if (alignSelf) style.alignSelf = alignSelf
  
  return <Box {...boxProps} style={style}>{children}</Box>
}

// Convenience components
export function Row(props: Omit<FlexProps, 'direction'>): JSX.Element {
  return <Flex {...props} direction="row" />
}

export function Column(props: Omit<FlexProps, 'direction'>): JSX.Element {
  return <Flex {...props} direction="column" />
}

// Common flex patterns
export function SpaceBetween(props: Omit<FlexProps, 'justify'>): JSX.Element {
  return <Row {...props} justify="between" />
}

export function Center(props: FlexProps): JSX.Element {
  return <Flex {...props} align="center" justify="center" />
}

export function Stack(props: Omit<FlexProps, 'direction'> & { spacing?: number }): JSX.Element {
  const { spacing, ...flexProps } = props
  return <Column {...flexProps} gap={spacing} />
}

// Grid-like layout using flex
export function Grid(props: {
  columns?: number
  gap?: number
  children: JSX.Element[]
} & BoxProps): JSX.Element {
  const { columns = 2, gap = 1, children, ...boxProps } = props
  
  // Group children into rows
  const rows: JSX.Element[][] = []
  for (let i = 0; i < children.length; i += columns) {
    rows.push(children.slice(i, i + columns))
  }
  
  return (
    <Column gap={gap} {...boxProps}>
      {rows.map((row, i) => (
        <Row key={i} gap={gap}>
          {row.map((child, j) => (
            <FlexItem key={j} grow={1} basis={0}>
              {child}
            </FlexItem>
          ))}
        </Row>
      ))}
    </Column>
  )
}

// Spacer component for flex layouts
export function Spacer({ size = 1 }: { size?: number }): JSX.Element {
  return <FlexItem grow={size} />
}

// Common layout patterns
export function Sidebar(props: {
  sidebar: JSX.Element
  sidebarWidth?: number
  content: JSX.Element
  gap?: number
} & BoxProps): JSX.Element {
  const { sidebar, sidebarWidth = 20, content, gap = 2, ...boxProps } = props
  
  return (
    <Row gap={gap} {...boxProps}>
      <Box width={sidebarWidth}>{sidebar}</Box>
      <FlexItem grow={1}>{content}</FlexItem>
    </Row>
  )
}

export function Header(props: {
  header: JSX.Element
  content: JSX.Element
  footer?: JSX.Element
  headerHeight?: number
  footerHeight?: number
  gap?: number
} & BoxProps): JSX.Element {
  const { 
    header, 
    content, 
    footer, 
    headerHeight = 3,
    footerHeight = 3,
    gap = 0,
    ...boxProps 
  } = props
  
  return (
    <Column gap={gap} height="100%" {...boxProps}>
      <Box height={headerHeight}>{header}</Box>
      <FlexItem grow={1}>{content}</FlexItem>
      {footer && <Box height={footerHeight}>{footer}</Box>}
    </Column>
  )
}