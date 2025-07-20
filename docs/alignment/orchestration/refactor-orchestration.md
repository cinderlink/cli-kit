# Refactor Orchestration Process

## Overview

This is the sophisticated refactor orchestration methodology demonstrated in `docs/sandbox/` for managing large-scale architectural changes while maintaining system stability.

## Core Orchestration Principles

### 1. Phase-Based Architecture
**Principle**: Break complex refactors into manageable phases with clear dependencies and success criteria.

**Pattern**:
```
Phase 1: Foundation → Phase 2: Integration → Phase 3: Enhancement → ...
```

### 2. Event-Driven Decoupling  
**Principle**: Replace direct dependencies with event-driven communication to enable independent module evolution.

**Pattern**:
```typescript
// OLD: Direct coupling
moduleA.callMethodDirectly(moduleB)

// NEW: Event-driven decoupling  
eventBus.publish('domain-event', payload)
moduleB.subscribe('domain-event', handler)
```

### 3. Scope System Design
**Principle**: Implement hierarchical context management for clean parent/child relationships.

**Components**:
- **ScopeDef Type**: Unified scope definition
- **ScopeStack**: Hierarchical context management
- **Scope Components**: All CLI components wrap content in scopes

## Refactor Phase Structure

### Phase Planning Template
```markdown
# Phase N: [Phase Name]

## Overview
[Brief description of what this phase achieves]

## Current Status
✅ **Completed**: [List completed items]
❌ **Issue**: [List current problems]

## Current Technical Problems
### 1. [Problem Name]
**File**: [specific file and line numbers]
**Issue**: [detailed technical description]
**Impact**: [how this affects the system]

## Technical Solution
### 1. [Solution Component]
**File to Create/Modify**: [specific file]
**Implementation**: [code examples and patterns]

## Implementation Plan
### Step 1: [Step Name]
**Files to Create**: [list of new files]
**Files to Modify**: [list of changed files]
**Implementation**: [detailed steps]

## Testing Strategy
### Unit Tests
[Required test files and scenarios]

### Integration Tests  
[End-to-end test requirements]

## Success Criteria
✅ **Primary Goals**: [list of main objectives]
✅ **Quality Gates**: [validation requirements]

## Dependencies and Risks
[Dependencies on other components and risk mitigation]
```

### Example: Phase 1 - Event Bus Foundation

**Objective**: Establish event-driven architecture foundation and fix plugin nesting

**Current Problems**:
1. **Single Plugin State Instead of Stack** (src/jsx/runtime.ts:98-106)
2. **Disconnected Stack Management** (jsx/app.ts, jsx/runtime.ts)
3. **Scope Pollution Between Plugins**
4. **Timing Issues in Registration**

**Technical Solution**:
1. **Generic Event Bus Foundation** (src/core/bus.ts)
2. **Core Event Definitions** (src/core/events.ts)  
3. **Module Base Class** (src/core/module-base.ts)
4. **Enhanced Scope System** (src/core/scope.ts)

**Implementation Steps**:
1. Create event bus foundation
2. Enhance existing scope system
3. Move JSX integration to JSX domain
4. Refactor JSX runtime to use events
5. Create CLI event listeners

## Scope System Design Pattern

### ScopeDef Type Structure
```typescript
interface ScopeDef {
  // Identity
  id: string
  type: 'cli' | 'plugin' | 'command' | 'arg' | 'flag' | 'option' | 'component'
  name: string
  
  // Hierarchy
  parent?: ScopeDef
  children: ScopeDef[]
  path: string[]
  
  // Execution
  executable: boolean
  handler?: Handler
  defaultContent?: JSX.Element
  
  // Configuration
  args?: Record<string, ArgDef>
  flags?: Record<string, FlagDef>
  options?: Record<string, OptionDef>
  
  // Lifecycle hooks
  onEnter?: (ctx: ScopeContext) => Effect<void>
  onExit?: (ctx: ScopeContext) => Effect<void>
}
```

### Scope Stack Management
```typescript
class ScopeStack {
  private stack: ScopeDef[] = []
  private registry: Map<string, ScopeDef> = new Map()
  
  push(scope: ScopeDef): Effect<void, ScopeError>
  pop(): Effect<ScopeDef | null, never>  
  current(): ScopeDef | null
  findByPath(path: string[]): ScopeDef | null
}
```

### Component Integration Pattern
```tsx
function Plugin({ name, description, children }) {
  const def: ScopeDef = {
    id: useId(),
    type: 'plugin',
    name,
    description,
    executable: true,
    defaultContent: children
  }
  
  return (
    <Scope def={def}>
      {children}
    </Scope>
  )
}
```

## Event-Driven Communication Patterns

### Event Bus Implementation
```typescript
interface EventBus {
  publish<T extends BaseEvent>(channel: string, event: T): Effect<void, never>
  subscribe<T extends BaseEvent>(channel: string): Stream<T>
  filter<T extends BaseEvent>(channel: string, predicate: (event: T) => boolean): Stream<T>
}

// Core event types
interface ScopeEvent extends BaseEvent {
  readonly type: 'scope-entered' | 'scope-exited' | 'scope-updated'
  readonly scope: ScopeContext
}

interface CommandEvent extends BaseEvent {
  readonly type: 'command-registered' | 'command-unregistered'
  readonly path: string[]
  readonly handler?: Function
}
```

### Module Base Class Pattern
```typescript
abstract class ModuleBase {
  constructor(
    protected eventBus: EventBus,
    protected moduleName: string
  ) {}
  
  protected emitEvent<T extends BaseEvent>(channel: string, event: Omit<T, 'id' | 'source' | 'timestamp'>): Effect<void, never>
  protected subscribe<T extends BaseEvent>(channel: string): Stream<T>
  
  abstract initialize(): Effect<void, never>
  abstract shutdown(): Effect<void, never>
}
```

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

## Testing Strategy for Refactors

### Unit Tests
```typescript
// Test scope system changes
test("ScopeStack manages hierarchy correctly", () => {
  const stack = new ScopeStack()
  
  const parent: ScopeContext = {
    id: "parent", type: "plugin", name: "pm",
    path: [], children: []
  }
  
  const child: ScopeContext = {
    id: "child", type: "command", name: "start", 
    path: [], children: []
  }
  
  stack.push(parent)
  stack.push(child)
  
  expect(child.parent).toBe(parent)
  expect(child.path).toEqual(["pm", "start"])
  expect(parent.children).toContain(child)
})
```

### Integration Tests
```typescript
// Test end-to-end plugin nesting
test("nested plugins create proper command hierarchy", async () => {
  const app = (
    <Plugin name="pm">
      <Command name="start" handler={startHandler} />
      <Plugin name="logs">
        <Command name="show" handler={showHandler} />
      </Plugin>
    </Plugin>
  )
  
  const result = await renderJSXCLI(app)
  
  expect(result.commands).toHaveProperty("pm")
  expect(result.commands).toHaveProperty("pm start") 
  expect(result.commands).toHaveProperty("pm logs")
  expect(result.commands).toHaveProperty("pm logs show")
})
```

### Example Validation Tests
- `examples/declarative-plugin-app.tsx` - Must work with new scope system
- `examples/process-manager-integration.tsx` - Process manager + logging integration
- `examples/jsx-cli-demo.tsx` - Basic functionality preservation

## Success Criteria Framework

### Phase Completion Gates
- ✅ **Technical Implementation**: All planned code changes complete
- ✅ **Test Coverage**: All new code has comprehensive tests
- ✅ **Integration Validation**: All examples continue to work
- ✅ **Performance**: No significant performance regressions
- ✅ **Documentation**: All changes properly documented

### Overall Refactor Success
- ✅ **Unified Architecture**: System provides clean hierarchical context
- ✅ **Event-Driven Communication**: Modules communicate via typed events
- ✅ **Plugin System**: Supports safe extensibility and nesting
- ✅ **Backward Compatibility**: All existing functionality preserved
- ✅ **Foundation for Future**: Clean interfaces for subsequent enhancements

## Dependencies and Risk Management

### Critical Dependencies
- **Primary Examples**: `examples/declarative-plugin-app.tsx`
- **Core Services**: `src/cli/plugin.ts`, `src/cli/router.ts`
- **Integration Points**: All JSX-based CLI examples

### Risk Mitigation Strategies
- **Breaking Changes**: Maintain backward compatibility through careful API design
- **Performance**: Scope operations must be lightweight (O(1) preferred)
- **Memory**: Proper cleanup of scope hierarchy to prevent leaks
- **Testing**: Comprehensive coverage before merging changes

### Rollback Plan
1. **Immediate Rollback**: Revert to git commit before phase changes
2. **Problem Isolation**: Identify specific failure area
3. **Targeted Fix**: Implement solution in isolated branch
4. **Full Validation**: Re-test with complete validation suite

## Orchestration Commands

### Phase Setup
```bash
# Create phase tracking
mkdir -p docs/tracking/refactor-[phase-name]/[date]-[phase-id]

# Initialize phase documentation  
cp docs/alignment/templates/process-tracking.md docs/tracking/refactor-[phase-name]/[date]-[phase-id]/

# Create phase plan
touch docs/sandbox/phases/[N].md
```

### Progress Validation
```bash
# Validate each change
bun test                    # All tests must pass
bun run tsc --noEmit       # No TypeScript errors

# Check examples still work
bun examples/declarative-plugin-app.tsx
bun examples/jsx-cli-demo.tsx
```

### Phase Completion
```bash
# Final validation
bun test --coverage        # Check coverage requirements
bun build                  # Ensure builds succeed

# Update tracking
git add . && git commit -m "phase-[N]: [description]"
```

## Related Processes

- [Audit Process](../processes/audit.md) - Code quality validation
- [Development Process](../processes/development.md) - Day-to-day development
- [Phase Planning](./phase-planning.md) - Detailed phase planning methodology
- [Testing Strategy](../dependencies/testing/rules.md) - Testing requirements