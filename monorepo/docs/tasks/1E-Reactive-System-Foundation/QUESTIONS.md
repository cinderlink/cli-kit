# Task 1E: Reactive System Foundation - Questions

## **❓ DEVELOPER QUESTIONS**

### **Template for New Questions**
```
**Q[Number]**: [Your question]
**Context**: [Specific files/code you're asking about]
**Impact**: [What this affects in your implementation]
**Status**: [waiting_for_response/answered]
```

---

## **📋 SAMPLE QUESTIONS** (Remove these when you add real questions)

### **Q1**: Rune implementation strategy
**Context**: `packages/reactive/src/runes/state.ts` - $state implementation
**Impact**: How should state containers track dependencies for derived values?
**Status**: `answered`

**Claude Response**: Use a dependency tracking system where each state container maintains a list of dependent derivations. When state changes, notify all dependents to recalculate. Use weak references to avoid memory leaks.

---

### **Q2**: Effect.ts integration approach
**Context**: `packages/reactive/src/integration/async.ts` - Async effects
**Impact**: How should async effects integrate with Effect.ts error handling?
**Status**: `answered`

**Claude Response**: Wrap async effects in Effect.gen and use Effect.ts error channels. Return cleanup functions that can cancel ongoing Effects. Use Effect.fork for non-blocking execution.

---

## **🔄 ACTIVE QUESTIONS** (Developer adds questions here)

### **Q[Number]**: [Your question here]
**Context**: [Specific files/code you're asking about]
**Impact**: [What this affects in your implementation]
**Status**: `waiting_for_response`

**Claude Response**: [Response will be added here]

---

## **✅ RESOLVED QUESTIONS**

### **Q[Number]**: [Resolved question]
**Context**: [Context]
**Impact**: [Impact]
**Status**: `answered`

**Claude Response**: [Response]
**Resolution**: [How you applied the answer]

---

## **📚 QUICK REFERENCE**

### **Rune System Patterns**
```typescript
// $state - Reactive state
const state = $state({ count: 0 })

// $derived - Computed values
const doubled = $derived(() => state.count * 2)

// $effect - Side effects
$effect(() => {
  console.log('Count:', state.count)
})

// Async effects
$effect(() => {
  return Effect.gen(function*() {
    const data = yield* fetchData()
    updateUI(data)
  })
})
```

### **State Management Patterns**
```typescript
// State container interface
export interface State<T> {
  readonly value: T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(fn: (value: T) => void): () => void
}

// State creation
export function $state<T>(initial: T): State<T> {
  return createState(initial)
}
```

### **Derived Values Patterns**
```typescript
// Derived interface
export interface Derived<T> {
  readonly value: T
  subscribe(fn: (value: T) => void): () => void
}

// Derived creation
export function $derived<T>(fn: () => T): Derived<T> {
  return createDerived(fn)
}
```

### **Effect System Patterns**
```typescript
// Effect cleanup interface
export interface EffectCleanup {
  (): void
}

// Effect creation
export function $effect(fn: () => void | EffectCleanup): void {
  const effect = createEffect(fn)
  registerEffect(effect)
}
```

---

## **🎯 IMPLEMENTATION GUIDELINES**

### **Rune System Design**
1. **Follow Svelte 5 patterns exactly**
2. **Use proxy-based reactivity for state**
3. **Implement dependency tracking for derived values**
4. **Support async effects with Effect.ts**
5. **Integrate with component lifecycle**

### **State Management**
1. **Immutable state updates**
2. **Efficient subscription management**
3. **Change tracking and notifications**
4. **Nested state support**
5. **Memory leak prevention**

### **Derived Values**
1. **Automatic dependency tracking**
2. **Memoization for performance**
3. **Lazy evaluation**
4. **Async derivations with Effect.ts**
5. **Error handling in derivations**

### **Effect System**
1. **Cleanup management**
2. **Effect scheduling and batching**
3. **Async effect support**
4. **Component lifecycle integration**
5. **Error handling and recovery**

---

## **⚠️ CRITICAL IMPLEMENTATION NOTES**

### **Performance Requirements**
- **State updates**: <1ms
- **Derived calculations**: <1ms
- **Effect execution**: <1ms
- **Memory usage**: <1MB per 1000 states

### **Type Safety**
- **No `any` types** in reactive system
- **Generic constraints** for reactive values
- **Type-safe state updates** and derivations
- **Proper error types** for reactive operations

### **Integration Requirements**
- **Effect.ts integration** for async operations
- **Component integration** for reactive components
- **JSX runtime integration** for reactive rendering
- **CLI system integration** for reactive commands

### **Error Handling**
- **Graceful degradation** when reactive operations fail
- **Error propagation** through reactive chains
- **Error recovery** and retry mechanisms
- **Proper error types** and error channels

---

**Guidelines for Questions**:
1. **Be specific** - reference exact files and line numbers
2. **Include context** - what you're trying to achieve
3. **Show impact** - how this affects your implementation
4. **One question per entry** - easier to track and resolve