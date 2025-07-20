# TUIX Styling Guide

Master the art of creating beautiful terminal user interfaces with TUIX's comprehensive styling system.

## Overview

TUIX provides multiple styling approaches:
1. **Style Objects** - Type-safe, composable styling
2. **Styled Components** - Pre-styled building blocks
3. **ANSI Helpers** - Low-level control
4. **Advanced Effects** - Shadows, gradients, animations

## Basic Styling

### Using the Style Builder

```typescript
import { style, Colors } from "tuix"

const myStyle = style({
  // Text styling
  color: Colors.cyan,
  background: Colors.darkBlue,
  bold: true,
  italic: false,
  underline: true,
  
  // Spacing
  padding: 2, // uniform padding
  padding: { top: 1, right: 2, bottom: 1, left: 2 }, // specific sides
  margin: 1,
  
  // Alignment
  align: "center", // left, center, right
  verticalAlign: "middle", // top, middle, bottom
  
  // Dimensions
  width: 40,
  height: 10,
  minWidth: 20,
  maxWidth: 60
})

// Apply to text
const styledContent = styledText("Hello World", myStyle)
```

### Color System

TUIX provides a rich color palette:

```typescript
import { Colors } from "tuix"

// Basic colors
Colors.red
Colors.green
Colors.blue
Colors.yellow
Colors.cyan
Colors.magenta
Colors.white
Colors.black
Colors.gray

// Variants
Colors.brightRed
Colors.darkBlue
Colors.lightGray

// RGB colors
Colors.rgb(255, 128, 0) // Orange
Colors.hex("#FF8000") // Same orange

// Semantic colors
Colors.primary   // Your app's primary color
Colors.success   // Green
Colors.warning   // Yellow
Colors.error     // Red
Colors.info      // Blue
```

### Text Decorations

```typescript
const decoratedStyle = style({
  // Text effects
  bold: true,
  dim: true,
  italic: true,
  underline: true,
  blink: true, // Use sparingly!
  reverse: true, // Swap foreground/background
  hidden: true, // Hide text
  strikethrough: true
})
```

## Borders and Boxes

### Border Styles

```typescript
import { Borders, styledBox } from "tuix"

// Pre-defined border styles
const box1 = styledBox("Content", { border: Borders.single })
const box2 = styledBox("Content", { border: Borders.double })
const box3 = styledBox("Content", { border: Borders.rounded })
const box4 = styledBox("Content", { border: Borders.thick })
const box5 = styledBox("Content", { border: Borders.dashed })

// Custom borders
const customBorder = {
  top: "═",
  bottom: "═",
  left: "║",
  right: "║",
  topLeft: "╔",
  topRight: "╗",
  bottomLeft: "╚",
  bottomRight: "╝"
}

const customBox = styledBox("Content", { border: customBorder })
```

### Partial Borders

```typescript
// Only specific sides
const topBottomBorder = style({
  border: {
    top: Borders.single.top,
    bottom: Borders.single.bottom
  }
})

// Different styles per side
const mixedBorder = style({
  border: {
    top: Borders.double.top,
    bottom: Borders.single.bottom,
    left: Borders.thick.left,
    right: Borders.thick.right
  }
})
```

## Advanced Effects

### Shadows

```typescript
import { withShadow } from "tuix/styling"

// Simple shadow
const shadowedBox = withShadow(
  styledBox("Elevated Content", baseStyle),
  { offset: { x: 2, y: 1 }, blur: 0, color: Colors.darkGray }
)

// Soft shadow with blur
const softShadow = withShadow(
  content,
  { offset: { x: 4, y: 2 }, blur: 2, color: Colors.black }
)
```

### Gradients

```typescript
import { gradient, GradientDirection } from "tuix/styling"

// Linear gradient
const gradientBg = style({
  background: gradient({
    colors: [Colors.blue, Colors.cyan, Colors.green],
    direction: GradientDirection.Horizontal
  })
})

// Vertical gradient
const verticalGradient = gradient({
  colors: [Colors.darkBlue, Colors.blue, Colors.lightBlue],
  direction: GradientDirection.Vertical
})

// Radial gradient (for backgrounds)
const radialGradient = gradient({
  colors: [Colors.white, Colors.gray, Colors.darkGray],
  direction: GradientDirection.Radial,
  center: { x: 0.5, y: 0.5 }
})
```

### Animations

```typescript
import { animate, AnimationType } from "tuix/styling"

// Blinking text
const blinkingAlert = animate(
  styledText("⚠️ Warning!", warningStyle),
  {
    type: AnimationType.Blink,
    duration: 500 // milliseconds
  }
)

// Pulsing effect
const pulsingButton = animate(
  button,
  {
    type: AnimationType.Pulse,
    duration: 1000,
    minOpacity: 0.5,
    maxOpacity: 1.0
  }
)

// Color transition
const colorShift = animate(
  content,
  {
    type: AnimationType.ColorShift,
    colors: [Colors.red, Colors.yellow, Colors.green],
    duration: 3000
  }
)
```

## Layout and Spacing

### Padding Patterns

```typescript
// Responsive padding
const responsivePadding = style({
  padding: {
    top: 1,
    right: model.isCompact ? 1 : 2,
    bottom: 1,
    left: model.isCompact ? 1 : 2
  }
})

// Content with breathing room
const spaciousContent = style({
  padding: 2,
  margin: 1,
  lineHeight: 1.5
})
```

### Alignment

```typescript
// Center everything
const centeredStyle = style({
  align: "center",
  verticalAlign: "middle",
  width: "100%",
  height: "100%"
})

// Right-aligned with padding
const rightAligned = style({
  align: "right",
  paddingRight: 2
})
```

## Responsive Design

### Terminal-Aware Styling

```typescript
const responsiveStyle = (width: number) => style({
  // Adjust based on terminal width
  padding: width < 80 ? 1 : 2,
  fontSize: width < 80 ? "small" : "normal",
  
  // Show/hide elements
  display: width < 60 ? "none" : "block"
})
```

### Adaptive Layouts

```typescript
const AdaptiveComponent = {
  view: (model) => {
    const { width } = model.terminal
    
    if (width < 80) {
      // Mobile-like layout
      return vstack(
        compactHeader,
        scrollableContent,
        minimalFooter
      )
    }
    
    // Desktop layout
    return hstack(
      sidebar,
      mainContent,
      infoPanel
    )
  }
}
```

## Theme System

### Creating Themes

```typescript
const darkTheme = {
  colors: {
    primary: Colors.cyan,
    secondary: Colors.magenta,
    background: Colors.black,
    surface: Colors.darkGray,
    text: Colors.white,
    textMuted: Colors.gray,
    border: Colors.gray
  },
  
  typography: {
    heading: style({ bold: true, color: Colors.white }),
    body: style({ color: Colors.lightGray }),
    code: style({ color: Colors.green, background: Colors.darkGray })
  },
  
  components: {
    button: {
      default: style({
        border: Borders.single,
        padding: { top: 0, right: 2, bottom: 0, left: 2 }
      }),
      primary: style({
        color: Colors.black,
        background: Colors.cyan,
        bold: true
      })
    }
  }
}
```

### Using Themes

```typescript
import { ThemeProvider, useTheme } from "tuix"

const ThemedApp = {
  view: (model) => (
    <ThemeProvider theme={darkTheme}>
      <App />
    </ThemeProvider>
  )
}

const ThemedButton = () => {
  const theme = useTheme()
  
  return styledText(
    "Click me",
    theme.components.button.primary
  )
}
```

## Performance Tips

### Style Caching

```typescript
// ✅ Good: Create styles once
const buttonStyle = style({ ... })

const Button = {
  view: () => styledText("Click", buttonStyle)
}

// ❌ Bad: Creating styles on every render
const Button = {
  view: () => styledText("Click", style({ ... }))
}
```

### Conditional Styles

```typescript
// Pre-compute style variations
const styles = {
  normal: style({ color: Colors.white }),
  hover: style({ color: Colors.cyan, bold: true }),
  active: style({ color: Colors.green, underline: true }),
  disabled: style({ color: Colors.gray, dim: true })
}

const getButtonStyle = (state: ButtonState) => styles[state]
```

## Common Patterns

### Status Indicators

```typescript
const statusStyles = {
  online: style({ color: Colors.green, bold: true }),
  offline: style({ color: Colors.red }),
  busy: style({ color: Colors.yellow })
}

const StatusBadge = ({ status }) => 
  styledText(`● ${status}`, statusStyles[status])
```

### Data Tables

```typescript
const tableStyle = {
  header: style({
    bold: true,
    background: Colors.darkGray,
    padding: 1,
    borderBottom: Borders.double
  }),
  cell: style({
    padding: 1,
    borderRight: Borders.single
  }),
  alternateRow: style({
    background: Colors.darkGray
  })
}
```

### Progress Bars

```typescript
const progressBarStyle = (percent: number) => ({
  background: gradient({
    colors: [Colors.green, Colors.green, Colors.gray],
    stops: [0, percent / 100, percent / 100]
  }),
  width: 40,
  height: 1
})
```

## Accessibility in Styling

### Color Contrast

```typescript
// Ensure readable contrast
const accessibleStyle = style({
  color: Colors.white,
  background: Colors.darkBlue
  // Contrast ratio: 8.5:1 ✅
})

// Avoid poor contrast
const poorContrast = style({
  color: Colors.lightGray,
  background: Colors.gray
  // Contrast ratio: 1.5:1 ❌
})
```

### Focus Indicators

```typescript
const focusableStyle = (focused: boolean) => style({
  border: focused ? Borders.thick : Borders.single,
  borderColor: focused ? Colors.yellow : Colors.gray,
  // Clear visual indicator for keyboard navigation
})
```

## Terminal Compatibility

### Safe Styles

```typescript
// These work in all terminals
const safeStyle = style({
  color: Colors.basic.red, // 16-color palette
  bold: true,
  underline: true
})

// These need capable terminals
const advancedStyle = style({
  color: Colors.rgb(128, 128, 255), // 24-bit color
  italic: true, // Not all terminals support
  strikethrough: true // Limited support
})
```

### Feature Detection

```typescript
const getStyle = (capabilities: TerminalCapabilities) => {
  if (capabilities.trueColor) {
    return richStyle
  } else if (capabilities.colors256) {
    return mediumStyle
  } else {
    return basicStyle
  }
}
```

## Best Practices

1. **Consistency**: Define a style guide and stick to it
2. **Semantic Naming**: Use meaningful style names
3. **Reusability**: Create shared style utilities
4. **Performance**: Cache computed styles
5. **Accessibility**: Ensure sufficient contrast
6. **Compatibility**: Test in different terminals
7. **Restraint**: Don't over-style - clarity first

## Examples Gallery

Find styled component examples in:
- `examples/gradient-demo.ts` - Advanced gradients
- `examples/table-showcase.ts` - Data table styling
- `examples/modal-demo.ts` - Modal dialogs
- `examples/git-dashboard.ts` - Complete app styling

## Next Steps

- Explore [Advanced Styling](./STYLING.md) for effects
- Study the [Component Guide](./COMPONENT_BEST_PRACTICES.md)
- Check [examples](../examples/) for inspiration

Style with confidence! 🎨