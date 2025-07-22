# Core Module Migration Plan

## Project Rules Reminder (Check Every 5 Steps)
- [ ] NO duplicate implementations - fix the real one
- [ ] NO version suffixes (-v2, -simple, -enhanced)
- [ ] DELETE old code when moving, don't copy
- [ ] UPDATE imports immediately after moving
- [ ] RUN tests after each migration step
- [ ] NO stub files or workarounds
- [ ] FOLLOW domain ownership principles
- [ ] ONE implementation per feature
- [ ] NO hyphenate filenames (except proper nouns, foo-bar-baz.ts should be foo/bar-baz or better yet foo/bar/baz)
- [ ] EVERY distinct feature or function is encapsulated in it's own file with accompanying README.md (internal helpers, types, or groups of functions/constants constituting a single feature being the exception)

## Final Directory Structure

  src/
  ├── core/                    # MVU architecture + foundation
  │   ├── model/              # The "M" in MVU
  │   │   ├── scope/          # Scope management (current src/scope/)
  │   │   ├── state/          # State primitives and stores
  │   │   ├── context/        # Context providers and consumers
  │   │   └── events/         # Event bus and domain events
  │   │
  │   ├── view/               # The "V" in MVU
  │   │   ├── renderer/       # Core rendering infrastructure
  │   │   ├── viewport/       # Viewport management
  │   │   ├── layout/         # Layout algorithms (flex, grid, etc.)
  │   │   └── primitives/     # Basic view building blocks (text, box, etc.)
  │   │
  │   ├── update/             # The "U" in MVU
  │   │   ├── effects/        # Effect patterns and utilities
  │   │   ├── commands/       # Command execution system
  │   │   ├── subscriptions/  # Subscription management
  │   │   └── reactivity/     # Reactive primitives
  │   │       └── runes/      # Svelte 5 runes implementation
  │   │
  │   ├── runtime/            # Execution environment
  │   │   ├── mvu/           # MVU loop implementation
  │   │   ├── scheduler/     # Task scheduling
  │   │   ├── fiber/         # Fiber management
  │   │   └── bun/           # Bun-specific optimizations
  │   │
  │   ├── terminal/           # Terminal abstraction layer
  │   │   ├── ansi/          # ANSI escape sequences
  │   │   │   ├── colors/    # Color handling
  │   │   │   ├── cursor/    # Cursor control
  │   │   │   └── styles/    # Text styling
  │   │   ├── input/         # Input handling (keyboard, mouse)
  │   │   ├── output/        # Output buffering and optimization
  │   │   └── capabilities/  # Terminal capability detection
  │   │
  │   ├── services/           # Core service interfaces
  │   │   ├── terminal/      # TerminalService implementation
  │   │   ├── input/         # InputService implementation
  │   │   ├── renderer/      # RendererService implementation
  │   │   ├── storage/       # StorageService implementation
  │   │   └── module.ts      # Service module coordination
  │   │
  │   ├── os/                 # OS-specific implementations
  │   │   ├── common/        # Cross-platform code
  │   │   ├── macos/         # macOS specific
  │   │   ├── linux/         # Linux specific
  │   │   └── windows/       # Windows specific
  │   │
  │   └── types/             # Core type system (already organized)
  │       ├── core.ts        # MVU types
  │       ├── errors.ts      # Error system
  │       ├── guards.ts      # Type guards
  │       ├── messages.ts    # Message types
  │       ├── schemas.ts     # Validation schemas
  │       └── values.ts      # Value utilities
  │
  ├── tea/                    # The Elm Architecture module
  │   ├── core/              # TEA pattern implementation
  │   │   ├── program.ts     # TEA program type
  │   │   ├── runtime.ts     # TEA runtime (pure functional layer)
  │   │   └── html.ts        # HTML-like view constructors
  │   ├── jsx/               # JSX integration for TEA users
  │   │   ├── runtime.ts     # JSX → TEA view translation
  │   │   └── components/    # TEA-friendly JSX components
  │   ├── effects/           # Effect adapters for TEA
  │   └── examples/          # TEA pattern examples
  │
  ├── cli/                    # CLI framework module
  │   ├── core/              # CLI core functionality
  │   │   ├── parser.ts      # Argument parsing
  │   │   ├── router.ts      # Command routing
  │   │   ├── registry.ts    # Command registry
  │   │   └── help.ts        # Help generation
  │   ├── tea/               # TEA adapter for CLI apps
  │   │   ├── program.ts     # CLI-specific TEA program
  │   │   └── commands.ts    # Command as TEA components
  │   ├── jsx/               # JSX components for CLI builders
  │   │   ├── components/    # <Command>, <Option>, <Arg>
  │   │   └── runtime.ts     # CLI-specific JSX handling
  │   ├── plugins/           # CLI plugin system
  │   └── testing/           # CLI testing utilities
  │
  ├── jsx/                    # JSX runtime module
  │   ├── runtime/           # Core JSX runtime
  │   │   ├── createElement.ts
  │   │   ├── vdom.ts        # Virtual DOM implementation
  │   │   └── reconciler.ts  # VDOM reconciliation
  │   ├── tea/               # TEA patterns for JSX users
  │   │   ├── hooks.ts       # useTEA() style hooks
  │   │   └── components/    # TEA-pattern components
  │   ├── cli/               # CLI components for JSX users
  │   │   ├── components/    # Terminal-specific JSX components
  │   │   └── helpers.ts     # CLI-JSX utilities
  │   ├── hooks/             # React-like hooks
  │   ├── components/        # Built-in JSX components
  │   └── testing/           # JSX testing utilities
  │
  ├── ui/                     # High-level UI components
  │   ├── components/        # Reusable UI components
  │   │   ├── forms/         # Form components
  │   │   ├── layout/        # Layout components
  │   │   ├── data/          # Data display components
  │   │   └── feedback/      # User feedback components
  │   ├── patterns/          # Common UI patterns
  │   ├── themes/            # Theming system
  │   └── examples/          # UI component gallery
  │
  ├── plugins/                # Plugin system
  │   ├── core/              # Plugin infrastructure
  │   │   ├── loader.ts      # Plugin loading
  │   │   ├── registry.ts    # Plugin registry
  │   │   └── hooks.ts       # Plugin hooks
  │   ├── cli/               # CLI integration for plugins
  │   │   ├── wrapper.ts     # CLI command wrappers
  │   │   └── generator.ts   # CLI generation from plugins
  │   └── api/               # Plugin API surface
  │
  ├── logger/                 # Logging module
  │   ├── core/              # Logger implementation
  │   ├── transports/        # Log transports
  │   └── formatters/        # Log formatters
  │
  ├── config/                 # Configuration module
  │   ├── loader.ts          # Config loading
  │   ├── schema.ts          # Config validation
  │   └── sources/           # Config sources (file, env, etc.)
  │
  ├── testing/                # Testing utilities
  │   ├── harness.ts         # Test harness
  │   ├── mocks/             # Service mocks
  │   └── utils.ts           # Test utilities
  │
  └── process-manager/        # Process management module
      ├── manager.ts         # Process manager
      ├── ipc/               # IPC implementation
      └── monitor.ts         # Process monitoring

### Key Principles Applied:

1. Core is Pure MVU: Model, View, Update with Effect-based architecture
2. Clear Module Boundaries: Each module has a clear purpose and consumer
3. Interop by Consumer:
- jsx/tea/ - JSX users who want TEA patterns
- tea/jsx/ - TEA users who want JSX views
- cli/jsx/ - CLI builders who want JSX components
4. Feature-Driven Structure: Organized by what it does, not what it is
5. Dependency Direction: Modules depend on core, never the reverse

This structure makes the architecture crystal clear and maintains proper separation of concerns while enabling rich interoperability between modules.

## Current State Analysis
- `src/core/` - Mixed concerns (types, runtime, views, errors)
- `src/scope/` - Should be in core/model/scope
- `src/services/` - Should be in core/services
- `src/reactivity/` - Should be in core/update/reactivity

## Target Structure
```
src/core/
├── model/          # M in MVU
├── view/           # V in MVU  
├── update/         # U in MVU
├── runtime/        # MVU loop
├── terminal/       # Terminal abstraction
├── services/       # Service implementations
├── os/             # OS-specific code
└── types/          # Already organized ✓
```

## Migration Steps

### Step 1: Create Core Subdirectories
```bash
mkdir -p src/core/{model,view,update,runtime,terminal,os}
mkdir -p src/core/model/{scope,state,context,events}
mkdir -p src/core/view/{renderer,viewport,layout,primitives}
mkdir -p src/core/update/{effects,commands,subscriptions,reactivity}
mkdir -p src/core/runtime/{mvu,scheduler,fiber,bun}
mkdir -p src/core/terminal/{ansi,input,output,capabilities}
```

### Step 2: Move Scope System (src/scope/ → src/core/model/scope/)
- [ ] Move src/scope/manager.ts → src/core/model/scope/manager.ts
- [ ] Move src/scope/types.ts → src/core/model/scope/types.ts
- [ ] Move src/scope/jsx/* → Keep in src/scope/jsx (scope module's JSX interop)
- [ ] Update all imports from '../scope' to '../core/model/scope'
- [ ] Run tests

### Step 3: Move Services (src/services/ → src/core/services/)
- [ ] Move service implementations
- [ ] Keep service module coordination
- [ ] Update imports
- [ ] Run tests

### Step 4: Move Reactivity (src/reactivity/ → src/core/update/reactivity/)
- [ ] Move runes implementation
- [ ] Move reactive primitives
- [ ] Update imports
- [ ] Run tests

### Step 5: CHECKPOINT - Rules Review
- [ ] Check for duplicates
- [ ] Verify no stubs created
- [ ] Confirm tests pass
- [ ] Review import updates

### Step 6: Move View System
- [ ] Move src/core/view.ts → src/core/view/primitives/
- [ ] Move src/core/view-cache.ts → src/core/view/cache/
- [ ] Move layout algorithms
- [ ] Update imports
- [ ] Run tests

### Step 7: Move Runtime
- [ ] Move src/core/runtime.ts → src/core/runtime/mvu/
- [ ] Extract scheduler logic
- [ ] Extract fiber management
- [ ] Update imports
- [ ] Run tests

### Step 8: Move Terminal Abstractions
- [ ] Extract ANSI codes to src/core/terminal/ansi/
- [ ] Move input handling to src/core/terminal/input/
- [ ] Move output buffering to src/core/terminal/output/
- [ ] Update imports
- [ ] Run tests

### Step 9: Move Remaining Core Files
- [ ] Move coordination → src/core/runtime/coordination/
- [ ] Move event-bus → src/core/model/events/
- [ ] Move remaining utilities
- [ ] Update imports
- [ ] Run tests

### Step 10: FINAL CHECKPOINT
- [ ] All tests pass
- [ ] No duplicate files
- [ ] Clean directory structure
- [ ] Update index.ts exports
- [ ] Document new structure

## Rollback Plan
If anything goes wrong:
1. `git stash` or `git reset --hard`
2. Review what went wrong
3. Adjust plan
4. Try again with smaller steps

## Success Criteria
- [ ] All tests pass
- [ ] No duplicate implementations
- [ ] Clear separation of concerns
- [ ] Imports are correct
- [ ] No temporary files remain
