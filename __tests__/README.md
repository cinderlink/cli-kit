# Test Structure

This directory contains all tests for the TUIX framework.

## Directory Structure

```
__tests__/
├── unit/               # Unit tests for individual components
│   ├── core/          # Core types, errors, and utilities
│   ├── services/      # Service implementations
│   └── components/    # Component tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── performance/      # Performance benchmarks
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test suites
bun test:unit        # Unit tests only
bun test:integration # Integration tests only
bun test:e2e        # End-to-end tests only
bun test:perf       # Performance tests only

# Watch mode
bun test:watch

# Coverage report
bun test:coverage
```

## Writing Tests

Use the test utilities from `src/testing/test-utils.ts` for consistent testing:

```typescript
import { testComponent, createTestLayer } from "@/testing/test-utils"
```

See existing tests for examples of testing patterns.
