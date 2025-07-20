# Current TUIX Architecture Analysis

## Executive Summary

TUIX implements a sophisticated terminal UI framework built on three core pillars:
1. **Effect.ts** for type-safe operations and resource management
2. **Model-View-Update (MVU)** architecture for state management  
3. **Dual API** supporting both functional and JSX-based development

## What Happens When a User Runs a TUIX CLI App?

### Complete Execution Flow

```
User Command → CLI Parser → Plugin Loading → Command Routing → Effect Execution → TUI Runtime → Terminal Output
```

#### 1. Entry Point (`bin/tuix.ts` or application binary)
- Parses command line arguments using custom parser
- Loads configuration from various sources (files, env vars)
- Determines command routing (pm, logs, dev, etc.)

#### 2. Command Resolution (`src/cli/`)
- **Parser** (`parser.ts`): Schema-validated argument parsing with Zod
- **Router** (`router.ts`): Command path resolution with subcommand support
- **Plugin System** (`plugin.ts`): Dynamic plugin loading and registration

#### 3. Effect Pipeline Initialization
- **Service Layer** (`src/services/`): Effect Context setup for dependencies
- **Configuration** (`src/config/`): Type-safe config loading with validation
- **Error Handling**: Comprehensive error hierarchy setup

#### 4. TUI Runtime Startup (`src/core/runtime.ts`)
```typescript
// Core MVU loop with Effect integration
const runApp = <Model, Msg>(
  component: Component<Model, Msg>,
  options?: AppOptions
): Effect<ExitCode, AppError, AppServices>
```

#### 5. Service Dependencies (`src/services/impl/`)
- **TerminalService**: Raw terminal control (cursor, screen, ANSI codes)
- **InputService**: Keyboard/mouse event streams
- **RendererService**: View rendering pipeline with frame management
- **StorageService**: Persistent state management

#### 6. Component Lifecycle
- **Initialization**: `component.init()` returns initial model and commands
- **Event Loop**: Input events → Messages → State updates → View rendering
- **Effects**: Async operations handled as Effect fibers
- **Subscriptions**: Continuous event streams (timers, external events)

#### 7. Rendering Pipeline (`src/core/view.ts`, `src/jsx/render.ts`)
- **View Computation**: Pure function from model to view
- **Layout Engine**: Flexbox-style layout with constraints
- **Styling**: ANSI color/style application
- **Optimization**: View caching and diff-based updates

## Current Architecture Deep Dive

### Core Runtime (`src/core/`)

**MVU Implementation:**
```typescript
interface Component<Model, Msg> {
  init: Effect<[Model, Cmd<Msg>[]], never, AppServices>
  update: (msg: Msg, model: Model) => Effect<[Model, Cmd<Msg>[]], never, AppServices>
  view: (model: Model) => View
  subscription?: (model: Model) => Effect<Sub<Msg>[], never, AppServices>
}
```

**Key Files:**
- `runtime.ts`: Main MVU loop with fiber management
- `types.ts`: Complete type system for components, views, commands
- `view.ts`: View rendering with layout engine
- `view-cache.ts`: Performance optimization through caching
- `errors.ts`: Hierarchical error types
- `keys.ts`: Keyboard event definitions

**Effect Integration:**
- All operations are Effect computations
- Automatic resource cleanup with `acquireRelease`
- Structured error handling with typed error channels
- Dependency injection through Effect Context

### JSX System (`src/jsx/`)

**Current Implementation:**
- **Runtime** (`runtime.ts`): Transforms JSX to Effect operations
- **Components** (`app.ts`): Svelte-inspired runes system (`$state`, `$derived`, `$effect`)
- **Rendering** (`render.ts`): JSX elements to terminal output
- **Lifecycle**: React-style hooks (`onMount`, `onDestroy`, etc.)

**Plugin Registry:**
```typescript
class JSXPluginRegistry {
  private scopeStack: ScopeStack = new ScopeStack()
  private plugins: Map<string, any> = new Map()
  
  // Fixed: Now uses unified scope stack
  startPlugin(name: string) { /* pushes to scope stack */ }
  finalizePlugin() { /* pops from scope stack */ }
}
```

**Current State:**
- ✅ Plugin nesting infrastructure fixed (uses unified ScopeStack)
- ✅ Context managed through scope system
- ✅ Proper scope isolation implemented
- ✅ CLI components fully integrated with scope system (Phase 1 complete)

### CLI System (`src/cli/`)

**Architecture:**
- **Runner** (`runner.ts`): Main execution engine
- **Parser** (`parser.ts`): Argument parsing with schema validation
- **Router** (`router.ts`): Command routing and resolution
- **Plugin System** (`plugin.ts`): Extensible plugin architecture

**Command Flow:**
```typescript
// Current router supports nested commands
findCommandConfig(commandPath: string[]): CommandConfig | null {
  let currentCommands = this.config.commands || {}
  
  for (const command of commandPath) {
    currentConfig = currentCommands[command] || null
    if (commandPath.indexOf(command) < commandPath.length - 1) {
      currentCommands = currentConfig.commands || {}
    }
  }
}
```

### Services Layer (`src/services/`)

**Service Pattern:**
```typescript
// All services are Effect Context interfaces
interface TerminalService {
  write: (text: string) => Effect<void, TerminalError>
  clear: Effect<void, TerminalError>
  setCursor: (x: number, y: number) => Effect<void, TerminalError>
  // ...
}

// Used through Effect Context
const program = Effect.gen(function* () {
  const terminal = yield* TerminalService
  yield* terminal.write("Hello World")
})
```

**Service Categories:**
- **I/O Services**: Terminal, Input, Renderer
- **State Services**: Storage, Focus
- **Utility Services**: HitTest, MouseRouter

### Process Management (`src/process-manager/`)

**Native Bun Implementation:**
- Direct Bun.spawn() usage (no wrapper processes)
- IPC communication with spawned processes
- Real-time log aggregation
- Health checking and auto-restart

**Current State:**
- ✅ Core functionality works well
- ✅ CLI components now have full scope integration enabling proper plugin composition

### Styling System (`src/styling/`)

**Features:**
- 256-color and truecolor support
- Style builder pattern with method chaining
- Border drawing utilities
- Gradient rendering
- ANSI code generation

## Current Strengths

1. **Solid Foundation**: Effect.ts provides robust error handling and resource management
2. **Performance**: Optimized rendering pipeline with caching
3. **Type Safety**: Comprehensive TypeScript typing throughout
4. **Dual API**: Both functional MVU and JSX approaches work
5. **Service Architecture**: Clean separation with dependency injection
6. **Plugin System**: Extensible architecture with lifecycle hooks

## Current State (Post Phase 1)

### 1. Scope Integration ✅ COMPLETE
- ✅ JSX plugin registry fixed - now uses unified ScopeStack
- ✅ Core scope system implemented and tested
- ✅ CLI components wrap content in scope providers
- ✅ Automatic command registration from JSX structure works

### 2. Module Boundaries (Unchanged)
- CLI, JSX, and Core systems use direct imports (working well)
- Direct coupling between modules is pragmatic and sufficient
- Plugin extension points exist through scope system

### 3. Two Scope Implementations ✅ DOCUMENTED
- `src/core/scope.ts` - Comprehensive runtime scope management
- `src/jsx/scope.ts` - Simpler UI rendering helpers
- Relationship documented in `docs/SCOPE_SYSTEM_ARCHITECTURE.md`
- Kept separate by design for better separation of concerns

### 4. Examples ✅ CREATED
- `examples/nested-plugins-demo.tsx` demonstrates full plugin nesting
- Shows deep nesting, sibling relationships, and command hierarchy

## Gaps vs. Proposed Architecture

### ✅ COMPLETE: Unified Scope System
- ✅ Core scope system exists with `ScopeContext` type
- ✅ JSX runtime uses unified ScopeStack
- ✅ CLI components use scope wrapping
- ✅ Automatic command hierarchy from JSX works

### Not Implemented: Effect Interop Layer (Proposed)
- Modules use direct imports (current approach works well)
- No event bus exists (proposed in phases 2-7)
- Plugin extension points are function-based, not Effect streams
- **Assessment**: May not be needed given successful Phase 1 implementation

### ✅ COMPLETE: Context Management
- ✅ Unified scope stack implemented
- ✅ Plugin nesting infrastructure works
- ✅ CLI components fully integrated

## Migration Path

The current architecture is actually quite close to the proposed design:

1. **Effect Foundation**: Already comprehensive
2. **Service Pattern**: Already established
3. **Plugin System**: Exists but needs scope improvements
4. **JSX Runtime**: Functional but needs scope integration
5. **CLI Router**: Already supports nested commands

The main work completed:
1. ✅ DONE: Implement core scope system
2. ✅ DONE: Fix plugin nesting in JSX runtime  
3. ✅ DONE: Integrate CLI components with scope system
4. ✅ DONE: Create working plugin nesting examples
5. ❌ OPTIONAL: Add event-driven architecture (phases 2-7) - not needed

## Conclusion

TUIX has a solid architectural foundation with Effect.ts integration and a working MVU system. Phase 1 has been successfully completed with:

- Full scope system implementation
- CLI component integration  
- Working nested plugin examples
- Comprehensive documentation and tests

The direct-import architecture has proven sufficient for TUIX's needs. The event-driven architecture proposed in phases 2-7 can be considered if future requirements demand it, but the current implementation successfully addresses all plugin nesting and scope management requirements.