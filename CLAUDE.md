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
1. **[RULES.md](./RULES.md)** - Framework rules (NEVER/ALWAYS)
2. **[STANDARDS.md](./STANDARDS.md)** - Code quality standards  
3. **[CONVENTIONS.md](./CONVENTIONS.md)** - File naming and organization

### Read for Specific Work
- **CLI work**: [src/cli/README.md](./src/cli/README.md)
- **JSX components**: [src/jsx/README.md](./src/jsx/README.md)
- **Scope system**: [src/scope/README.md](./src/scope/README.md)
- **Styling/Layout**: [src/styling/README.md](./src/styling/README.md), [src/layout/README.md](./src/layout/README.md)
- **Module integration**: [MODULES.md](./MODULES.md)
- **Plugin development**: [PLUGINS.md](./PLUGINS.md)

## Key Rules

- **NEVER** use npm/npx/pnpm/pnpx - ALWAYS use bun
- **NEVER** create multiple implementations (-v2, -simple, -enhanced)
- **NEVER** use PascalCase files - ALWAYS use kebab-case
- **NEVER** add JSX pragmas - configured at build level
- **ALWAYS** read module docs before modifying modules
- **ALWAYS** run `bun test` before committing
- **ALWAYS** check `bun run tsc --noEmit` for type errors

## File Organization

```
src/module-name/
├── README.md          # Read this before modifying module
├── PLANNING.md        # Module roadmap and plans
├── ISSUES.md          # Known issues and tracking
└── index.ts           # Public API
```

## Testing

```typescript
import { test, expect } from "bun:test"

test("description", () => {
  expect(actual).toBe(expected)
})
```

Run with: `bun test src/module-name/`