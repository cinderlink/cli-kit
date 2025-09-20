# TUIX Framework Implementation Plan

## Project Overview

Transform TUIX into a full-featured CLI framework with a Svelte 5-inspired API while maintaining our powerful Effect-based core. This will provide an intuitive, component-based approach to building terminal applications with automatic argument parsing, plugin support, and reactive state management.

## Current State Analysis

### Existing Strengths
- ✅ Robust Effect-based TUI runtime
- ✅ Rich component library (Panel, Button, Table, etc.)
- ✅ Advanced styling and layout system
- ✅ Screenshot and testing infrastructure
- ✅ Mouse support and event handling
- ✅ Gradient and theming capabilities

### Gaps to Address
- ❌ No CLI argument parsing framework
- ❌ No command/subcommand system
- ❌ Complex API requires Effect knowledge
- ❌ No plugin system
- ❌ No simplified reactivity for beginners
- ❌ No lazy loading system
- ❌ Repetitive boilerplate in examples

## Target Architecture

```
┌─ CLI Framework (New) ─────────────────────────────┐
│  • Command parsing & routing                      │
│  • Plugin system                                  │
│  • Simplified component API                       │
│  • Reactivity helpers                            │
└───────────────────────────────────────────────────┘
┌─ Effect-based Core (Existing) ───────────────────┐
│  • Runtime & TEA architecture                    │
│  • Component system                              │
│  • Services & implementations                    │
│  • Styling & layout                             │
└───────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core CLI Infrastructure (Week 1)
**Goal**: Basic CLI framework with command parsing and routing

**Files to Create**:
```
src/cli/
├── config.ts          # defineConfig API
├── parser.ts           # Zod-based argument parsing  
├── router.ts           # Command routing logic
├── runner.ts           # Main CLI execution
├── types.ts            # CLI type definitions
├── lazy.ts             # Lazy loading utilities
└── help.ts             # Auto-generated help system
```

**Key Features**:
- `defineConfig()` for CLI definition
- Zod schema integration for type-safe arguments
- Command/subcommand nesting
- Global and command-specific options
- `lazyLoad()` helper for dynamic imports
- Auto-generated help screens

### Phase 2: Simplified Component API (Week 2)
**Goal**: Svelte 5-like component API that wraps our Effect system

**Files to Create**:
```
component.ts            # Component wrapper API
reactivity.ts           # $state, $derived, $effect
lifecycle.ts            # onMount, onCleanup hooks
snippets.ts             # Reusable UI snippets
flow.ts                 # Control flow helpers (show, each, when)
```

**Files to Update**:
```
src/components/         # Add simplified wrappers
├── Panel.ts            # Add builder function export
├── Button.ts           # Add builder function export
├── List.ts             # Add builder function export
└── ... (all components)
```

**Key Features**:
- `component()` wrapper function
- `$state()` and `$derived()` reactivity
- `snippet()` for reusable UI fragments
- Lifecycle hooks that integrate with Effect
- Builder-pattern component constructors

### Phase 3: Package Structure & Exports (Week 2)
**Goal**: Clean import paths and tree-shaking support

**Files to Create/Update**:
```
index.ts                # Main entry point
cli.ts                  # CLI-specific exports
jsx-runtime.ts          # Optional JSX support

# Clean import paths
components/
├── index.ts            # Re-export all components
├── Panel.ts            # Export default Panel function
├── Button.ts           # Export default Button function
└── ...

# Package.json exports
{
  "exports": {
    ".": "./dist/index.js",
    "./cli": "./dist/cli.js", 
    "./component": "./dist/component.js",
    "./components/*": "./dist/components/*.js",
    "./jsx-runtime": "./dist/jsx-runtime.js"
  }
}
```

### Phase 4: Plugin System (Week 3)
**Goal**: Extensible plugin architecture

**Files to Create**:
```
src/cli/
├── plugin.ts           # Plugin definition API
├── loader.ts           # Plugin loading system
├── registry.ts         # Plugin registry
└── hooks.ts            # Plugin hook system

plugins/
├── auth.ts             # Example auth plugin
├── config.ts           # Config file plugin
└── telemetry.ts        # Usage analytics plugin
```

**Key Features**:
- `definePlugin()` API
- Command extension and wrapping
- Middleware hooks (beforeCommand, afterCommand)
- Plugin discovery and loading
- Version compatibility checking

### Phase 5: Advanced Features (Week 4)
**Goal**: Enhanced developer experience

**Files to Create**:
```
src/cli/
├── migration.ts        # Migration utilities
├── testing.ts          # CLI testing helpers
└── dev.ts              # Development mode features

templates/
├── basic/              # Basic CLI template
├── dashboard/          # Dashboard template
└── interactive/        # Interactive form template

docs/
├── migration.md        # Migration guide
├── plugins.md          # Plugin development
└── examples/           # Usage examples
```

## Detailed Implementation Plan

### 1. CLI Configuration System

**File**: `src/cli/config.ts`
```typescript
import { z } from "zod"

export interface CLIConfig {
  name: string
  version: string
  description?: string
  options?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig>
  plugins?: PluginReference[]
  hooks?: CLIHooks
}

export interface CommandConfig {
  description: string
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  commands?: Record<string, CommandConfig> // Subcommands
  handler?: LazyHandler | Handler
  aliases?: string[]
}

export type LazyHandler = () => Promise<Handler>
export type Handler = (args: any) => Promise<Component | void> | Component | void

export function defineConfig(config: CLIConfig): CLIConfig {
  return config
}

// Lazy loading helper
export function lazyLoad(importFn: () => Promise<{ default: any }>): LazyHandler {
  return async () => {
    const module = await importFn()
    return module.default
  }
}
```

**File**: `src/cli/parser.ts`
```typescript
import { z } from "zod"
import type { CLIConfig, CommandConfig } from "./config"

export interface ParsedArgs {
  command: string[]
  args: Record<string, any>
  options: Record<string, any>
  rawArgs: string[]
}

export class CLIParser {
  constructor(private config: CLIConfig) {}
  
  parse(argv: string[]): ParsedArgs {
    // Implementation details:
    // 1. Parse command hierarchy (serve, db migrate, etc.)
    // 2. Validate options with Zod schemas
    // 3. Handle aliases and shortcuts
    // 4. Generate helpful error messages
    // 5. Support -- to stop parsing
  }
  
  generateHelp(command?: string[]): string {
    // Auto-generate help from config and schemas
  }
}
```

### 2. Component Wrapper System

**File**: `component.ts`
```typescript
import { Effect } from "effect"
import { runApp } from "./src/core/runtime"
import type { Component as EffectComponent } from "./src/core/types"

export interface ComponentOptions {
  name?: string
  displayName?: string
}

export function component<Props = {}>(
  setupOrName: string | ((props: Props) => any),
  setup?: (props: Props) => any
): (props: Props) => EffectComponent<any, any> {
  
  const finalSetup = typeof setupOrName === "string" ? setup! : setupOrName
  const name = typeof setupOrName === "string" ? setupOrName : undefined
  
  return (props: Props) => {
    // Call user's setup function
    const result = finalSetup(props)
    
    // If it's already an Effect component, return as-is
    if (isEffectComponent(result)) {
      return result
    }
    
    // If it's a view function, wrap it
    if (typeof result === "function") {
      return createEffectComponent({
        view: result,
        name
      })
    }
    
    // If it's a static view, wrap it
    return createEffectComponent({
      view: () => result,
      name
    })
  }
}

function createEffectComponent({ view, name }): EffectComponent<any, any> {
  return {
    init: Effect.succeed([{}, []]),
    update: (msg, model) => Effect.succeed([model, []]),
    view: (model) => view(model),
    subscriptions: () => []
  }
}
```

**File**: `reactivity.ts`
```typescript
import { Ref, Effect } from "effect"

// Simple reactive state
export function $state<T>(initial: T) {
  let value = initial
  const listeners = new Set<(value: T) => void>()
  
  const state = {
    get value() { return value },
    set(newValue: T) {
      value = newValue
      listeners.forEach(fn => fn(value))
    },
    update(fn: (current: T) => T) {
      this.set(fn(value))
    },
    subscribe(fn: (value: T) => void) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    }
  }
  
  // Make it work with our Effect runtime
  state.toEffect = () => Ref.make(value)
  
  return state
}

// Derived state
export function $derived<T>(fn: () => T) {
  let cachedValue: T
  let isDirty = true
  
  return {
    get value() {
      if (isDirty) {
        cachedValue = fn()
        isDirty = false
      }
      return cachedValue
    },
    invalidate() {
      isDirty = true
    }
  }
}

// Effects
export function $effect(fn: () => void | (() => void)) {
  const cleanup = fn()
  
  // Register cleanup with Effect runtime if available
  if (typeof cleanup === "function") {
    // Store cleanup for later
  }
}
```

### 3. Component Builder Functions

**File**: `src/components/Panel.ts` (updated)
```typescript
// Existing Effect-based component (keep as-is)
export const panel = (config: Partial<PanelConfig> = {}, sections?: PanelSection[]): {
  // ... existing implementation
}

// New: Builder function for simplified API
export default function Panel(props: {
  title?: string
  children?: View | View[]
  selected?: boolean
  border?: BorderStyle
  padding?: Padding
  onClick?: () => void
  onFocus?: () => void
  onBlur?: () => void
  class?: string
}): View {
  const {
    title,
    children = [],
    selected = false,
    border = selected ? Borders.Thick : Borders.Single,
    padding = { top: 0, right: 1, bottom: 0, left: 1 },
    onClick,
    class: className
  } = props
  
  // Convert children array to single view
  const content = Array.isArray(children) ? vstack(...children) : children
  
  // Build title section
  const titleView = title ? styledText(title, style().bold()) : undefined
  
  // Combine title and content
  const finalContent = titleView 
    ? vstack(titleView, text(""), content)
    : content
  
  return styledBox(finalContent, {
    border,
    padding,
    style: style().foreground(selected ? Colors.brightBlue : Colors.white),
    className,
    onClick
  })
}

// Re-export both APIs
export { panel }
```

### 4. Lazy Loading System

**File**: `src/cli/lazy.ts`
```typescript
import type { Component } from "../core/types"

export interface LazyComponent {
  (): Promise<Component>
  preload?: () => Promise<void>
  isLoaded?: boolean
}

export function lazyLoad<T = any>(
  importFn: () => Promise<{ default: T }>,
  fallback?: Component
): LazyComponent {
  let cached: T | undefined
  let loading: Promise<T> | undefined
  
  const loader = async () => {
    if (cached) return cached
    
    if (!loading) {
      loading = importFn().then(module => {
        cached = module.default
        return cached
      })
    }
    
    return loading
  }
  
  const lazyComponent = async () => {
    try {
      return await loader()
    } catch (error) {
      console.error("Failed to load component:", error)
      if (fallback) return fallback
      throw error
    }
  }
  
  lazyComponent.preload = async () => {
    await loader()
  }
  
  Object.defineProperty(lazyComponent, "isLoaded", {
    get: () => !!cached
  })
  
  return lazyComponent
}

// Convenience helpers
export const lazyLoadCommand = (path: string) => 
  lazyLoad(() => import(path))

export const lazyLoadPlugin = (name: string) =>
  lazyLoad(() => import(name))
```

### 5. Plugin System

**File**: `src/cli/plugin.ts`
```typescript
import type { CLIConfig, CommandConfig } from "./config"

export interface Plugin {
  name: string
  version: string
  description?: string
  
  // Add new commands
  commands?: Record<string, CommandConfig>
  
  // Extend existing commands
  extends?: Record<string, CommandExtension>
  
  // Global middleware
  middleware?: PluginMiddleware
  
  // Plugin lifecycle
  install?: () => Promise<void> | void
  uninstall?: () => Promise<void> | void
}

export interface CommandExtension {
  options?: Record<string, z.ZodSchema>
  args?: Record<string, z.ZodSchema>
  wrapper?: HandlerWrapper
}

export type HandlerWrapper = (
  originalHandler: Handler
) => Handler

export interface PluginMiddleware {
  beforeCommand?: (command: string[], args: any) => Promise<void> | void
  afterCommand?: (command: string[], args: any, result: any) => Promise<void> | void
  onError?: (error: Error, command: string[], args: any) => Promise<void> | void
}

export function definePlugin(plugin: Plugin): Plugin {
  return plugin
}

// Plugin registry
export class PluginRegistry {
  private plugins = new Map<string, Plugin>()
  
  register(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin)
  }
  
  get(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }
  
  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }
  
  // Merge plugins into CLI config
  mergeIntoConfig(config: CLIConfig): CLIConfig {
    // Implementation details:
    // 1. Merge command definitions
    // 2. Apply command extensions
    // 3. Combine middleware
    // 4. Handle conflicts and priorities
  }
}
```

## File Organization Plan

### Current Structure (Keep)
```
src/
├── core/              # Keep existing Effect core
├── components/        # Keep existing components, add builders
├── services/          # Keep existing services
├── styling/           # Keep existing styling
├── layout/            # Keep existing layout
└── utils/             # Keep existing utilities
```

### New Structure (Add)
```
src/
├── cli/               # NEW: CLI framework
│   ├── config.ts
│   ├── parser.ts
│   ├── router.ts
│   ├── runner.ts
│   ├── plugin.ts
│   ├── lazy.ts
│   ├── help.ts
│   └── types.ts
└── wrappers/          # NEW: Simplified API wrappers
    ├── component.ts
    ├── reactivity.ts
    ├── lifecycle.ts
    ├── snippets.ts
    └── flow.ts

# Root level exports
component.ts           # Re-export from wrappers/component.ts
reactivity.ts          # Re-export from wrappers/reactivity.ts
cli.ts                 # Main CLI exports
jsx-runtime.ts         # Optional JSX support

# Component exports
components/
├── index.ts           # Export all components
├── Panel.ts           # Updated with builder function
├── Button.ts          # Updated with builder function
└── ... (all existing components)
```

### Package.json Updates
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./cli": {
      "import": "./dist/cli.js",
      "require": "./dist/cli.cjs"
    },
    "./component": {
      "import": "./dist/component.js",
      "require": "./dist/component.cjs"
    },
    "./components/*": {
      "import": "./dist/components/*.js",
      "require": "./dist/components/*.cjs"
    },
    "./jsx-runtime": {
      "import": "./dist/jsx-runtime.js",
      "require": "./dist/jsx-runtime.cjs"
    }
  },
  "bin": {
    "tuix": "./bin/tuix.ts"
  }
}
```

## Migration Strategy

### Backwards Compatibility
- ✅ All existing Effect-based components continue to work
- ✅ Existing examples run without changes
- ✅ Current API remains available alongside new API
- ✅ Gradual migration path

### New Examples Structure
```
examples/
├── legacy/            # Move current examples here
├── basic/             # Simple CLI examples
│   ├── hello.ts       # "Hello world" CLI
│   ├── counter.ts     # Interactive counter
│   └── file-browser.ts # File browser
├── advanced/          # Complex examples
│   ├── dev-server.ts  # Development server dashboard
│   ├── log-viewer.ts  # Log monitoring tool
│   └── task-manager.ts # Task management CLI
└── plugins/           # Plugin examples
    ├── auth-plugin.ts
    └── config-plugin.ts
```

## Testing Strategy

### Unit Tests
```
__tests__/
├── cli/
│   ├── config.test.ts     # Config parsing
│   ├── parser.test.ts     # Argument parsing
│   ├── router.test.ts     # Command routing
│   └── plugin.test.ts     # Plugin system
├── component/
│   ├── wrapper.test.ts    # Component wrapper
│   ├── reactivity.test.ts # State management
│   └── lifecycle.test.ts  # Lifecycle hooks
└── integration/
    ├── cli-commands.test.ts
    ├── plugin-loading.test.ts
    └── backwards-compat.test.ts
```

### E2E Tests
```
__tests__/e2e/
├── basic-cli.test.ts      # Simple CLI flows
├── interactive-cli.test.ts # Interactive components
├── plugin-system.test.ts  # Plugin integration
└── migration.test.ts      # Migration scenarios
```

## Documentation Plan

### API Documentation
```
docs/
├── api/
│   ├── cli-config.md      # defineConfig API
│   ├── components.md      # Component builders
│   ├── reactivity.md      # State management
│   ├── plugins.md         # Plugin development
│   └── migration.md       # Migration guide
├── guides/
│   ├── getting-started.md
│   ├── building-dashboards.md
│   ├── creating-plugins.md
│   └── testing-clis.md
└── examples/
    ├── simple-cli.md
    ├── interactive-dashboard.md
    └── plugin-development.md
```

## Progress Tracking

### Phase 1: Core CLI Infrastructure ✅
- [x] CLI configuration system (`src/cli/config.ts`)
- [x] Argument parser with Zod (`src/cli/parser.ts`) 
- [x] Command router (`src/cli/router.ts`)
- [x] Basic CLI runner (`src/cli/runner.ts`)
- [x] Lazy loading utilities (`src/cli/lazy.ts`)
- [x] Help system (`src/cli/help.ts`)
- [x] Type definitions (`src/cli/types.ts`)
- [x] Main CLI export (`cli.ts`)
- [x] Working example (`examples/cli/simple-cli.ts`)

**Status**: ✅ COMPLETED
**Key Achievements**:
- Command parsing with aliases support
- Zod-based argument validation and type coercion
- Help system with both text and component generation
- Lazy loading support for commands
- Fixed lazy handler detection bug
- Full test coverage with working CLI example

### Phase 2: Component API ✅
- [x] Component wrapper system (`src/components/component.ts`)
- [x] Reactivity primitives (`src/components/reactivity.ts`)
- [x] Lifecycle hooks (`src/components/lifecycle.ts`)
- [x] Builder functions for Panel and Button components
- [x] Package export structure with clean imports
- [x] Working examples demonstrating simplified API

**Status**: ✅ COMPLETED
**Key Achievements**:
- Svelte 5-inspired API with $state, $derived, $effect
- createComponent wrapper for simplified component creation
- Builder functions (Panel, Button variants) with intuitive options
- Clean imports: import { Panel, PrimaryButton } from "tuix"
- Lifecycle hooks (onMount, onDestroy, etc.)
- Working integration with CLI framework
- Component composition with vstack, hstack, text helpers

### Phase 3: Plugin System ⏸️
- [ ] Plugin definition API (`src/cli/plugin.ts`)
- [ ] Plugin loader and registry
- [ ] Hook system implementation
- [ ] Example plugins (auth, config)
- [ ] Plugin testing framework

### Phase 4: Polish & Documentation ⏸️
- [ ] JSX runtime (optional)
- [ ] Migration utilities
- [ ] Comprehensive documentation
- [ ] Example applications
- [ ] Performance optimization

## Risk Mitigation

### Technical Risks
1. **Performance Impact**: Wrapper functions could add overhead
   - *Mitigation*: Benchmark and optimize hot paths
   
2. **Bundle Size**: Additional APIs might increase bundle size
   - *Mitigation*: Tree-shaking support and modular exports
   
3. **Type Safety**: Simplified APIs might reduce type safety
   - *Mitigation*: Comprehensive TypeScript definitions and tests

### User Experience Risks
1. **API Confusion**: Two APIs might confuse users
   - *Mitigation*: Clear documentation and migration guide
   
2. **Breaking Changes**: Updates might break existing code
   - *Mitigation*: Semantic versioning and deprecation warnings

### Implementation Risks
1. **Scope Creep**: Features might expand beyond plan
   - *Mitigation*: Strict phase boundaries and MVP approach
   
2. **Integration Issues**: New APIs might not integrate well
   - *Mitigation*: Early prototypes and continuous testing

## Success Metrics

### Developer Experience
- [ ] CLI setup time < 5 minutes
- [ ] Common tasks require < 10 lines of code
- [ ] Plugin installation is one command
- [ ] Migration path is clear and documented

### Technical Quality
- [ ] 100% backwards compatibility
- [ ] < 5% performance overhead
- [ ] > 90% test coverage
- [ ] Zero breaking changes in minor versions

### Adoption
- [ ] Updated examples demonstrate new API
- [ ] Community plugins start appearing
- [ ] GitHub issues show usage patterns
- [ ] Documentation views increase

## Learning Log

### Assumptions to Test
- [ ] Developers prefer simplified API over Effect complexity
- [ ] Component-based approach works well for CLI tools
- [ ] Plugin system addresses extensibility needs
- [ ] Lazy loading provides meaningful performance benefits

### Key Decisions Made
- Start with Phase 1 CLI infrastructure
- Maintain 100% backwards compatibility
- Use Zod for argument validation
- Implement lazy loading from the start

### Lessons Learned
- (To be updated as we implement)

This plan provides a comprehensive roadmap for implementing the CLI framework while preserving the existing Effect-based architecture. The phased approach allows for iterative development and early feedback, while the backwards compatibility ensures existing users aren't disrupted.
