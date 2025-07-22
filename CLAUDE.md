---
description: Tuix framework development environment and rules
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

# Tuix Development Environment

## Bun Only (NEVER Node.js/npm/pnpm)

- `bun <file>` - Execute TypeScript/JavaScript files
- `bun test` - Run tests (NEVER jest/vitest)
- `bun install` - Install dependencies (NEVER npm/pnpm/yarn)
- `bun run <script>` - Run package.json scripts
- `bun build` - Build projects (NEVER webpack/vite)

## Bun Native APIs (NEVER Node.js equivalents)

- `Bun.file()` not `node:fs` readFile/writeFile
- `bun:sqlite` not `better-sqlite3`
- `Bun.$\`command\`` not `execa`
- Built-in `WebSocket` not `ws`
- Built-in `.env` loading

## Required Reading Before Coding

### ALWAYS Read First
1. **[RULES.md](./docs/RULES.md)** - Framework rules (NEVER/ALWAYS)
2. **[STANDARDS.md](./docs/STANDARDS.md)** - Code quality standards  
3. **[CONVENTIONS.md](./docs/CONVENTIONS.md)** - File naming and organization

### Read for Specific Work
- **CLI work**: [src/cli/README.md](./src/cli/README.md)
- **JSX components**: [src/jsx/README.md](./src/jsx/README.md)
- **Scope system**: [src/scope/README.md](./src/scope/README.md)
- **Styling/Layout**: [src/styling/README.md](./src/styling/README.md), [src/layout/README.md](./src/layout/README.md)
- **Module integration**: [MODULES.md](./docs/MODULES.md)
- **Plugin development**: [PLUGINS.md](./docs/PLUGINS.md)

## Critical Framework Rules

### Code Organization
- **NEVER** create multiple implementations (-v2, -simple, -enhanced)
- **NEVER** use qualifier names (simple-logger, basic-button)
- **NEVER** create test-*.ts or demo-*.ts files - use proper test suite
- **NEVER** commit backup files (.bak, .old, .backup, .orig)
- **ALWAYS** follow Single Implementation Principle

### File Naming
- **NEVER** use UPPERCASE for files (except documentation)
- **ALWAYS** use lowercase path-based naming for files and directories
- **EXCEPTIONS**: 
  - PascalCase for component files (Button.tsx, Modal.tsx)
  - camelCase for store files (userStore.ts, pluginStore.ts)
  - UPPERCASE.md for documentation (README.md, ISSUES.md)
- **AVOID** kebab-case except for proper nouns (process-manager)
- **NEVER** add JSX pragmas - configured at build level

### Development Process
- **ALWAYS** read module docs before modifying modules
- **ALWAYS** run `bun test` before committing
- **ALWAYS** check `bun run tsc --noEmit` for type errors
- **NEVER** use `any` types - use proper TypeScript
- **ALWAYS** maintain 80% test coverage

### Architecture
- **NEVER** violate module boundaries
- **ALWAYS** use Effect for async operations
- **ALWAYS** validate inputs at module boundaries
- **NEVER** directly access terminal - use services

## Documentation Structure

**Project Root docs/ (framework-wide concerns):**
- docs/RULES.md - NEVER/ALWAYS rules
- docs/STANDARDS.md - Code quality standards
- docs/CONVENTIONS.md - File naming conventions
- docs/DEPENDENCIES.md - Framework dependencies
- docs/MODULES.md - Module overview
- docs/PLUGINS.md - Plugin system

**Each Module (module-specific concerns):**
```
src/module-name/
├── README.md          # Module purpose, usage, API
├── PLANNING.md        # Future development plans
├── ISSUES.md          # Known issues and improvements
└── index.ts           # Public API exports
```

## Testing

```typescript
import { test, expect } from "bun:test"

test("description", () => {
  expect(actual).toBe(expected)
})
```

Run with: `bun test src/module-name/`