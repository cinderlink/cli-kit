# UI Module

The UI module provides terminal user interface components for the Tuix framework.

## Overview

The UI module contains:
- Pre-built UI components (buttons, inputs, modals, etc.)
- Layout components (flex, grid, viewport)
- Data display components (table, list)
- State management stores for complex UI state
- Styling and theming utilities

## Component Architecture

### Component Types

1. **Simple Components**: Stateless or minimal inline state
   - Text, Box, Button (hover/focus only)
   - Use inline `$state` for UI-only concerns

2. **Complex Components**: Components with significant state
   - TextInput, Viewport, FilePicker
   - Use dedicated stores for state management

3. **MVU Components**: Full Model-View-Update pattern
   - Modal, FilePicker, Table
   - Complete MVU implementation with messages and effects

## State Management

See [stores/STATE_MANAGEMENT.md](./stores/STATE_MANAGEMENT.md) for detailed guidelines.

### Quick Rules

**Use Inline State (`$state`) for:**
- Hover, focus, pressed states
- Simple toggles (expanded/collapsed)
- Transient UI feedback
- Animation states

**Use Stores for:**
- Form values and validation
- Complex UI state (scroll position, selection)
- State shared between components
- State that needs persistence

**Use MVU Model for:**
- Application-level state
- Business logic and data
- Complex workflows
- Side effects and async operations

## Component Structure

```
src/ui/
├── components/           # UI components organized by type
│   ├── display/         # Text, labels, badges
│   ├── forms/           # Inputs, buttons, selects
│   ├── layout/          # Box, flex, grid, viewport
│   ├── data/            # Table, list, tree
│   ├── feedback/        # Modal, spinner, progress
│   ├── navigation/      # Tabs, breadcrumbs
│   └── system/          # Exit, error boundary
├── stores/              # Centralized state management
│   ├── textInputStore.ts
│   ├── viewportStore.ts
│   ├── formStore.ts
│   └── STATE_MANAGEMENT.md
└── README.md           # This file
```

## Using UI Components

### Basic Example

```typescript
import { TextInput } from '@ui/components/forms/text-input/TextInput'
import { Button } from '@ui/components/forms/button/Button'
import { Box } from '@ui/components/layout/box/Box'

export function LoginForm() {
  const username = $state('')
  const password = $state('')
  
  return (
    <Box border="single" padding={2}>
      <TextInput 
        bind:value={username}
        placeholder="Username"
      />
      <TextInput 
        bind:value={password}
        placeholder="Password"
        echoMode="password"
      />
      <Button 
        label="Login"
        onPress={() => handleLogin(username.value, password.value)}
      />
    </Box>
  )
}
```

### Using Stores

```typescript
import { createFormStore, formValidators } from '@ui/stores/formStore'

export function ComplexForm() {
  const form = createFormStore({
    email: {
      value: '',
      validators: [
        formValidators.required(),
        formValidators.email()
      ]
    },
    password: {
      value: '',
      validators: [
        formValidators.required(),
        formValidators.minLength(8)
      ]
    }
  })
  
  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
      <TextInput {...form.getFieldProps('email')} />
      <TextInput {...form.getFieldProps('password')} type="password" />
      <Button 
        label="Submit" 
        disabled={!form.isValid.value}
        loading={form.isSubmitting.value}
      />
    </form>
  )
}
```

## Creating New Components

### 1. Determine Component Type

Ask yourself:
- Does it have complex state? → Use a store
- Does it need side effects? → Use MVU pattern
- Is it mostly presentational? → Keep it simple

### 2. Follow Naming Conventions

- Component files: PascalCase (Button.tsx)
- Store files: camelCase (buttonStore.ts)
- Test files: component.test.ts

### 3. Export Pattern

```typescript
// In Button.tsx
export function Button(props: ButtonProps) { /* ... */ }
export type { ButtonProps }

// In index.ts
export { Button } from './Button'
export type { ButtonProps } from './Button'
```

### 4. Document Your Component

Include:
- JSDoc comment with description
- Usage examples
- Props documentation
- State management approach

## Testing UI Components

```typescript
import { test, expect } from 'bun:test'
import { render } from '@test/utils'
import { Button } from './Button'

test('Button renders with label', () => {
  const view = render(<Button label="Click me" />)
  expect(view).toContain('Click me')
})

test('Button calls onPress when clicked', () => {
  let clicked = false
  const button = <Button label="Test" onPress={() => clicked = true} />
  
  // Simulate click
  button.handleKeyPress('Enter')
  
  expect(clicked).toBe(true)
})
```

## Best Practices

1. **Keep Components Focused**: Each component should do one thing well
2. **Prefer Composition**: Build complex UIs from simple components
3. **Type Everything**: Full TypeScript types for all props and state
4. **Document Usage**: Include examples in component JSDoc
5. **Test Behavior**: Focus on user interactions, not implementation
6. **Optimize Renders**: Use `$derived` for computed values
7. **Handle Edge Cases**: Empty states, loading, errors

## Common Patterns

### Loading States

```typescript
export function DataList({ loading, error, items }) {
  if (loading) return <Spinner />
  if (error) return <Text color="red">Error: {error}</Text>
  if (!items.length) return <Text color="gray">No items found</Text>
  
  return <List items={items} />
}
```

### Controlled vs Uncontrolled

```typescript
// Controlled (value from parent)
<TextInput value={parentValue} onChange={setParentValue} />

// Uncontrolled (internal state)
<TextInput defaultValue="initial" />

// Bindable (two-way binding)
<TextInput bind:value={parentValue} />
```

### Keyboard Navigation

```typescript
export function Menu({ items }) {
  const selectedIndex = $state(0)
  
  function handleKeyPress(key: string) {
    switch (key) {
      case 'ArrowUp':
        selectedIndex.value = Math.max(0, selectedIndex.value - 1)
        break
      case 'ArrowDown':
        selectedIndex.value = Math.min(items.length - 1, selectedIndex.value + 1)
        break
      case 'Enter':
        items[selectedIndex.value].onSelect()
        break
    }
  }
  
  return <List items={items} selectedIndex={selectedIndex.value} />
}
```

## Integration with MVU

When UI components need to interact with the MVU architecture:

```typescript
// In your MVU update function
case 'TextChanged':
  return [
    { ...model, text: msg.value },
    []
  ]

// In your view
<TextInput 
  value={model.text}
  onChange={value => dispatch({ _tag: 'TextChanged', value })}
/>
```

## Future Enhancements

- [ ] Theme system with customizable colors
- [ ] Accessibility improvements (screen reader support)
- [ ] Animation system for transitions
- [ ] Layout debugging tools
- [ ] Component playground for testing