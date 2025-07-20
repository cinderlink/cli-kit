/**
 * Testing utilities for TUIX framework
 * 
 * Provides utilities for testing TUIX applications and components.
 * 
 * @example
 * ```typescript
 * import { testComponent, createTestHarness } from "tuix/testing"
 * 
 * const harness = createTestHarness()
 * await testComponent(MyComponent, harness)
 * ```
 */

// Test utilities
export * from "./test-utils"

// E2E testing harness
export * from "./e2e-harness"

// Basic testing harness (lightweight, no PTY)
export * from "../../../src/testing/harness"

// Input adapter for simulating user input in tests
export * from "./input-adapter"

// Visual testing utilities
export * from "./visual-test"

// Integration tests
export * from "./integration/plugins.test"
export * from "./integration/components.test"
export * from "./integration/services.test"
export * from "./integration/streaming.test"
export * from "./integration/e2e.test"