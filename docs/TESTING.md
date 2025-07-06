# Testing Guide for CLI-Kit

## Overview

The CLI-Kit framework supports multiple testing approaches for different levels of verification:

1. **Component Logic Testing** - Direct testing of component behavior without runtime
2. **Integration Testing** - Testing with mocked services 
3. **End-to-End Testing** - Full runtime testing (complex, use sparingly)

## Testing Architecture

### Component Logic Testing (Recommended)

For most component testing, use the direct component testing utilities in `tests/e2e/component-test-utils.ts`. This approach:

- ✅ Tests component logic directly
- ✅ Fast execution
- ✅ Simple debugging
- ✅ Reliable and deterministic
- ✅ No runtime complexity

```typescript
import { createComponentTestContext, testInteraction } from "./component-test-utils.ts"

test("Component - Toggle Feature", async () => {
  await Effect.runPromise(
    testInteraction(
      myComponent,
      [{ tag: "toggleFeature" }],
      [
        (ctx) => assertModelProperty(ctx.model, "featureEnabled", true),
        (ctx) => Effect.gen(function* (_) {
          const output = yield* _(ctx.getOutput())
          yield* _(assertOutputContains(output, "Feature: ON"))
        })
      ]
    )
  )
})
```

### Integration Testing

Use the test setup utilities in `tests/e2e/setup.ts` for testing components with mocked services:

- ✅ Tests service integration
- ⚠️ More complex setup
- ⚠️ Runtime dependencies

```typescript
import { createTestContext } from "./setup.ts"

test("Component with Services", async () => {
  const ctx = await Effect.runPromise(createTestContext(component))
  // Test with mocked services
  await ctx.cleanup()
})
```

### Runtime/Subscription Testing Issues

**Current Limitation**: The runtime's subscription system has architectural challenges for testing:

1. **Dynamic Subscription Problem**: The runtime creates subscriptions once with the initial model and doesn't update them when the model changes
2. **Test Integration Complexity**: Full runtime testing is complex and unreliable

**Solution**: The runtime's `handleSubscriptions` function has been improved to properly handle dynamic subscriptions that depend on model state changes.

## Testing Patterns

### Testing Component Updates

```typescript
test("Component State Changes", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(component))
      
      // Send message and verify state change
      const newCtx = yield* _(ctx.sendMessage({ tag: "increment" }))
      yield* _(assertModelProperty(newCtx.model, "count", 1))
    })
  )
})
```

### Testing View Rendering

```typescript
test("Component View Rendering", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(component))
      const output = yield* _(ctx.getOutput())
      yield* _(assertOutputContains(output, "Expected Text"))
    })
  )
})
```

### Testing Complex Workflows

```typescript
test("Multi-step Workflow", async () => {
  await Effect.runPromise(
    testInteraction(
      component,
      [
        { tag: "start" },
        { tag: "configure", options: {...} },
        { tag: "execute" }
      ],
      [
        (ctx) => assertModelProperty(ctx.model, "status", "completed"),
        (ctx) => /* additional assertions */
      ]
    )
  )
})
```

## Test Organization

### File Structure

```
tests/
├── e2e/
│   ├── setup.ts                    # Integration test utilities
│   ├── component-test-utils.ts     # Component logic test utilities
│   ├── *.test.ts                   # Integration tests (sparingly)
│   └── *-component.test.ts         # Component logic tests (preferred)
├── unit/
│   └── */                          # Unit tests for specific modules
└── performance/
    └── *.test.ts                    # Performance benchmarks
```

### Naming Conventions

- Component logic tests: `*-component.test.ts`
- Integration tests: `*.test.ts`
- Unit tests: follow module structure
- Test utilities: `*-utils.ts` or `*-helpers.ts`

## Best Practices

### Do ✅

1. **Prefer component logic testing** for most scenarios
2. **Test business logic thoroughly** with direct component testing
3. **Use integration tests** for service interaction verification
4. **Keep tests focused** - test one concern per test
5. **Use descriptive test names** that explain the scenario
6. **Clean up resources** in integration tests

### Don't ❌

1. **Avoid full runtime testing** unless absolutely necessary
2. **Don't test implementation details** - focus on behavior
3. **Don't rely on timing** in tests (use deterministic approaches)
4. **Don't share state** between tests
5. **Don't skip cleanup** in integration tests

## Common Testing Scenarios

### Form Components

```typescript
test("Form Validation", async () => {
  await Effect.runPromise(
    testInteraction(
      formComponent,
      [
        { tag: "updateField", field: "email", value: "invalid-email" },
        { tag: "submit" }
      ],
      [
        (ctx) => assertModelProperty(ctx.model, "isValid", false),
        (ctx) => /* check error messages in output */
      ]
    )
  )
})
```

### Navigation Components

```typescript
test("Navigation States", async () => {
  await Effect.runPromise(
    testInteraction(
      navComponent,
      [
        { tag: "navigate", direction: "down" },
        { tag: "navigate", direction: "down" },
        { tag: "select" }
      ],
      [
        (ctx) => assertModelProperty(ctx.model, "selectedIndex", 2),
        (ctx) => assertModelProperty(ctx.model, "currentItem", expectedItem)
      ]
    )
  )
})
```

### Data Display Components

```typescript
test("Data Filtering", async () => {
  await Effect.runPromise(
    testInteraction(
      dataComponent,
      [
        { tag: "setFilter", filter: "active" },
        { tag: "refresh" }
      ],
      [
        (ctx) => assertModelProperty(ctx.model, "filteredCount", expectedCount),
        (ctx) => /* verify filtered data in output */
      ]
    )
  )
})
```

## Debugging Test Failures

### Component Logic Test Failures

1. **Check component update logic** - verify the update function handles the message correctly
2. **Verify initial state** - ensure the component's init returns expected model
3. **Debug step by step** - use console.log in test assertions to inspect model state

### Integration Test Failures

1. **Check service mocking** - verify mock services are set up correctly
2. **Verify cleanup** - ensure tests clean up properly
3. **Check timing issues** - add appropriate waits or use deterministic approaches

### Runtime Test Failures

1. **Avoid if possible** - prefer component logic testing
2. **Check subscription logic** - verify subscriptions are properly defined
3. **Debug runtime state** - add logging to understand runtime behavior

## Performance Considerations

- Component logic tests: ~1-10ms each
- Integration tests: ~100-500ms each  
- Runtime tests: ~1000-5000ms each

Prefer faster test approaches for better developer experience.

## Migration Guide

### From Runtime Tests to Component Tests

```typescript
// Before: Runtime integration test
test("Toggle Feature", async () => {
  const ctx = await Effect.runPromise(createTestContext(component))
  await ctx.sendKey(key('/'))
  await ctx.waitForOutput(output => output.includes("Feature ON"), 1000)
  // Slow, complex, unreliable
})

// After: Component logic test  
test("Toggle Feature", async () => {
  await Effect.runPromise(
    testInteraction(
      component,
      [{ tag: "toggleFeature" }],
      [
        (ctx) => assertModelProperty(ctx.model, "featureEnabled", true)
      ]
    )
  )
  // Fast, simple, reliable
})
```

## Summary

The CLI-Kit testing framework provides multiple levels of testing capabilities. For most scenarios, **component logic testing** provides the best balance of speed, reliability, and coverage. Use integration testing when you need to verify service interactions, and avoid full runtime testing unless absolutely necessary.

The key insight is that testing component behavior directly is more reliable and maintainable than testing through the full application runtime, especially for complex interactive features.