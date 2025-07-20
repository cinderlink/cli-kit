# Getting Started with TUIX

Welcome to TUIX! This guide will help you build your first terminal user interface application with full keyboard and mouse support.

## Installation

```bash
# Using Bun (recommended)
bun add tuix

# Using npm
npm install tuix
```

## Your First TUIX App

Let's create a simple counter application that responds to keyboard input:

```typescript
// counter.ts
import { Component, runTUIApp, KeyEvent } from "tuix"
import { Effect } from "effect"

// Define your model (state)
type Model = {
  count: number
}

// Define your messages (events)
type Msg = 
  | { type: "Increment" }
  | { type: "Decrement" }
  | { type: "Reset" }

// Create your component using the MVU pattern
const Counter: Component<Model, Msg> = {
  // Initialize the model
  init: Effect.succeed([{ count: 0 }, []]),
  
  // Update the model based on messages
  update: (msg, model) => {
    switch (msg.type) {
      case "Increment":
        return Effect.succeed([{ count: model.count + 1 }, []])
      case "Decrement":
        return Effect.succeed([{ count: model.count - 1 }, []])
      case "Reset":
        return Effect.succeed([{ count: 0 }, []])
    }
  },
  
  // Render the view
  view: (model) => ({
    render: () => Effect.succeed(
      `Counter: ${model.count}\n\n` +
      `Press '+' to increment\n` +
      `Press '-' to decrement\n` +
      `Press 'r' to reset\n` +
      `Press 'q' to quit`
    )
  }),
  
  // Handle keyboard input
  handleKey: (key: KeyEvent) => {
    switch (key.key) {
      case "+": return Effect.succeed({ type: "Increment" })
      case "-": return Effect.succeed({ type: "Decrement" })
      case "r": return Effect.succeed({ type: "Reset" })
      case "q": return Effect.fail("quit")
      default: return Effect.succeed(null)
    }
  }
}

// Run the app
runTUIApp(Counter)
```

Run your app:
```bash
bun run counter.ts
```

## Using Pre-built Components

TUIX provides many pre-built components to accelerate development:

```typescript
import { TextInput, Button, Panel, vstack } from "tuix"
import { Component, runTUIApp } from "tuix"
import { Effect } from "effect"

type Model = {
  name: string
  submitted: boolean
}

type Msg =
  | { type: "UpdateName"; value: string }
  | { type: "Submit" }

const FormApp: Component<Model, Msg> = {
  init: Effect.succeed([
    { name: "", submitted: false },
    []
  ]),
  
  update: (msg, model) => {
    switch (msg.type) {
      case "UpdateName":
        return Effect.succeed([
          { ...model, name: msg.value },
          []
        ])
      case "Submit":
        return Effect.succeed([
          { ...model, submitted: true },
          []
        ])
    }
  },
  
  view: (model) => {
    if (model.submitted) {
      return Panel({
        title: "Success!",
        content: `Hello, ${model.name}!`,
        variant: "success"
      })
    }
    
    return vstack(
      Panel({
        title: "Welcome",
        content: "Please enter your name:"
      }),
      TextInput({
        value: model.name,
        placeholder: "Your name...",
        onChange: (value) => ({ type: "UpdateName", value })
      }),
      Button({
        label: "Submit",
        onClick: () => ({ type: "Submit" }),
        disabled: model.name.length === 0
      })
    )
  }
}

runTUIApp(FormApp)
```

## Using JSX for Complex UIs

TUIX supports JSX syntax for more intuitive UI composition:

```tsx
// app.tsx
import { Component, runTUIApp } from "tuix"
import { Effect } from "effect"

const TodoApp: Component<Model, Msg> = {
  // ... init and update ...
  
  view: (model) => (
    <vstack>
      <Panel title="Todo List" variant="info">
        {model.todos.map((todo, i) => (
          <hstack key={i}>
            <text>{todo.done ? "✓" : "○"}</text>
            <text style={{ color: todo.done ? "gray" : "white" }}>
              {todo.text}
            </text>
          </hstack>
        ))}
      </Panel>
      
      <TextInput
        placeholder="Add a todo..."
        onSubmit={(text) => ({ type: "AddTodo", text })}
      />
      
      <hstack>
        <Button 
          label="Toggle" 
          hotkey="t"
          onClick={() => ({ type: "ToggleCurrent" })}
        />
        <Button
          label="Clear Done"
          variant="danger"
          onClick={() => ({ type: "ClearDone" })}
        />
      </hstack>
    </vstack>
  )
}
```

Configure TypeScript for JSX:
```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "tuix"
  }
}
```

## Reactive State with Runes

TUIX includes Svelte-inspired runes for reactive state management:

```typescript
import { $state, $derived, $effect } from "tuix"

function createTimer() {
  // Reactive state
  const seconds = $state(0)
  const running = $state(false)
  
  // Derived state
  const formatted = $derived(() => {
    const mins = Math.floor(seconds.value / 60)
    const secs = seconds.value % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  })
  
  // Side effects
  $effect(() => {
    if (!running.value) return
    
    const interval = setInterval(() => {
      seconds.value++
    }, 1000)
    
    return () => clearInterval(interval)
  })
  
  return {
    seconds,
    running,
    formatted,
    start: () => running.value = true,
    stop: () => running.value = false,
    reset: () => { 
      seconds.value = 0
      running.value = false
    }
  }
}
```

## Mouse Support

Enable mouse interactions in your components:

```typescript
import { Component, MouseEvent } from "tuix"

const ClickableBox: Component<Model, Msg> = {
  view: (model) => ({
    render: () => Effect.succeed("Click me!"),
    handleMouse: (event: MouseEvent) => {
      if (event.type === "press" && event.button === "left") {
        return Effect.succeed({ type: "Clicked", x: event.x, y: event.y })
      }
      return Effect.succeed(null)
    }
  })
}
```

## Styling Your App

TUIX provides a rich styling system:

```typescript
import { style, Colors, Borders } from "tuix"

const fancyStyle = style({
  color: Colors.cyan,
  background: Colors.blue,
  bold: true,
  padding: { top: 1, right: 2, bottom: 1, left: 2 },
  border: Borders.rounded,
  align: "center"
})

// Use in your view
view: (model) => styledText("Hello World!", fancyStyle)
```

## Next Steps

1. **Explore Components**: Check out the [Component Guide](./COMPONENT_BEST_PRACTICES.md)
2. **Master Styling**: Read the [Styling Guide](./STYLING_TIPS.md)
3. **Learn Patterns**: Study the examples in the `examples/` directory
4. **Build Something**: The best way to learn is by building!

## Resources

- [API Reference](./API.md)
- [Component Catalog](./COMPONENTS.md)
- [Examples](./EXAMPLES.md)
- [GitHub Repository](https://github.com/cinderlink/tuix)

Happy building with TUIX! 🚀