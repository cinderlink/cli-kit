# Task 1A: Core Type System Tests

## **Mission**: Create comprehensive type tests for TUIX core interfaces

### **Context & Why This Matters**
The audit found **96.7% missing test coverage** and identified core type system gaps. This task establishes the foundation for type safety throughout the framework. Without proper type tests, we cannot ensure the plugin system, component interfaces, and service contracts work correctly.

---

## **🎯 Subtask 1A.1: Component Type Tests**
**File**: `packages/core/src/types/component.test.ts`

### **What You're Building**
Comprehensive tests for the core Component interface that all TUIX components must implement.

### **Requirements**
- Test `Component<Model, Msg>` interface with proper generic constraints
- Verify `init`, `update`, `view`, `subscriptions` type signatures
- Test Effect return types and error handling
- Ensure Model extends object, Msg extends { tag: string }

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Based on kitchen-sink-demo/src/components/ProcessStarter.tsx
interface Component<Model extends object, Msg extends { tag: string }> {
  init: Effect.Effect<Model, never, never>
  update: (msg: Msg, model: Model) => Effect.Effect<Model, never, never>
  view: (model: Model) => JSX.Element
  subscriptions?: (model: Model) => Effect.Effect<void, never, never>
}
```

### **Test Cases Required**
1. **Generic Constraints**: Model must extend object, Msg must have tag
2. **Init Function**: Returns Effect with Model, no errors, no requirements
3. **Update Function**: Takes Msg + Model, returns Effect with Model  
4. **View Function**: Takes Model, returns JSX.Element
5. **Subscriptions**: Optional, returns Effect<void>

---

## **🎯 Subtask 1A.2: Plugin Type Tests**
**File**: `packages/core/src/types/plugin.test.ts`

### **What You're Building**
Type tests for the plugin system that enables TUIX's extensibility.

### **Requirements**
- Test Plugin interface with hooks, signals, lifecycle methods
- Verify plugin registration and discovery type safety
- Test hook types (before/after/around patterns)
- Test signal types for inter-plugin communication

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Based on kitchen-sink-demo/src/plugins/kitchen-sink.tsx
interface Plugin {
  name: string
  version: string
  init: Effect.Effect<void, PluginError, never>
  hooks: Record<string, Hook>
  signals: Record<string, Signal>
}
```

### **Test Cases Required**
1. **Plugin Interface**: Name, version, init, hooks, signals
2. **Hook Types**: Before/after/around execution patterns
3. **Signal Types**: Type-safe inter-plugin communication  
4. **Error Handling**: Plugin-specific error types
5. **Registration**: Type-safe plugin discovery

---

## **🎯 Subtask 1A.3: Service Type Tests**
**File**: `packages/core/src/types/services.test.ts`

### **What You're Building**
Tests for service interfaces (Terminal, Input, Renderer, Storage) that provide core functionality.

### **Requirements**
- Test Terminal service interface (write, clear, resize)
- Test Input service interface (key events, mouse events)
- Test Renderer service interface (render, update regions)
- Test Storage service interface (get, set, delete)

### **Expected Patterns**
```typescript
interface TerminalService {
  write: (content: string) => Effect.Effect<void, TerminalError, never>
  clear: () => Effect.Effect<void, TerminalError, never>
  resize: (width: number, height: number) => Effect.Effect<void, TerminalError, never>
}
```

### **Test Cases Required**
1. **Terminal Service**: Write, clear, resize operations
2. **Input Service**: Keyboard and mouse event handling
3. **Renderer Service**: Component rendering and updates
4. **Storage Service**: Persistent data operations
5. **Error Types**: Service-specific error handling

---

## **🎯 Subtask 1A.4: Effect Integration Tests**
**File**: `packages/core/src/types/effects.test.ts`

### **What You're Building**
Tests ensuring all TUIX types integrate properly with Effect.ts patterns.

### **Requirements**
- Test Effect return types throughout the system
- Test error channel types (ComponentError, PluginError, etc.)
- Test requirement types for dependency injection
- Test Effect composition patterns

### **Expected Patterns**
```typescript
// All operations return Effects
type ComponentUpdate = Effect.Effect<Model, ComponentError, never>
type PluginInit = Effect.Effect<void, PluginError, PluginDeps>
type ServiceOperation = Effect.Effect<Result, ServiceError, ServiceDeps>
```

### **Test Cases Required**
1. **Effect Return Types**: Consistent across all interfaces
2. **Error Channels**: Specific error types for each domain
3. **Requirements**: Dependency injection patterns
4. **Composition**: Effects compose correctly
5. **Performance**: Effect usage doesn't impact performance

---

## **🎯 Subtask 1A.5: Error Type Tests**
**File**: `packages/core/src/types/errors.test.ts`

### **What You're Building**
Comprehensive error type system tests ensuring robust error handling.

### **Requirements**
- Test error type hierarchy and discrimination
- Test error serialization and deserialization
- Test error propagation through Effect channels
- Test error recovery patterns

### **Expected Patterns**
```typescript
// From src/core/errors.ts patterns
interface ComponentError {
  readonly _tag: 'ComponentError'
  readonly message: string
  readonly cause?: unknown
}
```

### **Test Cases Required**
1. **Error Hierarchy**: Tagged union types for discrimination
2. **Error Details**: Message, cause, context information
3. **Serialization**: Errors can be serialized/deserialized
4. **Propagation**: Errors flow correctly through Effects
5. **Recovery**: Error handling and recovery patterns

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `src/core/types.ts` - Current type definitions
2. `src/core/errors.ts` - Error type patterns
3. `src/components/base.ts` - Component implementation
4. `src/cli/plugin.ts` - Plugin patterns
5. `kitchen-sink-demo/src/` - All perfect API examples

### **Integration Points**
- **Components**: Must work with component lifecycle
- **Plugins**: Must support plugin architecture
- **Services**: Must integrate with service layer
- **Reactivity**: Must work with runes system
- **CLI**: Must support command building

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ 100% TypeScript (no `any` types)
- ✅ 95%+ test coverage
- ✅ All tests pass in <5ms each
- ✅ JSDoc comments for all test utilities

### **Test Quality**
- ✅ Tests edge cases and error conditions
- ✅ Tests generic constraints and inference
- ✅ Tests Effect integration patterns
- ✅ Tests follow existing patterns in codebase

### **Documentation Quality**
- ✅ Clear test descriptions and intentions
- ✅ Examples of correct and incorrect usage
- ✅ Integration with existing test utilities
- ✅ Performance benchmarks where relevant

---

## **⚠️ Critical Reminders**

1. **Follow kitchen-sink-demo patterns exactly** - this is our API reference
2. **Use Effect.ts throughout** - all async operations must be Effects
3. **No `any` types** - this task is about establishing type safety
4. **Fast tests** - type tests should execute in milliseconds
5. **Integration focus** - ensure types work across the whole system

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1A.1.