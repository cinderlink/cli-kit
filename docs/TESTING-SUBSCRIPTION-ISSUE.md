# Testing Subscription Issue Report

## Problem Summary

Runtime-based tests that rely on keyboard input through component subscriptions are not working. The issue affects all tests that use the `runApp` function with mock InputService streams.

## Root Cause

The fundamental issue is with how Effect streams work in the test environment:

1. **Lazy Stream Evaluation**: `Stream.fromQueue` creates a lazy stream that doesn't consume until actively run
2. **Runtime Subscription Timing**: The runtime's subscription system may not be properly consuming the mock streams
3. **Queue Competition**: Multiple calls to `Stream.fromQueue` on the same queue create competing consumers

## Failed Approaches

1. **PubSub Broadcasting**: Attempted to use PubSub for event broadcasting, but PubSub streams have timing issues
2. **Pre-created Streams**: Creating streams before runtime starts doesn't solve the consumption issue
3. **Hot Streams**: Attempting to make streams "hot" by pre-consuming them creates complexity

## Working Test Patterns

### 1. Component Logic Testing (Recommended)

Test component logic directly without the runtime:

```typescript
import { createComponentTestContext } from "@/testing/component-test-utils.ts"

test("Component logic", async () => {
  await Effect.runPromise(
    Effect.gen(function* (_) {
      const ctx = yield* _(createComponentTestContext(myComponent))
      
      // Send messages directly
      const newCtx = yield* _(ctx.sendMessage({ tag: "increment" }))
      
      // Check output
      const output = yield* _(newCtx.getOutput())
      expect(output).toContain("Count: 1")
    })
  )
})
```

### 2. Direct Message Testing

For components that need keyboard handling, test the message transformation directly:

```typescript
test("Keyboard mapping", () => {
  const msg = component.handleKeyEvent("up", model)
  expect(msg).toEqual({ tag: "increment" })
})
```

## Recommendations

1. **Use Component Logic Tests**: For most testing needs, test components without the runtime
2. **Test Subscriptions Separately**: Test subscription stream transformations in isolation
3. **Integration Tests**: For full integration tests, consider using actual terminal emulators
4. **Document Limitations**: Make it clear that runtime-based keyboard testing has limitations

## Technical Details

The issue stems from Effect's stream consumption model:

```typescript
// This creates a lazy stream
const stream = Stream.fromQueue(queue)

// Stream only consumes when run
Stream.runForEach(stream, item => ...)  // This activates consumption
```

In the test environment, the runtime's subscription fiber may not be properly consuming the mock streams, or there may be timing issues with when the streams are created vs when they're consumed.

## Future Solutions

1. **Custom Test Runtime**: Create a specialized test runtime that handles stream consumption differently
2. **Stream Fixtures**: Pre-configured stream setups that ensure proper consumption
3. **Effect Test Utilities**: Wait for Effect.js to provide better testing utilities for stream-based code

## Workaround for Immediate Needs

For tests that absolutely need keyboard input with runtime:

1. Use direct message injection if possible
2. Consider using Effect's TestClock for controlling timing
3. Use polling-based approaches instead of stream-based for test scenarios