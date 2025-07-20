# Scope System Refactor Rules

## Purpose and Vision

The goal of this refactor is to fix the core architectural issues in TUIX while building on its solid Effect.ts foundation. We are implementing a unified **Scope System** that provides:

1. **Hierarchical Context Management**: Clean parent/child relationships for plugins, commands, and components
2. **Plugin Nesting Support**: Fix the current broken plugin nesting in JSX runtime
3. **Effect-based Module Communication**: Replace direct imports with typed Effect streams
4. **Type-safe Extensibility**: Plugin system with proper isolation and safety guarantees

## Core Refactor Standards

### Single Implementation Principle ⚠️ CRITICAL RULE ⚠️
- **ONE VERSION RULE**: Never create multiple versions of the same feature during refactor
- **NO WORKAROUNDS**: Fix the real implementation instead of creating simplified versions
- **REPLACE, DON'T APPEND**: When improving code, replace the existing implementation entirely
- **DELETE CLONES**: Remove duplicate or backup implementations immediately

### Technology Requirements
- **Runtime**: Bun only (not Node.js)
- **Language**: TypeScript strict mode with Effect.ts patterns
- **UI**: JSX + Svelte 5 Runes (preferred approach)
- **Testing**: Bun test with component logic testing
- **Error Handling**: Effect.ts structured errors throughout

### Quality Gates
- **NO `any` TYPES**: Use proper TypeScript typing with discriminated unions
- **EFFECT INTEGRATION**: All async operations must use Effect.Effect<Success, Error, Requirements>
- **COMPREHENSIVE TESTING**: Every changed .ts file must have corresponding test coverage
- **JSDOC REQUIRED**: Every exported function, class, and interface must have JSDoc
- **NO DEVELOPMENT ARTIFACTS**: Remove .bak, .old, and backup files immediately

## What To Do After Making Changes

### Required Validation Steps
1. **Run Tests**: `bun test` - all tests must pass
2. **Type Check**: `bun run tsc --noEmit` - no TypeScript errors allowed
3. **Documentation**: Update JSDoc and relevant docs
4. **Integration Test**: Verify examples still work with changes
5. **Clean Up**: Remove any development artifacts

### Testing Requirements
- **Component Logic Tests**: Use `tests/e2e/component-test-utils.ts` for UI components
- **Integration Tests**: Use `tests/e2e/setup.ts` for service interactions
- **Performance Tests**: Use Bun's bench for performance-critical changes
- **Deterministic Tests**: No timing-dependent assertions

## Key Files and Relationships

### Phase 1: Plugin Nesting Fix

#### Primary Files to Change
- `src/jsx/runtime.ts` - JSXPluginRegistry class (lines 98-106)
  - **Current Issue**: Single `currentPluginName` instead of stack
  - **Dependencies**: `src/jsx/app.ts`, `examples/declarative-plugin-app.tsx`
  - **Tests**: JSX runtime tests, plugin nesting integration tests

- `src/jsx/app.ts` - Context stack management
  - **Current Issue**: Context and command stacks not synchronized
  - **Dependencies**: All JSX-based CLI examples, plugin implementations
  - **Tests**: JSX lifecycle tests, context management tests

#### Critical Dependencies
- `examples/declarative-plugin-app.tsx` - Primary example showing plugin nesting
- `examples/jsx-cli-demo.tsx` - Basic JSX CLI functionality
- `examples/process-manager-integration.tsx` - Process manager + logging integration
- `src/cli/plugin.ts` - CLI plugin system that must work with JSX plugins

#### Current vs Desired API

**Current Broken Pattern:**
```typescript
class JSXPluginRegistry {
  private currentPluginName: string | null = null  // ❌ Single value
  private contextStack: Array<ContextDef> = []     // ❌ Not synchronized
  
  startPlugin(name: string) {
    this.currentPluginName = name  // ❌ Overwrites parent
  }
}
```

**Desired Pattern:**
```typescript
class JSXPluginRegistry {
  private pluginStack: Array<PluginContext> = []   // ✅ Proper stack
  private scopeStack: Array<ScopeDef> = []         // ✅ Scope management
  
  pushPlugin(context: PluginContext) {
    // ✅ Stack-based with scope isolation
  }
}
```

### Phase 2-7: Scope System and Effect Interop

#### Core Architecture Files
- `src/core/runtime.ts` - Main MVU loop, must integrate with scope system
- `src/core/types.ts` - Add ScopeDef type and related interfaces
- `src/cli/router.ts` - Command routing, must use scope-based routing
- `src/services/` - All service interfaces need Effect-based module APIs

#### New Files to Create
- `src/core/scope.ts` - ScopeDef type and ScopeStack management
- `src/core/interop.ts` - Effect-based module interfaces and EventBus
- `docs/sandbox/phases/1.md` through `docs/sandbox/phases/7.md` - Detailed plans

## Where to Look for Answers

### Documentation Hierarchy
1. **This File**: `docs/sandbox/rules.md` - Core refactor rules and standards
2. **Phase Plans**: `docs/sandbox/phases/N.md` - Specific implementation details
3. **Architecture Analysis**: `docs/sandbox/current-architecture-analysis.md` - Current state
4. **Standards**: `docs/NAMING_AND_ARCHITECTURE_RULES.md` - General coding standards
5. **CLAUDE.md**: Project-specific Bun and testing requirements

### Code References
- **JSX Plugin Issues**: `src/jsx/runtime.ts:98-106` (JSXPluginRegistry)
- **Effect Patterns**: `src/services/impl/` for proper Effect service patterns
- **Component Testing**: `tests/e2e/component-test-utils.ts` for test approaches
- **CLI Integration**: `src/cli/` for command routing and plugin systems

### When to Seek Help
- **Breaking Changes**: If refactor changes public API, document in phase plan
- **Test Failures**: Check `tests/e2e/` for integration test patterns
- **Effect Questions**: Reference existing service implementations in `src/services/impl/`
- **Architecture Decisions**: Refer to scope system design in `docs/sandbox/scope-system-design.md`

## Critical Relationships to Maintain

### JSX ↔ CLI Integration
- JSX plugins must register as CLI commands automatically
- Scope hierarchy must match command routing hierarchy  
- Plugin nesting in JSX must create proper CLI subcommand structure

### Effect ↔ Service Integration
- All services must expose Effect-based interfaces
- Cross-module communication via typed event streams only
- Resource management through Effect acquireRelease patterns

### Component ↔ Scope Integration
- All CLI components (Plugin, Command, etc.) must wrap content in Scope intrinsics
- Scope registration must happen automatically via JSX runtime
- Lifecycle hooks (onEnter, onExit) must integrate with Effect cleanup

### Testing ↔ Implementation Integration
- Every scope system change must have corresponding tests
- Plugin nesting tests must verify isolation
- Effect interop tests must verify type safety

## Migration Safety Rules

### Before Making Changes
1. **Read the phase plan** for the specific area you're working on
2. **Run existing tests** to establish baseline
3. **Identify all dependencies** of files you're changing
4. **Document current behavior** if not already clear

### During Changes
1. **Follow single implementation principle** - replace, don't duplicate
2. **Maintain Effect patterns** - don't break existing Effect integration
3. **Update tests incrementally** - don't let test coverage drop
4. **Update documentation** - keep JSDoc current

### After Changes
1. **Validate all tests pass** - both unit and integration
2. **Verify examples work** - especially JSX CLI examples
3. **Check type safety** - no new TypeScript errors
4. **Update phase plan status** - mark completed items

## Success Criteria

### Phase 1 Success (Plugin Nesting Fix)
- [ ] Nested plugins work in `examples/declarative-plugin-app.tsx`
- [ ] Context stack and command stack are synchronized
- [ ] Plugin isolation prevents scope leakage
- [ ] All existing JSX examples continue to work

### Overall Refactor Success
- [ ] Unified scope system provides clean hierarchical context
- [ ] Effect-based module communication replaces direct imports
- [ ] Plugin system supports safe extensibility
- [ ] All tests pass with improved architecture
- [ ] Documentation reflects new patterns and APIs

This refactor builds on TUIX's solid foundation while addressing its core architectural gaps. Follow these rules to ensure we improve the architecture without breaking existing functionality.