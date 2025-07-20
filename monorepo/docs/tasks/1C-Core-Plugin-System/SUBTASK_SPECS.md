# Task 1C: Core Plugin System

## **Mission**: Build plugin system enabling kitchen-sink demo extensibility patterns

### **Context & Why This Matters**
The kitchen-sink demo shows `<ProcessManagerPlugin as="pm" />` patterns requiring a robust plugin system. This task creates the foundation for TUIX's extensibility, enabling component-based plugins with hooks, signals, and lifecycle management.

---

## **🎯 Subtask 1C.1: Plugin Interface Definition**
**Location**: `packages/core/src/types/plugin.ts`

### **What You're Building**
Core plugin interface and type system enabling all plugin patterns from kitchen-sink demo.

### **Requirements**
- Define Plugin interface with hooks, signals, lifecycle
- Create hook types (before/after/around patterns)
- Define signal types for inter-plugin communication
- Create plugin metadata and discovery system
- Ensure Effect.ts integration throughout

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: <ProcessManagerPlugin as="pm" />
export interface Plugin {
  name: string
  version: string
  init: Effect.Effect<void, PluginError, PluginDeps>
  destroy: Effect.Effect<void, PluginError, never>
  hooks: Record<string, Hook>
  signals: Record<string, Signal>
  metadata: PluginMetadata
}

// Must enable: processWrapper customization
export interface PluginProps {
  as?: string
  [key: string]: any
}
```

### **Hook System Requirements**
```typescript
export interface Hook {
  before?: Effect.Effect<void, never, HookContext>
  after?: Effect.Effect<void, never, HookContext>
  around?: (next: Effect.Effect<void, never, never>) => Effect.Effect<void, never, HookContext>
}

export interface HookContext {
  pluginName: string
  hookName: string
  args: unknown[]
  result?: unknown
}
```

---

## **🎯 Subtask 1C.2: Plugin Registration System**
**Location**: `packages/core/src/plugin/registry.ts`

### **What You're Building**
Plugin registration and discovery system enabling dynamic plugin loading.

### **Requirements**
- Create plugin registry with Effect-based operations
- Support plugin discovery and loading
- Handle plugin dependencies and ordering
- Implement plugin lifecycle management
- Support plugin versioning and conflicts

### **Expected Patterns**
```typescript
export interface PluginRegistry {
  register: (plugin: Plugin) => Effect.Effect<void, PluginError, never>
  unregister: (name: string) => Effect.Effect<void, PluginError, never>
  get: (name: string) => Effect.Effect<Plugin, PluginError, never>
  list: () => Effect.Effect<Plugin[], never, never>
  resolve: (dependencies: string[]) => Effect.Effect<Plugin[], PluginError, never>
}
```

### **Plugin Loading Requirements**
```typescript
export interface PluginLoader {
  load: (path: string) => Effect.Effect<Plugin, PluginError, never>
  loadMany: (paths: string[]) => Effect.Effect<Plugin[], PluginError, never>
  discover: (directory: string) => Effect.Effect<string[], PluginError, never>
}
```

---

## **🎯 Subtask 1C.3: Hook System Implementation**
**Location**: `packages/core/src/plugin/hooks.ts`

### **What You're Building**
Hook system enabling plugins to extend TUIX behavior at runtime.

### **Requirements**
- Create hook manager with before/after/around patterns
- Support hook registration and execution
- Handle hook priorities and ordering
- Implement hook context and parameter passing
- Support async hooks with Effect.ts

### **Expected Patterns**
```typescript
export interface HookManager {
  register: (name: string, hook: Hook) => Effect.Effect<void, HookError, never>
  execute: (name: string, ...args: any[]) => Effect.Effect<any, HookError, never>
  executeBefore: (name: string, ...args: any[]) => Effect.Effect<void, HookError, never>
  executeAfter: (name: string, result: any, ...args: any[]) => Effect.Effect<void, HookError, never>
  executeAround: (name: string, next: Effect.Effect<any, never, never>) => Effect.Effect<any, HookError, never>
}
```

### **Hook Categories**
```typescript
export const HookNames = {
  COMPONENT_INIT: 'component:init',
  COMPONENT_UPDATE: 'component:update',
  COMPONENT_DESTROY: 'component:destroy',
  CLI_PARSE: 'cli:parse',
  CLI_EXECUTE: 'cli:execute',
  RENDER_BEFORE: 'render:before',
  RENDER_AFTER: 'render:after',
} as const
```

---

## **🎯 Subtask 1C.4: Signal System Implementation**
**Location**: `packages/core/src/plugin/signals.ts`

### **What You're Building**
Signal system enabling type-safe inter-plugin communication.

### **Requirements**
- Create signal manager with publish/subscribe patterns
- Support typed signals with schema validation
- Handle signal routing and filtering
- Implement signal history and replay
- Support async signal handlers with Effect.ts

### **Expected Patterns**
```typescript
export interface SignalManager {
  emit: <T>(name: string, data: T) => Effect.Effect<void, SignalError, never>
  subscribe: <T>(name: string, handler: SignalHandler<T>) => Effect.Effect<Subscription, SignalError, never>
  unsubscribe: (subscription: Subscription) => Effect.Effect<void, SignalError, never>
  once: <T>(name: string, handler: SignalHandler<T>) => Effect.Effect<void, SignalError, never>
}

export interface SignalHandler<T> {
  (data: T): Effect.Effect<void, never, never>
}
```

### **Signal Categories**
```typescript
export const SignalNames = {
  PROCESS_STARTED: 'process:started',
  PROCESS_STOPPED: 'process:stopped',
  LOG_MESSAGE: 'log:message',
  USER_INPUT: 'user:input',
  THEME_CHANGED: 'theme:changed',
} as const
```

---

## **🎯 Subtask 1C.5: Plugin Component System**
**Location**: `packages/core/src/plugin/components.ts`

### **What You're Building**
Component system enabling JSX-based plugin registration and configuration.

### **Requirements**
- Create PluginProvider component for plugin registration
- Support plugin configuration via props
- Handle plugin lifecycle in React-like manner
- Support plugin composition and dependencies
- Integrate with existing component system

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: <ProcessManagerPlugin as="pm" />
export interface PluginComponent {
  (props: PluginProps): JSX.Element
}

// Must enable: processWrapper customization
export interface ProcessManagerPluginProps {
  as?: string
  processWrapper?: (props: ProcessWrapperProps) => JSX.Element
  onProcessStart?: (process: Process) => void
  onProcessStop?: (process: Process) => void
}

export interface ProcessWrapperProps {
  children: JSX.Element
  process: Process
}
```

### **Plugin Registration Component**
```typescript
export function PluginProvider({ children, plugins }: PluginProviderProps): JSX.Element {
  // Register plugins and provide context
}

export function usePlugin(name: string): Plugin | undefined {
  // Hook to access registered plugins
}
```

---

## **🎯 Subtask 1C.6: Built-in Plugin Examples**
**Location**: `packages/core/src/plugin/builtin/`

### **What You're Building**
Example plugins demonstrating the plugin system capabilities.

### **Requirements**
- Create ProcessManagerPlugin matching kitchen-sink demo
- Create LoggerPlugin for logging integration
- Create ThemePlugin for theme management
- Create MetricsPlugin for performance monitoring
- Document plugin development patterns

### **ProcessManagerPlugin** (from kitchen-sink-demo)
```typescript
export interface ProcessManagerPlugin extends Plugin {
  name: 'process-manager'
  Component: (props: ProcessManagerPluginProps) => JSX.Element
  hooks: {
    'process:start': Hook
    'process:stop': Hook
    'process:restart': Hook
  }
  signals: {
    'process:started': Signal
    'process:stopped': Signal
    'process:error': Signal
  }
}
```

### **Plugin Development Guide**
```typescript
// Template for creating new plugins
export function createPlugin(config: PluginConfig): Plugin {
  return {
    name: config.name,
    version: config.version,
    init: Effect.succeed(void 0),
    destroy: Effect.succeed(void 0),
    hooks: config.hooks || {},
    signals: config.signals || {},
    metadata: config.metadata || {},
  }
}
```

---

## **🎯 Subtask 1C.7: Plugin Error Handling**
**Location**: `packages/core/src/plugin/errors.ts`

### **What You're Building**
Comprehensive error handling system for plugin operations.

### **Requirements**
- Define plugin-specific error types
- Create error recovery strategies
- Handle plugin loading failures
- Support plugin isolation and sandboxing
- Implement plugin health monitoring

### **Expected Patterns**
```typescript
export interface PluginError {
  readonly _tag: 'PluginError'
  readonly pluginName: string
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
}

export interface PluginLoadError extends PluginError {
  readonly _tag: 'PluginLoadError'
  readonly path: string
}

export interface PluginDependencyError extends PluginError {
  readonly _tag: 'PluginDependencyError'
  readonly dependencies: string[]
}
```

### **Error Recovery**
```typescript
export interface PluginErrorRecovery {
  retry: (error: PluginError) => Effect.Effect<void, PluginError, never>
  isolate: (pluginName: string) => Effect.Effect<void, never, never>
  restart: (pluginName: string) => Effect.Effect<void, PluginError, never>
}
```

---

## **🎯 Subtask 1C.8: Plugin Testing Framework**
**Location**: `packages/core/src/plugin/__tests__/`

### **What You're Building**
Testing utilities and framework for plugin development.

### **Requirements**
- Create plugin testing utilities
- Support plugin mocking and stubbing
- Test plugin lifecycle and interactions
- Test hook and signal systems
- Performance testing for plugin operations

### **Testing Utilities**
```typescript
export interface PluginTestUtils {
  createMockPlugin: (config: Partial<Plugin>) => Plugin
  createTestRegistry: () => PluginRegistry
  simulatePluginLoad: (plugin: Plugin) => Effect.Effect<void, never, never>
  assertPluginRegistered: (name: string) => void
  assertHookExecuted: (name: string, times: number) => void
}
```

### **Test Coverage Requirements**
- Plugin registration and lifecycle: 100%
- Hook system: 95%
- Signal system: 95%
- Error handling: 90%
- Component integration: 85%

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `kitchen-sink-demo/src/plugins/kitchen-sink.tsx` - Plugin usage patterns
2. `kitchen-sink-demo/src/index.tsx` - Plugin registration examples
3. `src/core/types.ts` - Current type definitions
4. `src/core/errors.ts` - Error handling patterns
5. `src/cli/plugin.ts` - Existing plugin code

### **Integration Points**
- **Components**: Plugins must integrate with component system
- **CLI**: Plugins must extend CLI functionality
- **Services**: Plugins must access service layer
- **Reactivity**: Plugins must work with runes system
- **Testing**: Plugins must be testable

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ 100% TypeScript (no `any` types)
- ✅ 95%+ test coverage
- ✅ All tests pass in <5ms each
- ✅ JSDoc comments for all public APIs

### **API Compliance**
- ✅ Kitchen-sink demo patterns work exactly
- ✅ Plugin customization works as specified
- ✅ Component-based plugin registration
- ✅ Hook and signal systems functional

### **Performance**
- ✅ Plugin loading <10ms
- ✅ Hook execution <1ms
- ✅ Signal emission <1ms
- ✅ No memory leaks in plugin lifecycle

---

## **⚠️ Critical Reminders**

1. **Follow kitchen-sink-demo patterns exactly** - this is our plugin API reference
2. **Use Effect.ts throughout** - all plugin operations must be Effects
3. **No `any` types** - plugin system must be fully typed
4. **Fast operations** - plugin system must not impact performance
5. **Component integration** - plugins must work with JSX patterns

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1C.1.