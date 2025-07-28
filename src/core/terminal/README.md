# Core Terminal Module

This module provides low-level terminal interaction capabilities, including ANSI escape sequences, terminal capabilities detection, and input/output handling.

## Overview

The terminal module consists of:
- **ANSI**: Complete ANSI escape sequence generation and styling
- **Capabilities**: Terminal feature detection and compatibility
- **Input**: Raw terminal input processing
- **Output**: Terminal output utilities and string width calculation

## ANSI Support

### Basic Styling

```typescript
import { style, color, background } from "@core/terminal/ansi/styles"

// Create styled text
const styledText = style("Hello", {
  color: color.rgb(255, 100, 50),
  background: background.blue,
  bold: true,
  underline: true
})

// Compose styles
const errorStyle = style.compose(
  style.bold,
  style.color(color.red)
)
```

### Advanced Features

```typescript
import { gradient, border } from "@core/terminal/ansi/styles"

// Create gradients
const gradientText = gradient("Rainbow Text", {
  from: { r: 255, g: 0, b: 0 },
  to: { r: 0, g: 0, b: 255 }
})

// Draw borders
const box = border.single({
  width: 20,
  height: 10,
  title: "My Box"
})
```

## Terminal Capabilities

```typescript
import { capabilities } from "@core/terminal/capabilities"

// Check for feature support
if (capabilities.supports256Colors()) {
  // Use extended color palette
}

if (capabilities.supportsUnicode()) {
  // Use Unicode characters
}
```

## Input Processing

```typescript
import { parseKeySequence } from "@core/terminal/input"

// Parse raw terminal input
const keys = parseKeySequence("\x1b[A") // Up arrow
// { type: 'arrow', direction: 'up' }
```

## String Width Calculation

```typescript
import { stringWidth } from "@core/terminal/output/string"

// Calculate display width (handles Unicode, emojis, etc.)
const width = stringWidth("Hello 👋") // 8 (emoji is 2 columns)
```

## Architecture

The terminal module:
- Provides low-level building blocks for higher-level modules
- Handles platform-specific terminal differences
- Optimizes ANSI sequence generation
- Accurately calculates string display widths
- Supports both basic and advanced terminal features

## Module Boundaries

This module is the lowest level of terminal interaction and is used by:
- Core services (Terminal, Renderer)
- UI components for styling
- Layout system for size calculations

It has minimal dependencies:
- Effect for functional programming patterns
- No external terminal libraries

## Best Practices

1. Always check terminal capabilities before using advanced features
2. Use the style composition API for maintainable styling
3. Cache stringWidth calculations for performance
4. Test on multiple terminal emulators
5. Provide fallbacks for limited terminals
6. Use semantic color names when possible