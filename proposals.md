# CLI-KIT API Improvement Proposals

Based on the framework showcase and example development process, here are proposed API improvements to simplify common use cases and enhance the developer experience.

## 1. Component Embedding System

### Current Challenge
The framework lacks a way to embed one app inside another, making it difficult to create showcase applications or component playgrounds.

### Proposed Solution
```typescript
// New embedding API
interface EmbeddedApp<Model, Msg> {
  readonly component: Component<Model, Msg>
  readonly viewport: ViewportConfig
  readonly isolated: boolean // Whether to isolate services
}

// Usage
const embeddedExample = embed({
  component: loadingScreenComponent,
  viewport: { width: 80, height: 24 },
  isolated: true
})
```

### Benefits
- Enable creation of component galleries
- Allow for live documentation with embedded examples
- Support multi-pane applications with independent sub-apps

## 2. Simplified Component Props API

### Current Challenge
Component configuration requires verbose option objects and manual state management.

### Proposed Solution
```typescript
// Current approach
const btn = new Button({
  label: "Click me",
  variant: ButtonVariant.Primary,
  disabled: false,
  onClick: () => console.log("clicked")
})

// Proposed declarative API
const btn = button("Click me")
  .variant("primary")
  .disabled(model.isLoading)
  .onClick(() => dispatch({ tag: "buttonClicked" }))
```

### Benefits
- More intuitive API similar to popular UI frameworks
- Better TypeScript inference
- Easier prop spreading and composition

## 3. Animation Framework

### Current Challenge
Creating smooth animations requires manual timer management and state updates.

### Proposed Solution
```typescript
// Animation primitive
interface Animation<T> {
  readonly duration: number
  readonly easing: EasingFunction
  readonly from: T
  readonly to: T
}

// Usage
const fadeIn = animate({
  duration: 300,
  easing: "ease-in-out",
  from: { opacity: 0 },
  to: { opacity: 1 }
})

// Component integration
const animatedBox = box(content)
  .animate(fadeIn)
  .onComplete(() => dispatch({ tag: "animationComplete" }))
```

### Benefits
- Declarative animation API
- Built-in easing functions
- Automatic cleanup and lifecycle management

## 4. Enhanced Gradient Builder

### Current Challenge
Creating complex gradients requires understanding low-level gradient configuration.

### Proposed Solution
```typescript
// Gradient builder API
const customGradient = gradient()
  .addStop(0, Colors.red)
  .addStop(0.5, Colors.yellow)
  .addStop(1, Colors.green)
  .direction("diagonal")
  .animate({ speed: 0.1 })

// Text with gradient
const title = largeText("CLI-KIT")
  .gradient(customGradient)
  .size("large")
  .spacing(2)
```

### Benefits
- Fluent API for gradient creation
- Better discoverability of options
- Type-safe gradient composition

## 5. Layout Constraints System

### Current Challenge
Complex layouts require manual calculation and positioning.

### Proposed Solution
```typescript
// Constraint-based layout
const layout = constraintLayout({
  header: {
    height: "10%",
    anchor: "top"
  },
  sidebar: {
    width: "200px",
    anchor: "left",
    below: "header"
  },
  content: {
    fill: true,
    rightOf: "sidebar",
    below: "header"
  }
})

// Usage
layout.render({
  header: headerComponent,
  sidebar: sidebarComponent,
  content: contentComponent
})
```

### Benefits
- Declarative layout constraints
- Automatic responsive behavior
- Easier to create complex layouts

## 6. Component Testing Utilities

### Current Challenge
Testing interactive components requires complex setup and manual event simulation.

### Proposed Solution
```typescript
// Testing utilities
const { render, fireEvent, getByText } = createTestUtils()

test("button click", async () => {
  const { model, dispatch } = render(buttonComponent)
  
  await fireEvent.click(getByText("Submit"))
  
  expect(model.clicked).toBe(true)
})
```

### Benefits
- Familiar testing API
- Simplified event simulation
- Better test isolation

## 7. Theme System

### Current Challenge
Consistent styling across components requires manual style management.

### Proposed Solution
```typescript
// Theme definition
const darkTheme = createTheme({
  colors: {
    primary: Colors.cyan,
    secondary: Colors.magenta,
    background: Colors.black,
    text: Colors.white
  },
  spacing: {
    small: 1,
    medium: 2,
    large: 4
  },
  borders: {
    default: Borders.Rounded
  }
})

// Usage
const app = runApp(component, { theme: darkTheme })

// In components
const btn = button("Click")
  .variant("primary") // Uses theme.colors.primary
```

### Benefits
- Consistent styling across the app
- Easy theme switching
- Better design system support

## 8. State Management Helpers

### Current Challenge
Complex state updates require verbose Effect chains.

### Proposed Solution
```typescript
// State update helpers
const update = createUpdater<Model, Msg>({
  // Pattern matching on message types
  Navigate: (direction, model) => ({
    ...model,
    selectedIndex: calculateNewIndex(direction, model)
  }),
  
  // Async updates
  LoadData: async (url, model) => {
    const data = await fetch(url)
    return { ...model, data, loading: false }
  }
})
```

### Benefits
- Less boilerplate for updates
- Built-in async handling
- Better TypeScript inference

## 9. Interactive Documentation Components

### Current Challenge
Creating interactive documentation requires custom implementations.

### Proposed Solution
```typescript
// Documentation components
const example = codeExample({
  title: "Button Example",
  code: `
    const btn = button("Click me")
      .variant("primary")
      .onClick(() => console.log("clicked"))
  `,
  live: true, // Shows live preview
  editable: true // Allow editing code
})

const propTable = componentProps(Button, {
  showDefaults: true,
  interactive: true
})
```

### Benefits
- Self-documenting components
- Live code examples
- Automatic prop documentation

## 10. Plugin System

### Current Challenge
Extending the framework requires modifying core code.

### Proposed Solution
```typescript
// Plugin API
interface Plugin {
  readonly name: string
  readonly components?: Record<string, Component>
  readonly services?: ServiceProviders
  readonly commands?: CliCommands
}

// Usage
const markdownPlugin: Plugin = {
  name: "markdown",
  components: {
    markdown: markdownComponent,
    markdownEditor: markdownEditorComponent
  }
}

// Register plugin
const app = createApp()
  .use(markdownPlugin)
  .use(chartsPlugin)
```

### Benefits
- Extensible architecture
- Community plugin ecosystem
- Better code organization

## Implementation Priority

1. **High Priority** (Core functionality)
   - Animation Framework
   - Theme System
   - State Management Helpers

2. **Medium Priority** (Developer experience)
   - Simplified Component Props API
   - Component Testing Utilities
   - Enhanced Gradient Builder

3. **Low Priority** (Advanced features)
   - Component Embedding System
   - Layout Constraints System
   - Interactive Documentation Components
   - Plugin System

These improvements would significantly enhance the framework's usability while maintaining its functional, Effect-based architecture.