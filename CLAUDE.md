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

## Code Quality Rules

1. **Before Committing**
   - Run `bun test` - all tests must pass
   - Run `bun run tsc --noEmit` - no TypeScript errors allowed
   - Ensure documentation is updated
   - Check that examples still work

2. **Code Style**
   - Follow existing patterns in the codebase
   - Use functional programming principles with Effect
   - Keep functions small and focused
   - Prefer composition over inheritance
