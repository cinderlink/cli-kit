# Styling System Documentation

CLI-Kit provides a comprehensive styling system for creating visually appealing terminal applications. The system is inspired by CSS but adapted for terminal environments.

## Table of Contents

- [Overview](#overview)
- [Colors](#colors)
- [Text Styling](#text-styling)
- [Borders](#borders)
- [Layout Styling](#layout-styling)
- [Advanced Techniques](#advanced-techniques)
- [Best Practices](#best-practices)

## Overview

The styling system is built around the `Style` interface, which allows you to:

- Set foreground and background colors
- Apply text decorations (bold, italic, underline)
- Define borders and padding
- Control layout and alignment

### Basic Style Creation

```typescript
import { style, Colors } from "@/styling/index.ts"

// Basic colored text
const redText = style(Colors.Red)

// Text with background
const highlighted = style(Colors.White).background(Colors.Blue)

// Multiple decorations
const emphasized = style(Colors.BrightWhite)
  .background(Colors.DarkGray)
  .bold()
  .italic()
```

## Colors

### Standard Colors

CLI-Kit supports the full range of ANSI colors:

```typescript
// Basic colors (dark variants)
Colors.Black     // #000000
Colors.Red       // #800000  
Colors.Green     // #008000
Colors.Yellow    // #808000
Colors.Blue      // #000080
Colors.Magenta   // #800080
Colors.Cyan      // #008080
Colors.White     // #C0C0C0

// Bright colors (light variants)
Colors.BrightBlack    // #808080 (Gray)
Colors.BrightRed      // #FF0000
Colors.BrightGreen    // #00FF00
Colors.BrightYellow   // #FFFF00
Colors.BrightBlue     // #0000FF
Colors.BrightMagenta  // #FF00FF
Colors.BrightCyan     // #00FFFF
Colors.BrightWhite    // #FFFFFF
```

### Extended Colors

Additional colors for common use cases:

```typescript
Colors.Gray      // Same as BrightBlack
Colors.DarkGray  // Darker gray variant
```

### Color Usage Examples

```typescript
// Error messages
const errorStyle = style(Colors.BrightRed).bold()

// Success messages  
const successStyle = style(Colors.BrightGreen)

// Warning messages
const warningStyle = style(Colors.BrightYellow)

// Info messages
const infoStyle = style(Colors.BrightCyan)

// Muted text
const mutedStyle = style(Colors.Gray)

// Highlighted text
const highlightStyle = style(Colors.Black).background(Colors.BrightYellow)
```

## Text Styling

### Text Decorations

```typescript
// Font weight and style
const boldText = style().bold()
const italicText = style().italic()
const boldItalic = style().bold().italic()

// Text decorations
const underlined = style().underline()
const strikethrough = style().strikethrough()

// Combined styling
const emphasized = style(Colors.BrightWhite)
  .background(Colors.Blue)
  .bold()
  .underline()
```

### Advanced Text Effects

```typescript
// Dim/faded text
const dimText = style().dim()

// Blinking text (use sparingly!)
const blinking = style().blink()

// Inverted colors
const inverted = style().invert()
```

### Text Alignment

When used with layout components:

```typescript
// Text alignment in containers
const centeredText = text("Centered", style().align('center'))
const rightAligned = text("Right", style().align('right'))
```

## Borders

### Border Styles

CLI-Kit provides several built-in border styles:

```typescript
import { Borders } from "@/styling/index.ts"

// Available border styles
Borders.none     // No border
Borders.single   // ┌─┬─┐ style
Borders.double   // ╔═╦═╗ style
Borders.rounded  // ╭─┬─╮ style  
Borders.thick    // ┏━┳━┓ style
Borders.dotted   // ┌┄┬┄┐ style
```

### Border Characters

Each border style defines characters for different parts:

```typescript
interface BorderStyle {
  readonly topLeft: string     // ┌ ╔ ╭ ┏
  readonly topRight: string    // ┐ ╗ ╮ ┓  
  readonly bottomLeft: string  // └ ╚ ╰ ┗
  readonly bottomRight: string // ┘ ╝ ╯ ┛
  readonly horizontal: string  // ─ ═ ─ ━
  readonly vertical: string    // │ ║ │ ┃
  readonly topJoin: string     // ┬ ╦ ┬ ┳
  readonly bottomJoin: string  // ┴ ╩ ┴ ┻
  readonly leftJoin: string    // ├ ╠ ├ ┣
  readonly rightJoin: string   // ┤ ╣ ┤ ┫
  readonly cross: string       // ┼ ╬ ┼ ╋
}
```

### Border Usage

```typescript
import { box } from "@/core/view.ts"

// Simple bordered box
const simpleBox = box(content, {
  border: Borders.single,
  borderStyle: style(Colors.Gray)
})

// Fancy colored border
const fancyBox = box(content, {
  border: Borders.rounded,
  borderStyle: style(Colors.BrightCyan).bold()
})

// Attention-grabbing border
const alertBox = box(content, {
  border: Borders.thick,
  borderStyle: style(Colors.BrightRed)
})
```

## Layout Styling

### Padding and Margin

Control spacing around and within components:

```typescript
interface Padding {
  readonly top: number
  readonly right: number  
  readonly bottom: number
  readonly left: number
}

// Uniform padding
const paddedBox = box(content, {
  padding: { top: 1, right: 2, bottom: 1, left: 2 }
})

// Asymmetric padding
const customPadding = box(content, {
  padding: { top: 2, right: 1, bottom: 0, left: 3 }
})
```

### Sizing

Control component dimensions:

```typescript
// Fixed size
const fixedBox = box(content, {
  width: 40,
  height: 10
})

// Minimum size
const minSizedBox = box(content, {
  minWidth: 20,
  minHeight: 5
})

// Maximum size  
const maxSizedBox = box(content, {
  maxWidth: 80,
  maxHeight: 20
})
```

### Alignment

Control content alignment within containers:

```typescript
// Horizontal alignment
const leftAligned = box(content, { align: 'left' })
const centered = box(content, { align: 'center' })
const rightAligned = box(content, { align: 'right' })

// Vertical alignment
const topAligned = box(content, { valign: 'top' })
const middleAligned = box(content, { valign: 'middle' })
const bottomAligned = box(content, { valign: 'bottom' })

// Combined alignment
const centeredBox = box(content, {
  align: 'center',
  valign: 'middle',
  width: 40,
  height: 10
})
```

## Advanced Techniques

### Theme Systems

Create consistent styling across your application:

```typescript
// Define a theme
const theme = {
  primary: style(Colors.BrightBlue),
  secondary: style(Colors.Gray),
  success: style(Colors.BrightGreen),
  danger: style(Colors.BrightRed),
  warning: style(Colors.BrightYellow),
  
  // Component-specific styles
  button: {
    primary: style(Colors.White).background(Colors.Blue).bold(),
    secondary: style(Colors.Black).background(Colors.Gray),
    danger: style(Colors.White).background(Colors.Red).bold()
  },
  
  border: {
    default: style(Colors.Gray),
    active: style(Colors.BrightBlue),
    error: style(Colors.BrightRed)
  }
}

// Use theme styles
const primaryButton = text("Save", theme.button.primary)
const errorBorder = box(content, {
  border: Borders.single,
  borderStyle: theme.border.error
})
```

### Conditional Styling

Apply styles based on state:

```typescript
const getButtonStyle = (variant: ButtonVariant, focused: boolean, disabled: boolean) => {
  let baseStyle = style()
  
  // Variant styling
  switch (variant) {
    case ButtonVariant.Primary:
      baseStyle = style(Colors.White).background(Colors.Blue)
      break
    case ButtonVariant.Danger:
      baseStyle = style(Colors.White).background(Colors.Red)
      break
    default:
      baseStyle = style(Colors.Black).background(Colors.Gray)
  }
  
  // State modifiers
  if (focused) {
    baseStyle = baseStyle.bold().underline()
  }
  
  if (disabled) {
    baseStyle = style(Colors.DarkGray)
  }
  
  return baseStyle
}
```

### Style Composition

Build complex styles by composing simpler ones:

```typescript
// Base styles
const baseText = style(Colors.White)
const baseBold = style().bold()
const baseUnderline = style().underline()

// Composed styles
const headerStyle = baseText.bold().underline()
const linkStyle = style(Colors.BrightBlue).underline()
const codeStyle = style(Colors.BrightYellow).background(Colors.DarkGray)

// Conditional composition
const getTextStyle = (isHeader: boolean, isLink: boolean) => {
  let textStyle = baseText
  
  if (isHeader) {
    textStyle = textStyle.bold()
  }
  
  if (isLink) {
    textStyle = textStyle.foreground(Colors.BrightBlue).underline()
  }
  
  return textStyle
}
```

### Custom Color Schemes

Create custom color schemes for different contexts:

```typescript
// Dark theme
const darkTheme = {
  background: Colors.Black,
  foreground: Colors.White,
  accent: Colors.BrightCyan,
  muted: Colors.Gray,
  border: Colors.DarkGray
}

// Light theme  
const lightTheme = {
  background: Colors.White,
  foreground: Colors.Black,
  accent: Colors.Blue,
  muted: Colors.Gray,
  border: Colors.Gray
}

// High contrast theme
const highContrastTheme = {
  background: Colors.Black,
  foreground: Colors.BrightWhite,
  accent: Colors.BrightYellow,
  muted: Colors.Gray,
  border: Colors.BrightWhite
}
```

## Best Practices

### Color Usage

1. **Use semantic colors**: Choose colors that convey meaning (red for errors, green for success)
2. **Ensure readability**: Test color combinations for sufficient contrast
3. **Be consistent**: Use the same colors for similar elements across your app
4. **Consider colorblind users**: Don't rely solely on color to convey information

### Text Styling

1. **Use bold sparingly**: Reserve bold text for important elements
2. **Avoid excessive decoration**: Too many decorations can be distracting
3. **Test in different terminals**: Some terminals have limited styling support
4. **Provide fallbacks**: Ensure your app works even without styling

### Layout

1. **Use consistent spacing**: Maintain consistent padding and margins
2. **Respect terminal limits**: Account for small terminal sizes
3. **Group related content**: Use borders and spacing to create visual hierarchy
4. **Test different sizes**: Ensure your layout works in various terminal sizes

### Performance

1. **Cache complex styles**: Reuse style objects when possible
2. **Avoid dynamic style creation**: Pre-define styles where possible
3. **Use efficient view updates**: Only re-render when necessary

### Accessibility

1. **Provide text alternatives**: Don't rely solely on visual styling
2. **Use sufficient contrast**: Ensure text is readable
3. **Support different terminals**: Test in various terminal environments
4. **Consider screen readers**: Some users may use terminal screen readers

### Example: Complete Styling Pattern

```typescript
// Define your app's styling system
const AppStyles = {
  // Colors
  colors: {
    primary: Colors.BrightBlue,
    secondary: Colors.Gray,
    success: Colors.BrightGreen,
    warning: Colors.BrightYellow,
    danger: Colors.BrightRed,
    text: Colors.White,
    textMuted: Colors.Gray,
    background: Colors.Black
  },
  
  // Text styles
  text: {
    normal: style(Colors.White),
    heading: style(Colors.BrightWhite).bold(),
    subheading: style(Colors.Gray).bold(),
    muted: style(Colors.Gray),
    error: style(Colors.BrightRed),
    success: style(Colors.BrightGreen),
    warning: style(Colors.BrightYellow),
    code: style(Colors.BrightYellow).background(Colors.DarkGray)
  },
  
  // Component styles
  button: {
    primary: style(Colors.White).background(Colors.BrightBlue).bold(),
    secondary: style(Colors.Black).background(Colors.Gray),
    danger: style(Colors.White).background(Colors.BrightRed).bold()
  },
  
  // Border styles
  border: {
    default: style(Colors.Gray),
    active: style(Colors.BrightBlue),
    error: style(Colors.BrightRed),
    success: style(Colors.BrightGreen)
  },
  
  // Layout constants
  spacing: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6
  }
}

// Usage throughout your app
const welcomeMessage = text("Welcome!", AppStyles.text.heading)
const errorMessage = text("Error occurred", AppStyles.text.error)
const primaryButton = text("Continue", AppStyles.button.primary)
```