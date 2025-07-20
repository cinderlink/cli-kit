# Task 1F: Component Base System

## **Mission**: Create component foundation with lifecycle management supporting all kitchen-sink demo patterns

### **Context & Why This Matters**
The kitchen-sink demo shows complex component interactions requiring a robust component system. This task creates the foundation for TUIX's component architecture, enabling lifecycle management, props handling, state integration, and reactive capabilities.

---

## **🎯 Subtask 1F.1: Component Base Interface**
**Location**: `packages/components/src/base/index.ts`

### **What You're Building**
Core component interface and base implementation providing the foundation for all TUIX components.

### **Requirements**
- Define Component interface with lifecycle methods
- Create base component class with common functionality
- Support generic props and state types
- Integrate with Effect.ts for async operations
- Provide lifecycle hook system

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: Component interface
export interface Component<Props = {}, State = {}> {
  init(props: Props): Effect.Effect<State, ComponentError, never>
  update(props: Props, state: State): Effect.Effect<State, ComponentError, never>
  render(props: Props, state: State): JSX.Element
  cleanup?(state: State): Effect.Effect<void, ComponentError, never>
}

// Must enable: Base component class
export abstract class BaseComponent<Props = {}, State = {}> implements Component<Props, State> {
  protected state: State
  protected props: Props
  protected mounted: boolean
  protected effects: Effect.Effect<any, any, any>[]
  
  abstract init(props: Props): Effect.Effect<State, ComponentError, never>
  abstract render(props: Props, state: State): JSX.Element
  
  update(props: Props, state: State): Effect.Effect<State, ComponentError, never> {
    return Effect.succeed(state)
  }
  
  cleanup?(state: State): Effect.Effect<void, ComponentError, never> {
    return Effect.succeed(void 0)
  }
}
```

---

## **🎯 Subtask 1F.2: Component Lifecycle System**
**Location**: `packages/components/src/lifecycle/index.ts`

### **What You're Building**
Component lifecycle management system handling mount, update, and unmount phases.

### **Requirements**
- Create lifecycle manager with phase tracking
- Support lifecycle hooks (onMount, onUpdate, onUnmount)
- Handle async lifecycle operations with Effect.ts
- Integrate with reactive system
- Provide lifecycle event system

### **Expected Patterns**
```typescript
// Must enable: Lifecycle manager
export interface LifecycleManager {
  mount<Props, State>(component: Component<Props, State>, props: Props): Effect.Effect<State, ComponentError, never>
  update<Props, State>(component: Component<Props, State>, props: Props, state: State): Effect.Effect<State, ComponentError, never>
  unmount<State>(component: Component<any, State>, state: State): Effect.Effect<void, ComponentError, never>
}

// Must enable: Lifecycle hooks
export interface LifecycleHooks<Props, State> {
  onMount?(props: Props, state: State): Effect.Effect<void, ComponentError, never>
  onUpdate?(props: Props, state: State, prevState: State): Effect.Effect<void, ComponentError, never>
  onUnmount?(state: State): Effect.Effect<void, ComponentError, never>
  onError?(error: ComponentError, state: State): Effect.Effect<State, ComponentError, never>
}
```

### **Lifecycle Phases**
1. **Initialization**: Component creation and prop processing
2. **Mounting**: Component mounting and state initialization
3. **Updating**: Props/state changes and re-rendering
4. **Unmounting**: Component cleanup and resource disposal
5. **Error Handling**: Error recovery and fallback rendering

---

## **🎯 Subtask 1F.3: Props and State Management**
**Location**: `packages/components/src/props/index.ts`

### **What You're Building**
Props and state management system with validation and transformation.

### **Requirements**
- Create props processing and validation
- Support state management with reactive integration
- Handle prop changes and state updates
- Integrate with reactive system
- Provide prop and state utilities

### **Expected Patterns**
```typescript
// Must enable: Props validation
export interface PropValidator<T> {
  validate(value: unknown): T
  transform?(value: T): T
  default?(): T
}

// Must enable: Props schema
export interface PropsSchema<T> {
  [K in keyof T]: PropValidator<T[K]>
}

// Must enable: State management
export interface ComponentState<T> {
  readonly value: T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(fn: (value: T) => void): () => void
}
```

### **Props Features**
- **Validation**: Type-safe prop validation
- **Transformation**: Prop value transformation
- **Defaults**: Default prop values
- **Change detection**: Detect prop changes
- **Reactive props**: Integration with reactive system

---

## **🎯 Subtask 1F.4: Component Registry System**
**Location**: `packages/components/src/registry/index.ts`

### **What You're Building**
Component registry system for component registration and discovery.

### **Requirements**
- Create component registry with registration
- Support component discovery and instantiation
- Handle component dependencies
- Integrate with plugin system
- Provide component metadata

### **Expected Patterns**
```typescript
// Must enable: Component registry
export interface ComponentRegistry {
  register<Props, State>(name: string, component: ComponentDefinition<Props, State>): void
  get<Props, State>(name: string): ComponentDefinition<Props, State> | undefined
  list(): string[]
  has(name: string): boolean
  unregister(name: string): void
}

// Must enable: Component definition
export interface ComponentDefinition<Props = {}, State = {}> {
  name: string
  component: Component<Props, State>
  schema?: PropsSchema<Props>
  metadata?: ComponentMetadata
  dependencies?: string[]
}
```

### **Registry Features**
- **Registration**: Register components with metadata
- **Discovery**: Find registered components
- **Instantiation**: Create component instances
- **Dependencies**: Handle component dependencies
- **Metadata**: Component metadata and documentation

---

## **🎯 Subtask 1F.5: Component Composition System**
**Location**: `packages/components/src/composition/index.ts`

### **What You're Building**
Component composition system enabling higher-order components and composition patterns.

### **Requirements**
- Create component composition utilities
- Support higher-order components
- Handle component wrapping and decoration
- Integrate with plugin system
- Provide composition patterns

### **Expected Patterns**
```typescript
// Must enable: Higher-order components
export interface HigherOrderComponent<Props, State> {
  (component: Component<Props, State>): Component<Props, State>
}

// Must enable: Component wrapper
export interface ComponentWrapper<Props, State> {
  wrap(component: Component<Props, State>): Component<Props, State>
  unwrap(component: Component<Props, State>): Component<Props, State>
}

// Must enable: Component composition
export function compose<Props, State>(
  ...components: Component<Props, State>[]
): Component<Props, State> {
  // Compose components together
}
```

### **Composition Features**
- **HOCs**: Higher-order component patterns
- **Wrapping**: Component wrapping and decoration
- **Composition**: Compose multiple components
- **Mixins**: Component mixin patterns
- **Decorators**: Component decorator patterns

---

## **🎯 Subtask 1F.6: Component Event System**
**Location**: `packages/components/src/events/index.ts`

### **What You're Building**
Component event system for inter-component communication.

### **Requirements**
- Create component event emitter
- Support event bubbling and capturing
- Handle custom event types
- Integrate with reactive system
- Provide event utilities

### **Expected Patterns**
```typescript
// Must enable: Component events
export interface ComponentEventEmitter {
  emit<T>(event: string, data: T): void
  on<T>(event: string, handler: (data: T) => void): () => void
  once<T>(event: string, handler: (data: T) => void): () => void
  off(event: string, handler?: Function): void
}

// Must enable: Event system
export interface ComponentEventSystem {
  createEmitter(): ComponentEventEmitter
  propagateEvent(event: ComponentEvent): void
  handleEvent(event: ComponentEvent): void
}
```

### **Event Features**
- **Event emission**: Emit custom events
- **Event handling**: Handle component events
- **Event bubbling**: Event propagation
- **Event types**: Type-safe event system
- **Event utilities**: Event utility functions

---

## **🎯 Subtask 1F.7: Component Testing Framework**
**Location**: `packages/components/src/testing/index.ts`

### **What You're Building**
Testing framework and utilities for component testing.

### **Requirements**
- Create component testing utilities
- Support component rendering and interaction
- Handle lifecycle testing
- Integrate with testing system
- Provide testing patterns

### **Expected Patterns**
```typescript
// Must enable: Component testing
export interface ComponentTestHarness<Props, State> {
  render(props: Props): Promise<ComponentTestResult<State>>
  update(props: Props): Promise<ComponentTestResult<State>>
  unmount(): Promise<void>
  getState(): State
  getProps(): Props
}

// Must enable: Test utilities
export interface ComponentTestUtils {
  createHarness<Props, State>(component: Component<Props, State>): ComponentTestHarness<Props, State>
  mockComponent<Props, State>(name: string): Component<Props, State>
  simulateEvent(event: ComponentEvent): void
}
```

### **Testing Features**
- **Component rendering**: Test component rendering
- **Lifecycle testing**: Test component lifecycle
- **Event testing**: Test component events
- **State testing**: Test component state
- **Integration testing**: Test component integration

---

## **🎯 Subtask 1F.8: Built-in Components**
**Location**: `packages/components/src/builtin/`

### **What You're Building**
Built-in components demonstrating the component system capabilities.

### **Requirements**
- Create essential UI components
- Demonstrate component patterns
- Show lifecycle management
- Integrate with reactive system
- Provide component examples

### **Built-in Components**
```typescript
// Must enable: Basic components
export class Text extends BaseComponent<TextProps, TextState> {
  // Text component implementation
}

export class Box extends BaseComponent<BoxProps, BoxState> {
  // Box component implementation
}

export class Button extends BaseComponent<ButtonProps, ButtonState> {
  // Button component implementation
}
```

### **Component Features**
- **Text**: Text rendering and styling
- **Box**: Container with layout
- **Button**: Interactive button
- **Input**: Text input handling
- **List**: List rendering

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `kitchen-sink-demo/src/components/` - All component patterns to enable
2. `src/components/` - Current component implementation
3. `src/core/types.ts` - Core type definitions
4. `src/reactivity/` - Reactive system integration
5. `src/jsx-runtime.ts` - JSX integration points

### **Integration Points**
- **Core System**: Must integrate with TUIX core
- **Reactive System**: Must work with reactive values
- **JSX Runtime**: Must integrate with JSX rendering
- **Plugin System**: Must support plugin components
- **CLI System**: Must work with CLI components

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ 100% TypeScript (no `any` types)
- ✅ 95%+ test coverage
- ✅ All tests pass in <5ms each
- ✅ JSDoc comments for all public APIs

### **Functionality**
- ✅ All kitchen-sink demo patterns work
- ✅ Component lifecycle works correctly
- ✅ Props and state management works
- ✅ Event system works
- ✅ Testing framework works

### **Performance**
- ✅ Component rendering <2ms
- ✅ Lifecycle operations <1ms
- ✅ Event handling <1ms
- ✅ No memory leaks

---

## **⚠️ Critical Reminders**

1. **Follow kitchen-sink demo patterns exactly** - this is our component API reference
2. **Use Effect.ts throughout** - all async operations must be Effects
3. **No `any` types** - component system must be fully typed
4. **Fast operations** - component system must not impact performance
5. **Integration focus** - components must work with entire system

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1F.1.