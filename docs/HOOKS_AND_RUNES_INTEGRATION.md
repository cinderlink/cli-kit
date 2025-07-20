# How Hooks Enhance Svelte 5 Runes Reactivity

## Current State

We have multiple reactivity systems:
1. **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) - Local component reactivity
2. **Event-Driven Hooks** - Global lifecycle and cross-component communication
3. **Scope System** - Hierarchical context management

## Integration Opportunities

### 1. Global State Synchronization

Hooks can broadcast state changes across the entire application:

```typescript
// In runes.ts
export function $state<T>(initial: T): StateRune<T> {
  const rune = createStateRune(initial)
  
  // Emit state change through hooks
  rune.$set = (newValue: T) => {
    const oldValue = rune.value
    rune.value = newValue
    
    // Broadcast through hook system
    hooks.emit(createHookEvent('rune:stateChange', {
      runeId: rune.id,
      oldValue,
      newValue,
      source: getCurrentScope()
    }))
  }
  
  return rune
}
```

### 2. Cross-Component Reactivity

Hooks enable components to react to changes in other components:

```typescript
// Component A
const count = $state(0)

// Component B can listen
hooks.on<RuneStateChangeEvent>('rune:stateChange')
  .filter(e => e.source === 'componentA')
  .subscribe(event => {
    // React to Component A's state changes
    console.log('Component A changed:', event.newValue)
  })
```

### 3. Lifecycle Integration

Combine rune effects with hook lifecycle events:

```typescript
export function $effect(fn: () => void | (() => void)) {
  const cleanup = createEffect(fn)
  
  // Hook into component lifecycle
  hooks.emit(createHookEvent('rune:effectCreated', {
    componentId: getCurrentComponentId(),
    effectId: generateId()
  }))
  
  // Auto-cleanup on component unmount
  hooks.onBeforeUnmount
    .filter(e => e.componentId === getCurrentComponentId())
    .once(() => cleanup?.())
}
```

### 4. Debugging and DevTools

Hooks provide a centralized point for debugging reactive flows:

```typescript
// Enable reactive debugging
hooks.on<RuneEvent>('rune:*').subscribe(event => {
  if (DEBUG_MODE) {
    console.log('[Rune]', event.type, {
      component: event.source,
      data: event.data,
      timestamp: event.timestamp
    })
  }
})
```

### 5. Time-Travel Debugging

Hooks enable recording and replaying state changes:

```typescript
const stateHistory: StateSnapshot[] = []

hooks.on<RuneStateChangeEvent>('rune:stateChange').subscribe(event => {
  stateHistory.push({
    timestamp: event.timestamp,
    runeId: event.runeId,
    value: event.newValue
  })
})

// Replay to any point in time
function replayToTimestamp(timestamp: Date) {
  const relevantEvents = stateHistory.filter(e => e.timestamp <= timestamp)
  // Apply state changes in order
}
```

### 6. Persistence Layer

Hooks can automatically persist rune state:

```typescript
// Auto-save state changes
hooks.on<RuneStateChangeEvent>('rune:stateChange')
  .filter(e => e.persistent === true)
  .subscribe(async event => {
    await saveToStorage(event.runeId, event.newValue)
  })

// Restore on init
hooks.onAfterInit.subscribe(async () => {
  const savedState = await loadFromStorage()
  restoreRunes(savedState)
})
```

### 7. Validation and Constraints

Hooks can enforce global validation rules:

```typescript
// Global validation hook
hooks.on<RuneStateChangeEvent>('rune:beforeStateChange')
  .subscribe(event => {
    const validation = validateGlobalConstraints(event)
    if (!validation.valid) {
      event.preventDefault() // Cancel the state change
      hooks.emit(createHookEvent('rune:validationError', {
        runeId: event.runeId,
        error: validation.error
      }))
    }
  })
```

### 8. Computed Dependencies

Track and optimize derived rune dependencies:

```typescript
export function $derived<T>(fn: () => T): DerivedRune<T> {
  const rune = createDerivedRune(fn)
  
  // Track dependencies through hooks
  hooks.emit(createHookEvent('rune:derivedCreated', {
    runeId: rune.id,
    dependencies: capturedDependencies
  }))
  
  // Re-compute on dependency changes
  hooks.on<RuneStateChangeEvent>('rune:stateChange')
    .filter(e => rune.dependencies.includes(e.runeId))
    .subscribe(() => rune.recompute())
}
```

## Implementation Strategy

### Phase 1: Event Integration
- Add hook events to all rune operations
- Create RuneEvent types extending BaseEvent
- Implement event filters for rune-specific events

### Phase 2: Lifecycle Coordination
- Sync rune lifecycle with component lifecycle
- Auto-cleanup of effects and subscriptions
- Proper dependency tracking

### Phase 3: Developer Experience
- Add debugging hooks
- Implement time-travel debugging
- Create DevTools integration

### Phase 4: Advanced Features
- Global state management
- Persistence layer
- Validation framework

## Benefits

1. **Unified Reactivity Model**: Single system for local and global state
2. **Better Debugging**: Centralized event stream for all reactive changes
3. **Cross-Component Communication**: Easy reactive updates between components
4. **Plugin Integration**: Plugins can hook into reactive state changes
5. **Performance Monitoring**: Track reactive update performance
6. **State Management**: Global state without additional libraries

## Example: Todo App with Hooks + Runes

```typescript
// todos.ts
const todos = $state<Todo[]>([])
const filter = $state<'all' | 'active' | 'completed'>('all')

// Emit on todo changes for plugins/persistence
hooks.on<RuneStateChangeEvent>('rune:stateChange')
  .filter(e => e.runeId === todos.id)
  .subscribe(event => {
    // Auto-save todos
    localStorage.setItem('todos', JSON.stringify(event.newValue))
  })

// todo-counter-plugin.ts
hooks.on<RuneStateChangeEvent>('rune:stateChange')
  .filter(e => e.source === 'todos')
  .subscribe(event => {
    const count = event.newValue.length
    updateStatusBar(`${count} todos`)
  })

// analytics-plugin.ts  
hooks.on<TodoEvent>('todo:completed')
  .subscribe(event => {
    analytics.track('todo_completed', {
      todoId: event.todoId,
      timeToComplete: event.duration
    })
  })
```

This integration creates a powerful reactive system that combines the simplicity of Svelte 5 runes with the flexibility of event-driven architecture.