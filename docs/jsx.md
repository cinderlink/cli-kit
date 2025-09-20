# JSX/TSX Support

TUIX provides built-in JSX/TSX support for building terminal UIs with familiar React-like syntax.

## Setup

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "tuix"
  }
}
```

Or use per-file pragma:

```tsx
/** @jsxImportSource tuix */
```

### Basic Usage

```tsx
import { defineConfig, runCLI } from "tuix/cli"

const config = defineConfig({
  name: "my-cli",
  commands: {
    hello: {
      description: "Say hello",
      handler: () => (
        <panel title="Hello">
          <bold>Hello from JSX!</bold>
        </panel>
      )
    }
  }
})

runCLI(config)
```

## Elements

### Text Elements

Basic text rendering:

```tsx
<text>Plain text</text>
<span>Also plain text</span>
```

### Styled Text

Text styling shortcuts:

```tsx
<bold>Bold text</bold>
<italic>Italic text</italic>
<underline>Underlined text</underline>
<faint>Faint/dim text</faint>
```

### Color Elements

Color shortcuts for common colors:

```tsx
<red>Red text</red>
<green>Green text</green>
<blue>Blue text</blue>
<yellow>Yellow text</yellow>
<cyan>Cyan text</cyan>
<magenta>Magenta text</magenta>
<white>White text</white>
<gray>Gray text</gray>
```

### Semantic Elements

Semantic elements with predefined styling:

```tsx
<error>Error message</error>      // Red + bold
<success>Success message</success> // Green + bold
<warning>Warning message</warning> // Yellow + bold
<info>Info message</info>         // Blue + bold
```

### Layout Elements

Stack elements for layout:

```tsx
// Vertical stack (like div)
<vstack>
  <text>Line 1</text>
  <text>Line 2</text>
  <text>Line 3</text>
</vstack>

// Horizontal stack
<hstack>
  <text>Left</text>
  <text> | </text>
  <text>Right</text>
</hstack>

// Div is alias for vstack
<div>
  <text>Content</text>
</div>
```

### Component Elements

UI component elements:

```tsx
// Panel with optional title
<panel title="My Panel">
  <text>Panel content</text>
</panel>

// Button (requires component implementation)
<button variant="primary">Click me</button>
```

## Component Composition

Create reusable components:

```tsx
// Functional component
const Greeting = ({ name, emoji = "👋" }) => (
  <hstack>
    <text>{emoji} </text>
    <bold>Hello, {name}!</bold>
  </hstack>
)

// Use in your CLI
handler: () => (
  <panel>
    <Greeting name="World" />
  </panel>
)
```

## Advanced Styling

Combine with the style API:

```tsx
import { style, Colors } from "tuix/styling"

const customStyle = style()
  .foreground(Colors.brightBlue)
  .background(Colors.black)
  .bold()

// Use in JSX
<text style={customStyle}>Custom styled text</text>
```

## Conditional Rendering

Standard JSX patterns work:

```tsx
// Conditional rendering
{isError && <error>Something went wrong!</error>}

// Ternary operator
{loading ? <faint>Loading...</faint> : <success>Done!</success>}

// Array mapping
{items.map(item => (
  <text key={item.id}>{item.name}</text>
))}

// Fragment-like behavior (automatic)
<>
  <text>Line 1</text>
  <text>Line 2</text>
</>
```

## Interactive Components

Use with reactive state:

```tsx
import { createComponent } from "tuix/components"
import { $state } from "tuix/components"

const Counter = createComponent(() => {
  const count = $state(0)
  
  return {
    update: (msg, model) => {
      if (msg._tag === "KeyPress") {
        if (msg.key.name === "up") count.update(n => n + 1)
        if (msg.key.name === "down") count.update(n => n - 1)
      }
      return [model, []]
    },
    
    view: () => (
      <panel title="Counter">
        <vstack>
          <text>Count: <bold>{count.value}</bold></text>
          <faint>Use ↑/↓ arrows</faint>
        </vstack>
      </panel>
    )
  }
})
```

## Complete Example

```tsx
/** @jsxImportSource tuix */
import { defineConfig, runCLI } from "tuix/cli"
import { z } from "zod"

// Task component
const Task = ({ task }) => (
  <hstack>
    <text>{task.done ? "✓" : "○"} </text>
    {task.done ? (
      <faint>{task.title}</faint>
    ) : (
      <text>{task.title}</text>
    )}
  </hstack>
)

// Task list component
const TaskList = ({ tasks }) => (
  <vstack>
    <blue>Tasks ({tasks.filter(t => t.done).length}/{tasks.length})</blue>
    <text></text>
    {tasks.map(task => (
      <Task key={task.id} task={task} />
    ))}
  </vstack>
)

// CLI configuration
const config = defineConfig({
  name: "todo-jsx",
  version: "1.0.0",
  
  commands: {
    list: {
      description: "List tasks",
      handler: () => {
        const tasks = [
          { id: 1, title: "Build CLI", done: true },
          { id: 2, title: "Add JSX", done: true },
          { id: 3, title: "Write docs", done: false }
        ]
        
        return (
          <panel title="Todo List">
            <TaskList tasks={tasks} />
          </panel>
        )
      }
    },
    
    add: {
      description: "Add a task",
      args: {
        title: z.string().describe("Task title")
      },
      handler: ({ title }) => (
        <panel>
          <success>✓ Task added: {title}</success>
        </panel>
      )
    }
  }
})

runCLI(config)
```

## Type Safety

Full TypeScript support with type checking:

```tsx
// Type errors are caught
<text color="invalid">Text</text> // Error: Type '"invalid"' is not assignable

// Props are typed
interface GreetingProps {
  name: string
  age?: number
}

const Greeting: React.FC<GreetingProps> = ({ name, age }) => (
  <div>
    <text>Hello, {name}!</text>
    {age && <text>Age: {age}</text>}
  </div>
)
```

## Performance Tips

1. **Avoid deep nesting** - Terminal rendering is line-based
2. **Use fragments** to avoid unnecessary vstack wrappers
3. **Memoize complex computations** outside of render
4. **Keep components small** and focused

## Limitations

- No event handlers on individual elements (use component update)
- No CSS-style positioning (terminal is character-grid based)
- Limited styling options compared to web
- No animations (use reactive state for updates)

## Best Practices

1. **Use semantic elements** for better readability:
   ```tsx
   <error>Failed!</error>  // Better than <red><bold>Failed!</bold></red>
   ```

2. **Extract components** for reusability:
   ```tsx
   const Badge = ({ type, children }) => {
     const Element = type // 'error', 'success', etc.
     return <Element>{children}</Element>
   }
   ```

3. **Type your components**:
   ```tsx
   interface Props {
     items: Array<{ id: string; name: string }>
   }
   
   const List: React.FC<Props> = ({ items }) => (
     <vstack>
       {items.map(item => (
         <text key={item.id}>{item.name}</text>
       ))}
     </vstack>
   )
   ```

4. **Use consistent spacing**:
   ```tsx
   <vstack>
     <text>Section 1</text>
     <text></text>  {/* Empty line for spacing */}
     <text>Section 2</text>
   </vstack>
   ```

## Migration from React

If you're familiar with React, here are the key differences:

- No DOM events - use component `update` method
- No className - use `style` prop or color elements
- No flexbox/grid - use vstack/hstack
- No useState - use `$state` from reactivity API
- No useEffect - use `$effect` from reactivity API

## Troubleshooting

**"Cannot find module 'tuix/jsx-runtime'"**
- Ensure tuix is installed
- Check tsconfig.json jsx settings

**"Element type is invalid"**
- Check element name spelling
- Ensure using supported elements

**Styles not applying**
- Check style object syntax
- Verify color names are valid

**Text not rendering**
- Ensure returning valid JSX element
- Check for null/undefined values
