# AI Agents Guide for Tuix Framework

## Quick Setup

1. **Read framework rules first**: [RULES.md](./RULES.md), [STANDARDS.md](./STANDARDS.md), [CONVENTIONS.md](./CONVENTIONS.md)
2. **Use Bun only**: `bun test`, `bun install`, `bun run` (NEVER npm/npx/pnpm)
3. **Check module docs**: Read `src/{module}/README.md` before modifying any module

## Environment Commands

```bash
# Test everything
bun test

# Type check
bun run tsc --noEmit

# Run specific module tests
bun test src/core/

# Install dependencies
bun install
```

## Module-Specific Guidance

### CLI Work
- Read: [src/cli/README.md](./src/cli/README.md)
- Commands defined in CLI module with zod schemas
- Use plugin system for extensibility

### JSX Components  
- Read: [src/jsx/README.md](./src/jsx/README.md)
- No JSX pragmas - configured at build level
- Components extend base classes from core

### Scope System
- Read: [src/scope/README.md](./src/scope/README.md)
- Manages execution isolation and context
- Critical for resource management

### Styling & Layout
- Read: [src/styling/README.md](./src/styling/README.md), [src/layout/README.md](./src/layout/README.md)
- ANSI terminal styling system
- Flexbox-based layout engine

### Plugin Development
- Read: [PLUGINS.md](./PLUGINS.md)
- Use `definePlugin()` pattern
- Follow plugin architecture guidelines

## Critical Rules

- **NEVER** create multiple implementations (-v2, -simple, etc.)
- **NEVER** use PascalCase for files (use kebab-case)
- **NEVER** use npm/node tooling (use bun)
- **ALWAYS** read module documentation before changes
- **ALWAYS** run tests before committing
- **ALWAYS** fix TypeScript errors immediately

## File Structure

Every module has:
- `readme.md` - Overview and usage
- `rules.md` - Module-specific rules  
- `standards.md` - Quality standards
- `index.ts` - Public API exports

## Getting Help

- Framework overview: [MODULES.md](./MODULES.md)
- Plugin system: [PLUGINS.md](./PLUGINS.md)
- File naming: [CONVENTIONS.md](./CONVENTIONS.md)
- Code quality: [STANDARDS.md](./STANDARDS.md)