# Feature and Component Relationships

## Core Dependencies

### Core Module (`src/core/`)
**Foundation of the entire system**

```
src/core/
├── types.ts          → Defines Component, ComponentState, Effect types
├── runtime.ts        → Runtime engine, uses types.ts
├── view.ts           → View system, uses types.ts, runtime.ts
├── view-cache.ts     → View caching, uses view.ts
├── errors.ts         → Error handling, used by all modules
├── keys.ts           → Key handling, used by input systems
├── interactive.ts    → Interactive mode, uses runtime.ts
├── schemas.ts        → Data validation schemas
├── type-utils.ts     → Type utilities
└── index.ts          → Public API exports
```

**Dependencies:**
- `types.ts` → Used by ALL modules (fundamental types)
- `runtime.ts` → Used by components, services, CLI
- `view.ts` → Used by components, layout, rendering
- `errors.ts` → Used by ALL modules (error handling)

## Component System

### Base Components (`src/components/`)
**UI building blocks**

```
src/components/
├── base.ts           → Base component logic, uses core/types.ts
├── component.ts      → Component utilities, uses base.ts
├── lifecycle.ts      → Component lifecycle, uses component.ts
├── reactivity.ts     → Reactive components, uses lifecycle.ts
├── mouse-aware.ts    → Mouse integration, uses base.ts
└── index.ts          → Public exports
```

### UI Components
**Concrete implementations**

```
Components → Dependencies
├── Box.ts            → base.ts, styling/
├── Button.ts         → base.ts, styling/, mouse-aware.ts
├── TextInput.ts      → base.ts, services/input.ts, reactivity.ts
├── Table.ts          → base.ts, styling/, layout/
├── Modal.ts          → base.ts, styling/, services/focus.ts
├── List.ts           → base.ts, styling/
├── Text.ts           → base.ts, styling/
├── Tabs.ts           → base.ts, styling/, mouse-aware.ts
├── Spinner.ts        → base.ts, styling/
├── ProgressBar.ts    → base.ts, styling/
├── FilePicker.ts     → base.ts, services/
├── Help.ts           → base.ts, styling/
├── LargeText.ts      → base.ts, styling/
├── Viewport.ts       → base.ts, layout/
└── Exit.ts           → base.ts, core/runtime.ts
```

### Builder Components (`src/components/builders/`)
**Fluent API builders**

```
├── Button.ts         → ../Button.ts
├── Panel.ts          → ../Box.ts, styling/
└── index.ts          → Exports both builders
```

## Service Layer

### Core Services (`src/services/`)
**System services**

```
Services → Dependencies
├── terminal.ts       → core/types.ts, core/errors.ts
├── input.ts          → terminal.ts, core/keys.ts
├── renderer.ts       → terminal.ts, styling/
├── storage.ts        → core/errors.ts
├── focus.ts          → core/types.ts
├── hit-test.ts       → core/types.ts, layout/
├── mouse-router.ts   → hit-test.ts, input.ts
└── index.ts          → All service exports
```

### Service Implementations (`src/services/impl/`)
**Concrete service implementations**

```
├── terminal-impl.ts  → ../terminal.ts, Bun APIs
├── input-impl.ts     → ../input.ts, terminal-impl.ts
├── renderer-impl.ts  → ../renderer.ts, styling/
├── storage-impl.ts   → ../storage.ts, Bun APIs
└── index.ts          → All implementations
```

## Layout System

### Layout Engines (`src/layout/`)
**Positioning and sizing**

```
Layout → Dependencies
├── types.ts          → core/types.ts
├── box.ts            → types.ts
├── flexbox.ts        → types.ts, box.ts
├── flexbox-simple.ts → flexbox.ts (simplified API)
├── grid.ts           → types.ts
├── join.ts           → types.ts
├── spacer.ts         → types.ts
├── simple.ts         → types.ts (basic layouts)
├── dynamic-layout.ts → types.ts (runtime layout)
└── index.ts          → All layout exports
```

## Styling System

### Styling Engine (`src/styling/`)
**Visual appearance**

```
Styling → Dependencies
├── types.ts          → core/types.ts
├── color.ts          → types.ts
├── borders.ts        → types.ts, color.ts
├── gradients.ts      → types.ts, color.ts
├── style.ts          → types.ts, color.ts, borders.ts
├── render.ts         → style.ts, types.ts
├── render-optimized.ts → render.ts (performance optimized)
├── advanced.ts       → style.ts, gradients.ts
└── index.ts          → All styling exports
```

## JSX Integration

### JSX Runtime (`src/jsx-*.ts`)
**JSX support**

```
JSX → Dependencies
├── jsx-runtime.ts    → core/types.ts, core/runtime.ts
├── jsx-render.ts     → jsx-runtime.ts, components/
├── jsx-app.ts        → jsx-runtime.ts, cli/
└── jsx-components.ts → jsx-runtime.ts, components/ (all)
```

## CLI Framework

### CLI System (`src/cli/`)
**Command-line interface**

```
CLI → Dependencies
├── types.ts          → core/types.ts
├── config.ts         → types.ts, services/storage.ts
├── parser.ts         → types.ts, core/errors.ts
├── router.ts         → types.ts, parser.ts
├── runner.ts         → types.ts, core/runtime.ts
├── registry.ts       → types.ts, plugin.ts
├── plugin.ts         → types.ts, loader.ts
├── loader.ts         → types.ts, services/
├── help.ts           → types.ts, components/Help.ts
├── hooks.ts          → types.ts, core/runtime.ts
├── lazy.ts           → types.ts
├── lazy-cache.ts     → lazy.ts, services/storage.ts
├── plugin-test-utils.ts → plugin.ts, testing/
└── index.ts          → All CLI exports
```

## Reactivity System

### Runes (`src/reactivity/`)
**Reactive state management**

```
Reactivity → Dependencies
├── runes.ts          → core/types.ts, Effect
├── index.ts          → runes.ts
└── ../runes.ts       → reactivity/runes.ts (re-export)
```

## Specialized Systems

### Process Manager (`src/process-manager/`)
**Process lifecycle management**

```
Process Manager → Dependencies
├── types.ts          → core/types.ts
├── ipc.ts            → types.ts, core/errors.ts
├── manager.ts        → types.ts, ipc.ts
├── wrapper.ts        → types.ts, manager.ts
├── doctor.ts         → types.ts, manager.ts
├── templates.ts      → types.ts
├── bun-*.ts          → Bun-specific implementations
└── components/ProcessMonitor.ts → ../types.ts, components/
```

### Logger (`src/logger/`)
**Logging infrastructure**

```
Logger → Dependencies
├── types.ts          → core/types.ts
├── logger.ts         → types.ts, core/errors.ts
├── formatters.ts     → types.ts
├── transports.ts     → types.ts, services/terminal.ts
├── bun-*.ts          → Bun-specific implementations
└── components/LogExplorer.ts → ../types.ts, components/
```

### Screenshot (`src/screenshot/`)
**Screenshot functionality**

```
Screenshot → Dependencies
├── types.ts          → core/types.ts
├── capture.ts        → types.ts, services/terminal.ts
├── reconstruct.ts    → types.ts, capture.ts
├── storage.ts        → types.ts, services/storage.ts
├── protocol.ts       → types.ts
├── external.ts       → types.ts, protocol.ts
└── index.ts          → All screenshot exports
```

### Theming (`src/theming/`)
**Theme management**

```
Theming → Dependencies
├── theme.ts          → styling/types.ts, styling/color.ts
├── adaptive-color.ts → theme.ts, styling/color.ts
└── index.ts          → All theming exports
```

## Testing Infrastructure

### Testing Utils (`src/testing/`)
**Test utilities and harnesses**

```
Testing → Dependencies
├── test-utils.ts     → core/types.ts, components/
├── simple-harness.ts → test-utils.ts, services/
├── e2e-harness.ts    → test-utils.ts, cli/
├── input-adapter.ts  → services/input.ts
├── visual-test.ts    → components/, styling/
└── index.ts          → All testing exports
```

## Critical Dependency Chains

### 1. Core Foundation Chain
```
core/types.ts → core/runtime.ts → components/base.ts → UI Components
```

### 2. Service Chain
```
core/errors.ts → services/terminal.ts → services/input.ts → components/
```

### 3. Styling Chain
```
styling/types.ts → styling/color.ts → styling/style.ts → components/
```

### 4. Layout Chain
```
layout/types.ts → layout/box.ts → layout/flexbox.ts → components/
```

### 5. CLI Chain
```
cli/types.ts → cli/parser.ts → cli/router.ts → cli/runner.ts
```

## Component Usage Patterns

### High-Level Components (Used by applications)
- `Button`, `TextInput`, `Table`, `Modal`
- `FilePicker`, `Help`, `ProgressBar`
- `Tabs`, `List`, `Viewport`

### Low-Level Components (Used by other components)
- `Box`, `Text`, `Spinner`
- `base.ts`, `component.ts`, `lifecycle.ts`

### Builder Components (Fluent APIs)
- `builders/Button.ts`, `builders/Panel.ts`

## Service Usage Patterns

### Direct Service Usage
```typescript
// Components using services directly
TextInput → input.ts
Modal → focus.ts
components → renderer.ts (for rendering)
```

### Service Implementation Pattern
```typescript
// Interface → Implementation → Usage
terminal.ts → terminal-impl.ts → input-impl.ts
```

## Missing Relationships (Potential Issues)

### Components Without Tests
- Most components lack corresponding test files
- Only 4 core files have tests out of 122 total files

### Potential Circular Dependencies
- Need to audit: `jsx-components.ts` importing all components
- Need to audit: `index.ts` files for circular imports

### Undocumented Dependencies
- Effect.ts usage patterns not clearly documented
- Bun API usage not centralized
- Service layer abstractions may be incomplete

## Feature Consolidation Opportunities

### Duplicate Layout Systems
- `flexbox.ts` vs `flexbox-simple.ts` (simplification candidate)
- `render.ts` vs `render-optimized.ts` (performance optimization)

### Multiple Component APIs
- Traditional components vs JSX components
- Builder pattern vs direct instantiation
- Runes vs traditional state management

### Service Implementation Variants
- Multiple transport implementations
- Different logger backends
- Various storage backends

## API Surface Analysis

### Primary APIs (User-facing)
1. **JSX Components** - Main user interface
2. **Runes** - Reactive state management
3. **CLI Framework** - Command-line applications
4. **Effect Integration** - Async/error handling

### Secondary APIs (Internal)
1. **Service Layer** - System services
2. **Layout System** - Positioning
3. **Styling System** - Visual appearance
4. **Testing Utils** - Development tools

### Support APIs (Infrastructure)
1. **Core Runtime** - Foundation
2. **Process Manager** - Process lifecycle
3. **Logger** - Debugging/monitoring
4. **Screenshot** - Visual testing