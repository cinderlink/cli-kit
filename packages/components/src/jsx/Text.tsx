/**
 * Text Component (TSX/JSX)
 *
 * A foundational component for rendering styled text. It serves as a
 * JSX-native wrapper around the imperative `styledText` view builder from
 * the unified styling system.
 *
 * @module Text
 */
import { jsx, View } from '@tuix/jsx'
import { styledText } from '@tuix/jsx'
import { style as createStyle, type Style, Colors } from '@tuix/styling'

export interface TextProps {
  children?: string | string[]
  color?: string
  backgroundColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  faint?: boolean
  style?: Style
}

export function Text(props: TextProps): View {
  const {
    children,
    color,
    backgroundColor,
    bold,
    italic,
    underline,
    faint,
    style: propStyle,
  } = props

  const content = Array.isArray(children) ? children.join('') : (children ?? '')

  // The style prop from JSX can be passed directly, or we can construct
  // a new style from the individual props.
  let textStyle = propStyle ?? createStyle()
  if (color) {
    const colorValue = Colors[color as keyof typeof Colors];
    if (typeof colorValue !== 'function') {
      textStyle = textStyle.foreground(colorValue);
    }
  }
  if (backgroundColor) {
    const bgColorValue = Colors[backgroundColor as keyof typeof Colors];
    if (typeof bgColorValue !== 'function') {
      textStyle = textStyle.background(bgColorValue);
    }
  }
  if (bold) textStyle = textStyle.bold()
  if (italic) textStyle = textStyle.italic()
  if (underline) textStyle = textStyle.underline()
  if (faint) textStyle = textStyle.faint()

  return styledText(content, textStyle)
} 