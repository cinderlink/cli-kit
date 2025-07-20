/**
 * Box Component (TSX/JSX)
 *
 * A foundational, composable layout component that provides spacing, borders,
 * and other container properties. It serves as a JSX-native wrapper around the
 * imperative `styledBox` and `flexbox` layout functions.
 *
 * @module Box
 */
import { jsx, View, type JSX, vstack } from '@tuix/jsx'
import { styledBox, flexbox, type BoxProps as StyledBoxProps, type FlexboxProps, FlexDirection } from '@tuix/layout'
import type { Style } from '@tuix/styling'

export type BoxProps = Omit<StyledBoxProps, 'style' | 'children'> & Omit<FlexboxProps, 'children'> & {
  children?: JSX.Element | JSX.Element[],
  style?: Style,
};

export function Box(props: BoxProps): View {
  const {
    children,
    // Flexbox props
    direction,
    justifyContent,
    alignItems,
    gap,
    // Box props
    border,
    borderSides,
    padding,
    minWidth,
    minHeight,
    style,
  } = props

  const content = Array.isArray(children) ? children : (children ? [children] : []);

  // If flex props are provided, use flexbox; otherwise, just stack vertically.
  const innerView = (direction || justifyContent || alignItems || gap)
    ? flexbox(content as View[], { direction, justifyContent, alignItems, gap })
    : vstack(...content as View[]);

  return styledBox(innerView, {
    border,
    borderSides,
    padding,
    minWidth,
    minHeight,
    style,
  })
} 