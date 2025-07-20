# Code Standards

## Core Principles

### Single Implementation Principle ⚠️ CRITICAL RULE ⚠️
- **ONE VERSION RULE**: Never create multiple versions of the same feature (no "-v2", "-enhanced", "-main", "-simple", "-basic", "-legacy", "-new" suffixes)
- **NO WORKAROUNDS**: Fix the real implementation instead of creating simplified versions or workarounds
- **NO BACKWARDS COMPATIBILITY LAYERS**: Features evolve forward, old APIs get properly deprecated and removed
- **DELETE CLONES**: If another version exists, it must be removed or have a distinct, justified purpose as a different feature
- **REPLACE, DON'T APPEND**: When improving code, replace the existing implementation entirely
- **SINGLE API**: One clean API surface, not multiple ways to do the same thing

## Technology Stack

### Primary Technologies
- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript (strict mode)
- **Framework**: Effect-ts for async/error handling
- **UI**: JSX (preferred) + Svelte 5 Runes
- **Testing**: Bun's built-in test runner
- **Build**: Bun's native bundler

### API Preferences
- **JSX**: Preferred where it doesn't introduce complications
- **Runes**: For reactive state management
- **Stream Components**: For real-time data
- **Effect**: For all async operations and error handling
- **Bun APIs**: Use native Bun APIs over Node.js alternatives

## Code Quality Requirements

### Type Safety
- **NO `any` TYPES**: Use proper TypeScript typing with discriminated unions
- **NO TYPE WORKAROUNDS**: Fix the types properly instead of casting around problems
- **USE EFFECT TYPES**: Proper Effect<Success, Error, Requirements> signatures
- **DISCRIMINATED UNIONS**: For message types and state variants
- **TYPE GUARDS**: For runtime type checking

### Testing Requirements
- **100% TEST COVERAGE**: Every .ts file must have corresponding .test.ts file
- **COMPONENT LOGIC TESTING**: Use component test utilities for UI components
- **INTEGRATION TESTING**: For service interactions
- **PERFORMANCE TESTING**: Use Bun's bench for performance-critical code
- **DETERMINISTIC TESTS**: No timing-dependent assertions

### Documentation Requirements
- **JSDOC**: Every exported function, class, and interface must have JSDoc
- **PARAMETER DOCS**: Document all parameters with types and descriptions
- **RETURN VALUES**: Document return types and possible values
- **EXAMPLES**: Include usage examples for complex functions
- **ERROR CONDITIONS**: Document when and why errors are thrown

## File Organization

### Directory Structure
```
src/
├── cli/           # Command-line interface
├── components/    # UI components
├── core/          # Core framework
├── jsx-*          # JSX runtime and integration
├── layout/        # Layout systems
├── logger/        # Logging infrastructure
├── process-manager/ # Process management
├── reactivity/    # Runes and reactive state
├── screenshot/    # Screenshot functionality
├── services/      # Core services
├── styling/       # Styling systems
├── testing/       # Testing utilities
├── theming/       # Theme management
└── utils/         # Utility functions
```

### File Naming
- **Components**: PascalCase (`Button.ts`, `TextInput.ts`)
- **Modules**: kebab-case (`process-manager/`, `view-cache.ts`)
- **Tests**: `.test.ts` suffix matching source file
- **Types**: `.ts` files with proper exports
- **Index Files**: Export public API only

### Import/Export Standards
- **EXPLICIT IMPORTS**: Import specific functions, not entire modules
- **BARREL EXPORTS**: Use index.ts files for clean public APIs
- **NO CIRCULAR DEPS**: Avoid circular dependencies
- **EFFECT IMPORTS**: Import Effect utilities consistently
- **TYPE IMPORTS**: Use `import type` for type-only imports

## Effect.ts Patterns

### Basic Effect Usage
```typescript
import { Effect, Layer, Context } from "effect"

// Services
interface MyService {
  readonly doSomething: (input: string) => Effect.Effect<string, MyError>
}

// Implementations
const MyServiceImpl = Layer.succeed(MyService, {
  doSomething: (input) => Effect.succeed(`Result: ${input}`)
})

// Error Types
class MyError extends Error {
  readonly _tag = "MyError"
}
```

### Async Patterns
```typescript
// Prefer generators for complex async flows
function* complexOperation() {
  const user = yield* getUserById(id)
  const permissions = yield* getPermissions(user)
  return yield* processWithPermissions(user, permissions)
}

// Use acquireRelease for resources
const withResource = <A, E, R>(
  acquire: Effect.Effect<Resource, E, R>,
  use: (resource: Resource) => Effect.Effect<A, E, R>
) => Effect.acquireRelease(acquire, (resource) => cleanup(resource)).pipe(
  Effect.flatMap(use)
)
```

### Error Handling
```typescript
// Tagged errors for better discrimination
export class ValidationError extends Error {
  readonly _tag = "ValidationError"
  constructor(public field: string, message: string) {
    super(message)
  }
}

// Proper error handling in Effects
const validateInput = (input: string): Effect.Effect<string, ValidationError> =>
  input.length > 0 
    ? Effect.succeed(input)
    : Effect.fail(new ValidationError("input", "Input cannot be empty"))
```

## Component Standards

### JSX Components (Preferred)
```typescript
import { Component, ComponentState } from "../core/types"
import { Effect } from "effect"

interface ButtonProps {
  readonly label: string
  readonly onClick?: () => Effect.Effect<void>
}

export const Button: Component<ButtonProps> = (props) => {
  return {
    render: () => /* render logic */,
    update: (state) => /* update logic */
  }
}
```

### Runes Integration
```typescript
import { rune } from "../reactivity/runes"

// Reactive state with runes
const counter = rune(0)
const increment = () => counter.update(n => n + 1)
const decrement = () => counter.update(n => n - 1)
```

### Stream Components
```typescript
import { Stream } from "effect"

// For real-time data
const LogStream: Component<{}> = () => {
  const logs = Stream.fromAsyncIterable(watchLogs())
  return {
    render: () => /* render streaming logs */
  }
}
```

## Service Standards

### Service Definition
```typescript
interface TerminalService {
  readonly write: (text: string) => Effect.Effect<void, TerminalError>
  readonly read: () => Effect.Effect<string, TerminalError>
  readonly clear: () => Effect.Effect<void, TerminalError>
}

const TerminalService = Context.GenericTag<TerminalService>("TerminalService")
```

### Service Implementation
```typescript
const TerminalServiceImpl = Layer.succeed(TerminalService, {
  write: (text) => Effect.sync(() => process.stdout.write(text)),
  read: () => Effect.async<string>((resume) => {
    // async implementation
  }),
  clear: () => Effect.sync(() => process.stdout.write('\u001b[2J\u001b[0;0H'))
})
```

## Testing Standards

### Test Structure
```typescript
import { test, expect } from "bun:test"
import { Effect } from "effect"

test("component renders correctly", () => {
  const result = renderComponent(Button, { label: "Click me" })
  expect(result).toMatchSnapshot()
})

test("service handles errors", async () => {
  const effect = MyService.doSomething("invalid")
  const result = await Effect.runPromise(Effect.either(effect))
  expect(result._tag).toBe("Left")
})
```

### Performance Testing
```typescript
import { bench } from "bun:test"

bench("component render performance", () => {
  renderComponent(ComplexComponent, props)
})
```

## Build and Deployment

### Development Commands
```bash
bun run dev          # Development server
bun test            # Run tests
bun test --watch    # Watch mode
bun run tsc --noEmit # Type checking
```

### Production Commands
```bash
bun run build       # Production build
bun run start       # Production server
bun run test:ci     # CI testing
```

## Code Review Checklist

### Before PR
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] JSDoc on all exported functions
- [ ] No `any` types used
- [ ] Effect patterns used correctly
- [ ] Single implementation principle followed
- [ ] No development artifacts (.bak files, etc.)

### During Review
- [ ] Code follows established patterns
- [ ] Proper error handling
- [ ] Adequate test coverage
- [ ] Documentation updated
- [ ] No circular dependencies
- [ ] Performance considerations addressed