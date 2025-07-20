# SCOPE_FIX.md - Scope System Architecture Refactor

## Implementation Checklist

- [ ] Create core scope module structure (`src/scope/`)
- [ ] Implement scope manager with status tracking
- [ ] Create scope JSX components (Scope, ScopeContent, ScopeFallback)
- [ ] Create plugin module with scope wrappers (`src/plugins/`)
- [ ] Create CLI module with CommandLineScope (`src/cli/`)
- [ ] Remove ALL legacy implementations
- [ ] Update all imports and connective code
- [ ] Test with exemplar project

## Architecture Overview

### Module Organization
```
src/
├── scope/              # Core scope management
│   ├── manager.ts      # ScopeManager class
│   ├── types.ts        # ScopeDef, ScopeStatus types
│   └── jsx/
│       ├── components/
│       │   ├── Scope.tsx
│       │   ├── ScopeContent.tsx
│       │   ├── ScopeFallback.tsx
│       │   ├── Scoped.tsx
│       │   └── Unscoped.tsx
│       └── stores/
│           ├── currentScope.ts
│           ├── parentScope.ts
│           └── rootScope.ts
├── plugins/            # Plugin functionality
│   ├── scope/          # Plugin-specific scope wrappers
│   └── jsx/
│       ├── components/
│       │   ├── Plugin.tsx
│       │   └── LoadPlugin.tsx
│       └── stores/
│           ├── currentPlugin.ts
│           └── plugins.ts
├── cli/                # CLI functionality
│   ├── scope/          # CLI-specific scope wrappers
│   └── jsx/
│       ├── components/
│       │   ├── App.tsx
│       │   ├── CLI.tsx
│       │   ├── Command.tsx
│       │   ├── Arg.tsx
│       │   ├── Option.tsx
│       │   ├── CommandLineInput.tsx
│       │   ├── CommandLineScope.tsx
│       │   └── CommandLineHelp.tsx
│       └── stores/
│           └── cli.ts
└── jsx/                # JSX runtime updates
    ├── cli/
    │   └── helpers/
    └── scope/
        ├── getScope.ts
        ├── setScope.ts
        └── scopeExists.ts
```

## Current Implementation Analysis

### 1. Scope Implementation (`src/core/scope.ts`)
**Current State:**
- Has `ScopeContext` interface with id, type, name, path, children, handler, args, flags
- Has `ScopeStack` class that manages a stack of scopes
- Supports push/pop operations and parent-child relationships
- Has lifecycle hooks (onEnter, onExit, onChild) but they're Effect-based
- Can find scopes by path or ID
- Builds command trees for routing

**What Needs to Change:**
- Move to `src/scope/manager.ts` as `ScopeManager` class
- Add status tracking (mounted, rendered, executed)
- Add context data management per scope
- Add transient state management with reset capability
- Change activation model from stack-based to ID-based activation
- Add `isScopeActive()` that checks self or children
- Remove Effect-based lifecycle hooks in favor of simpler callbacks

### 2. JSX Runtime Scope Handling (`src/jsx/runtime.ts`)
**Current State:**
- Lines 1608-1749: Massive `case 'Scope':` that handles everything inline
- Mixes plugin/command registration with scope logic
- Uses `jsxScopeInterface` object (lines 2053-2194) with methods like `setScopeDef`, `notifyScopeActive`
- Has `scopeStates` Map tracking isInScope and hasRenderedChildren
- Tries to determine what to render based on children analysis

**What Needs to Change:**
- Remove ALL scope logic from runtime.ts
- Replace `case 'Scope':` with simple component rendering
- Move `jsxScopeInterface` functionality into scope module
- Remove `scopeStates` Map - use scope manager instead
- Let Scope components handle their own lifecycle

### 3. Plugin/Command Registration (`src/jsx/runtime.ts`)
**Current State:**
- Lines 1730-1741: `case 'Plugin':` wraps in Scope
- Lines 1744-1758: `case 'Command':` wraps in Scope
- Lines 1636-1682: Plugin/command registry logic inside Scope case
- Uses `pluginRegistry` to track commands and build hierarchy

**What Needs to Change:**
- Plugin.tsx and Command.tsx components should handle their own registration
- Remove wrapping logic from runtime.ts
- Components should use CommandLineScope internally
- Registration should happen through scope manager, not separate registry

### 4. Help System (`src/jsx/runtime.ts`)
**Current State:**
- Lines 1816-1919: `case 'Help':` component that renders help
- Tries to get scope info from `jsxScopeInterface`
- Manually builds help text with styling
- Uses `scope.children` to show subcommands

**What Needs to Change:**
- Move to `src/cli/jsx/components/CommandLineHelp.tsx`
- Use scope stores to get current scope info
- Should be used by `ScopeFallback` automatically
- Simplify to just query scope state

### 5. CLI App Integration (`src/jsx/app.ts`)
**Current State:**
- Lines 45-53: Exports CLI, Plugin, Command components as factory functions
- Lines 486-551: `render()` function builds command hierarchy from plugins
- Lines 769-786: Tries to show help when no handler found
- Complex command routing and execution logic

**What Needs to Change:**
- Import components from their new modules
- Remove command hierarchy building - let scope manager handle it
- Simplify routing to just activate scopes
- Let CommandLineScope handle help display

### 6. Plugin Registry (`src/jsx/runtime.ts`)
**Current State:**
- Lines 250-603: `PluginRegistry` class with command tracking
- Maintains stacks for plugins and commands
- Builds command hierarchy after processing
- Filters commands by scope

**What Needs to Change:**
- Should only track plugin metadata, not commands
- Command hierarchy should come from scope manager
- Remove scope filtering logic
- Simplify to just plugin loading/enabling

### 7. Exemplar Integration
**Current State:**
- Uses `<plugin>` and `<command>` JSX elements
- Expects help to show when running `bun ex dev`
- Auth commands showing in wrong scopes

**What Will Change:**
- Same JSX syntax but proper scope isolation
- Help will automatically show from ScopeFallback
- Scope activation will ensure only relevant commands show

## Connective Code Updates

### 1. Import Updates
**Files to Update:**
- `src/jsx/runtime.ts` - Remove scope logic, import Scope component
- `src/jsx/app.ts` - Import CLI components from new locations
- `src/index.ts` - Export new module structure
- All example files using CLI components

### 2. Type Updates
**Current Types to Migrate:**
- `ScopeContext` → `ScopeDef` in scope module
- `JSXCommandConfig` → Use scope-based command definition
- Remove `pluginCommands` and related types

### 3. Event System Integration
**Current:**
- `JSXScopeIntegration` in `src/core/jsx-scope-integration.ts`
- Events for plugin/command registration

**Updates Needed:**
- Scope manager should emit events for scope changes
- CLI module subscribes to scope events
- Remove JSX-specific scope integration

## Existing Architecture Conflicts

### Current Two-System Problem
From `docs/SCOPE_SYSTEM_ARCHITECTURE.md`, we currently have:
1. **Core Scope System** (`src/core/scope.ts`) - Runtime scope management
2. **JSX Scope Component** (scattered in runtime.ts) - UI rendering helpers

**This violates Single Implementation Principle!** We need ONE scope system, not two.

### What to Keep from Current Implementation
- `ScopeContext` interface structure (rename to `ScopeDef`)
- Parent-child relationship tracking
- Path computation logic
- Scope ID generation

### What to Remove
- Dual scope systems
- Effect-based lifecycle hooks in core (use simple callbacks)
- JSX-specific scope in runtime.ts
- `jsx-scope-integration.ts` (no need for integration when there's one system)
- Complex command tree building

## Alignment with Project Standards

### From `docs/alignment/NAMING_AND_ARCHITECTURE_RULES.md`:
1. **Single Implementation Principle** ✓
   - One scope system, no alternatives
   - Remove all legacy implementations

2. **No Qualifier Names** ✓
   - `Scope` not `SimpleScope` or `EnhancedScope`
   - `CommandLineHelp` not `BasicHelp`

3. **Proper Module Structure** ✓
   - Related functionality in subdirectories
   - Clear separation of concerns

### From `docs/alignment/TECHNOLOGY_DECISIONS.md`:
1. **Effect.ts Usage** ✓
   - Scope manager operations return Effects
   - Proper error handling with ScopeError types

2. **Svelte 5 Runes** ✓
   - Use `$state` for reactive scope state
   - Use `$derived` for computed scope properties

3. **TypeScript Patterns** ✓
   - Discriminated unions for scope types
   - No `any` types

## Migration Strategy

### Phase 1: Core Scope Module
1. Create directory structure
2. Implement ScopeManager with all methods
3. Create base Scope components
4. Add scope stores with runes

### Phase 2: CLI/Plugin Modules
1. Create CLI module structure
2. Implement CommandLineScope
3. Create Plugin module structure
4. Update component implementations

### Phase 3: Cleanup
1. Remove ALL legacy code
2. Update imports everywhere
3. Fix type errors
4. Test with exemplar

## Legacy Code to Remove

### Files to Delete Entirely
1. `src/core/jsx-scope-integration.ts` - No longer needed
2. `src/jsx/scope.ts` - If it exists
3. Any `-simple`, `-enhanced`, `-v2` variants found

### Code to Remove from Files
1. **`src/jsx/runtime.ts`**
   - Lines 1608-1749: Entire `case 'Scope':` block
   - Lines 2053-2194: `jsxScopeInterface` object
   - `scopeStates` Map and related logic
   - Plugin/command registration in Scope case

2. **`src/jsx/app.ts`**
   - Command hierarchy building logic
   - Complex help display logic
   - Plugin command aggregation

3. **`src/core/scope.ts`**
   - Move to `src/scope/manager.ts`
   - Remove Effect-based lifecycle hooks
   - Remove command tree building (scope manager just tracks hierarchy)

## Key Behavioral Changes

### Before:
- Commands registered during JSX processing
- Help shown by checking command.subcommands
- Scope tracked in multiple places
- Complex parent/child relationship management

### After:
- Commands register through scope lifecycle
- Help shown automatically by ScopeFallback
- Single source of truth in scope manager
- Passive scope tracking with reactive updates

## Implementation Order

### Step 1: Create Core Scope Module
1. Create `src/scope/` directory structure
2. Move and refactor `ScopeStack` → `ScopeManager`
3. Add status and context tracking
4. Create `ScopeDef` type (not `ScopeContext`)

### Step 2: Create Scope JSX Components
1. `src/scope/jsx/components/Scope.tsx` with lifecycle
2. `src/scope/jsx/components/ScopeContent.tsx`
3. `src/scope/jsx/components/ScopeFallback.tsx`
4. Scope stores with runes

### Step 3: Create CLI Module Components
1. `src/cli/jsx/components/CommandLineScope.tsx`
2. `src/cli/jsx/components/CommandLineHelp.tsx`
3. Move CLI, Command, Arg, Option components

### Step 4: Create Plugin Module
1. `src/plugins/jsx/components/Plugin.tsx`
2. Plugin-specific scope wrappers

### Step 5: Update Runtime and Cleanup
1. Remove ALL scope logic from runtime.ts
2. Update imports everywhere
3. Delete legacy files
4. Fix type errors

## Testing Plan

1. Unit tests for scope manager
2. Component tests for Scope/ScopeContent/ScopeFallback
3. Integration test with exemplar project
4. Verify help shows correctly at each scope level
5. Verify scope isolation (auth commands only in auth scope)