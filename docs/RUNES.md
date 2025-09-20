# CLI Kit Runes - Svelte-Inspired Reactivity

CLI Kit provides a Svelte-inspired runes system for reactive state management in terminal UIs.

## Installation

```typescript
import { $bindable, $state, $derived } from 'tuix/runes'
```

## Core Concepts

### $bindable - Two-Way Bindable State

The `$bindable` rune creates reactive state that can be bound to components using the `bind:` syntax.

```typescript
// Basic usage
const name = $bindable('initial value')

// With validation
const email = $bindable('', {
  validate: (value) => {
    if (!value) return 'Email is required'
    if (!value.includes('@')) return 'Invalid email'
    return true
  }
})

// With transformation
const phone = $bindable('', {
  transform: (value) => value.replace(/\D/g, '') // Remove non-digits
})

// With both
const age = $bindable(0, {
  transform: (value) => Math.floor(value),
  validate: (value) => value >= 0 && value <= 120 || 'Invalid age'
})
```

### Using with JSX Components

The `bind:` syntax automatically creates two-way data binding:

```tsx
const MyForm = () => {
  const username = $bindable('')
  const password = $bindable('')
  const age = $bindable(18)
  
  return (
    <form>
      <TextInput bind:value={username} placeholder="Username" />
      <TextInput bind:value={password} type="password" />
      <NumberInput bind:value={age} min={0} max={120} />
      
      <Button onClick={() => {
        console.log('Form data:', {
          username: username(),
          password: password(),
          age: age()
        })
      }}>
        Submit
      </Button>
    </form>
  )
}
```

### How bind: Works

When you use `bind:value={myRune}`, the JSX transform:

1. Passes the current value as a prop: `value={myRune()}`
2. Creates an onChange handler: `onValueChange={(v) => myRune.$set(v)}`
3. Passes the rune reference: `valueRune={myRune}` (for advanced use)

This works with any prop, not just `value`:

```tsx
<Checkbox bind:checked={isEnabled} />
<Slider bind:value={volume} />
<ColorPicker bind:color={selectedColor} />
```

## API Reference

### $bindable(initial, options?)

Creates a bindable reactive value.

**Parameters:**
- `initial`: The initial value
- `options`: Optional configuration
  - `validate?: (value: T) => boolean | string` - Validation function
  - `transform?: (value: T) => T` - Transform function

**Returns:** `BindableRune<T>`

**Methods:**
- `()`: Get the current value
- `$set(value)`: Set a new value
- `$update(fn)`: Update using a function
- `$subscribe(callback)`: Subscribe to changes

**Example:**
```typescript
const count = $bindable(0)

// Get value
console.log(count()) // 0

// Set value
count.$set(5)

// Update value
count.$update(n => n + 1)

// Subscribe to changes
const unsubscribe = count.$subscribe(value => {
  console.log('Count changed to:', value)
})

// Cleanup
unsubscribe()
```

### $state(initial)

Creates basic reactive state (simpler than $bindable).

```typescript
const count = $state(0)
count.$set(5)
count.$update(n => n + 1)
```

### $derived(fn) [Basic Implementation]

Creates a computed value (basic implementation - full dependency tracking coming soon).

```typescript
const firstName = $state('John')
const lastName = $state('Doe')

// Manual derived for now
const fullName = () => `${firstName()} ${lastName()}`
```

## Validation

Validation functions can return:
- `true` - Value is valid
- `false` - Reject silently
- `string` - Reject with error message

```typescript
const email = $bindable('', {
  validate: (value) => {
    if (!value) return 'Email is required'
    if (!value.includes('@')) return 'Invalid email format'
    if (value.length > 100) return 'Email too long'
    return true
  }
})

// Invalid values are rejected
email.$set('invalid')
console.log(email()) // Still empty string

// Error is logged to console
// "Validation error: Invalid email format"
```

## Transformation

Transform functions modify values before they're stored:

```typescript
const username = $bindable('', {
  transform: (value) => value.toLowerCase().trim()
})

username.$set('  JohnDoe  ')
console.log(username()) // 'johndoe'

// Transforms are applied to initial values too
const upper = $bindable('hello', {
  transform: (v) => v.toUpperCase()
})
console.log(upper()) // 'HELLO'
```

## Subscriptions

Subscribe to value changes:

```typescript
const theme = $bindable('light')

const unsubscribe = theme.$subscribe((value) => {
  console.log('Theme changed to:', value)
  document.body.className = `theme-${value}`
})

theme.$set('dark') // Logs: "Theme changed to: dark"

// Clean up when done
unsubscribe()
```

## Best Practices

### 1. Use $bindable for Form Inputs

```tsx
const LoginForm = () => {
  const username = $bindable('', {
    validate: (v) => v.length >= 3 || 'Username too short'
  })
  
  const password = $bindable('', {
    validate: (v) => v.length >= 8 || 'Password too short'
  })
  
  return (
    <form>
      <TextInput bind:value={username} />
      <PasswordInput bind:value={password} />
    </form>
  )
}
```

### 2. Transform for Normalization

```typescript
const phone = $bindable('', {
  transform: (value) => {
    // Remove all formatting
    const digits = value.replace(/\D/g, '')
    
    // Add formatting
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`
  }
})
```

### 3. Combine with Effect.ts

```typescript
const saveSettings = (settings: Settings) => Effect.gen(function* () {
  const username = $bindable(settings.username)
  const theme = $bindable(settings.theme)
  
  // Subscribe to changes
  username.$subscribe((value) => {
    yield* saveToStorage('username', value)
  })
  
  theme.$subscribe((value) => {
    yield* saveToStorage('theme', value)
  })
  
  return { username, theme }
})
```

## Migration from Old Reactivity

If you're using the old reactivity system from `tuix/components`:

```typescript
// Old
import { $state } from 'tuix/components'
const count = $state(0)

// New
import { $bindable } from 'tuix/runes'
const count = $bindable(0)
```

The new system provides:
- ✅ Built-in validation
- ✅ Value transformation
- ✅ JSX bind: syntax support
- ✅ Better TypeScript inference
- ✅ Cleaner API

## Future Features

Coming soon:
- Full dependency tracking for `$derived`
- `$effect` with automatic cleanup
- `$inspect` for debugging
- Integration with DevTools

---

Remember: **This is a Svelte house!** 🏠 We use runes, not hooks. 🎉
