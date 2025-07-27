# UI State Management Guidelines

## Overview

This document defines when and how to use stores vs inline state in Tuix UI components. The goal is to maintain consistency while keeping components simple and performant.

## State Categories

### 1. Inline State (Component-Local)
State that should remain within the component using `$state` runes:

- **UI-only state**: hover, focus, animation states
- **Transient state**: temporary UI feedback, loading indicators
- **Component lifecycle**: mounted, visible, transitioning
- **Simple toggles**: expanded/collapsed, show/hide
- **Cursor/selection**: for simple cases (e.g., button focus)

### 2. Store State (Centralized)
State that should be extracted to stores:

- **Form state**: input values, validation errors, dirty flags
- **Complex UI state**: multi-step wizards, complex interactions
- **Shared state**: state used by multiple components
- **Business logic**: any state that represents business data
- **Persistent state**: state that needs to survive component unmount

### 3. MVU Model State
State that belongs in the MVU pattern:

- **Application state**: global app configuration, user session
- **Domain state**: business entities, API responses
- **Navigation state**: routing, active views
- **Command state**: current command context, execution state

## Implementation Patterns

### Simple Inline State
```typescript
// ✅ GOOD: Simple UI state stays inline
export function Button(props: ButtonProps) {
  const isHovered = $state(false)
  const isFocused = $state(false)
  
  return (
    <interactive
      onMouseEnter={() => isHovered.value = true}
      onMouseLeave={() => isHovered.value = false}
      onFocus={() => isFocused.value = true}
      onBlur={() => isFocused.value = false}
    >
      {/* ... */}
    </interactive>
  )
}
```

### Store-Based State
```typescript
// ✅ GOOD: Complex form state in a store
import { createFormStore } from '@ui/stores/formStore'

export function ComplexForm(props: FormProps) {
  const form = createFormStore({
    fields: {
      email: { value: '', rules: [required(), email()] },
      password: { value: '', rules: [required(), minLength(8)] }
    }
  })
  
  return (
    <form onSubmit={form.handleSubmit}>
      <TextInput 
        bind:value={form.fields.email.value}
        error={form.fields.email.error}
      />
      {/* ... */}
    </form>
  )
}
```

### Store Patterns

#### 1. Instance Stores (Per Component)
For state that's complex but component-specific:

```typescript
// textInputStore.ts
export function createTextInputStore(initial?: string) {
  const value = $state(initial || '')
  const cursor = $state(0)
  const selection = $state<[number, number] | null>(null)
  const validationError = $state<string | null>(null)
  
  const validate = (validator?: (value: string) => string | null) => {
    if (validator) {
      validationError.value = validator(value.value)
    }
  }
  
  return {
    value,
    cursor,
    selection,
    validationError,
    validate,
    // ... methods
  }
}
```

#### 2. Singleton Stores (Global)
For truly global state:

```typescript
// themeStore.ts
class ThemeStore {
  #theme = $state<'light' | 'dark'>('dark')
  
  get theme() { return this.#theme }
  
  toggle() {
    this.#theme.value = this.#theme.value === 'light' ? 'dark' : 'light'
  }
}

export const themeStore = new ThemeStore()
```

#### 3. Context-Based Stores
For state that needs to be shared within a component tree:

```typescript
// formContext.ts
export const FormContext = createContext<FormStore>()

export function FormProvider({ children }: { children: JSX.Element }) {
  const store = createFormStore()
  return (
    <FormContext.Provider value={store}>
      {children}
    </FormContext.Provider>
  )
}
```

## Decision Matrix

| State Type | Inline | Store | MVU Model |
|------------|--------|-------|-----------|
| Hover state | ✅ | ❌ | ❌ |
| Focus state | ✅ | ❌ | ❌ |
| Input value (simple) | ✅ | ❌ | ❌ |
| Input value (complex form) | ❌ | ✅ | ❌ |
| Validation errors | ❌ | ✅ | ❌ |
| Multi-step form data | ❌ | ✅ | ❌ |
| Theme preference | ❌ | ✅ | ❌ |
| User session | ❌ | ❌ | ✅ |
| API data | ❌ | ❌ | ✅ |
| Navigation state | ❌ | ❌ | ✅ |

## Best Practices

1. **Start Simple**: Begin with inline state, extract to store when complexity grows
2. **Colocation**: Keep stores close to where they're used
3. **Type Safety**: Always provide full TypeScript types for store state
4. **Reactivity**: Use `$state` and `$derived` for reactive updates
5. **Immutability**: Don't mutate state directly, use `.value` assignment
6. **Effects**: Use `$effect` sparingly, prefer derived state
7. **Testing**: Stores should be easily testable in isolation

## Anti-Patterns to Avoid

```typescript
// ❌ BAD: Business logic in UI component
export function ProductList() {
  const products = $state<Product[]>([])
  const calculateTotal = () => { /* complex business logic */ }
  // This belongs in MVU model or service layer
}

// ❌ BAD: Overusing stores for simple state
export function SimpleButton() {
  const buttonStore = createButtonStore() // Overkill for hover/focus
}

// ❌ BAD: Direct store mutation from multiple places
textInputStore.value.value = 'new value' // Use methods instead

// ❌ BAD: Storing derived state
const store = {
  firstName: $state(''),
  lastName: $state(''),
  fullName: $state('') // Should be $derived
}
```

## Migration Strategy

When refactoring existing components:

1. Identify all state in the component
2. Categorize each piece using the decision matrix
3. Create stores for complex/shared state
4. Keep simple UI state inline
5. Add proper TypeScript types
6. Write tests for the new stores
7. Update component to use stores
8. Verify reactivity still works