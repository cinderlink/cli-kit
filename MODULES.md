# Tuix Framework Modules

## Core Modules

### 🎯 core
**Purpose**: Core runtime, view system, and lifecycle management
**Status**: Stable
**Documentation**: [src/core/README.md](src/core/README.md)

Key Features:
- View tree management
- Lifecycle hooks
- Event system
- Type definitions
- Runtime coordination

### 🖥️ cli
**Purpose**: CLI framework for building command-line applications
**Status**: Stable
**Documentation**: [src/cli/README.md](src/cli/README.md)

Key Features:
- Command routing
- Plugin system
- Configuration management
- Help generation
- Lazy loading

### 🎨 components
**Purpose**: Pre-built UI components and component system
**Status**: Stable
**Documentation**: [src/components/README.md](src/components/README.md)

Key Features:
- Base component classes
- Layout components
- Interactive components
- Component lifecycle
- Reactivity integration

### 🔤 jsx
**Purpose**: JSX runtime for declarative UI development
**Status**: Stable
**Documentation**: [src/jsx/readme.md](src/jsx/readme.md)

Key Features:
- JSX transformation
- Component rendering
- Props handling
- Children management
- Dev tools integration

### 🎭 styling
**Purpose**: Styling system with ANSI support
**Status**: Stable
**Documentation**: [src/styling/readme.md](src/styling/readme.md)

Key Features:
- ANSI color support
- Gradient rendering
- Border styles
- Layout styling
- Performance optimization

### 📦 services
**Purpose**: Core services for terminal interaction
**Status**: Stable
**Documentation**: [src/services/readme.md](src/services/readme.md)

Key Features:
- Terminal abstraction
- Input handling
- Renderer service
- Storage service
- Mouse support

### 🔄 reactivity
**Purpose**: Reactive state management with runes
**Status**: Stable
**Documentation**: [src/reactivity/readme.md](src/reactivity/readme.md)

Key Features:
- Svelte-like runes
- Reactive stores
- Effect system
- State derivation
- Subscription management

### 🏗️ layout
**Purpose**: Layout algorithms and components
**Status**: Stable
**Documentation**: [src/layout/readme.md](src/layout/readme.md)

Key Features:
- Flexbox layout
- Grid layout
- Box model
- Spacer utilities
- Dynamic layouts

### 🔬 testing
**Purpose**: Testing utilities and harnesses
**Status**: Stable
**Documentation**: [src/testing/readme.md](src/testing/readme.md)

Key Features:
- Test harness
- Mock services
- Visual testing
- E2E utilities
- Component testing

### 🔌 plugins
**Purpose**: Plugin system and built-in plugins
**Status**: Beta
**Documentation**: [src/plugins/readme.md](src/plugins/readme.md)

Key Features:
- Plugin architecture
- Lifecycle hooks
- Configuration
- Inter-plugin communication
- Hot reloading

### 📋 logger
**Purpose**: Structured logging system
**Status**: Stable
**Documentation**: [src/logger/readme.md](src/logger/readme.md)

Key Features:
- Multiple transports
- Structured logging
- Log levels
- Performance optimized
- Bun native integration

### ⚙️ process-manager
**Purpose**: Process management and monitoring
**Status**: Stable
**Documentation**: [src/process-manager/readme.md](src/process-manager/readme.md)

Key Features:
- Process lifecycle management
- Resource monitoring
- Auto-restart
- Log streaming
- Health checks

### 🔍 scope
**Purpose**: Scope management for isolated execution contexts
**Status**: Experimental
**Documentation**: [src/scope/readme.md](src/scope/readme.md)

Key Features:
- Execution isolation
- Resource management
- Context propagation
- Memory boundaries
- Security features

### ⚙️ config
**Purpose**: Configuration management system
**Status**: Stable
**Documentation**: [src/config/readme.md](src/config/readme.md)

Key Features:
- Schema validation
- Environment support
- Type safety
- Live reloading
- Default values

### 🏥 health
**Purpose**: Health monitoring and diagnostics
**Status**: Beta
**Documentation**: [src/health/readme.md](src/health/readme.md)

Key Features:
- Health checks
- System monitoring
- Performance metrics
- Resource tracking
- Alerting

### 🎭 tea
**Purpose**: TEA (The Elm Architecture) components
**Status**: Experimental
**Documentation**: [src/tea/readme.md](src/tea/readme.md)

Key Features:
- Functional architecture
- Immutable state
- Message passing
- Predictable updates
- Time travel debugging

### 🛠️ utils
**Purpose**: Shared utility functions
**Status**: Stable
**Documentation**: [src/utils/readme.md](src/utils/readme.md)

Key Features:
- String utilities
- ANSI handling
- Type utilities
- Common helpers
- Performance optimized

### 📐 alignment
**Purpose**: Documentation alignment and AI assistant integration
**Status**: Planning
**Documentation**: [src/alignment/readme.md](src/alignment/readme.md)

Key Features:
- Documentation parsing
- Rule validation
- AI assistant tools
- Standards enforcement
- Convention checking

## Module Relationships

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
├─────────────────────────────────────────────────────┤
│  JSX Runtime  │  CLI Framework  │  Components       │
├─────────────────────────────────────────────────────┤
│  Reactivity   │  Styling        │  Layout           │
├─────────────────────────────────────────────────────┤
│  Services     │  Core           │  Testing          │
├─────────────────────────────────────────────────────┤
│  Logger       │  Process Mgr    │  Config           │
├─────────────────────────────────────────────────────┤
│  Plugins      │  Scope          │  Health           │
├─────────────────────────────────────────────────────┤
│  TEA          │  Utils          │  Alignment        │
└─────────────────────────────────────────────────────┘
```

## Integration Guidelines

### Module Boundaries
- Modules communicate through well-defined interfaces
- No circular dependencies between modules
- Integration code lives in subdirectories

### Common Patterns
```typescript
// Direct usage
import { View } from '@tuix/core'

// Integration usage
import { CliView } from '@tuix/cli/components'

// Plugin usage
import { logger } from '@tuix/plugins/logger'
```

## Module Development

### Creating New Modules
1. Create directory in `src/`
2. Add required documentation files (readme.md, rules.md, etc.)
3. Define public API in `index.ts`
4. Implement core functionality
5. Add comprehensive tests
6. Update this file

### Module Standards
- Each module must have complete documentation
- All exports must be typed
- Test coverage minimum 80%
- No external dependencies without justification
- Clear separation of concerns

## Module Status Definitions

- **Stable**: Production-ready, stable API
- **Beta**: Feature-complete, API may change
- **Experimental**: Under development, API will change
- **Planning**: Design phase, not yet implemented
- **Deprecated**: Being phased out, use alternatives

## Quick Start Examples

### CLI Application
```typescript
import { cli } from '@tuix/cli'

cli.command('hello', {
  description: 'Say hello',
  action: () => console.log('Hello, world!')
})

cli.run()
```

### JSX Application
```typescript
import { render } from '@tuix/jsx'
import { Box, Text } from '@tuix/components'

function App() {
  return (
    <Box>
      <Text>Hello, JSX!</Text>
    </Box>
  )
}

render(<App />)
```

### Component Creation
```typescript
import { Component } from '@tuix/components'
import { View } from '@tuix/core'

export class MyComponent extends Component {
  render(): View {
    return View.text('My Component')
  }
}
```