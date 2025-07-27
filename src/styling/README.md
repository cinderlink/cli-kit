# Styling Module

The Styling module provides a comprehensive styling system for terminal UI applications in the Tuix framework. It offers CSS-inspired styling with terminal-specific features, including colors, borders, layouts, gradients, and advanced effects like animations and shadows.

## Architecture

The Styling module is designed with multiple layers for flexibility and performance:

### Core Components

1. **Style API** - Immutable, chainable styling with fluent interface
2. **Color System** - Rich color support with multiple formats and palettes
3. **Border System** - Various border styles with partial borders and composition
4. **Layout System** - Text alignment, padding, margins, and responsive design
5. **Advanced Effects** - Gradients, shadows, patterns, and animations
6. **Theme System** - Dynamic theming with runtime switching

### Design Principles

1. **CSS-Inspired**: Familiar styling concepts adapted for terminal environments
2. **Immutable Styles**: Styles are immutable and composable for predictable behavior
3. **Terminal-Native**: Optimized for terminal capabilities and constraints
4. **Performance-First**: Efficient rendering with caching and optimization
5. **Type-Safe**: Full TypeScript support with comprehensive type definitions

## API Reference

### Core Style API

#### `style()` - Style Factory Function

Create new styles with a fluent, chainable API:

```typescript
import { style, Colors, Borders } from '@tuix/styling'

const myStyle = style()
  .foreground(Colors.Blue)
  .background(Colors.White)
  .bold()
  .padding(2)
  .border(Borders.Rounded)
  .margin(1)
```

#### `Style` Class

The main style class with comprehensive styling properties:

```typescript
interface StyleMethods {
  // Colors
  foreground(color: Color): Style
  background(color: Color): Style
  
  // Text decoration
  bold(): Style
  italic(): Style
  underline(): Style
  strikethrough(): Style
  
  // Layout
  padding(value: number | Padding): Style
  margin(value: number | Margin): Style
  width(value: number): Style
  height(value: number): Style
  
  // Alignment
  align(horizontal: HorizontalAlign, vertical?: VerticalAlign): Style
  
  // Borders
  border(border: Border): Style
  borderTop(border: Border): Style
  borderBottom(border: Border): Style
  borderLeft(border: Border): Style
  borderRight(border: Border): Style
  
  // Text transformation
  transform(transform: TextTransform): Style
  
  // Rendering
  render(content: string): string
}
```

### Color System

#### Pre-defined Colors

```typescript
import { Colors } from '@tuix/styling'

// Standard colors
Colors.Black, Colors.Red, Colors.Green, Colors.Yellow
Colors.Blue, Colors.Magenta, Colors.Cyan, Colors.White

// Extended palette
Colors.Orange, Colors.Purple, Colors.Pink, Colors.Brown
Colors.Gray, Colors.LightGray, Colors.DarkGray

// Bright variants
Colors.BrightRed, Colors.BrightGreen, Colors.BrightBlue
// ... and more
```

#### Color Creation and Manipulation

```typescript
import { Color, blend, lighten, darken, gradient } from '@tuix/styling'

// Create colors in different formats
const rgbColor = Color.rgb(255, 0, 0)        // RGB
const hexColor = Color.hex('#ff0000')        // Hex
const ansiColor = Color.ansi(1)              // ANSI
const ansi256Color = Color.ansi256(196)      // ANSI 256

// Color manipulation
const lighter = lighten(Colors.Blue, 0.2)    // 20% lighter
const darker = darken(Colors.Red, 0.3)       // 30% darker
const blended = blend(Colors.Red, Colors.Blue, 0.5)  // 50% blend

// Adaptive colors
const adaptiveColor = Color.adaptive({
  light: Colors.Black,   // For light terminals
  dark: Colors.White     // For dark terminals
})
```

#### Gradients

```typescript
import { textGradient, backgroundGradient, rainbowGradient } from '@tuix/styling'

// Text gradients
const rainbow = textGradient('Hello World', rainbowGradient)
const sunset = textGradient('Beautiful Text', sunsetGradient)
const ocean = textGradient('Ocean Wave', oceanGradient)

// Background gradients
const bgGradient = backgroundGradient(40, 3, [
  { color: Colors.Blue, position: 0 },
  { color: Colors.Purple, position: 0.5 },
  { color: Colors.Pink, position: 1 }
])

// Custom gradients
const customGradient = createGradient([
  { color: '#ff0000', position: 0 },
  { color: '#00ff00', position: 0.5 },
  { color: '#0000ff', position: 1 }
])
```

### Border System

#### Pre-defined Borders

```typescript
import { Borders } from '@tuix/styling'

// Border styles
Borders.Normal      // ┌─┐ │ │ └─┘
Borders.Rounded     // ╭─╮ │ │ ╰─╯
Borders.Bold        // ┏━┓ ┃ ┃ ┗━┛
Borders.Double      // ╔═╗ ║ ║ ╚═╝
Borders.ASCII       // +- | | +-
Borders.Hidden      // No visible border
```

#### Custom Borders

```typescript
import { createBorder, BorderSide } from '@tuix/styling'

// Custom border characters
const customBorder = createBorder({
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║'
})

// Partial borders
const partialBorder = createBorder({
  sides: [BorderSide.Top, BorderSide.Bottom],
  style: Borders.Bold
})
```

#### Border Composition

```typescript
import { mergeBorders, renderBox } from '@tuix/styling'

// Merge multiple borders
const mergedBorder = mergeBorders([
  { border: Borders.Normal, weight: 1 },
  { border: Borders.Bold, weight: 2 }
])

// Render bordered content
const boxed = renderBox('Content', {
  border: Borders.Rounded,
  padding: 1,
  width: 20,
  height: 5
})
```

### Layout and Typography

#### Text Alignment

```typescript
import { HorizontalAlign, VerticalAlign } from '@tuix/styling'

const centered = style()
  .align(HorizontalAlign.Center, VerticalAlign.Middle)
  .width(40)
  .height(10)

const rightAligned = style()
  .align(HorizontalAlign.Right)
```

#### Spacing

```typescript
// Uniform spacing
const uniformPadding = style().padding(2)    // 2 on all sides
const uniformMargin = style().margin(1)      // 1 on all sides

// Individual spacing
const customPadding = style().padding({
  top: 1,
  right: 2,
  bottom: 1,
  left: 2
})

const customMargin = style().margin({
  horizontal: 2,  // left and right
  vertical: 1     // top and bottom
})
```

#### Text Transformations

```typescript
import { TextTransform } from '@tuix/styling'

const uppercase = style().transform(TextTransform.Uppercase)
const lowercase = style().transform(TextTransform.Lowercase)
const capitalize = style().transform(TextTransform.Capitalize)
```

### Advanced Effects

#### Shadow Effects

```typescript
import { createDropShadow, createInnerShadow, createGlow } from '@tuix/styling'

// Drop shadow
const dropShadow = createDropShadow({
  offsetX: 2,
  offsetY: 1,
  color: Colors.Gray,
  blur: 1
})

// Inner shadow
const innerShadow = createInnerShadow({
  offsetX: 1,
  offsetY: 1,
  color: Colors.DarkGray,
  blur: 2
})

// Glow effect
const glow = createGlow({
  color: Colors.Cyan,
  intensity: 0.8,
  radius: 2
})
```

#### Pattern Generation

```typescript
import { generatePattern, applyPattern } from '@tuix/styling'

// Generate patterns
const dotPattern = generatePattern({
  type: 'dots',
  spacing: 2,
  char: '•'
})

const stripePattern = generatePattern({
  type: 'stripes',
  direction: 'horizontal',
  width: 3
})

// Apply patterns
const patternedText = applyPattern('Hello World', dotPattern)
```

#### Animation Effects

```typescript
import { 
  createPulse, 
  createShake, 
  createTypewriter,
  createRainbowText 
} from '@tuix/styling'

// Pulse animation
const pulse = createPulse({
  duration: 1000,
  minOpacity: 0.3,
  maxOpacity: 1.0
})

// Shake effect
const shake = createShake({
  duration: 500,
  intensity: 2
})

// Typewriter effect
const typewriter = createTypewriter({
  text: 'Hello, World!',
  speed: 100
})

// Rainbow text animation
const rainbow = createRainbowText({
  text: 'Colorful Text',
  speed: 200
})
```

#### Special Effects

```typescript
import { 
  createNeonEffect, 
  createMatrixEffect, 
  createHologramEffect 
} from '@tuix/styling'

// Neon effect
const neon = createNeonEffect({
  text: 'NEON SIGN',
  color: Colors.Cyan,
  glow: true
})

// Matrix effect
const matrix = createMatrixEffect({
  width: 80,
  height: 24,
  speed: 100
})

// Hologram effect
const hologram = createHologramEffect({
  text: 'HOLOGRAM',
  flicker: true,
  scanlines: true
})
```

## Usage Examples

### Basic Styling

```typescript
import { style, Colors, Borders } from '@tuix/styling'

// Simple styled text
const styledText = style()
  .foreground(Colors.Blue)
  .bold()
  .render('Hello, World!')

// Bordered box
const box = style()
  .border(Borders.Rounded)
  .padding(2)
  .width(30)
  .render('This is a bordered box')

// Centered content
const centered = style()
  .align(HorizontalAlign.Center)
  .width(40)
  .render('Centered Text')
```

### Component Styling

```typescript
import { style, Colors, Borders } from '@tuix/styling'

// Button component styling
const buttonStyle = style()
  .background(Colors.Blue)
  .foreground(Colors.White)
  .bold()
  .padding({ horizontal: 3, vertical: 1 })
  .border(Borders.Rounded)

function Button({ label, onClick }: ButtonProps) {
  return (
    <div 
      style={buttonStyle}
      onClick={onClick}
    >
      {label}
    </div>
  )
}

// Card component styling
const cardStyle = style()
  .background(Colors.White)
  .foreground(Colors.Black)
  .border(Borders.Normal)
  .padding(2)
  .margin(1)
  .width(50)

function Card({ title, content }: CardProps) {
  const titleStyle = style()
    .bold()
    .foreground(Colors.Blue)
    .margin({ bottom: 1 })
  
  return (
    <div style={cardStyle}>
      <div style={titleStyle}>{title}</div>
      <div>{content}</div>
    </div>
  )
}
```

### Advanced Effects

```typescript
import { 
  style, 
  textGradient, 
  rainbowGradient,
  createDropShadow,
  createGlow 
} from '@tuix/styling'

// Rainbow gradient text
const rainbowText = textGradient('Rainbow Text!', rainbowGradient)

// Text with drop shadow
const shadowedStyle = style()
  .foreground(Colors.White)
  .effects([
    createDropShadow({
      offsetX: 2,
      offsetY: 1,
      color: Colors.Black
    })
  ])

// Glowing button
const glowButton = style()
  .background(Colors.Blue)
  .foreground(Colors.White)
  .bold()
  .padding(2)
  .effects([
    createGlow({
      color: Colors.Cyan,
      intensity: 0.8
    })
  ])
```

### Responsive Design

```typescript
import { style, HorizontalAlign } from '@tuix/styling'

// Responsive layout
const responsiveStyle = style()
  .padding(2)
  .responsive({
    small: {
      padding: 1,
      width: 30,
      align: HorizontalAlign.Left
    },
    medium: {
      padding: 2,
      width: 50,
      align: HorizontalAlign.Center
    },
    large: {
      padding: 3,
      width: 80,
      align: HorizontalAlign.Center
    }
  })

// Terminal size detection
function ResponsiveComponent() {
  const terminalSize = useTerminalSize()
  
  const dynamicStyle = style()
    .width(terminalSize.width > 100 ? 80 : 40)
    .padding(terminalSize.width > 80 ? 2 : 1)
  
  return <div style={dynamicStyle}>Responsive Content</div>
}
```

### Theme Integration

```typescript
import { useTheme, style } from '@tuix/styling'

// Theme-aware styling
function ThemedComponent() {
  const theme = useTheme()
  
  const themedStyle = style()
    .foreground(theme.colors.primary)
    .background(theme.colors.surface)
    .border(Borders.Normal, theme.colors.border)
    .padding(2)
  
  return (
    <div style={themedStyle}>
      Themed Content
    </div>
  )
}

// Dark/light mode
const adaptiveStyle = style()
  .foreground(Color.adaptive({
    light: Colors.Black,
    dark: Colors.White
  }))
  .background(Color.adaptive({
    light: Colors.White,
    dark: Colors.Black
  }))
```

## Configuration

### Style Configuration

```typescript
interface StyleConfig {
  // Default theme
  defaultTheme: string
  
  // Color profile
  colorProfile: 'ansi' | 'ansi256' | 'truecolor'
  
  // Terminal capabilities
  capabilities: {
    unicode: boolean
    trueColor: boolean
    emoji: boolean
  }
  
  // Performance settings
  performance: {
    caching: boolean
    batchRendering: boolean
    lazyEvaluation: boolean
  }
  
  // Responsive breakpoints
  breakpoints: {
    small: number    // < 40 columns
    medium: number   // < 80 columns
    large: number    // >= 80 columns
  }
}
```

### Theme Configuration

```typescript
interface ThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
    surface: string
    border: string
    error: string
    warning: string
    success: string
    info: string
  }
  fonts?: {
    primary: string
    monospace: string
  }
  spacing?: {
    unit: number
    scale: number[]
  }
}
```

## Performance Considerations

### Rendering Optimization

1. **Style Caching**: Computed styles are cached to avoid recalculation
2. **Batch Rendering**: Multiple style applications are batched
3. **Lazy Evaluation**: Complex effects are computed only when needed
4. **Efficient ANSI**: Optimized ANSI escape sequence generation

### Best Practices

1. **Reuse Styles**: Create style objects once and reuse them
2. **Avoid Inline Styles**: Use pre-computed styles for better performance
3. **Minimize Effects**: Use advanced effects sparingly for better performance
4. **Cache Gradients**: Pre-compute gradients for repeated use

```typescript
// Good: Reuse styles
const buttonStyle = style().background(Colors.Blue).bold()
const buttons = items.map(item => 
  <Button style={buttonStyle}>{item.label}</Button>
)

// Avoid: Creating styles in render
const buttons = items.map(item => 
  <Button style={style().background(Colors.Blue).bold()}>{item.label}</Button>
)
```

## Integration with Framework

### With UI Components

```typescript
import { Button } from '@tuix/ui'
import { style, Colors } from '@tuix/styling'

const primaryButton = style()
  .background(Colors.Blue)
  .foreground(Colors.White)
  .bold()

<Button style={primaryButton}>Click Me</Button>
```

### With CLI Module

```typescript
import { CLI } from '@tuix/cli'
import { style, Colors, Borders } from '@tuix/styling'

const helpStyle = style()
  .border(Borders.Normal)
  .padding(1)
  .foreground(Colors.Cyan)

CLI.configure({
  styling: {
    help: helpStyle,
    errors: style().foreground(Colors.Red).bold(),
    success: style().foreground(Colors.Green).bold()
  }
})
```

### With Debug Module

```typescript
import { debug } from '@tuix/debug'
import { style, Colors } from '@tuix/styling'

debug.configure({
  styling: {
    log: style().foreground(Colors.Gray),
    error: style().foreground(Colors.Red).bold(),
    warning: style().foreground(Colors.Yellow)
  }
})
```

## Related Modules

- **core/terminal/ansi/styles**: Core styling implementation
- **ui**: UI components that use the styling system
- **cli**: Command-line interface styling integration
- **debug**: Debug output styling and formatting
- **jsx**: JSX component styling integration