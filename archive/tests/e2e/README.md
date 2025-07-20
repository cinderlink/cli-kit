# E2E Testing Directory

## Active Tests

- `log-viewer-component.test.ts` - Component logic tests (recommended approach)
- `component-test-utils.ts` - Testing utilities for component logic

## Disabled Tests (Runtime Integration)

The following integration tests have been disabled because they use the complex full-runtime testing approach which is unreliable and slow:

- `log-viewer.integration.test.ts.disabled` - Runtime-based log viewer tests
- `process-monitor.integration.test.ts.disabled` - Runtime-based process monitor tests  
- `package-manager.integration.test.ts.disabled` - Runtime-based package manager tests
- `git-dashboard.integration.test.ts.disabled` - Runtime-based git dashboard tests

## Testing Strategy

**Use Component Logic Testing**: The preferred approach is to test components directly using `component-test-utils.ts`. This provides:

- ✅ Fast execution (~1-10ms per test)
- ✅ Reliable and deterministic results
- ✅ Easy debugging
- ✅ No runtime complexity

**Avoid Runtime Integration Testing**: The disabled tests demonstrate the problems with full runtime testing:

- ❌ Slow execution (~1000-5000ms per test)
- ❌ Timing-dependent and unreliable
- ❌ Complex debugging
- ❌ Subscription system integration issues

## Re-enabling Integration Tests

If you need to re-enable the integration tests:

1. Rename the `.disabled` files back to `.test.ts`
2. Fix the mock service interfaces to match current service definitions
3. Ensure proper subscription integration
4. Be prepared for slow and potentially flaky tests

## Migration

To migrate existing runtime integration tests to component logic tests:

```typescript
// OLD: Runtime integration test (slow, unreliable)
test("Feature Toggle", async () => {
  const ctx = await Effect.runPromise(createTestContext(component))
  await ctx.sendKey(key('/'))
  await ctx.waitForOutput(output => output.includes("Feature ON"), 1000)
})

// NEW: Component logic test (fast, reliable)
test("Feature Toggle", async () => {
  await Effect.runPromise(
    testInteraction(
      component,
      [{ tag: "toggleFeature" }],
      [(ctx) => assertModelProperty(ctx.model, "featureEnabled", true)]
    )
  )
})
```

See `docs/TESTING.md` for comprehensive testing guidelines.