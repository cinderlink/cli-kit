# Task 1B: Monorepo Structure Migration - Context Files

## **📁 CRITICAL CONTEXT FILES**

### **1. Kitchen-Sink Demo (TRUE NORTH)**
**Location**: `docs/audit/solutions/kitchen-sink-demo/`
**Why Critical**: This is our API reference - all import patterns must be enabled

**Key Files**:
- `src/index.tsx` - Shows import patterns we must enable
- `src/commands/` - Command structure requiring @tuix/cli
- `src/components/` - Component patterns requiring @tuix/components
- `src/plugins/` - Plugin patterns requiring @tuix/core
- `package.json` - Dependencies we must support

**What to Look For**:
```typescript
// These imports must work after migration:
import { CLI, Command, Scope } from '@tuix/cli'
import { Box, Text, Table } from '@tuix/components'
import { $state, $derived, $effect } from '@tuix/reactive'
import { Component, Effect } from '@tuix/core'
```

---

### **2. Current Source Structure**
**Location**: `src/`
**Why Critical**: All code must be migrated to appropriate packages

**Key Directories**:
- `src/core/` → `packages/core/src/`
- `src/cli/` → `packages/cli/src/`
- `src/components/` → `packages/components/src/`
- `src/reactivity/` → `packages/reactive/src/`
- `src/services/` → `packages/services/src/`
- `src/layout/` → `packages/layout/src/`
- `src/styling/` → `packages/styling/src/`
- `src/testing/` → `packages/testing/src/`

**What to Look For**:
- Public exports (what each package should expose)
- Internal dependencies (how packages depend on each other)
- Test files (must move with their source code)
- Type definitions (must be properly exported)

---

### **3. Current Package Configuration**
**Location**: `package.json`
**Why Critical**: Dependencies and scripts must be adapted to monorepo

**Key Sections**:
- `dependencies` - What packages need
- `devDependencies` - What stays at root
- `scripts` - Build and test commands
- `exports` - How packages expose their APIs

**What to Look For**:
- Dependencies that should move to specific packages
- Scripts that need to work across packages
- Export patterns for ESM compatibility
- TypeScript configuration requirements

---

### **4. TypeScript Configuration**
**Location**: `tsconfig.json`
**Why Critical**: Must support project references and package building

**Key Sections**:
- `compilerOptions` - Shared configuration
- `paths` - Package alias mapping
- `references` - Project references for packages
- `include`/`exclude` - Package-specific includes

**What to Look For**:
- Path mapping for @tuix/* packages
- Project references for build optimization
- Shared compiler options
- Package-specific overrides

---

### **5. Examples and Usage**
**Location**: `examples/`
**Why Critical**: All must work with new import patterns

**Key Files**:
- `examples/button-showcase.ts` - Component imports
- `examples/git-dashboard.ts` - CLI patterns
- `examples/process-monitor.ts` - Service usage
- `examples/jsx-cli-demo.tsx` - JSX patterns

**What to Look For**:
- Import statements to update
- Usage patterns to verify
- Dependencies to package assignments
- Build requirements

---

### **6. Test Structure**
**Location**: `src/**/*.test.ts`
**Why Critical**: All tests must continue to pass

**Key Patterns**:
- Unit tests (move with source)
- Integration tests (may span packages)
- E2E tests (use new imports)
- Performance tests (verify no regressions)

**What to Look For**:
- Test imports to update
- Test utilities to package
- Cross-package test dependencies
- Performance benchmarks

---

### **7. Build and Development**
**Location**: `bunfig.toml`, build scripts
**Why Critical**: Development workflow must remain efficient

**Key Files**:
- `bunfig.toml` - Bun configuration
- `bin/` - CLI entry points
- Build scripts and tooling
- Development server configuration

**What to Look For**:
- Workspace configuration
- Build optimization
- Development hot-reloading
- CLI tool building

---

## **📋 PACKAGE-SPECIFIC CONTEXT**

### **@tuix/core Package**
**Source**: `src/core/`, `src/jsx-runtime.ts`
**Dependencies**: Effect.ts, basic Node.js types
**Exports**: Component, Plugin, Service interfaces, runtime, view system

### **@tuix/cli Package**
**Source**: `src/cli/`
**Dependencies**: @tuix/core, @tuix/components
**Exports**: CLI, Command, Scope components, parser, router

### **@tuix/components Package**
**Source**: `src/components/`
**Dependencies**: @tuix/core, @tuix/reactive
**Exports**: Box, Text, Table, Button, all UI components

### **@tuix/reactive Package**
**Source**: `src/reactivity/`
**Dependencies**: @tuix/core
**Exports**: $state, $derived, $effect, runes utilities

### **@tuix/services Package**
**Source**: `src/services/`
**Dependencies**: @tuix/core
**Exports**: TerminalService, InputService, renderer, storage

### **@tuix/layout Package**
**Source**: `src/layout/`
**Dependencies**: @tuix/core
**Exports**: Flexbox, Grid, Spacer, layout utilities

### **@tuix/styling Package**
**Source**: `src/styling/`
**Dependencies**: @tuix/core
**Exports**: Color, Gradient, Border, style rendering

### **@tuix/testing Package**
**Source**: `src/testing/`
**Dependencies**: @tuix/core, @tuix/components
**Exports**: TestHarness, test utilities, E2E patterns

---

## **🔗 DEPENDENCY ANALYSIS**

### **External Dependencies**
- `effect` - Core Effect.ts library (root)
- `@types/node` - Node.js types (root)
- `typescript` - TypeScript compiler (root)
- `bun-types` - Bun runtime types (root)

### **Internal Dependencies**
```
@tuix/core: (no internal deps)
@tuix/reactive: @tuix/core
@tuix/services: @tuix/core
@tuix/layout: @tuix/core
@tuix/styling: @tuix/core
@tuix/components: @tuix/core, @tuix/reactive
@tuix/cli: @tuix/core, @tuix/components
@tuix/testing: @tuix/core, @tuix/components
```

---

## **⚠️ CRITICAL MIGRATION NOTES**

### **Import Path Updates**
All imports must change from relative paths to package names:
```typescript
// Before
import { Component } from '../core/types'
import { Box } from '../components/Box'

// After
import { Component } from '@tuix/core'
import { Box } from '@tuix/components'
```

### **File Movement Rules**
1. **Keep related files together** - components with their tests
2. **Respect package boundaries** - no cross-package file access
3. **Maintain public APIs** - packages export only what's needed
4. **Update all references** - imports, tests, examples

### **Build Requirements**
1. **Bun workspace support** - packages must work with Bun
2. **TypeScript project references** - for efficient building
3. **Proper exports** - ESM and TypeScript declarations
4. **Development workflow** - hot reloading and testing

---

**Next Steps**: Read these files in order, then proceed with SUBTASK_SPECS.md implementation.