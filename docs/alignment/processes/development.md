# Development Process

## Overview

This guide defines the standard development workflow for all team members and AI assistants working on the TUIX framework.

## Core Development Workflow

### 1. Planning Phase
1. **Read existing documentation** before making changes
2. **Understand the requirements** and scope clearly
3. **Check for existing implementations** to avoid duplication
4. **Create todo list** for complex tasks using TodoWrite tool
5. **Break down work** into manageable steps

### 2. Implementation Phase
1. **Read relevant files** to understand current patterns
2. **Follow existing code conventions** and patterns
3. **Use proper TypeScript types** (no `any` types)
4. **Implement tests** before or alongside features
5. **Update documentation** as you make changes

### 3. Validation Phase
1. **Run tests** (`bun test`) - must pass
2. **Type check** (`bun run tsc --noEmit`) - no errors
3. **Update documentation** if APIs changed
4. **Clean up** development artifacts
5. **Review changes** against standards

## Required Commands

### Before Starting Work
```bash
# Check current state
bun test                 # Ensure tests pass
bun run tsc --noEmit    # Ensure no type errors
git status              # Check for uncommitted changes
```

### During Development
```bash
# Iterative development
bun test --watch        # Keep tests running
bun run tsc --noEmit    # Check types frequently
```

### Before Committing
```bash
# Final validation
bun test                # All tests must pass
bun run tsc --noEmit   # No TypeScript errors allowed
```

## Technology Stack Requirements

### Runtime and Tools
- **Runtime**: Bun (not Node.js)
- **Package Manager**: `bun install` (not npm/yarn/pnpm)
- **Test Runner**: `bun test` (not jest/vitest)
- **Build Tool**: `bun build` (not webpack/vite)

### Code Patterns
- **Async Handling**: Effect.ts patterns required
- **UI Framework**: JSX + Svelte 5 Runes (preferred)
- **Type System**: Strict TypeScript with discriminated unions
- **Error Handling**: Tagged errors with Effect

### API Preferences
- **File Operations**: `Bun.file` over `node:fs`
- **Processes**: `Bun.$` over execa
- **Databases**: `bun:sqlite` over better-sqlite3
- **Web**: `Bun.serve()` over express

## Code Quality Requirements

### Type Safety
- ❌ NO: `any` types ever
- ❌ NO: Type workarounds or excessive casting
- ✅ YES: Proper discriminated unions
- ✅ YES: Type guards for external data
- ✅ YES: Effect type signatures

### Testing
- ✅ REQUIRED: Every `.ts` file has `.test.ts` companion
- ✅ REQUIRED: 80% line/function coverage, 70% branch coverage
- ✅ PREFERRED: Component logic testing for UI
- ✅ REQUIRED: Integration testing for services

### Documentation
- ✅ REQUIRED: JSDoc on all exported APIs
- ✅ REQUIRED: Parameter and return value docs
- ✅ REQUIRED: Usage examples for complex functions
- ✅ REQUIRED: Update docs when changing APIs

## File Organization Standards

### Directory Structure
Follow the established structure:
```
src/
├── cli/              # Command-line interface
├── components/       # UI components  
├── core/            # Core framework
├── jsx/             # JSX runtime and integration
├── layout/          # Layout systems
├── logger/          # Logging infrastructure
├── process-manager/ # Process management
├── reactivity/      # Runes and reactive state
├── services/        # Core services
├── styling/         # Styling systems
├── testing/         # Testing utilities
└── utils/           # Utility functions
```

### File Naming
- **Components**: PascalCase (`Button.ts`, `TextInput.ts`)
- **Modules**: kebab-case (`process-manager/`, `view-cache.ts`)
- **Tests**: `.test.ts` suffix matching source file
- **Index Files**: Export public API only

### Import/Export Standards
```typescript
// ✅ GOOD: Explicit imports
import { Component, ComponentState } from '../core/types'
import { Effect } from 'effect'

// ✅ GOOD: Type-only imports
import type { User, UserPermissions } from './types'

// ✅ GOOD: Barrel exports in index.ts
export { Button } from './Button'
export { TextInput } from './TextInput'
export type { ComponentProps } from './types'
```

## Error Handling Patterns

### Effect-based Error Handling
```typescript
import { Effect } from 'effect'

// ✅ GOOD: Structured error types
class ValidationError extends Error {
  readonly _tag = "ValidationError"
  constructor(public field: string, message: string) {
    super(message)
  }
}

// ✅ GOOD: Proper Effect signatures
function validateUser(data: unknown): Effect.Effect<User, ValidationError> {
  // Implementation with proper error handling
}
```

### Error Recovery
```typescript
// ✅ GOOD: Proper error recovery patterns
const withRetry = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  maxRetries: number = 3
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.retry({ times: maxRetries }),
    Effect.tapError(error => Effect.log(`Operation failed: ${error}`))
  )
```

## Component Development

### JSX Components (Preferred)
```typescript
import { Component } from '../core/types'
import { Effect } from 'effect'

interface ButtonProps {
  readonly label: string
  readonly onClick?: () => Effect.Effect<void>
  readonly disabled?: boolean
}

export const Button: Component<ButtonProps> = (props) => {
  return {
    render: () => `<button ${props.disabled ? 'disabled' : ''}>${props.label}</button>`,
    update: (state) => state,
    cleanup: () => Effect.void
  }
}
```

### Runes Integration
```typescript
import { rune } from '../reactivity/runes'

// ✅ GOOD: Reactive state management
const useCounter = () => {
  const count = rune(0)
  const increment = () => count.update(n => n + 1)
  const decrement = () => count.update(n => n - 1)
  
  return { count, increment, decrement }
}
```

## Service Development

### Service Interface Pattern
```typescript
interface DatabaseService {
  readonly findUser: (id: string) => Effect.Effect<User | null, DatabaseError>
  readonly saveUser: (user: User) => Effect.Effect<void, DatabaseError>
  readonly deleteUser: (id: string) => Effect.Effect<void, DatabaseError>
}

const DatabaseService = Context.GenericTag<DatabaseService>("DatabaseService")
```

### Service Implementation
```typescript
const DatabaseServiceImpl = Layer.effect(DatabaseService, Effect.gen(function* () {
  const pool = yield* acquireConnectionPool()
  
  return {
    findUser: (id: string) => Effect.gen(function* () {
      const connection = yield* pool.acquire()
      try {
        return yield* connection.query('SELECT * FROM users WHERE id = ?', [id])
      } finally {
        yield* pool.release(connection)
      }
    }),
    // ... other methods
  }
}))
```

## Common Workflows

### Adding a New Feature
1. **Research existing patterns** in similar features
2. **Create todo list** for implementation steps
3. **Write tests first** (TDD approach preferred)
4. **Implement core logic** following existing patterns
5. **Add documentation** with JSDoc and examples
6. **Validate integration** with existing features
7. **Run full test suite** and type checking

### Fixing a Bug
1. **Reproduce the issue** with a test case
2. **Identify root cause** through debugging
3. **Implement fix** following existing patterns
4. **Ensure test passes** and covers the fix
5. **Check for similar issues** in codebase
6. **Update documentation** if behavior changed

### Refactoring Code
1. **Ensure comprehensive test coverage** before changes
2. **Make incremental changes** with tests passing
3. **Follow single implementation principle** - no duplicates
4. **Update all references** to changed APIs
5. **Validate all examples** still work
6. **Update documentation** to reflect changes

## Quality Gates

### Pre-commit Checklist
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] JSDoc updated for changed APIs
- [ ] No development artifacts (.bak files, unused code)
- [ ] Examples still work with changes
- [ ] Coverage thresholds maintained

### Code Review Checklist  
- [ ] Follows single implementation principle
- [ ] Uses proper TypeScript types (no `any`)
- [ ] Has comprehensive test coverage
- [ ] Follows existing code patterns
- [ ] Has proper JSDoc documentation
- [ ] No circular dependencies
- [ ] Proper error handling with Effect

## Anti-Patterns to Avoid

### Code Anti-Patterns
- ❌ Creating multiple versions of same feature
- ❌ Using `any` types or excessive casting
- ❌ Skipping tests for "simple" features
- ❌ Direct imports instead of using services
- ❌ Ignoring TypeScript errors

### Process Anti-Patterns
- ❌ Making changes without reading existing code
- ❌ Creating one-off test files or scripts
- ❌ Committing with failing tests
- ❌ Not updating documentation for API changes
- ❌ Adding features without proper planning

## Getting Help

### Documentation Order of Reference
1. **This alignment system** (`docs/alignment/`)
2. **Specific domain docs** (`docs/alignment/dependencies/`)
3. **Framework documentation** (`docs/`)
4. **Code examples** in `examples/` directory
5. **Test patterns** in existing `.test.ts` files

### When Stuck
1. **Check similar implementations** in the codebase
2. **Review test patterns** for guidance
3. **Read Effect.ts documentation** for async patterns
4. **Follow existing component patterns** for UI work
5. **Ask for clarification** if requirements are unclear

## Related Guides

- [Rules: Single Implementation](../rules/single-implementation.md)
- [Rules: Type Safety](../rules/type-safety.md)  
- [Rules: Testing](../rules/testing.md)
- [Dependencies: Bun](../dependencies/bun/rules.md)
- [Dependencies: Effect](../dependencies/effect/rules.md)
- [Process: Code Review](./code-review.md)