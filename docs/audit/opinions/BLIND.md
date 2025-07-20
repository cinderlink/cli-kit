# TUIX Framework Overview

## Current Architecture & Feature Diagram

```
                                 TUIX Framework
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
          ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
          │    CLI    │        │    UI     │        │  System   │
          │ Framework │        │Framework  │        │ Services  │
          └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
                │                     │                     │
      ┌─────────┼─────────┐          │          ┌─────────┼─────────┐
      │         │         │          │          │         │         │
  ┌───▼───┐ ┌──▼──┐ ┌────▼────┐     │     ┌───▼───┐ ┌───▼───┐ ┌──▼──┐
  │Plugins│ │Args │ │Commands │     │     │Input  │ │Render │ │Term │
  └───────┘ └─────┘ └─────────┘     │     └───────┘ └───────┘ └─────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
       ┌────▼────┐             ┌───▼───┐              ┌────▼────┐
       │Components│             │Layout │              │Styling  │
       └────┬────┘             └───┬───┘              └────┬────┘
            │                       │                       │
    ┌───────┼───────┐              │              ┌─────────┼─────────┐
    │       │       │              │              │         │         │
┌───▼───┐┌─▼─┐ ┌───▼───┐         │         ┌────▼────┐ ┌──▼──┐ ┌──▼──┐
│Interact││UI │ │Display│         │         │Flexbox  │ │Color│ │Anim │
└───────┘└───┘ └───────┘         │         └─────────┘ └─────┘ └─────┘
                                  │
                            ┌─────▼─────┐
                            │ Reactivity│
                            │  (Runes)  │
                            └───────────┘

          ┌─────────────────────────────────────────────┐
          │              Foundation Layer                │
          │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
          │  │  Core   │  │Effect.ts│  │  Types  │     │
          │  │   MVU   │  │ Runtime │  │ System  │     │
          │  └─────────┘  └─────────┘  └─────────┘     │
          └─────────────────────────────────────────────┘
```

## Current Major Feature Groups & Related Files

### 1. Core Foundation (MVU + Effect.ts)
**Purpose**: Fundamental architecture, error handling, type system
- `src/core/errors.ts` - Error handling system
- `src/core/runtime.ts` - MVU runtime implementation
- `src/core/types.ts` - Core type definitions
- `src/core/view.ts` - View system
- `src/core/view-cache.ts` - View caching
- `src/core/interactive.ts` - Interactive runtime
- `src/core/keys.ts` - Key handling
- `src/core/schemas.ts` - Schema validation
- `src/core/type-utils.ts` - Type utilities
- `src/core/index.ts` - Core exports
- **Test files**: `src/core/*.test.ts`

### 2. CLI Framework
**Purpose**: Command-line application framework with plugins
- `src/cli/index.ts` - CLI framework entry
- `src/cli/config.ts` - Configuration management
- `src/cli/help.ts` - Help generation
- `src/cli/hooks.ts` - Lifecycle hooks
- `src/cli/lazy-cache.ts` - Performance caching
- `src/cli/lazy.ts` - Lazy loading
- `src/cli/loader.ts` - Module loading
- `src/cli/parser.ts` - Argument parsing
- `src/cli/plugin.ts` - Plugin system
- `src/cli/plugin-test-utils.ts` - Testing utilities
- `src/cli/registry.ts` - Command registry
- `src/cli/router.ts` - Command routing
- `src/cli/runner.ts` - Command execution
- `src/cli/types.ts` - CLI type definitions

### 3. JSX Runtime & Declarative Layer
**Purpose**: JSX support for terminal UIs
- `src/jsx-runtime.ts` - JSX runtime implementation
- `src/jsx-app.ts` - JSX application helpers
- `src/jsx-components.ts` - JSX component utilities
- `src/jsx-config-validator.ts` - JSX configuration validation
- `src/jsx-render.ts` - JSX rendering
- `src/jsx-lifecycle-example.tsx` - JSX lifecycle example

### 4. Component Library
**Purpose**: Reusable UI components for terminal interfaces

#### Core Components
- `src/components/base.ts` - Base component implementation
- `src/components/component.ts` - Component utilities
- `src/components/lifecycle.ts` - Component lifecycle
- `src/components/reactivity.ts` - Component reactivity
- `src/components/mouse-aware.ts` - Mouse interaction support
- `src/components/index.ts` - Component exports

#### Interactive Components
- `src/components/Button.ts` - Button component
- `src/components/TextInput.ts` - Text input component
- `src/components/FilePicker.ts` - File picker component
- `src/components/List.ts` - List component
- `src/components/Table.ts` - Table component

#### Display Components
- `src/components/Text.ts` - Text display component
- `src/components/LargeText.ts` - Large text display
- `src/components/Box.ts` - Box container component
- `src/components/Spinner.ts` - Loading spinner
- `src/components/ProgressBar.ts` - Progress bar

#### Layout Components
- `src/components/Tabs.ts` - Tab container
- `src/components/Modal.ts` - Modal dialog
- `src/components/Viewport.ts` - Viewport component
- `src/components/Help.ts` - Help display component
- `src/components/MarkdownRenderer.ts` - Markdown renderer
- `src/components/Exit.ts` / `src/components/Exit.tsx` - Exit component (DUPLICATE)

#### Builders & Utilities
- `src/components/builders/Button.ts` - Button builder API
- `src/components/builders/Panel.ts` - Panel builder API
- `src/components/builders/index.ts` - Builder exports

#### JSX Components
- `src/components/jsx/TextInput.tsx` - JSX TextInput implementation

#### Stream Components
- `src/components/streams/index.ts` - Stream component exports
- `src/components/streams/spawn.ts` - Process spawning component

### 5. Reactivity System (Runes)
**Purpose**: Svelte 5-inspired reactive state management
- `src/reactivity/runes.ts` - Runes implementation
- `src/reactivity/lifecycle.ts` - Reactive lifecycle
- `src/reactivity/jsx-lifecycle.ts` - JSX-specific lifecycle
- `src/reactivity/index.ts` - Reactivity exports
- `src/runes.ts` - **DUPLICATE** (should be removed)

### 6. Layout System
**Purpose**: CSS-inspired layout containers and positioning
- `src/layout/index.ts` - Layout exports
- `src/layout/types.ts` - Layout type definitions
- `src/layout/box.ts` - Box layout implementation
- `src/layout/flexbox.ts` - Flexbox layout
- `src/layout/flexbox-simple.ts` - Simplified flexbox
- `src/layout/grid.ts` - Grid layout
- `src/layout/dynamic-layout.ts` - Dynamic layout system
- `src/layout/join.ts` - Layout joining utilities
- `src/layout/simple.ts` - Simple layout utilities
- `src/layout/spacer.ts` - Spacing utilities

### 7. Styling System
**Purpose**: CSS-inspired styling with terminal support
- `src/styling/index.ts` - Styling exports
- `src/styling/types.ts` - Style type definitions
- `src/styling/style.ts` - Style implementation
- `src/styling/color.ts` - Color system
- `src/styling/borders.ts` - Border styling
- `src/styling/gradients.ts` - Gradient effects
- `src/styling/advanced.ts` - Advanced styling features
- `src/styling/render.ts` - Style rendering
- `src/styling/render-optimized.ts` - Optimized rendering

### 8. Services Layer
**Purpose**: System integration and hardware abstraction

#### Core Services
- `src/services/index.ts` - Service exports
- `src/services/terminal.ts` - Terminal service interface
- `src/services/input.ts` - Input service interface
- `src/services/renderer.ts` - Renderer service interface
- `src/services/storage.ts` - Storage service interface

#### Service Implementations
- `src/services/impl/index.ts` - Implementation exports
- `src/services/impl/terminal-impl.ts` - Terminal implementation
- `src/services/impl/input-impl.ts` - Input implementation
- `src/services/impl/renderer-impl.ts` - Renderer implementation
- `src/services/impl/storage-impl.ts` - Storage implementation

#### Specialized Services
- `src/services/focus.ts` - Focus management
- `src/services/hit-test.ts` - Hit testing for mouse events
- `src/services/mouse-router.ts` - Mouse event routing

### 9. Process Manager
**Purpose**: Process lifecycle and monitoring
- `src/process-manager/index.ts` - Process manager exports
- `src/process-manager/types.ts` - Process manager types
- `src/process-manager/manager.ts` - Main process manager
- `src/process-manager/wrapper.ts` - Process wrapper
- `src/process-manager/ipc.ts` - Inter-process communication
- `src/process-manager/doctor.ts` - Process health monitoring
- `src/process-manager/templates.ts` - Process templates
- `src/process-manager/bun-wrapper.ts` - Bun-specific wrapper
- `src/process-manager/bun-fs.ts` - Bun filesystem utilities
- `src/process-manager/bun-ipc.ts` - Bun IPC implementation
- `src/process-manager/components/ProcessMonitor.ts` - Process monitor component

### 10. Logger System
**Purpose**: Structured logging with multiple transports
- `src/logger/index.ts` - Logger exports
- `src/logger/types.ts` - Logger type definitions
- `src/logger/logger.ts` - Main logger implementation
- `src/logger/formatters.ts` - Log formatters
- `src/logger/transports.ts` - Log transports
- `src/logger/bun-logger.ts` - Bun-specific logger
- `src/logger/bun-transports.ts` - Bun transports
- `src/logger/test-logger.ts` - Testing logger
- `src/logger/components/LogExplorer.ts` - Log explorer component

### 11. Screenshot System
**Purpose**: Terminal screenshot capture and management
- `src/screenshot/index.ts` - Screenshot exports
- `src/screenshot/types.ts` - Screenshot types
- `src/screenshot/capture.ts` - Screenshot capture
- `src/screenshot/reconstruct.ts` - Screenshot reconstruction
- `src/screenshot/storage.ts` - Screenshot storage
- `src/screenshot/external.ts` - External screenshot handling
- `src/screenshot/protocol.ts` - Screenshot protocol

### 12. Testing Utilities
**Purpose**: Testing framework and utilities
- `src/testing/index.ts` - Testing exports
- `src/testing/test-utils.ts` - Test utilities
- `src/testing/e2e-harness.ts` - E2E test harness
- `src/testing/simple-harness.ts` - Simple test harness
- `src/testing/input-adapter.ts` - Input simulation
- `src/testing/visual-test.ts` - Visual testing support

### 13. Theming System
**Purpose**: Theme support and adaptive colors
- `src/theming/index.ts` - Theming exports
- `src/theming/theme.ts` - Theme implementation
- `src/theming/adaptive-color.ts` - Adaptive color system

### 14. Utilities
**Purpose**: Common utilities and helpers
- `src/utils/index.ts` - Utility exports
- `src/utils/string-width.ts` - String width calculation
- `src/utils/string-width-optimized.ts` - Optimized string width
- `src/utils/ansi.ts` - ANSI terminal utilities

### 15. Health System
**Purpose**: Framework health monitoring
- `src/health/index.ts` - Health monitoring

### 16. Plugins
**Purpose**: Example plugins and extensions
- `src/plugins/index.ts` - Plugin exports
- `src/plugins/logging.tsx` - Logging plugin
- `src/plugins/process-manager.tsx` - Process manager plugin

### 17. Other/Root Level
- `src/index.ts` - Main framework export

---

## Issues Found in Current Organization

### 🔴 Critical Duplications
1. **Runes**: `src/runes.ts` vs `src/reactivity/runes.ts`
2. **Exit Component**: `src/components/Exit.ts` vs `src/components/Exit.tsx`
3. **String Width**: `src/utils/string-width.ts` vs `src/utils/string-width-optimized.ts`
4. **Multiple Lifecycle Systems**: Components have separate lifecycle implementations

### 🟡 Misorganized Files
1. **JSX Files Scattered**: JSX-related files are spread across root and components
2. **Test Files in Source**: `*.test.ts` files should be in test directories
3. **Mixed Component Types**: Both `.ts` and `.tsx` components in same directory
4. **Process Manager Complexity**: Too many separate files for related functionality

### 🟠 Missed Opportunities
1. **JSX Component Conversion**: Many components could benefit from JSX syntax
2. **Stream Components**: Limited use of stream-based components
3. **Plugin Architecture**: Underutilized plugin system
4. **Theming Integration**: Theming system not fully integrated

### 🔵 Naming Inconsistencies
1. **File Naming**: Mix of kebab-case, camelCase, and PascalCase
2. **Directory Structure**: Inconsistent patterns between feature areas

---

## Proposed New Directory Structure

```
src/
├── core/                           # Foundation layer
│   ├── runtime/                    # MVU runtime
│   │   ├── index.ts
│   │   ├── mvu.ts                 # From runtime.ts
│   │   ├── view.ts
│   │   ├── view-cache.ts
│   │   └── interactive.ts
│   ├── errors/                     # Error handling
│   │   ├── index.ts
│   │   ├── types.ts               # From errors.ts
│   │   └── recovery.ts
│   ├── types/                      # Type system
│   │   ├── index.ts
│   │   ├── core.ts                # From types.ts
│   │   ├── schemas.ts
│   │   └── utils.ts               # From type-utils.ts
│   └── keys/                       # Key handling
│       ├── index.ts
│       └── keys.ts
│
├── jsx/                           # JSX runtime and utilities
│   ├── runtime/
│   │   ├── index.ts
│   │   ├── jsx-runtime.ts
│   │   └── jsx-render.ts
│   ├── app/
│   │   ├── index.ts
│   │   ├── app.ts                 # From jsx-app.ts
│   │   └── config-validator.ts    # From jsx-config-validator.ts
│   ├── components/
│   │   ├── index.ts
│   │   └── jsx-components.ts
│   └── examples/
│       └── lifecycle-example.tsx
│
├── reactivity/                    # Unified reactivity system
│   ├── index.ts
│   ├── runes.ts                   # Consolidated from both runes files
│   ├── lifecycle.ts               # Unified lifecycle
│   └── jsx-lifecycle.ts
│
├── components/                    # All components as JSX
│   ├── base/                      # Base component system
│   │   ├── index.ts
│   │   ├── component.tsx          # From component.ts
│   │   ├── base.tsx               # From base.ts
│   │   ├── lifecycle.tsx          # From lifecycle.ts
│   │   ├── reactivity.tsx         # From reactivity.ts
│   │   └── mouse-aware.tsx        # From mouse-aware.ts
│   ├── interactive/               # Interactive components
│   │   ├── index.ts
│   │   ├── button.tsx             # From Button.ts
│   │   ├── text-input.tsx         # From TextInput.ts + jsx/TextInput.tsx
│   │   ├── file-picker.tsx        # From FilePicker.ts
│   │   ├── list.tsx               # From List.ts
│   │   └── table.tsx              # From Table.ts
│   ├── display/                   # Display components
│   │   ├── index.ts
│   │   ├── text.tsx               # From Text.ts
│   │   ├── large-text.tsx         # From LargeText.ts
│   │   ├── spinner.tsx            # From Spinner.ts
│   │   ├── progress-bar.tsx       # From ProgressBar.ts
│   │   └── markdown-renderer.tsx  # From MarkdownRenderer.ts
│   ├── layout/                    # Layout components
│   │   ├── index.ts
│   │   ├── box.tsx                # From Box.ts
│   │   ├── tabs.tsx               # From Tabs.ts
│   │   ├── modal.tsx              # From Modal.ts
│   │   ├── viewport.tsx           # From Viewport.ts
│   │   └── exit.tsx               # Consolidated from Exit.ts/tsx
│   ├── utility/                   # Utility components
│   │   ├── index.ts
│   │   └── help.tsx               # From Help.ts
│   ├── streams/                   # Stream components
│   │   ├── index.ts
│   │   └── spawn.tsx              # From streams/spawn.ts
│   └── builders/                  # Builder APIs
│       ├── index.ts
│       ├── button.ts              # From builders/Button.ts
│       └── panel.ts               # From builders/Panel.ts
│
├── layout/                        # Layout system
│   ├── index.ts
│   ├── types.ts
│   ├── engines/                   # Layout engines
│   │   ├── index.ts
│   │   ├── box.ts
│   │   ├── flexbox.ts             # Consolidated from flexbox files
│   │   ├── grid.ts
│   │   └── dynamic.ts             # From dynamic-layout.ts
│   └── utilities/                 # Layout utilities
│       ├── index.ts
│       ├── join.ts
│       ├── spacer.ts
│       └── simple.ts
│
├── styling/                       # Styling system
│   ├── index.ts
│   ├── types.ts
│   ├── core/                      # Core styling
│   │   ├── index.ts
│   │   ├── style.ts
│   │   └── color.ts
│   ├── effects/                   # Visual effects
│   │   ├── index.ts
│   │   ├── borders.ts
│   │   ├── gradients.ts
│   │   └── advanced.ts
│   └── rendering/                 # Style rendering
│       ├── index.ts
│       ├── render.ts              # Consolidated rendering
│       └── optimized.ts           # From render-optimized.ts
│
├── theming/                       # Theme system
│   ├── index.ts
│   ├── theme.ts
│   └── adaptive-color.ts
│
├── services/                      # System services
│   ├── index.ts
│   ├── interfaces/                # Service interfaces
│   │   ├── index.ts
│   │   ├── terminal.ts
│   │   ├── input.ts
│   │   ├── renderer.ts
│   │   └── storage.ts
│   ├── implementations/           # Service implementations
│   │   ├── index.ts
│   │   ├── terminal-impl.ts
│   │   ├── input-impl.ts
│   │   ├── renderer-impl.ts
│   │   └── storage-impl.ts
│   └── specialized/               # Specialized services
│       ├── index.ts
│       ├── focus.ts
│       ├── hit-test.ts
│       └── mouse-router.ts
│
├── system/                        # System-level features
│   ├── process-manager/           # Consolidated process management
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── core/                  # Core process management
│   │   │   ├── index.ts
│   │   │   ├── manager.ts
│   │   │   ├── wrapper.ts
│   │   │   └── ipc.ts
│   │   ├── runtime/               # Runtime-specific implementations
│   │   │   ├── index.ts
│   │   │   ├── bun-wrapper.ts
│   │   │   ├── bun-fs.ts
│   │   │   └── bun-ipc.ts
│   │   ├── monitoring/            # Process monitoring
│   │   │   ├── index.ts
│   │   │   ├── doctor.ts
│   │   │   └── health.ts          # From health/index.ts
│   │   ├── templates/
│   │   │   ├── index.ts
│   │   │   └── templates.ts
│   │   └── components/
│   │       ├── index.ts
│   │       └── process-monitor.tsx # From ProcessMonitor.ts
│   ├── logger/                    # Logging system
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── core/                  # Core logging
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   └── formatters.ts
│   │   ├── transports/            # Log transports
│   │   │   ├── index.ts
│   │   │   ├── transports.ts
│   │   │   ├── bun-transports.ts
│   │   │   └── test-logger.ts
│   │   ├── runtime/               # Runtime-specific loggers
│   │   │   ├── index.ts
│   │   │   └── bun-logger.ts
│   │   └── components/
│   │       ├── index.ts
│   │       └── log-explorer.tsx   # From LogExplorer.ts
│   └── screenshot/                # Screenshot system
│       ├── index.ts
│       ├── types.ts
│       ├── core/                  # Core screenshot functionality
│       │   ├── index.ts
│       │   ├── capture.ts
│       │   ├── reconstruct.ts
│       │   └── storage.ts
│       └── protocols/             # External protocols
│           ├── index.ts
│           ├── external.ts
│           └── protocol.ts
│
├── cli/                           # CLI framework
│   ├── index.ts
│   ├── types.ts
│   ├── core/                      # Core CLI functionality
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── parser.ts
│   │   ├── runner.ts
│   │   └── registry.ts
│   ├── plugins/                   # Plugin system
│   │   ├── index.ts
│   │   ├── plugin.ts
│   │   ├── hooks.ts
│   │   └── test-utils.ts          # From plugin-test-utils.ts
│   ├── routing/                   # Command routing
│   │   ├── index.ts
│   │   └── router.ts
│   ├── loading/                   # Lazy loading system
│   │   ├── index.ts
│   │   ├── lazy.ts
│   │   ├── loader.ts
│   │   └── cache.ts               # From lazy-cache.ts
│   └── presentation/              # User interface
│       ├── index.ts
│       └── help.ts
│
├── testing/                       # Testing utilities
│   ├── index.ts
│   ├── utilities/                 # Test utilities
│   │   ├── index.ts
│   │   ├── test-utils.ts
│   │   └── input-adapter.ts
│   ├── harnesses/                 # Test harnesses
│   │   ├── index.ts
│   │   ├── e2e-harness.ts
│   │   └── simple-harness.ts
│   └── visual/                    # Visual testing
│       ├── index.ts
│       └── visual-test.ts
│
├── utilities/                     # Common utilities
│   ├── index.ts
│   ├── string/                    # String utilities
│   │   ├── index.ts
│   │   └── width.ts               # Consolidated string width
│   └── terminal/                  # Terminal utilities
│       ├── index.ts
│       └── ansi.ts
│
├── examples/                      # Example plugins
│   ├── plugins/
│   │   ├── index.ts
│   │   ├── logging.tsx
│   │   └── process-manager.tsx
│   └── components/
│       └── (example components)
│
└── index.ts                      # Main framework export
```

## Migration Benefits

### 🎯 Improved Organization
- **Logical Grouping**: Related functionality is co-located
- **Clear Boundaries**: Each directory has a single, clear purpose
- **Reduced Confusion**: No more duplicate files or scattered implementations

### 🚀 Better Developer Experience
- **Easier Navigation**: Intuitive directory structure
- **Consistent Patterns**: Similar organization across all feature areas
- **Better Imports**: Clear import paths that reflect functionality

### 🛡️ Reduced Maintenance
- **Single Source of Truth**: No duplicate implementations
- **Unified APIs**: Consistent interfaces across similar features
- **Better Testing**: Test files properly organized

### 📈 Scalability
- **Room for Growth**: Clear places to add new features
- **Plugin Architecture**: Better support for extensions
- **Performance**: Optimized for tree-shaking and lazy loading

## Migration Strategy

### Phase 1: Remove Duplicates
1. Consolidate runes implementations
2. Remove duplicate Exit component
3. Merge string width utilities
4. Unify lifecycle systems

### Phase 2: Reorganize Core
1. Restructure core/ directory
2. Move JSX files to jsx/ directory
3. Consolidate reactivity system

### Phase 3: Convert Components
1. Convert all components to JSX
2. Reorganize by component type
3. Update import paths

### Phase 4: Restructure Systems
1. Reorganize services layer
2. Restructure system features (process-manager, logger, screenshot)
3. Reorganize CLI framework

### Phase 5: Update Testing
1. Move test files to appropriate directories
2. Update test imports
3. Consolidate testing utilities

### Phase 6: Documentation & Cleanup
1. Update all import statements
2. Update documentation
3. Run comprehensive tests
4. Update examples and demos