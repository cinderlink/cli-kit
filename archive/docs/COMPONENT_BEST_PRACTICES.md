# TUIX Component Best Practices

This guide covers best practices for building robust, performant, and accessible components in TUIX.

## Component Architecture

### The MVU Pattern

TUIX components follow the Model-View-Update (MVU) pattern inspired by Elm:

```typescript
type Component<Model, Msg> = {
  // Initialize your component's state
  init: Effect<[Model, Cmd<Msg>[]], never, AppServices>
  
  // Update state based on messages
  update: (msg: Msg, model: Model) => Effect<[Model, Cmd<Msg>[]], never, AppServices>
  
  // Render the visual representation
  view: (model: Model) => View
  
  // Optional: Subscribe to external events
  subscriptions?: (model: Model) => Sub<Msg>[]
}
```

### Best Practice: Keep Models Immutable

```typescript
// ❌ Bad: Mutating the model
update: (msg, model) => {
  model.count++ // Don't mutate!
  return Effect.succeed([model, []])
}

// ✅ Good: Create new model
update: (msg, model) => {
  return Effect.succeed([
    { ...model, count: model.count + 1 },
    []
  ])
}
```

## State Management

### Local State with Runes

For simple component state, use reactive runes:

```typescript
import { $state, $derived, $effect } from "tuix"

export function createToggle(initial = false) {
  const isOn = $state(initial)
  const label = $derived(() => isOn.value ? "ON" : "OFF")
  
  return {
    isOn: isOn.value, // For reading
    label,
    toggle: () => isOn.value = !isOn.value,
    set: (value: boolean) => isOn.value = value
  }
}
```

### Complex State Management

For complex state, use discriminated unions:

```typescript
type Model = 
  | { type: "Loading" }
  | { type: "Loaded"; data: Item[]; selected: number }
  | { type: "Error"; message: string }

// This makes impossible states impossible
update: (msg, model) => {
  // TypeScript ensures we handle all cases
  switch (model.type) {
    case "Loading":
      // Can only receive certain messages while loading
      break
    case "Loaded":
      // Full functionality available
      break
    case "Error":
      // Limited to retry or dismiss
      break
  }
}
```

## Keyboard Handling

### Use Semantic Key Bindings

```typescript
import { KeyUtils } from "tuix"

const keyMap = {
  submit: KeyUtils.bindings.submit,     // Enter
  cancel: KeyUtils.bindings.escape,     // Escape
  next: KeyUtils.bindings.arrowDown,    // Down arrow
  prev: KeyUtils.bindings.arrowUp,      // Up arrow
  selectAll: KeyUtils.binding("ctrl+a"), // Ctrl+A
}

handleKey: (event) => {
  if (KeyUtils.matches(event, keyMap.submit)) {
    return Effect.succeed({ type: "Submit" })
  }
  // ...
}
```

### Provide Keyboard Shortcuts

```typescript
const FileManager = {
  view: (model) => (
    <vstack>
      <Help>
        Press 'n' for new file
        Press 'd' to delete
        Press '/' to search
      </Help>
      {/* Component content */}
    </vstack>
  )
}
```

## Mouse Support

### Make Click Targets Clear

```typescript
// Use visual indicators for clickable elements
const ClickableItem = ({ label, onClick }) => (
  <Box 
    border="single"
    style={{ 
      cursor: "pointer",
      hover: { background: Colors.gray }
    }}
    onClick={onClick}
  >
    {label}
  </Box>
)
```

### Handle All Mouse Events

```typescript
handleMouse: (event, model) => {
  switch (event.type) {
    case "press":
      // Start interaction
      return Effect.succeed({ type: "StartDrag", x: event.x, y: event.y })
    
    case "motion":
      // Update during drag
      if (model.dragging) {
        return Effect.succeed({ type: "UpdateDrag", x: event.x, y: event.y })
      }
      break
      
    case "release":
      // Complete interaction
      return Effect.succeed({ type: "EndDrag" })
  }
}
```

## Performance Optimization

### Use View Caching

```typescript
import { memoizeRender } from "tuix"

const ExpensiveList = {
  view: memoizeRender((model: Model) => {
    // This expensive computation is cached
    const processed = model.items
      .filter(item => item.visible)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => renderItem(item))
    
    return vstack(...processed)
  })
}
```

### Batch Updates

```typescript
import { batch } from "tuix"

// Multiple state updates in one render
const handleBulkAction = () => {
  batch(() => {
    selectedItems.value = []
    isLoading.value = true
    errorMessage.value = null
  })
}
```

### Use Lazy Loading

```typescript
const LazyComponent = {
  view: (model) => {
    if (!model.isExpanded) {
      return text("Click to expand...")
    }
    
    // Only render expensive content when needed
    return renderExpensiveContent(model)
  }
}
```

## Accessibility

### Provide Clear Focus Indicators

```typescript
const FocusableButton = {
  view: (model) => {
    const style = model.focused
      ? { border: Borders.thick, color: Colors.yellow }
      : { border: Borders.single }
    
    return styledBox("Button", style)
  }
}
```

### Support Screen Readers

```typescript
// Provide text alternatives
const IconButton = ({ icon, label, onClick }) => (
  <Button onClick={onClick} aria-label={label}>
    {icon}
  </Button>
)
```

### Implement Keyboard Navigation

```typescript
const List = {
  handleKey: (event, model) => {
    switch (event.key) {
      case "ArrowDown":
        return Effect.succeed({ 
          type: "Select", 
          index: Math.min(model.selected + 1, model.items.length - 1)
        })
      case "ArrowUp":
        return Effect.succeed({ 
          type: "Select", 
          index: Math.max(model.selected - 1, 0)
        })
      case "Home":
        return Effect.succeed({ type: "Select", index: 0 })
      case "End":
        return Effect.succeed({ 
          type: "Select", 
          index: model.items.length - 1
        })
    }
  }
}
```

## Error Handling

### Use Error Boundaries

```typescript
import { withErrorBoundary, ErrorPanel } from "tuix"

const SafeComponent = withErrorBoundary(
  RiskyComponent,
  {
    fallback: (error) => ErrorPanel({
      title: "Something went wrong",
      message: error.message,
      variant: "error"
    })
  }
)
```

### Provide User-Friendly Error Messages

```typescript
update: (msg, model) => {
  return fetchData()
    .pipe(
      Effect.map(data => [{ ...model, data }, []]),
      Effect.catchAll(error => 
        Effect.succeed([
          { ...model, error: getUserFriendlyMessage(error) },
          []
        ])
      )
    )
}
```

## Testing Components

### Use Component Test Utils

```typescript
import { testComponent, assertModelProperty } from "tuix/testing"

test("Counter increments", async () => {
  const ctx = await testComponent(Counter, { count: 0 })
  
  await ctx.send({ type: "Increment" })
  assertModelProperty(ctx.model, "count", 1)
  
  await ctx.send({ type: "Increment" })
  assertModelProperty(ctx.model, "count", 2)
})
```

### Test Keyboard Interactions

```typescript
test("List navigation", async () => {
  const ctx = await testComponent(List, initialModel)
  
  await ctx.sendKey("ArrowDown")
  assertModelProperty(ctx.model, "selected", 1)
  
  await ctx.sendKey("End")
  assertModelProperty(ctx.model, "selected", model.items.length - 1)
})
```

## Common Patterns

### Loading States

```typescript
const DataView = {
  view: (model) => {
    if (model.loading) {
      return <Spinner message="Loading..." />
    }
    
    if (model.error) {
      return <ErrorPanel message={model.error} />
    }
    
    return <DataList items={model.data} />
  }
}
```

### Form Validation

```typescript
const Form = {
  view: (model) => (
    <vstack>
      <TextInput
        value={model.email}
        onChange={(email) => ({ type: "UpdateEmail", email })}
        error={model.errors.email}
      />
      <Button
        label="Submit"
        disabled={!isValid(model)}
        onClick={() => ({ type: "Submit" })}
      />
    </vstack>
  )
}
```

### Modal Dialogs

```typescript
const AppWithModal = {
  view: (model) => (
    <vstack>
      {/* Main content */}
      <MainView {...model} />
      
      {/* Modal overlay */}
      {model.modalOpen && (
        <Modal
          title="Confirm"
          onClose={() => ({ type: "CloseModal" })}
        >
          Are you sure?
        </Modal>
      )}
    </vstack>
  )
}
```

## Component Composition

### Prefer Composition Over Inheritance

```typescript
// ✅ Good: Compose components
const LabeledInput = ({ label, ...inputProps }) => (
  <vstack>
    <text>{label}</text>
    <TextInput {...inputProps} />
  </vstack>
)

// Use it
<LabeledInput 
  label="Email"
  value={model.email}
  onChange={handleEmailChange}
/>
```

### Create Reusable Wrappers

```typescript
const Card = ({ title, children, variant = "default" }) => (
  <Panel title={title} variant={variant}>
    <Box padding={2}>
      {children}
    </Box>
  </Panel>
)
```

## Tips for Success

1. **Start Simple**: Begin with basic components and add features incrementally
2. **Think in Messages**: Design your message types before implementing update logic
3. **Keep Views Pure**: Views should only depend on the model, not external state
4. **Test Early**: Write tests as you develop components
5. **Document Props**: Use TypeScript interfaces to document component APIs
6. **Handle Edge Cases**: Consider empty states, errors, and loading scenarios
7. **Optimize Later**: Focus on correctness first, then optimize if needed

## Next Steps

- Study the [examples](../examples/) directory for real-world patterns
- Read the [Styling Guide](./STYLING_TIPS.md) for visual polish
- Check the [API Reference](./API.md) for detailed documentation

Happy component building! 🎨