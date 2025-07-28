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
export * from './testUtils'

// E2E testing harness
export * from './e2eHarness'

// Lightweight testing harness (no PTY dependency)
export * from './harness'

// Input adapter for simulating user input in tests
export * from './inputAdapter'

// Visual testing utilities
export * from './visualTest'
