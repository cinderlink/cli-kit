# Task 1E: Reactive System Foundation - Context Files

## **📁 CRITICAL CONTEXT FILES**

### **1. Kitchen-Sink Demo Reactive Usage (TRUE NORTH)**
**Location**: `docs/audit/solutions/kitchen-sink-demo/src/`
**Why Critical**: Shows the exact reactive patterns we must enable

**Key Files**:
- `hooks/useAppState.ts` - App state management patterns
- `hooks/useTheme.ts` - Theme state management
- `components/` - Reactive component patterns
- `index.tsx` - Root reactive state usage

**What to Look For**:
```typescript
// Must enable: Basic state management
const state = $state({ count: 0 })

// Must enable: Derived values
const doubled = $derived(() => state.count * 2)

// Must enable: Side effects
$effect(() => {
  console.log('Count changed:', state.count)
})

// Must enable: Component integration
function MyComponent() {
  const [count, setCount] = useState(0)
  const doubled = useDerived(() => count * 2)
  
  useEffect(() => {
    console.log('Count:', count)
  }, [count])
}
```

---

### **2. Current Reactive Implementation**
**Location**: `src/reactivity/runes.ts`
**Why Critical**: Shows current implementation to build upon

**Key Functions**:
- `isBindableRune` - Rune detection
- `isStateRune` - State rune detection
- `BindableRune` type - Bindable rune interface
- `StateRune` type - State rune interface

**What to Look For**:
- Current rune detection logic
- State binding mechanisms
- Type definitions for runes
- Integration with JSX system

---

### **3. Component Integration Requirements**
**Location**: `src/components/`
**Why Critical**: Shows how reactive system must integrate with components

**Key Files**:
- `base.ts` - Component base class
- `component.ts` - Component interface
- `reactivity.ts` - Component reactivity integration
- `lifecycle.ts` - Component lifecycle

**What to Look For**:
- Component lifecycle hooks
- State management in components
- Reactive prop handling
- Component cleanup patterns

---

### **4. Core Type Definitions**
**Location**: `src/core/types.ts`
**Why Critical**: Defines types that reactive system must integrate with

**Key Types**:
- `Component` interface
- `View` interface
- `JSX.Element` type
- `ComponentProps` interface

**What to Look For**:
- Type constraints for reactive values
- Interface definitions for components
- Integration points with core system
- Type safety requirements

---

### **5. Effect.ts Integration Points**
**Location**: `src/core/runtime.ts`
**Why Critical**: Shows how reactive system must integrate with Effect.ts

**Key Patterns**:
- Effect composition
- Error handling with Effect.ts
- Resource management
- Async operations

**What to Look For**:
- Effect usage patterns
- Error handling mechanisms
- Resource cleanup patterns
- Async operation handling

---

### **6. JSX Runtime Integration**
**Location**: `src/jsx-runtime.ts`
**Why Critical**: Shows how reactive system integrates with JSX

**Key Sections**:
- Rune handling in JSX props
- State binding in components
- Reactive prop processing
- Component lifecycle integration

**What to Look For**:
- Rune detection in JSX
- State binding mechanisms
- Reactive prop handling
- Component integration patterns

---

## **📋 REACTIVE SYSTEM REQUIREMENTS**

### **Svelte 5 Runes Compatibility**
```typescript
// Must enable: $state
const state = $state({ count: 0 })

// Must enable: $derived
const doubled = $derived(() => state.count * 2)

// Must enable: $effect
$effect(() => {
  console.log('Count:', state.count)
})

// Must enable: $derived with dependencies
const computed = $derived(() => {
  if (state.enabled) {
    return state.count * 2
  }
  return 0
})
```

### **Effect.ts Integration**
```typescript
// Must enable: Async effects
$effect(() => {
  return Effect.gen(function*() {
    const data = yield* fetchData()
    updateUI(data)
  })
})

// Must enable: Async state
const asyncState = $asyncState(
  Effect.gen(function*() {
    const data = yield* fetchData()
    return processData(data)
  })
)
```

### **Component Integration**
```typescript
// Must enable: Reactive components
export function MyComponent() {
  const state = $state({ count: 0 })
  const doubled = $derived(() => state.count * 2)
  
  $effect(() => {
    console.log('Count changed:', state.count)
  })
  
  return <div>{doubled}</div>
}
```

---

## **🔗 REACTIVE SYSTEM ARCHITECTURE**

### **Core Reactive System**
```
packages/reactive/src/
├── runes/
│   ├── index.ts        # Core rune exports
│   ├── state.ts        # $state implementation
│   ├── derived.ts      # $derived implementation
│   └── effect.ts       # $effect implementation
├── state/
│   ├── index.ts        # State management
│   ├── container.ts    # State container
│   ├── subscription.ts # Subscription system
│   └── tracking.ts     # Change tracking
├── derived/
│   ├── index.ts        # Derived values
│   ├── computation.ts  # Computation engine
│   ├── dependencies.ts # Dependency tracking
│   └── memoization.ts  # Memoization system
├── effects/
│   ├── index.ts        # Effect system
│   ├── scheduler.ts    # Effect scheduler
│   ├── cleanup.ts      # Cleanup management
│   └── async.ts        # Async effect handling
├── components/
│   ├── index.ts        # Component integration
│   ├── reactive.ts     # Reactive components
│   ├── hooks.ts        # Component hooks
│   └── lifecycle.ts    # Lifecycle integration
├── integration/
│   ├── index.ts        # Effect.ts integration
│   ├── async.ts        # Async operations
│   ├── errors.ts       # Error handling
│   └── resources.ts    # Resource management
├── utils/
│   ├── index.ts        # Utility functions
│   ├── collections.ts  # Collection utilities
│   ├── debug.ts        # Debug utilities
│   └── validation.ts   # Validation utilities
└── __tests__/
    ├── state.test.ts
    ├── derived.test.ts
    ├── effects.test.ts
    └── integration.test.ts
```

### **Reactive Value Types**
```typescript
// State containers
export interface State<T> {
  readonly value: T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(fn: (value: T) => void): () => void
}

// Derived values
export interface Derived<T> {
  readonly value: T
  subscribe(fn: (value: T) => void): () => void
}

// Effect cleanup
export interface EffectCleanup {
  (): void
}
```

---

## **🎯 INTEGRATION ANALYSIS**

### **Component Integration Points**
- **State Management**: Components must access reactive state
- **Lifecycle Hooks**: Integration with component lifecycle
- **Prop Handling**: Reactive prop processing
- **Event Handling**: Reactive event handling

### **JSX Integration Points**
- **Rune Detection**: JSX must detect runes in props
- **State Binding**: JSX must bind state to components
- **Reactive Rendering**: JSX must re-render on state changes
- **Component Lifecycle**: JSX must integrate with component lifecycle

### **Effect.ts Integration Points**
- **Async Operations**: Handle async operations with Effect.ts
- **Error Handling**: Integrate with Effect.ts error handling
- **Resource Management**: Manage resources with Effect.ts
- **Effect Composition**: Compose effects with reactive values

### **CLI Integration Points**
- **Command State**: CLI commands must access reactive state
- **Configuration**: CLI configuration must be reactive
- **Plugin State**: Plugin state must be reactive
- **User Input**: User input must update reactive state

---

## **📊 PERFORMANCE REQUIREMENTS**

### **State Operations**
- State updates: <1ms
- State subscriptions: <0.5ms
- State notifications: <0.5ms
- Memory usage: <1MB per 1000 states

### **Derived Values**
- Derived calculations: <1ms
- Dependency tracking: <0.5ms
- Memoization: <0.5ms
- Cache management: <0.5ms

### **Effect System**
- Effect execution: <1ms
- Effect scheduling: <0.5ms
- Effect cleanup: <0.5ms
- Async effect handling: <2ms

### **Component Integration**
- Component state access: <0.5ms
- Component updates: <2ms
- Component lifecycle: <1ms
- Component cleanup: <1ms

---

## **⚠️ CRITICAL IMPLEMENTATION NOTES**

### **Type Safety Requirements**
- All reactive operations must be fully typed
- No `any` types allowed in reactive system
- Generic constraints for reactive values
- Type-safe state updates and derivations

### **Performance Requirements**
- State updates <1ms
- Derived calculations <1ms
- Effect execution <1ms
- No memory leaks in reactive system

### **Integration Requirements**
- Full integration with Effect.ts
- Seamless component integration
- JSX runtime integration
- CLI system integration

### **Error Handling Requirements**
- Reactive errors must not crash the system
- Graceful degradation when reactive operations fail
- Error recovery and retry mechanisms
- Proper error propagation through reactive chains

---

## **🎯 SUCCESS VALIDATION**

### **Kitchen-Sink Demo Compliance**
- [ ] `$state` works exactly as specified
- [ ] `$derived` works exactly as specified
- [ ] `$effect` works exactly as specified
- [ ] Component integration works
- [ ] Effect.ts integration works

### **API Compliance**
- [ ] Rune interfaces match specification
- [ ] State management works as specified
- [ ] Derived values work as specified
- [ ] Effect system works as specified

### **Performance Compliance**
- [ ] All operations meet performance requirements
- [ ] No performance regressions
- [ ] Memory usage is controlled
- [ ] System remains responsive

---

**Next Steps**: Read these files in order, then proceed with SUBTASK_SPECS.md implementation.