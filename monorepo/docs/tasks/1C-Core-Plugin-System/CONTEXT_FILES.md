# Task 1C: Core Plugin System - Context Files

## **📁 CRITICAL CONTEXT FILES**

### **1. Kitchen-Sink Demo Plugin Usage (TRUE NORTH)**
**Location**: `docs/audit/solutions/kitchen-sink-demo/src/plugins/kitchen-sink.tsx`
**Why Critical**: This shows the exact plugin patterns we must enable

**Key Patterns**:
```typescript
// Must enable: Component-based plugin registration
<ProcessManagerPlugin as="pm" />

// Must enable: Plugin customization
<ProcessManagerPlugin 
  as="pm"
  processWrapper={({ children, process }) => (
    <CustomLayout>{children}</CustomLayout>
  )}
/>

// Must enable: Plugin composition
<>
  <ProcessManagerPlugin as="pm" />
  <LoggerPlugin />
  <ThemePlugin />
</>
```

**What to Look For**:
- Plugin component interfaces
- Plugin prop patterns
- Plugin composition patterns
- Plugin lifecycle expectations

---

### **2. Kitchen-Sink Demo Plugin Integration**
**Location**: `docs/audit/solutions/kitchen-sink-demo/src/index.tsx`
**Why Critical**: Shows how plugins integrate with the overall system

**Key Patterns**:
```typescript
// Must enable: Plugin registration in CLI
<CLI name="kitchen-sink" alias="ks">
  {({ config }) => (
    <>
      <ProcessManagerPlugin as="pm" />
      <LoggerPlugin />
      <DashboardCommand config={config} />
    </>
  )}
</CLI>
```

**What to Look For**:
- Plugin registration context
- Plugin interaction with CLI
- Plugin configuration patterns
- Plugin dependency management

---

### **3. Current Plugin Implementation**
**Location**: `src/cli/plugin.ts`
**Why Critical**: Shows existing plugin patterns to build upon

**Key Sections**:
- Plugin interface definitions
- Plugin registration system
- Plugin loading and discovery
- Plugin lifecycle management

**What to Look For**:
- Current plugin API design
- Implementation patterns to preserve
- Integration points with CLI system
- Error handling approaches

---

### **4. Core Types and Interfaces**
**Location**: `src/core/types.ts`
**Why Critical**: Defines core interfaces plugins must integrate with

**Key Interfaces**:
- Component interface
- Service interfaces
- Effect types and patterns
- Error type definitions

**What to Look For**:
- Type patterns to follow
- Interface extension points
- Effect integration requirements
- Error handling standards

---

### **5. Error Handling Patterns**
**Location**: `src/core/errors.ts`
**Why Critical**: Defines error handling patterns for plugins

**Key Patterns**:
- Tagged union error types
- Error discrimination
- Effect error channels
- Error recovery strategies

**What to Look For**:
- Error type structure
- Error handling conventions
- Effect error channel usage
- Recovery pattern examples

---

### **6. Component Base System**
**Location**: `src/components/base.ts`
**Why Critical**: Shows component patterns plugins must integrate with

**Key Patterns**:
- Component lifecycle
- Component props and state
- Component Effect integration
- Component testing patterns

**What to Look For**:
- Component interface compliance
- Lifecycle hook integration
- Props and state management
- Effect usage in components

---

### **7. CLI System Integration**
**Location**: `src/cli/index.ts`
**Why Critical**: Shows how plugins integrate with CLI system

**Key Patterns**:
- CLI component registration
- Command routing and execution
- Plugin discovery and loading
- Configuration management

**What to Look For**:
- CLI extension points
- Plugin registration flow
- Command routing patterns
- Configuration patterns

---

## **📋 PLUGIN SYSTEM REQUIREMENTS**

### **Plugin Interface Requirements**
```typescript
// From kitchen-sink-demo patterns
export interface Plugin {
  name: string
  version: string
  init: Effect.Effect<void, PluginError, PluginDeps>
  destroy: Effect.Effect<void, PluginError, never>
  hooks: Record<string, Hook>
  signals: Record<string, Signal>
  metadata: PluginMetadata
}
```

### **Plugin Component Requirements**
```typescript
// Must enable kitchen-sink patterns
export interface PluginComponent {
  (props: PluginProps): JSX.Element
}

// Must support customization
export interface PluginProps {
  as?: string
  [key: string]: any
}
```

### **Hook System Requirements**
```typescript
// Must support before/after/around patterns
export interface Hook {
  before?: Effect.Effect<void, never, HookContext>
  after?: Effect.Effect<void, never, HookContext>
  around?: (next: Effect.Effect<void, never, never>) => Effect.Effect<void, never, HookContext>
}
```

### **Signal System Requirements**
```typescript
// Must support type-safe communication
export interface Signal {
  emit: <T>(data: T) => Effect.Effect<void, SignalError, never>
  subscribe: <T>(handler: SignalHandler<T>) => Effect.Effect<Subscription, SignalError, never>
}
```

---

## **🔗 INTEGRATION ANALYSIS**

### **CLI Integration Points**
- **Command Registration**: Plugins must register new commands
- **Route Handling**: Plugins must extend routing
- **Configuration**: Plugins must access and modify config
- **Lifecycle**: Plugins must integrate with CLI lifecycle

### **Component Integration Points**
- **Component Registration**: Plugins must register new components
- **Props and State**: Plugins must work with component state
- **Lifecycle Hooks**: Plugins must integrate with component lifecycle
- **Event Handling**: Plugins must handle component events

### **Service Integration Points**
- **Service Access**: Plugins must access terminal, input, renderer services
- **Service Extension**: Plugins must extend service functionality
- **Service Configuration**: Plugins must configure service behavior
- **Service Lifecycle**: Plugins must manage service lifecycle

### **Reactivity Integration Points**
- **Runes Support**: Plugins must work with $state, $derived, $effect
- **Reactive Components**: Plugins must create reactive components
- **State Management**: Plugins must manage reactive state
- **Effect Composition**: Plugins must compose with reactive effects

---

## **📊 PLUGIN SYSTEM ARCHITECTURE**

### **Core Plugin System**
```
packages/core/src/plugin/
├── types.ts        # Plugin interfaces and types
├── registry.ts     # Plugin registration system
├── hooks.ts        # Hook system implementation
├── signals.ts      # Signal system implementation
├── components.ts   # Plugin component system
├── errors.ts       # Plugin error handling
├── builtin/        # Built-in plugin examples
└── __tests__/      # Plugin testing framework
```

### **Plugin Categories**
1. **System Plugins**: Core functionality (ProcessManager, Logger)
2. **UI Plugins**: Interface enhancements (Theme, Layout)
3. **Service Plugins**: Service extensions (Storage, Network)
4. **Development Plugins**: Development tools (Debug, Metrics)

### **Plugin Lifecycle**
1. **Discovery**: Find and load plugin files
2. **Registration**: Register plugin with system
3. **Initialization**: Initialize plugin resources
4. **Activation**: Activate plugin functionality
5. **Deactivation**: Deactivate plugin functionality
6. **Cleanup**: Clean up plugin resources

---

## **⚠️ CRITICAL IMPLEMENTATION NOTES**

### **Type Safety Requirements**
- All plugin operations must be fully typed
- No `any` types allowed in plugin system
- Generic constraints for plugin customization
- Type-safe hook and signal systems

### **Performance Requirements**
- Plugin loading <10ms
- Hook execution <1ms
- Signal emission <1ms
- No memory leaks in plugin lifecycle

### **Error Handling Requirements**
- Plugin errors must not crash the system
- Graceful degradation when plugins fail
- Plugin isolation and sandboxing
- Error recovery and retry mechanisms

### **Testing Requirements**
- 95%+ test coverage for plugin system
- Plugin testing utilities and frameworks
- Integration testing with CLI and components
- Performance testing for plugin operations

---

## **🎯 SUCCESS VALIDATION**

### **Kitchen-Sink Demo Compliance**
- [ ] `<ProcessManagerPlugin as="pm" />` works exactly
- [ ] Plugin customization props work
- [ ] Plugin composition works
- [ ] Plugin lifecycle works

### **API Compliance**
- [ ] Plugin interface matches specification
- [ ] Hook system works as specified
- [ ] Signal system works as specified
- [ ] Component integration works

### **Performance Compliance**
- [ ] Plugin operations meet performance requirements
- [ ] No performance regressions
- [ ] Memory usage is controlled
- [ ] System remains responsive

---

**Next Steps**: Read these files in order, then proceed with SUBTASK_SPECS.md implementation.