# View System

The view system provides basic primitives for rendering text-based user interfaces. Views are composable units that can render content, have dimensions, and can be combined in various layouts.

## Overview

Views are the fundamental building blocks of the TUIX framework. They represent renderable content that can be:

- **Measured**: Views have width and height properties
- **Rendered**: Views can render their content as strings via Effect
- **Composed**: Views can be combined using layout functions
- **Styled**: Views can have styling applied

## Basic View Creation

### text(content)

Create a simple text view from a string:

```typescript
import { text } from "@/core/view"

const simpleText = text("Hello, World!")
// Width: 13, Height: 1

const multiLineText = text("Line 1\nLine 2\nLine 3")
// Width: 6 (longest line), Height: 3
```

### empty

An empty view with no content:

```typescript
import { empty } from "@/core/view"

const emptyView = empty
// Width: 0, Height: 1
```

### createView(content)

Alias for `text()` function:

```typescript
import { createView } from "@/core/view"

const view = createView("Same as text()")
```

## View Properties

All views have the following structure:

```typescript
interface View {
  render(): Effect.Effect<string, RenderError, never>
  width?: number
  height?: number
}
```

- `render()`: Effect that produces the rendered string content
- `width`: Display width in characters (optional)
- `height`: Display height in lines (optional)

## View Utilities

### isView(obj)

Type guard to check if an object is a View:

```typescript
import { isView } from "@/core/view"

if (isView(someObject)) {
  // someObject is definitely a View
  const content = await Effect.runPromise(someObject.render())
}
```

### measureView(view)

Get the dimensions of a view:

```typescript
import { measureView } from "@/core/view"

const view = text("Hello\nWorld")
const dimensions = await Effect.runPromise(measureView(view))
// { width: 5, height: 2 }
```

### renderView(view)

Render a view to string content:

```typescript
import { renderView } from "@/core/view"

const view = text("Hello")
const content = await Effect.runPromise(renderView(view))
// "Hello"
```

## Layout Functions

### vstack(...views)

Combine views vertically (stacked top to bottom):

```typescript
import { vstack, text } from "@/core/view"

const header = text("Header")
const body = text("Body content")
const footer = text("Footer")

const page = vstack(header, body, footer)
// Renders as:
// Header
// Body content  
// Footer
```

**Behavior:**
- Width: Maximum width of all child views
- Height: Sum of all child view heights
- Views are separated by newlines

### hstack(...views)

Combine views horizontally (side by side):

```typescript
import { hstack, text } from "@/core/view"

const left = text("Left\nPanel")
const right = text("Right\nPanel")

const layout = hstack(left, right)
// Renders as:
// LeftRight
// PanelPanel
```

**Behavior:**
- Width: Sum of all child view widths
- Height: Maximum height of all child views
- Shorter views are padded with spaces to match the tallest view
- Each line is padded to the view's full width

### Advanced Layout

For complex layout requirements, use the layout system:

```typescript
import { joinHorizontal } from "@/layout/join"

// More control over alignment and spacing
const aligned = joinHorizontal("top", 2, [leftView, rightView])
```

## Box and Borders

### box(view)

Create a border around a view using Unicode box characters:

```typescript
import { box, text } from "@/core/view"

const content = text("Hello\nWorld")
const boxed = box(content)
// Renders as:
// ┌───────┐
// │ Hello │
// │ World │
// └───────┘
```

**Behavior:**
- Adds 4 to width (2 characters per side)
- Adds 2 to height (top and bottom borders)
- Uses Unicode box drawing characters
- Automatically pads content to fit within border

## Alignment

### center(view, totalWidth)

Center a view within a specified width:

```typescript
import { center, text } from "@/core/view"

const content = text("Hello")
const centered = center(content, 15)
// Renders as: "     Hello     "
//             ^^^^^       ^^^^^
//             left pad    right pad
```

**Behavior:**
- Each line is centered individually
- Left padding is `floor((totalWidth - lineWidth) / 2)`
- Right padding fills remaining space
- If content is wider than totalWidth, no padding is added

## Styling

### Basic ANSI Styling

Apply ANSI escape codes directly:

```typescript
import { styled, text } from "@/core/view"

const redText = styled(text("Error"), "\\x1b[31m")
// Applies red foreground color
```

### Common Style Functions

Predefined styling functions for common needs:

```typescript
import { bold, dim, italic, underline, text } from "@/core/view"

const emphasis = bold(text("Important"))
const subtle = dim(text("Subtle text"))
const quote = italic(text("Quoted text"))
const link = underline(text("Link text"))
```

### Color Functions

Apply foreground colors:

```typescript
import { red, green, yellow, blue, magenta, cyan, white, text } from "@/core/view"

const error = red(text("Error message"))
const success = green(text("Success!"))
const warning = yellow(text("Warning"))
const info = blue(text("Information"))
const highlight = magenta(text("Highlighted"))
const accent = cyan(text("Accent text"))
const normal = white(text("Normal text"))
```

### Advanced Styling with Style System

Use the comprehensive styling system for complex styling:

```typescript
import { styledText } from "@/core/view"
import { style } from "@/styling"

const complexStyle = style()
  .foreground("brightRed")
  .background("darkBlue")
  .bold()
  .underline()
  .padding(1)

const styledView = styledText("Fancy text", complexStyle)
```

**Behavior:**
- Respects width/height from style object
- Falls back to content dimensions if not specified
- Uses the full styling system capabilities

## Composition Examples

### Simple Layout

```typescript
import { vstack, hstack, text, bold, box } from "@/core/view"

const title = bold(text("My Application"))
const sidebar = box(text("Menu\nOption 1\nOption 2"))
const content = box(text("Main content area"))
const body = hstack(sidebar, content)

const app = vstack(title, body)
```

### Complex Layout with Styling

```typescript
import { vstack, hstack, center, box, text, bold, green, red } from "@/core/view"

// Header with centered title
const header = box(center(bold(text("STATUS DASHBOARD")), 50))

// Status indicators
const statusGood = green(text("✓ Service OK"))
const statusBad = red(text("✗ Service Error"))
const statusPanel = box(vstack(statusGood, statusBad))

// Main content area
const metrics = text("CPU: 45%\nMemory: 67%\nDisk: 23%")
const metricsPanel = box(metrics)

// Layout
const dashboard = vstack(
  header,
  hstack(statusPanel, metricsPanel)
)
```

### Conditional Content

```typescript
import { text, red, green } from "@/core/view"

const createStatusView = (isError: boolean, message: string) => {
  const content = text(message)
  return isError ? red(content) : green(content)
}

const status = createStatusView(false, "All systems operational")
```

## Performance Considerations

### View Caching

Views are lightweight and can be created frequently, but consider caching for:

- Complex composed views that don't change
- Views with expensive styling calculations
- Large lists of similar views

```typescript
// Cache expensive view construction
const cachedView = useMemo(() => 
  box(center(bold(text(title)), 40)), 
  [title]
)
```

### Lazy Rendering

Views use Effect for rendering, enabling lazy evaluation:

```typescript
// View is created but not rendered until needed
const expensiveView = text(expensiveCalculation())

// Render only when actually needed
const content = await Effect.runPromise(expensiveView.render())
```

## Best Practices

### 1. Compose Views Functionally

Build complex views by composing simple views:

```typescript
// Good: Functional composition
const createUserCard = (user: User) =>
  box(vstack(
    bold(text(user.name)),
    text(user.email),
    dim(text(`Joined: ${user.joinDate}`))
  ))

// Avoid: Complex view creation
const createUserCard = (user: User) => {
  // Complex string building logic
}
```

### 2. Use Appropriate Layout Functions

Choose the right layout function for your needs:

- `vstack`/`hstack` for simple layouts
- `center` for alignment
- `box` for borders
- Layout system functions for complex layouts

### 3. Handle Dynamic Content

Plan for content that changes size:

```typescript
// Good: Handles variable content
const createMessage = (text: string) =>
  box(center(text(text), Math.max(20, text.length + 4)))

// Bad: Fixed size that may truncate
const createMessage = (text: string) =>
  box(center(text(text), 20))
```

### 4. Separate Styling from Content

Keep content and styling separate for maintainability:

```typescript
// Good: Separate concerns
const content = text("Important message")
const styled = red(bold(content))

// Better: Use style system
const styled = styledText("Important message", 
  style().foreground("red").bold())
```

### 5. Test View Rendering

Test both dimensions and content:

```typescript
test("user card should render correctly", async () => {
  const user = { name: "John", email: "john@example.com" }
  const card = createUserCard(user)
  
  expect(card.width).toBeGreaterThan(0)
  expect(card.height).toBeGreaterThan(0)
  
  const content = await Effect.runPromise(card.render())
  expect(content).toContain(user.name)
  expect(content).toContain(user.email)
})
```

## Related Documentation

- [Layout System](../layout/README.md) - Advanced layout capabilities
- [Styling System](../styling/README.md) - Comprehensive styling options
- [Component System](../components/README.md) - Building interactive components
- [Effect Patterns](./effect-patterns.md) - Working with Effect.ts