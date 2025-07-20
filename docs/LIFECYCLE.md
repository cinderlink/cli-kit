# Component Lifecycle in TUIX

TUIX implements a clean, predictable lifecycle management system with runes, inspired by Svelte 5's simplicity. This provides proper component initialization order and solves parent-child timing issues.

## Overview

The component lifecycle ensures that parent components are fully initialized before child components, solving common timing issues in declarative UI frameworks.

## Lifecycle Phases

```
1. Component initialization (constructor/setup)
2. $effect.pre() - Before render
3. Render phase (JSX → View)  
4. $effect() - After render
5. onMount() - After first render (once)
6. Updates trigger steps 2-4 again
7. onDestroy() - Cleanup on unmount
```

## Lifecycle Hooks

### `$effect()`

Runs after each render. Returns optional cleanup function.

```tsx
$effect(() => {
  console.log('Component rendered!')
  
  return () => {
    console.log('Cleaning up...')
  }
})
```

### `$effect.pre()`

Runs before each render. Useful for reading current state.

```tsx
$effect.pre(() => {
  console.log('About to render')
})
```

### `onMount()`

Runs once after the component is first rendered. Perfect for:
- Starting timers/intervals
- Subscribing to external events
- Ensuring parent components are ready

```tsx
onMount(() => {
  console.log('Component mounted!')
  
  const timer = setInterval(() => {
    // ...
  }, 1000)
  
  // Return cleanup function
  return () => {
    clearInterval(timer)
  }
})
```

### `onDestroy()`

Runs when component is destroyed. Use for cleanup that doesn't have a corresponding mount.

```tsx
onDestroy(() => {
  console.log('Component destroyed')
})
```

### `beforeUpdate()` / `afterUpdate()`

Global hooks that run before/after ANY component update.

```tsx
beforeUpdate(() => {
  console.log('Some component is updating')
})

afterUpdate(() => {
  console.log('Some component updated')
})
```

### `tick()`

Returns a promise that resolves after pending updates are flushed.

```tsx
await tick()
console.log('All updates complete!')
```

## Component Wrapper

Use `withLifecycle()` to add lifecycle management to components:

```tsx
const MyComponent = withLifecycle(() => {
  const count = $state(0)
  
  $effect(() => {
    console.log('Count:', count())
  })
  
  onMount(() => {
    console.log('Mounted!')
  })
  
  return <div>Count: {count()}</div>
})
```

## Solving Parent-Child Timing

The lifecycle system ensures proper initialization order:

```tsx
const ParentPlugin = withLifecycle(() => {
  onMount(() => {
    // This runs AFTER all child components are processed
    console.log('Parent ready, all children registered')
  })
  
  return (
    <Plugin name="parent">
      <ChildCommand />
    </Plugin>
  )
})

const ChildCommand = withLifecycle(() => {
  onMount(() => {
    // This runs BEFORE parent's onMount
    console.log('Child mounted')
  })
  
  return <Command name="child">...</Command>
})
```

## Execution Order

For a parent with two children:

```
1. Parent init
2. Child1 init  
3. Child2 init
4. Parent $effect.pre()
5. Child1 $effect.pre()
6. Child2 $effect.pre()
7. Render all
8. Child1 $effect()
9. Child2 $effect()
10. Parent $effect()
11. Child1 onMount()
12. Child2 onMount()
13. Parent onMount()
```

## Best Practices

1. **Use onMount for one-time setup** - Don't put one-time logic in $effect
2. **Always return cleanup functions** - Prevent memory leaks
3. **Use $effect.pre for synchronous prep** - Read dimensions, calculate layouts
4. **Use $effect for post-render work** - Update external state, trigger events
5. **Wrap components with withLifecycle** - Ensures proper lifecycle management

## Common Patterns

### Auto-saving Form

```tsx
const Form = withLifecycle(() => {
  const data = $state({ name: '', email: '' })
  const saved = $state(false)
  
  // Debounced save effect
  $effect(() => {
    const timer = setTimeout(() => {
      saveToDatabase(data())
      saved.$set(true)
    }, 500)
    
    return () => clearTimeout(timer)
  })
  
  return <form>...</form>
})
```

### Real-time Updates

```tsx
const Dashboard = withLifecycle(() => {
  const stats = $state({ users: 0, revenue: 0 })
  
  onMount(() => {
    const ws = new WebSocket('ws://...')
    
    ws.onmessage = (e) => {
      stats.$set(JSON.parse(e.data))
    }
    
    return () => ws.close()
  })
  
  return <div>Users: {stats().users}</div>
})
```

### Parent-Child Communication

```tsx
const Parent = withLifecycle(() => {
  const commands = $state<string[]>([])
  
  onMount(() => {
    // All child commands have registered
    console.log('Registered commands:', commands())
  })
  
  return (
    <Plugin name="parent">
      <Command name="cmd1" />
      <Command name="cmd2" />
    </Plugin>
  )
})
```

## Debugging

Enable lifecycle debugging:

```tsx
import { getLifecyclePhases } from 'tuix/reactivity/jsx-lifecycle'

console.log(getLifecyclePhases())
// Shows all lifecycle phases in order
```

## Migration Guide

### From Raw JSX

Before:
```tsx
function MyPlugin() {
  // Timing issues - commands might register before plugin
  return (
    <Plugin name="my-plugin">
      <Command name="hello" />
    </Plugin>
  )
}
```

After:
```tsx
const MyPlugin = withLifecycle(() => {
  onMount(() => {
    // Plugin is ready, commands are registered
  })
  
  return (
    <Plugin name="my-plugin">
      <Command name="hello" />
    </Plugin>
  )
})
```

### From Class Components

Before:
```tsx
class MyComponent {
  componentDidMount() { }
  componentWillUnmount() { }
}
```

After:
```tsx
const MyComponent = withLifecycle(() => {
  onMount(() => {
    // componentDidMount logic
    return () => {
      // componentWillUnmount logic  
    }
  })
})
```