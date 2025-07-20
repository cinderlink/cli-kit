# Task 1F: Component Base System - Context Files

## **📁 CRITICAL CONTEXT FILES**

### **1. Kitchen-Sink Demo Component Usage (TRUE NORTH)**
**Location**: `docs/audit/solutions/kitchen-sink-demo/src/components/`
**Why Critical**: Shows all component patterns we must enable

**Key Files**:
- `DashboardView.tsx` - Complex dashboard component
- `DatabaseProcessorView.tsx` - Database processing component
- `ProcessFilesView.tsx` - File processing component
- `SystemMonitorView.tsx` - System monitoring component
- `common/` - Common component patterns

**What to Look For**:
```typescript
// Must enable: Component with props and state
export function DashboardView({ config, args }: DashboardViewProps) {
  const [state, setState] = useState({ loading: true })
  
  useEffect(() => {
    // Component lifecycle
  }, [])
  
  return <Box>{/* Component rendering */}</Box>
}

// Must enable: Component composition
export function ComplexComponent() {
  return (
    <Box>
      <DashboardView config={config} />
      <SystemMonitorView />
    </Box>
  )
}
```

---

### **2. Current Component Implementation**
**Location**: `src/components/`
**Why Critical**: Shows current component patterns to build upon

**Key Files**:
- `base.ts` - Component base class
- `component.ts` - Component interface
- `lifecycle.ts` - Component lifecycle
- `Box.ts`, `Text.ts`, etc. - Individual components

**What to Look For**:
- Component interface definitions
- Base component implementation
- Lifecycle management patterns
- Props and state handling
- Integration with core system

---

### **3. Component Integration with Core**
**Location**: `src/core/`
**Why Critical**: Shows how components integrate with core system

**Key Files**:
- `types.ts` - Core type definitions
- `runtime.ts` - Runtime integration
- `view.ts` - View system integration
- `errors.ts` - Error handling

**What to Look For**:
- Component type definitions
- Runtime integration points
- View system integration
- Error handling patterns
- Effect.ts integration

---

### **4. Reactive System Integration**
**Location**: `src/reactivity/`
**Why Critical**: Shows how components integrate with reactive system

**Key Files**:
- `runes.ts` - Reactive system integration
- `lifecycle.ts` - Lifecycle integration
- Component reactive patterns

**What to Look For**:
- Reactive state integration
- Component lifecycle with reactive values
- Props and state reactivity
- Effect integration with components

---

### **5. JSX Runtime Integration**
**Location**: `src/jsx-runtime.ts`
**Why Critical**: Shows how components integrate with JSX system

**Key Sections**:
- Component registration
- Component rendering
- Props processing
- Component lifecycle in JSX

**What to Look For**:
- JSX component creation
- Props processing in JSX
- Component lifecycle in JSX
- Integration with JSX runtime

---

### **6. Styling System Integration**
**Location**: `src/styling/`
**Why Critical**: Shows how components integrate with styling

**Key Files**:
- `style.ts` - Style definitions
- `render.ts` - Style rendering
- `color.ts` - Color management

**What to Look For**:
- Style prop patterns
- Style application to components
- Color and theme integration
- Styling utilities

---

## **📋 COMPONENT SYSTEM REQUIREMENTS**

### **Component Interface Requirements**
```typescript
// Must enable: Component interface
export interface Component<Props = {}, State = {}> {
  init(props: Props): Effect.Effect<State, ComponentError, never>
  update(props: Props, state: State): Effect.Effect<State, ComponentError, never>
  render(props: Props, state: State): JSX.Element
  cleanup?(state: State): Effect.Effect<void, ComponentError, never>
}
```

### **Component Lifecycle Requirements**
```typescript
// Must enable: Lifecycle phases
export enum LifecyclePhase {
  INITIALIZING = 'initializing',
  MOUNTING = 'mounting',
  MOUNTED = 'mounted',
  UPDATING = 'updating',
  UNMOUNTING = 'unmounting',
  UNMOUNTED = 'unmounted',
  ERROR = 'error'
}
```

### **Props and State Requirements**
```typescript
// Must enable: Props validation
export interface PropValidator<T> {
  validate(value: unknown): T
  transform?(value: T): T
  default?(): T
}

// Must enable: State management
export interface ComponentState<T> {
  readonly value: T
  set(value: T): void
  update(fn: (value: T) => T): void
  subscribe(fn: (value: T) => void): () => void
}
```

---

## **🔗 COMPONENT SYSTEM ARCHITECTURE**

### **Component System Structure**
```
packages/components/src/
├── base/
│   ├── index.ts        # Component base interface
│   ├── component.ts    # Base component class
│   ├── types.ts        # Component type definitions
│   └── errors.ts       # Component error types
├── lifecycle/
│   ├── index.ts        # Lifecycle manager
│   ├── phases.ts       # Lifecycle phases
│   ├── hooks.ts        # Lifecycle hooks
│   └── events.ts       # Lifecycle events
├── props/
│   ├── index.ts        # Props management
│   ├── validation.ts   # Props validation
│   ├── schema.ts       # Props schema
│   └── utilities.ts    # Props utilities
├── registry/
│   ├── index.ts        # Component registry
│   ├── registration.ts # Component registration
│   ├── discovery.ts    # Component discovery
│   └── metadata.ts     # Component metadata
├── composition/
│   ├── index.ts        # Component composition
│   ├── hoc.ts          # Higher-order components
│   ├── wrapper.ts      # Component wrapping
│   └── patterns.ts     # Composition patterns
├── events/
│   ├── index.ts        # Event system
│   ├── emitter.ts      # Event emitter
│   ├── handler.ts      # Event handling
│   └── types.ts        # Event types
├── testing/
│   ├── index.ts        # Testing utilities
│   ├── harness.ts      # Test harness
│   ├── mocks.ts        # Mock utilities
│   └── assertions.ts   # Test assertions
├── builtin/
│   ├── index.ts        # Built-in components
│   ├── Text.ts         # Text component
│   ├── Box.ts          # Box component
│   ├── Button.ts       # Button component
│   └── Input.ts        # Input component
└── __tests__/
    ├── component.test.ts
    ├── lifecycle.test.ts
    ├── props.test.ts
    └── integration.test.ts
```

### **Component Lifecycle Flow**
```
1. Component Creation
   ↓
2. Props Processing
   ↓
3. State Initialization (init)
   ↓
4. Mount Phase
   ↓
5. Render Phase
   ↓
6. Update Phase (when props/state change)
   ↓
7. Unmount Phase
   ↓
8. Cleanup Phase
```

---

## **🎯 INTEGRATION ANALYSIS**

### **Core System Integration Points**
- **Types**: Component types must integrate with core types
- **Runtime**: Component runtime must integrate with core runtime
- **View**: Component rendering must integrate with view system
- **Errors**: Component errors must integrate with error handling

### **Reactive System Integration Points**
- **State**: Component state must integrate with reactive state
- **Props**: Component props must support reactive values
- **Effects**: Component effects must integrate with reactive effects
- **Lifecycle**: Component lifecycle must integrate with reactive lifecycle

### **JSX Runtime Integration Points**
- **Creation**: JSX must create components correctly
- **Props**: JSX must process component props
- **Rendering**: JSX must render components
- **Lifecycle**: JSX must handle component lifecycle

### **Plugin System Integration Points**
- **Registration**: Plugins must register components
- **Extension**: Plugins must extend components
- **Composition**: Plugins must compose components
- **Customization**: Plugins must customize components

---

## **📊 COMPONENT SYSTEM PERFORMANCE**

### **Performance Requirements**
- Component creation: <1ms
- Props processing: <0.5ms
- State updates: <0.5ms
- Lifecycle operations: <1ms
- Event handling: <0.5ms

### **Memory Requirements**
- Component instances: <10KB each
- Props and state: <1KB each
- Event listeners: <100B each
- Lifecycle hooks: <100B each

### **Rendering Performance**
- Component rendering: <2ms
- Props diffing: <0.5ms
- State diffing: <0.5ms
- Re-rendering: <1ms

---

## **⚠️ CRITICAL IMPLEMENTATION NOTES**

### **Type Safety Requirements**
- All component operations must be fully typed
- No `any` types allowed in component system
- Generic constraints for props and state
- Type-safe event system

### **Performance Requirements**
- Component operations must be fast
- No unnecessary re-renders
- Efficient props and state management
- Memory-efficient component instances

### **Integration Requirements**
- Full integration with core system
- Seamless reactive system integration
- JSX runtime integration
- Plugin system integration

### **Error Handling Requirements**
- Component errors must not crash the system
- Graceful degradation when components fail
- Error boundaries for component isolation
- Proper error recovery mechanisms

---

## **🎯 SUCCESS VALIDATION**

### **Kitchen-Sink Demo Compliance**
- [ ] All component patterns work exactly
- [ ] Component composition works
- [ ] Component lifecycle works
- [ ] Props and state management works
- [ ] Event system works

### **Integration Compliance**
- [ ] Core system integration works
- [ ] Reactive system integration works
- [ ] JSX runtime integration works
- [ ] Plugin system integration works

### **Performance Compliance**
- [ ] All operations meet performance requirements
- [ ] No performance regressions
- [ ] Memory usage is controlled
- [ ] Rendering is efficient

---

**Next Steps**: Read these files in order, then proceed with SUBTASK_SPECS.md implementation.