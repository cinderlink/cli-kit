---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

# Testing and Documentation Guidelines

## Testing Requirements

1. **Always Run Tests After Code Changes**
   - Run `bun test` after making changes to ensure nothing breaks
   - Run `bun run tsc --noEmit` to check for TypeScript errors
   - Address failing tests immediately - do not leave broken tests

2. **Test Strategy (See docs/TESTING.md for details)**
   - **Prefer Component Logic Testing**: Use `tests/e2e/component-test-utils.ts` for most component testing
   - **Use Integration Testing**: Only when testing service interactions with `tests/e2e/setup.ts`
   - **Avoid Full Runtime Testing**: Complex, slow, and unreliable - use sparingly
   - Write tests for new features before implementation when possible
   - Ensure test coverage meets thresholds (80% lines, functions, statements; 70% branches)

3. **Test Organization**
   - Component logic tests: `*-component.test.ts` (preferred for most scenarios)
   - Integration tests: `*.test.ts` (service interaction testing)
   - Unit tests: `tests/unit/**/*.test.ts` (individual functions and modules)
   - Performance tests: Use Bun's bench functionality for performance-critical code

4. **Testing Best Practices**
   - Component tests should be fast (~1-10ms each) and deterministic
   - Use `testInteraction()` for multi-step component workflows
   - Always clean up resources in integration tests
   - Avoid timing-dependent assertions - prefer deterministic approaches

## Documentation Requirements

1. **Code Documentation**
   - Every exported function, class, and interface MUST have JSDoc comments
   - Include parameter descriptions and return value documentation
   - Add usage examples for complex functions
   - Document side effects and error conditions

2. **Update Documentation When Changing Code**
   - ALWAYS read existing documentation before modifying code
   - Update documentation to reflect code changes
   - Keep examples in documentation up-to-date
   - Ensure type definitions match implementation

3. **Documentation Format**
   ```typescript
   /**
    * Brief description of what the function does.
    * 
    * @param param1 - Description of first parameter
    * @param param2 - Description of second parameter
    * @returns Description of return value
    * @throws {ErrorType} Description of when this error is thrown
    * 
    * @example
    * ```typescript
    * const result = myFunction('value1', 'value2')
    * ```
    */
   ```

## Effect.ts Best Practices

1. **Use Effect Patterns Consistently**
   - Prefer generators for complex async flows
   - Use tagged errors for better error discrimination
   - Leverage layers for dependency injection
   - Always use `acquireRelease` for resources needing cleanup

2. **Type Safety**
   - Never use `any` types - use `unknown` and type guards instead
   - Ensure all Effects have proper error and requirement types
   - Use discriminated unions for message types

3. **Error Handling**
   - Use the error types defined in `src/core/errors.ts`
   - Implement proper error recovery strategies
   - Log errors appropriately for debugging

## Lifecycle Management

1. **Component Lifecycle Hooks**
   - `onMount`: Called when component is mounted to the view tree
     - Use for: initialization, event listeners, subscriptions
     - Return cleanup function for symmetry
   - `onDestroy`: Called when component is removed from the view tree
     - Use for: cleanup, unsubscriptions, resource disposal
     - This is where scopes should be cleaned up
   - `onUpdate`: Called when component props or state change
     - Use for: reacting to changes, updating derived state

2. **Resource Management**
   - Always clean up resources in `onDestroy`
   - Use Effect's `acquireRelease` for managed resources
   - Never leave event listeners or subscriptions active
   - Scopes must be removed from registry on destroy

## Code Quality Rules

### Single Implementation Principle ⚠️ CRITICAL RULE ⚠️
- **ONE VERSION RULE**: Never create multiple versions of the same feature (no "-v2", "-enhanced", "-main", "-simple", "-basic", "-legacy", "-new" suffixes)
- **NO WORKAROUNDS**: Fix the real implementation instead of creating simplified versions or workarounds
- **NO BACKWARDS COMPATIBILITY LAYERS**: Features evolve forward, old APIs get properly deprecated and removed
- **DELETE CLONES**: If another version exists, it must be removed or have a distinct, justified purpose as a different feature
- **REPLACE, DON'T APPEND**: When improving code, replace the existing implementation entirely
- **SINGLE API**: One clean API surface, not multiple ways to do the same thing

### Naming and Architecture Rules
- **NO QUALIFIER NAMES**: Avoid names like `simple-harness`, `basic-logger`, `enhanced-button`
- **INTERFACE-BASED VARIANTS**: When variants are needed, use interfaces with proper directory structure:
  ```
  ❌ BAD: simple-logger.ts, enhanced-logger.ts
  ✅ GOOD: logger/console.ts, logger/file.ts (both implement Logger interface)
  ```
- **DESCRIPTIVE NAMES**: Use names that describe purpose, not complexity level
- **NO BACKUP FILES**: Never commit .bak, .old, .backup, .save, .orig files
- **PROPER STRUCTURE**: Related implementations go in subdirectories, not qualifier-suffixed files

### Production Code Standards
- **NO `any` TYPES**: Use proper TypeScript typing with discriminated unions, never `any` or excessive type casting
- **NO TYPE WORKAROUNDS**: Fix the types properly instead of casting around problems
- **COMPREHENSIVE TESTING**: Every feature must have tests before it's considered complete
- **PROPER EXPORTS**: All code must be properly exported and documented for its intended use
- **NO DEVELOPMENT ARTIFACTS**: Remove .bak files, commented code blocks, unused imports immediately

### File Organization
- **NO DUPLICATE IMPLEMENTATIONS**: If similar code exists, consolidate into one well-designed version
- **CLEAR NAMING**: File and function names must clearly indicate their single purpose
- **LOGICAL GROUPING**: Related functionality goes together, unrelated functionality stays separate

## Module Architecture Rules

### Domain Ownership
- **SINGLE DOMAIN OWNER**: Each domain (scope, cli, core, jsx, etc.) owns its implementation
  - `src/scope/` owns all scope management logic
  - `src/cli/` owns CLI-specific behavior
  - `src/core/` owns runtime and lifecycle management
  - `src/jsx/` owns JSX runtime and rendering
- **NO DUPLICATE IMPLEMENTATIONS**: Never create parallel implementations in different modules
- **INTEGRATION THROUGH INTERFACES**: Modules integrate via:
  - Hooks for lifecycle integration
  - Stores for state sharing
  - Helpers for domain-specific utilities
  - Components for UI integration

### Integration Patterns
- **USE EXISTING INFRASTRUCTURE**: When integrating modules:
  - Use hooks from the target module
  - Use stores for reactive state
  - Use helpers for domain logic
  - Use components for UI elements
- **EXAMPLE**: JSX integration with scopes
  ```
  ❌ BAD: src/jsx/scope-manager.ts (duplicate implementation)
  ✅ GOOD: src/scope/jsx/components/Scope.tsx (uses scope manager)
  ✅ GOOD: src/scope/jsx/hooks/useScope.ts (integration hook)
  ```

### Module Structure
- **DOMAIN ROOT**: Core implementation lives at module root
  - `src/scope/manager.ts` - Core scope manager
  - `src/scope/types.ts` - Domain types
- **INTEGRATION SUBDIRS**: Integration with other modules in subdirectories
  - `src/scope/jsx/` - JSX integration (components, hooks, stores)
  - `src/scope/cli/` - CLI integration (if needed)
- **NO CROSS-CONTAMINATION**: Modules should not know about each other's internals
  - Use exported APIs only
  - No reaching into internal files
  - No assumptions about implementation details

1. **Before Committing**
   - Run `bun test` - all tests must pass
   - Run `bun run tsc --noEmit` - no TypeScript errors allowed
   - Ensure documentation is updated
   - Check that examples still work
   - Remove any development artifacts (.bak files, unused code)

2. **Code Style**
   - Follow existing patterns in the codebase
   - Use functional programming principles with Effect
   - Keep functions small and focused
   - Prefer composition over inheritance
   - NEVER create workarounds or simplified versions

# Important Instruction Reminders

- **ALWAYS READ FILES**: When asked to read documentation or files, use the Read tool to actually read them
- **FOLLOW EXACT INSTRUCTIONS**: When asked to read specific documents, use LS to find them and Read to view them
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER create multiple versions of the same feature - no -v2, -simple, -enhanced, -basic, -new, -old suffixes
- NEVER use qualifier names like simple-harness or basic-logger - use descriptive names or proper subdirectories
- ALWAYS replace implementations when improving them, don't create new versions alongside
- NEVER commit backup files (.bak, .old, etc.) - use git for version history
- When multiple implementations are truly needed, use interfaces and proper directory structure
- **NEVER CREATE ONE-OFF SCRIPTS, TESTS, COMMANDS, OR EXAMPLES**: Only create or modify real feature tests. If a feature isn't covered by the feature test suite, then the feature test suite is incomplete and should be fixed
- **NO TEST SCRIPTS**: Never create test-*.ts, test-*.tsx, demo-*.ts, example-*.ts files for testing - use the proper test suite
- **FEATURE TESTS ONLY**: All testing must be done through the official test suite. If something needs testing, add it to the appropriate test file in the tests/ directory
