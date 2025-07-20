# Task 1B: Monorepo Structure Migration

## **Mission**: Create 8-package monorepo enabling kitchen-sink demo import patterns

### **Context & Why This Matters**
The kitchen-sink demo requires `import { CLI } from '@tuix/cli'` patterns but our current structure is a single package. This task creates the monorepo foundation enabling independent package development, proper dependency management, and production-ready module separation.

---

## **🎯 Subtask 1B.1: Core Package Structure**
**Location**: `packages/core/`

### **What You're Building**
The foundational package providing core types, runtime, and Effect.ts integration.

### **Requirements**
- Package name: `@tuix/core`
- Export core types (Component, Plugin, Service interfaces)
- Export runtime and view system
- Export Effect.ts patterns and utilities
- Export error types and handling

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: import { Component, Effect } from '@tuix/core'
export interface Component<Model extends object, Msg extends { tag: string }> {
  init: Effect.Effect<Model, never, never>
  update: (msg: Msg, model: Model) => Effect.Effect<Model, never, never>
  view: (model: Model) => JSX.Element
}
```

### **Package.json Requirements**
```json
{
  "name": "@tuix/core",
  "version": "1.0.0-rc.2",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

---

## **🎯 Subtask 1B.2: CLI Package Structure**
**Location**: `packages/cli/`

### **What You're Building**
The CLI building package providing command registration, routing, and execution.

### **Requirements**
- Package name: `@tuix/cli`
- Export CLI, Command, Scope components
- Export parser, router, and runner
- Export plugin system for CLI extensions
- Depend on @tuix/core, @tuix/components

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: import { CLI, Command, Scope } from '@tuix/cli'
export function CLI(props: CLIProps): JSX.Element
export function Command(props: CommandProps): JSX.Element
export function Scope(props: ScopeProps): JSX.Element
```

---

## **🎯 Subtask 1B.3: Components Package Structure**
**Location**: `packages/components/`

### **What You're Building**
The UI components package providing all terminal UI elements.

### **Requirements**
- Package name: `@tuix/components`
- Export all UI components (Box, Text, Table, etc.)
- Export component builders and lifecycle utilities
- Export mouse-aware and reactive components
- Depend on @tuix/core, @tuix/reactive

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: import { Box, Text, Table } from '@tuix/components'
export function Box(props: BoxProps): JSX.Element
export function Text(props: TextProps): JSX.Element
export function Table(props: TableProps): JSX.Element
```

---

## **🎯 Subtask 1B.4: Reactive Package Structure**
**Location**: `packages/reactive/`

### **What You're Building**
The reactivity package providing Svelte 5 runes integration.

### **Requirements**
- Package name: `@tuix/reactive`
- Export $state, $derived, $effect utilities
- Export runes-based component patterns
- Export lifecycle management for reactive components
- Depend on @tuix/core

### **Expected Patterns** (from kitchen-sink-demo)
```typescript
// Must enable: import { $state, $derived, $effect } from '@tuix/reactive'
export function $state<T>(initial: T): State<T>
export function $derived<T>(fn: () => T): Derived<T>
export function $effect(fn: () => void): void
```

---

## **🎯 Subtask 1B.5: Services Package Structure**
**Location**: `packages/services/`

### **What You're Building**
The services package providing terminal, input, renderer, and storage services.

### **Requirements**
- Package name: `@tuix/services`
- Export service interfaces and implementations
- Export service providers and dependency injection
- Export hit-test, focus, and mouse routing
- Depend on @tuix/core

### **Expected Patterns**
```typescript
// Must enable: import { TerminalService, InputService } from '@tuix/services'
export interface TerminalService {
  write: (content: string) => Effect.Effect<void, TerminalError, never>
  clear: () => Effect.Effect<void, TerminalError, never>
}
```

---

## **🎯 Subtask 1B.6: Layout Package Structure**
**Location**: `packages/layout/`

### **What You're Building**
The layout package providing flexbox, grid, and positioning systems.

### **Requirements**
- Package name: `@tuix/layout`
- Export layout components and utilities
- Export flexbox, grid, and spacer systems
- Export dynamic layout and join utilities
- Depend on @tuix/core

### **Expected Patterns**
```typescript
// Must enable: import { Flexbox, Grid, Spacer } from '@tuix/layout'
export function Flexbox(props: FlexboxProps): JSX.Element
export function Grid(props: GridProps): JSX.Element
```

---

## **🎯 Subtask 1B.7: Styling Package Structure**
**Location**: `packages/styling/`

### **What You're Building**
The styling package providing colors, gradients, borders, and rendering.

### **Requirements**
- Package name: `@tuix/styling`
- Export color utilities and types
- Export gradient and border systems
- Export style rendering and optimization
- Depend on @tuix/core

### **Expected Patterns**
```typescript
// Must enable: import { Color, Gradient, Border } from '@tuix/styling'
export type Color = string | { r: number; g: number; b: number }
export interface Gradient { /* ... */ }
```

---

## **🎯 Subtask 1B.8: Testing Package Structure**
**Location**: `packages/testing/`

### **What You're Building**
The testing package providing test utilities and harnesses.

### **Requirements**
- Package name: `@tuix/testing`
- Export test utilities and harnesses
- Export visual testing and input simulation
- Export E2E testing patterns
- Depend on @tuix/core, @tuix/components

### **Expected Patterns**
```typescript
// Must enable: import { TestHarness, simulateInput } from '@tuix/testing'
export class TestHarness { /* ... */ }
export function simulateInput(input: string): void
```

---

## **🎯 Subtask 1B.9: Root Package Configuration**
**Location**: `package.json`, `tsconfig.json`, etc.

### **What You're Building**
Monorepo root configuration enabling package development and building.

### **Requirements**
- Configure Bun workspaces for all packages
- Set up TypeScript project references
- Configure testing across all packages
- Set up build pipeline for all packages
- Maintain single package.json for dependencies

### **Expected Structure**
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run build:packages",
    "test": "bun test packages/*/src/**/*.test.ts",
    "dev": "bun run dev:packages"
  }
}
```

---

## **🎯 Subtask 1B.10: Migration Strategy**
**Location**: Throughout codebase

### **What You're Building**
Systematic migration of existing code to new package structure.

### **Requirements**
- Move src/ files to appropriate packages
- Update all import paths to use package names
- Maintain all existing functionality
- Ensure all tests still pass
- Update examples to use new imports

### **Migration Map**
```
src/core/ → packages/core/src/
src/cli/ → packages/cli/src/
src/components/ → packages/components/src/
src/reactivity/ → packages/reactive/src/
src/services/ → packages/services/src/
src/layout/ → packages/layout/src/
src/styling/ → packages/styling/src/
src/testing/ → packages/testing/src/
```

---

## **🔗 Dependencies & Integration**

### **Files You Must Read First**
1. `src/` - Current source structure to migrate
2. `package.json` - Current dependencies and scripts
3. `tsconfig.json` - Current TypeScript configuration
4. `kitchen-sink-demo/src/` - All import patterns to enable
5. `examples/` - All example files to update

### **Integration Points**
- **Build System**: Must work with Bun's package system
- **Testing**: All tests must continue to pass
- **Examples**: All examples must work with new imports
- **Development**: Must support efficient development workflow
- **Production**: Must support optimized production builds

---

## **🎯 Success Criteria**

### **Code Quality**
- ✅ All packages have proper TypeScript configuration
- ✅ All packages export their public APIs correctly
- ✅ All imports use proper package names
- ✅ No circular dependencies between packages

### **Functionality**
- ✅ All existing tests pass with new structure
- ✅ All examples work with new imports
- ✅ Kitchen-sink demo patterns are enabled
- ✅ Development workflow is efficient

### **Performance**
- ✅ Build times are reasonable (<30s for full build)
- ✅ Test execution is fast (<10s for all tests)
- ✅ Development server starts quickly (<5s)
- ✅ No performance regressions

---

## **⚠️ Critical Reminders**

1. **Follow kitchen-sink-demo patterns exactly** - enable all import patterns
2. **Maintain backward compatibility** - existing code must continue to work
3. **No functionality changes** - this is pure restructuring
4. **Test everything** - ensure no regressions
5. **Update all examples** - they must work with new imports

---

**Next Steps**: Read `CONTEXT_FILES.md` for specific file references, then start with Subtask 1B.1.