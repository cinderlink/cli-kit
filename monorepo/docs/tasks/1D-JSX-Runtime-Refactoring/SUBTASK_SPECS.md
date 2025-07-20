# Task 1D: JSX Runtime Refactoring

## **Mission**: Split 1557-line jsx-runtime.ts into focused modules while preserving all functionality

### **Context & Why This Matters**
The jsx-runtime.ts file is a monolithic 1557 lines mixing CLI building, component registration, plugin management, configuration, and core JSX transforms. This violates the Single Implementation Principle and makes the code difficult to maintain and test. This task refactors it into logical modules while preserving all kitchen-sink demo functionality.

---

## **🎯 Subtask 1D.1: CLI Building Module**
**Location**: `packages/jsx/src/cli/index.ts`

### **What You're Building**
Focused module for CLI building components and logic extracted from jsx-runtime.ts.

### **Requirements**
- Extract CLI, Command, Scope component logic
- Extract CLI configuration and management
- Extract command stack and routing logic
- Maintain all kitchen-sink demo CLI patterns
- Ensure full Effect.ts integration

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: CLI component with configuration
export function CLI(props: CLIProps): JSX.Element

// Must enable: Command registration
export function Command(props: CommandProps): JSX.Element

// Must enable: Scope grouping
export function Scope(props: ScopeProps): JSX.Element

// Must enable: CLI configuration
export interface CLIConfig {
  name: string
  alias?: string
  description?: string
  version?: string
}
```

### **Functions to Extract**
- `CLI` component function
- `Command` component function  
- `Scope` component function
- CLI configuration management
- Command stack operations
- CLI routing logic

---

## **🎯 Subtask 1D.2: Component Registration Module**
**Location**: `packages/jsx/src/components/index.ts`

### **What You're Building**
Component registration and management system extracted from jsx-runtime.ts.

### **Requirements**
- Extract component registration logic
- Extract component lifecycle management
- Extract component context and parent tracking
- Maintain all component patterns
- Ensure proper type safety

### **Expected Patterns**
```typescript
// Must enable: Component registration
export interface ComponentRegistry {
  register: (name: string, component: any) => void
  get: (name: string) => any
  list: () => string[]
}

// Must enable: Component context
export interface ComponentContext {
  type: 'plugin' | 'command' | 'component'
  id: string
  data: any
  parent?: any
  children: any[]
}
```

### **Functions to Extract**
- Component registration functions
- Component context management
- Component lifecycle functions
- Component stack operations
- Component parent tracking

---

## **🎯 Subtask 1D.3: Plugin System Module**
**Location**: `packages/jsx/src/plugins/index.ts`

### **What You're Building**
Plugin system management extracted from jsx-runtime.ts.

### **Requirements**
- Extract JSXPluginRegistry class
- Extract plugin configuration management
- Extract declarative plugin support
- Maintain all plugin patterns
- Ensure Effect.ts integration

### **Expected Patterns**
```typescript
// Must enable: Plugin registry
export class JSXPluginRegistry {
  private plugins: Map<string, any>
  private configurations: Map<string, Record<string, any>>
  private enabled: Map<string, boolean>
  private declarativePlugins: Map<string, any>
  
  register(name: string, plugin: any): void
  configure(name: string, config: any): void
  enable(name: string): void
  disable(name: string): void
}
```

### **Functions to Extract**
- JSXPluginRegistry class
- Plugin configuration functions
- Plugin enable/disable functions
- Declarative plugin support
- Plugin stack management

---

## **🎯 Subtask 1D.4: Configuration Management Module**
**Location**: `packages/jsx/src/config/index.ts`

### **What You're Building**
Configuration management system extracted from jsx-runtime.ts.

### **Requirements**
- Extract global config manager
- Extract configuration validation
- Extract template management
- Maintain all configuration patterns
- Ensure type safety

### **Expected Patterns**
```typescript
// Must enable: Config management
export interface ConfigManager {
  get(key: string): any
  set(key: string, value: any): void
  validate(config: any): boolean
  merge(config: any): void
}

// Must enable: Template management
export interface TemplateManager {
  register(name: string, template: any): void
  get(name: string): any
  list(): string[]
}
```

### **Functions to Extract**
- Global config manager
- Configuration validation
- Template management
- Config file operations
- Config merging logic

---

## **🎯 Subtask 1D.5: Core JSX Transform Module**
**Location**: `packages/jsx/src/runtime/index.ts`

### **What You're Building**
Core JSX transformation functions extracted from jsx-runtime.ts.

### **Requirements**
- Extract jsx and jsxs functions
- Extract Fragment support
- Extract element creation logic
- Maintain all JSX patterns
- Ensure performance optimization

### **Expected Patterns**
```typescript
// Must enable: JSX transformation
export function jsx(type: any, props: any, key?: any): JSX.Element
export function jsxs(type: any, props: any, key?: any): JSX.Element
export const Fragment: symbol

// Must enable: Element creation
export function createElement(type: any, props: any, ...children: any[]): JSX.Element
```

### **Functions to Extract**
- jsx function
- jsxs function
- Fragment support
- Element creation
- Props processing
- Children handling

---

## **🎯 Subtask 1D.6: Reactivity Integration Module**
**Location**: `packages/jsx/src/reactivity/index.ts`

### **What You're Building**
Reactivity system integration extracted from jsx-runtime.ts.

### **Requirements**
- Extract rune handling logic
- Extract state binding support
- Extract reactive props processing
- Maintain all reactivity patterns
- Ensure Svelte 5 compatibility

### **Expected Patterns**
```typescript
// Must enable: Rune handling
export function handleRune(rune: any): any
export function isBindableRune(value: any): boolean
export function isStateRune(value: any): boolean

// Must enable: State binding
export function bindState(state: any, props: any): void
export function processReactiveProps(props: any): any
```

### **Functions to Extract**
- Rune handling functions
- State binding logic
- Reactive props processing
- Bindable rune support
- State rune support

---

## **🎯 Subtask 1D.7: Utility Functions Module**
**Location**: `packages/jsx/src/utils/index.ts`

### **What You're Building**
Utility functions and helpers extracted from jsx-runtime.ts.

### **Requirements**
- Extract debug logging utilities
- Extract file system operations
- Extract string processing functions
- Extract validation utilities
- Maintain all utility patterns

### **Expected Patterns**
```typescript
// Must enable: Debug logging
export function debug(message: string, ...args: any[]): void
export function createDebugLogger(namespace: string): DebugLogger

// Must enable: File operations
export function loadTemplate(path: string): Promise<any>
export function saveConfig(path: string, config: any): Promise<void>
```

### **Functions to Extract**
- Debug logging functions
- File system operations
- String processing
- Validation utilities
- Helper functions

---

## **🎯 Subtask 1D.8: Integration and Main Export**
**Location**: `packages/jsx/src/index.ts`

### **What You're Building**
Main export file integrating all modules and providing the public API.

### **Requirements**
- Import all modules
- Export public API
- Maintain backward compatibility
- Ensure proper initialization
- Preserve all functionality

### **Expected Patterns**
```typescript
// Must enable: Main API exports
export { jsx, jsxs, Fragment } from './runtime'
export { CLI, Command, Scope } from './cli'
export { JSXPluginRegistry } from './plugins'
export { ConfigManager } from './config'

// Must enable: Kitchen-sink demo compatibility
export * from './runtime'
export * from './cli'
export * from './components'
export * from './plugins'
```

### **Integration Requirements**
- All modules work together
- No circular dependencies
- Proper initialization order
- All tests pass
- Performance maintained

---

## **🎯 Subtask 1D.9: Testing Migration**
**Location**: `packages/jsx/src/__tests__/`

### **What You're Building**
Comprehensive test suite for all refactored modules.

### **Requirements**
- Test all modules independently
- Test integration between modules
- Test kitchen-sink demo patterns
- Maintain test coverage
- Ensure fast execution

### **Test Structure**
```
packages/jsx/src/__tests__/
├── cli.test.ts
├── components.test.ts
├── plugins.test.ts
├── config.test.ts
├── runtime.test.ts
├── reactivity.test.ts
├── utils.test.ts
└── integration.test.ts
```

### **Test Coverage Requirements**
- CLI module: 95%+
- Component module: 90%+
- Plugin module: 95%+
- Config module: 90%+
- Runtime module: 100%
- Reactivity module: 95%+
- Utils module: 90%+
- Integration: 85%+

---

## **🎯 Subtask 1D.10: Documentation and Examples**
**Location**: `packages/jsx/docs/`

### **What You're Building**
Documentation and examples for the refactored JSX system.

### **Requirements**
- Document all public APIs
- Provide usage examples
- Document migration guide
- Update kitchen-sink demo
- Ensure JSDoc comments

### **Documentation Structure**
```
packages/jsx/docs/
├── API.md
├── MIGRATION.md
├── EXAMPLES.md
├── PLUGINS.md
└── TROUBLESHOOTING.md
```

### **Documentation Requirements**
- Complete API reference
- Migration guide from old jsx-runtime.ts
- Usage examples for all modules
- Plugin development guide
- Troubleshooting guide

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `src/jsx-runtime.ts` - Current monolithic implementation
2. `kitchen-sink-demo/src/` - All JSX patterns to preserve
3. `src/core/types.ts` - Type definitions
4. `src/reactivity/runes.ts` - Reactivity system
5. `src/components/` - Component system integration

### **Integration Points**
- **Core System**: Must integrate with TUIX core
- **Components**: Must work with all components
- **Reactivity**: Must preserve rune functionality
- **CLI**: Must support all CLI patterns
- **Plugins**: Must integrate with plugin system

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ 100% TypeScript (no `any` types)
- ✅ 95%+ test coverage across all modules
- ✅ All tests pass in <5ms each
- ✅ JSDoc comments for all public APIs

### **Functionality**
- ✅ All kitchen-sink demo patterns work
- ✅ No functionality regressions
- ✅ All existing tests pass
- ✅ Performance maintained or improved

### **Architecture**
- ✅ Clean module separation
- ✅ No circular dependencies
- ✅ Proper concern separation
- ✅ Maintainable code structure

---

## **⚠️ Critical Reminders**

1. **Preserve all functionality** - no breaking changes allowed
2. **Follow kitchen-sink demo patterns exactly** - this is our API reference
3. **Maintain backward compatibility** - existing code must continue to work
4. **No `any` types** - maintain full type safety
5. **Test everything** - ensure no regressions

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1D.1.