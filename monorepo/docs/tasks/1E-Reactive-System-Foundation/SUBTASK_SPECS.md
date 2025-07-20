# Task 1E: Reactive System Foundation

## **Mission**: Build production-ready Svelte 5 runes system enabling kitchen-sink demo reactivity patterns

### **Context & Why This Matters**
The kitchen-sink demo shows `$state`, `$derived`, `$effect` patterns requiring a robust reactive system. This task creates the foundation for TUIX's reactivity, enabling state management, derived values, and side effects with full Effect.ts integration.

---

## **🎯 Subtask 1E.1: Core Rune System**
**Location**: `packages/reactive/src/runes/index.ts`

### **What You're Building**
Core rune system providing $state, $derived, $effect functionality matching Svelte 5 patterns.

### **Requirements**
- Implement $state for reactive state management
- Implement $derived for computed values
- Implement $effect for side effects
- Ensure full type safety with generics
- Integrate with Effect.ts for async operations

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: Basic state management
const state = $state({ count: 0 })

// Must enable: Derived values
const doubled = $derived(() => state.count * 2)

// Must enable: Side effects
$effect(() => {
  console.log('Count changed:', state.count)
})

// Must enable: Async effects with Effect.ts
$effect(() => {
  return Effect.gen(function*() {
    const result = yield* someAsyncOperation()
    updateUI(result)
  })
})
```

### **Core Interfaces**
```typescript
export interface State<T> {
  readonly value: T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(fn: (value: T) => void): () => void
}

export interface Derived<T> {
  readonly value: T
  subscribe(fn: (value: T) => void): () => void
}

export interface EffectCleanup {
  (): void
}
```

---

## **🎯 Subtask 1E.2: State Management System**
**Location**: `packages/reactive/src/state/index.ts`

### **What You're Building**
State management system providing reactive state with change tracking and subscriptions.

### **Requirements**
- Create reactive state containers
- Support state subscriptions and unsubscriptions
- Handle state updates and mutations
- Provide state change tracking
- Integrate with component lifecycle

### **Expected Patterns**
```typescript
// Must enable: State creation and updates
export function $state<T>(initial: T): State<T> {
  const state = createState(initial)
  return {
    get value() { return state.value },
    set(value: T) { state.set(value) },
    update(fn: (value: T) => T) { state.update(fn) },
    subscribe(fn: (value: T) => void) { return state.subscribe(fn) }
  }
}

// Must enable: Complex state objects
const appState = $state({
  user: { name: 'John', age: 30 },
  settings: { theme: 'dark', notifications: true }
})
```

### **State Features**
- **Immutable updates**: State changes create new references
- **Change tracking**: Track which properties changed
- **Subscription management**: Efficient subscription handling
- **Nested state**: Support for nested object states
- **State validation**: Optional state validation

---

## **🎯 Subtask 1E.3: Derived Values System**
**Location**: `packages/reactive/src/derived/index.ts`

### **What You're Building**
Derived values system providing computed values that automatically update when dependencies change.

### **Requirements**
- Create computed values with dependency tracking
- Support chained derivations
- Handle async derivations with Effect.ts
- Optimize recalculation with memoization
- Integrate with state system

### **Expected Patterns**
```typescript
// Must enable: Simple derived values
export function $derived<T>(fn: () => T): Derived<T> {
  const derived = createDerived(fn)
  return {
    get value() { return derived.value },
    subscribe(fn: (value: T) => void) { return derived.subscribe(fn) }
  }
}

// Must enable: Chained derivations
const doubled = $derived(() => state.count * 2)
const tripled = $derived(() => doubled.value * 1.5)

// Must enable: Async derivations
const asyncData = $derived(() => {
  return Effect.gen(function*() {
    const data = yield* fetchData(state.query)
    return processData(data)
  })
})
```

### **Derived Features**
- **Dependency tracking**: Automatically track dependencies
- **Memoization**: Cache results to avoid recalculation
- **Lazy evaluation**: Only compute when accessed
- **Async support**: Handle async computations with Effect.ts
- **Error handling**: Graceful error handling in derivations

---

## **🎯 Subtask 1E.4: Effect System**
**Location**: `packages/reactive/src/effects/index.ts`

### **What You're Building**
Effect system providing side effect management with cleanup and lifecycle integration.

### **Requirements**
- Create effect registration and execution
- Support effect cleanup and disposal
- Handle async effects with Effect.ts
- Integrate with component lifecycle
- Provide effect scheduling and batching

### **Expected Patterns**
```typescript
// Must enable: Basic side effects
export function $effect(fn: () => void | EffectCleanup): void {
  const effect = createEffect(fn)
  registerEffect(effect)
}

// Must enable: Async effects
$effect(() => {
  return Effect.gen(function*() {
    const data = yield* fetchData()
    updateUI(data)
    
    return () => {
      // Cleanup function
      cleanup()
    }
  })
})

// Must enable: Conditional effects
$effect(() => {
  if (state.enabled) {
    startProcess()
    return () => stopProcess()
  }
})
```

### **Effect Features**
- **Cleanup management**: Automatic cleanup on disposal
- **Scheduling**: Efficient effect scheduling
- **Batching**: Batch multiple effects together
- **Error handling**: Graceful error handling in effects
- **Lifecycle integration**: Integrate with component lifecycle

---

## **🎯 Subtask 1E.5: Reactive Component Integration**
**Location**: `packages/reactive/src/components/index.ts`

### **What You're Building**
Component integration system enabling reactive components with rune support.

### **Requirements**
- Create reactive component base class
- Support component-scoped state
- Handle component lifecycle with effects
- Integrate with existing component system
- Provide reactive prop handling

### **Expected Patterns**
```typescript
// Must enable: Reactive components
export class ReactiveComponent<Props, State> {
  private state: State
  private effects: Effect[]
  private cleanup: EffectCleanup[]
  
  constructor(props: Props, initialState: State) {
    this.state = $state(initialState)
    this.effects = []
    this.cleanup = []
  }
  
  protected useState<T>(initial: T): State<T> {
    return $state(initial)
  }
  
  protected useEffect(fn: () => void | EffectCleanup): void {
    const cleanup = $effect(fn)
    this.cleanup.push(cleanup)
  }
  
  protected useDerived<T>(fn: () => T): Derived<T> {
    return $derived(fn)
  }
}
```

### **Component Features**
- **State management**: Component-scoped state
- **Effect cleanup**: Automatic cleanup on unmount
- **Reactive props**: Handle reactive prop updates
- **Lifecycle hooks**: Integrate with component lifecycle
- **Error boundaries**: Handle errors in reactive components

---

## **🎯 Subtask 1E.6: Reactive Utilities**
**Location**: `packages/reactive/src/utils/index.ts`

### **What You're Building**
Utility functions and helpers for reactive programming patterns.

### **Requirements**
- Create reactive utility functions
- Support collection operations
- Handle reactive transformations
- Provide debugging utilities
- Integrate with existing utility systems

### **Expected Patterns**
```typescript
// Must enable: Reactive collections
export function $computed<T, R>(items: State<T[]>, fn: (item: T) => R): Derived<R[]> {
  return $derived(() => items.value.map(fn))
}

// Must enable: Reactive filtering
export function $filter<T>(items: State<T[]>, predicate: (item: T) => boolean): Derived<T[]> {
  return $derived(() => items.value.filter(predicate))
}

// Must enable: Reactive debugging
export function $debug<T>(state: State<T>, label: string): State<T> {
  $effect(() => {
    console.log(`[${label}]:`, state.value)
  })
  return state
}
```

### **Utility Features**
- **Collection operations**: Map, filter, reduce operations
- **Transformation utilities**: Transform reactive values
- **Debugging helpers**: Debug reactive state changes
- **Performance utilities**: Performance monitoring
- **Validation utilities**: Validate reactive state

---

## **🎯 Subtask 1E.7: Effect.ts Integration**
**Location**: `packages/reactive/src/integration/index.ts`

### **What You're Building**
Integration layer between reactive system and Effect.ts for async operations.

### **Requirements**
- Create Effect.ts integration utilities
- Support async state updates
- Handle effect composition
- Integrate with error handling
- Provide resource management

### **Expected Patterns**
```typescript
// Must enable: Async state updates
export function $asyncState<T>(
  effect: Effect.Effect<T, any, any>
): State<T | undefined> {
  const state = $state<T | undefined>(undefined)
  
  $effect(() => {
    return Effect.gen(function*() {
      const value = yield* effect
      state.set(value)
    })
  })
  
  return state
}

// Must enable: Effect composition
export function $effectCompose<A, B>(
  stateA: State<A>,
  effectB: (a: A) => Effect.Effect<B, any, any>
): Derived<B | undefined> {
  return $derived(() => {
    return Effect.gen(function*() {
      const b = yield* effectB(stateA.value)
      return b
    })
  })
}
```

### **Integration Features**
- **Async operations**: Handle async operations with Effect.ts
- **Error handling**: Integrate with Effect.ts error handling
- **Resource management**: Manage resources with Effect.ts
- **Effect composition**: Compose effects with reactive values
- **Cancellation**: Support operation cancellation

---

## **🎯 Subtask 1E.8: Testing Framework**
**Location**: `packages/reactive/src/__tests__/`

### **What You're Building**
Testing framework and utilities for reactive system testing.

### **Requirements**
- Create reactive testing utilities
- Support state testing
- Test derived values
- Test effect execution
- Provide performance testing

### **Expected Patterns**
```typescript
// Must enable: State testing
export function testState<T>(initial: T): StateTestHarness<T> {
  const state = $state(initial)
  return {
    state,
    expectValue(expected: T) {
      expect(state.value).toBe(expected)
    },
    setValue(value: T) {
      state.set(value)
    },
    subscribe(fn: (value: T) => void) {
      return state.subscribe(fn)
    }
  }
}

// Must enable: Effect testing
export function testEffect(fn: () => void | EffectCleanup): EffectTestHarness {
  let cleanup: EffectCleanup | undefined
  
  const effect = () => {
    cleanup = fn() as EffectCleanup
  }
  
  return {
    run: effect,
    cleanup() {
      cleanup?.()
    }
  }
}
```

### **Testing Features**
- **State testing**: Test state changes and subscriptions
- **Effect testing**: Test effect execution and cleanup
- **Derived testing**: Test derived value calculations
- **Integration testing**: Test system integration
- **Performance testing**: Test performance characteristics

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `kitchen-sink-demo/src/` - All reactive patterns to enable
2. `src/reactivity/runes.ts` - Current reactive implementation
3. `src/core/types.ts` - Core type definitions
4. `src/components/` - Component integration requirements
5. `src/core/runtime.ts` - Runtime integration points

### **Integration Points**
- **Components**: Reactive components must integrate with component system
- **CLI**: CLI must support reactive patterns
- **Services**: Services must work with reactive state
- **Testing**: Testing must support reactive patterns
- **Effect.ts**: Full integration with Effect.ts patterns

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ 100% TypeScript (no `any` types)
- ✅ 95%+ test coverage
- ✅ All tests pass in <5ms each
- ✅ JSDoc comments for all public APIs

### **API Compliance**
- ✅ Kitchen-sink demo patterns work exactly
- ✅ Svelte 5 runes compatibility
- ✅ Full Effect.ts integration
- ✅ Component integration works

### **Performance**
- ✅ State updates <1ms
- ✅ Derived calculations <1ms
- ✅ Effect execution <1ms
- ✅ No memory leaks

---

## **⚠️ Critical Reminders**

1. **Follow kitchen-sink-demo patterns exactly** - this is our reactive API reference
2. **Use Effect.ts throughout** - all async operations must be Effects
3. **No `any` types** - reactive system must be fully typed
4. **Fast operations** - reactive system must not impact performance
5. **Component integration** - reactive system must work with all components

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1E.1.