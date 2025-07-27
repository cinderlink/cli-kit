# Tuix Framework Documentation

## Framework Documentation

### Core Documentation
- **[RULES.md](./RULES.md)** - Framework-wide NEVER/ALWAYS rules
- **[STANDARDS.md](./STANDARDS.md)** - Code quality standards
- **[CONVENTIONS.md](./CONVENTIONS.md)** - File naming and organization conventions
- **[DEPENDENCIES.md](./DEPENDENCIES.md)** - Framework dependencies guide
- **[MODULES.md](./MODULES.md)** - Module system overview
- **[PLUGINS.md](./PLUGINS.md)** - Plugin system documentation

### Architecture Documentation
- **[ARCHITECTURE_AND_DATA_FLOWS.md](./ARCHITECTURE_AND_DATA_FLOWS.md)** - Core architecture and data flow patterns
- **[ADVANCED_PATTERNS_AND_INTERNALS.md](./ADVANCED_PATTERNS_AND_INTERNALS.md)** - Advanced architectural patterns and internals

### Guides
- **[AGENTS.md](./AGENTS.md)** - AI agents guide for working with the framework

### Diagrams
- **[diagrams/](./diagrams/)** - Architecture and data flow diagrams
  - **[features/](./diagrams/features/)** - Feature-specific architecture diagrams
  - **[patterns/](./diagrams/patterns/)** - Usage pattern diagrams

## Reports and Status

### Historical Reports (Archived)
These reports document past work and are kept for historical reference:

- **[COMPLIANCE_AUDIT_REPORT.md](./COMPLIANCE_AUDIT_REPORT.md)** - Final compliance audit report (January 2025 - COMPLETED)
- **[DOCUMENTATION_COMPLIANCE_SUMMARY.md](./DOCUMENTATION_COMPLIANCE_SUMMARY.md)** - Documentation compliance verification
- **[BROKEN_ITEMS_REPORT.md](./BROKEN_ITEMS_REPORT.md)** - Historical broken items report
- **[PRIORITY_TODO.md](./PRIORITY_TODO.md)** - Historical priority task list

## Getting Started with Tuix

TUIX is a powerful framework for creating rich terminal user interfaces with TypeScript and Effect.ts.

### Installation

```bash
bun add tuix
```

### Basic Example

```typescript
import { text, vstack, box } from "tuix/core/view"

const app = box(vstack(
  text("Welcome to TUIX!"),
  text("Building beautiful terminal UIs")
))

console.log(await Effect.runPromise(app.render()))
```

## Module Documentation

Each module maintains its own documentation within its directory structure:

```
src/module-name/
├── README.md       # Module overview and usage
├── ISSUES.md       # Known issues and improvements
├── PLANNING.md     # Future development plans
└── index.ts        # Public API exports
```

### Core Modules

- [Core System](../src/core/README.md) - View primitives, lifecycle, and runtime
- [CLI Framework](../src/cli/README.md) - Command-line interface building
- [JSX Runtime](../src/jsx/README.md) - Declarative UI development
- [UI Components](../src/ui/README.md) - Pre-built UI components
- [Styling System](../src/styling/README.md) - Colors, borders, and themes
- [Services](../src/services/README.md) - Terminal, input, and rendering
- [Testing](../src/testing/README.md) - Testing utilities and harnesses
- [Process Manager](../src/process-manager/README.md) - Process lifecycle management
- [Logger](../src/logger/README.md) - Structured logging system
- [Configuration](../src/config/README.md) - Configuration management
- [Plugins](../src/plugins/README.md) - Plugin system and built-ins
- [Debug](../src/debug/README.md) - Debug tools and utilities
- [Screenshot](../src/screenshot/README.md) - Terminal screenshot capabilities

## Getting Started

1. Read **[RULES.md](./RULES.md)** first to understand framework constraints
2. Review **[STANDARDS.md](./STANDARDS.md)** for code quality expectations
3. Follow **[CONVENTIONS.md](./CONVENTIONS.md)** for consistent naming and organization
4. Explore **[MODULES.md](./MODULES.md)** to understand the module system
5. Check **[ARCHITECTURE_AND_DATA_FLOWS.md](./ARCHITECTURE_AND_DATA_FLOWS.md)** for architectural patterns

## Documentation Standards

All documentation follows these conventions:

- **UPPERCASE.md** for documentation files (README.md, ISSUES.md, etc.)
- **lowercase** path-based naming for directories
- **PascalCase** for component files
- **camelCase** for store files

See [CONVENTIONS.md](./CONVENTIONS.md) for complete naming guidelines.

## Development

### Testing

```bash
# Run all tests
bun test

# Run specific module tests
bun test src/core/

# Type checking
bun run tsc --noEmit
```

### Contributing

1. Follow the framework [RULES.md](./RULES.md)
2. Adhere to [STANDARDS.md](./STANDARDS.md) for code quality
3. Use [CONVENTIONS.md](./CONVENTIONS.md) for naming
4. Write comprehensive tests for all new features
5. Update module documentation as needed