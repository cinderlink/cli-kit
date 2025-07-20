# Input Handling Guide

This guide explains how input handling works in the CLI-Kit framework and common pitfalls to avoid.

## Key Concepts

### 1. Focus Management

Only ONE component should be focused at a time. The focused component is the only one that should receive and process keyboard input.

### 2. Input Flow

1. **Runtime** captures raw keyboard input via stdin
2. **InputService** parses raw bytes into `KeyEvent` objects
3. **Component subscriptions** receive key events via `input.mapKeys()`
4. **Component** decides which child component gets the input based on focus
5. **Child component** processes the key via its `handleKey()` method

### 3. Common Patterns

#### Correct: Route input to focused component only

```typescript
// In subscriptions
return input.mapKeys(key => {
  // Handle global keys first
  if (key.key === 'q') return { _tag: "Quit" }
  if (key.key === 'tab') return { _tag: "NextField" }
  
  // Route to focused component
  switch (model.focusIndex) {
    case 0:
      return component1.handleKey(key, model.component1)
    case 1:
      return component2.handleKey(key, model.component2)
  }
  return null
})

// In update
case "CharacterInput":
  // Only update the focused component
  switch (model.focusIndex) {
    case 0:
      const [new1] = yield* _(component1.update(msg, model.component1))
      return [{ ...model, component1: new1 }, []]
    case 1:
      const [new2] = yield* _(component2.update(msg, model.component2))
      return [{ ...model, component2: new2 }, []]
  }
```

#### Incorrect: Send input to all components

```typescript
// DON'T DO THIS - it sends input to unfocused components
const msg1 = component1.handleKey(key, model.component1)
if (msg1) return msg1
const msg2 = component2.handleKey(key, model.component2)
if (msg2) return msg2

// DON'T DO THIS - it updates all components with the same message
const [new1] = yield* _(component1.update(msg, model.component1))
const [new2] = yield* _(component2.update(msg, model.component2))
return [{ ...model, component1: new1, component2: new2 }, []]
```

### 4. Focus State

Each focusable component should have a `focused: boolean` field in its model. When changing focus:

1. Blur the currently focused component: `update({ _tag: "Blur" }, model)`
2. Focus the new component: `update({ _tag: "Focus" }, model)`

### 5. Default Configuration

The runtime now defaults to `quitOnCtrlC: true` to prevent orphaned processes. Always ensure your app can be terminated with Ctrl+C unless you have a specific reason to disable it.

### 6. Testing Considerations

- Testing with `echo` or `printf` piped to stdin doesn't work well with raw terminal mode
- The input arrives all at once when the pipe closes, not character by character
- For proper testing, use the e2e test utilities that spawn a PTY (pseudo-terminal)

## Debugging Tips

1. Enable debug mode: `debug: true` in RuntimeConfig to see key events
2. Add console.log in handleKey methods to trace input routing
3. Check that focus state is correctly maintained
4. Verify that only the focused component receives input messages

## Example: Multi-Field Form

See `examples/contact-form.ts` for a complete example of:
- Multiple input fields with focus management
- Tab navigation between fields
- Proper input routing to focused field only
- Global key handling (quit, reset)