# Testing

## Overview

The Testing module provides comprehensive testing utilities for Tuix applications and components. It includes mock services, test harnesses, input simulation, visual testing, E2E testing capabilities, and component testing helpers built specifically for terminal user interfaces.

## Installation

```bash
# Testing utilities are included with tuix
import { testComponent, createTestHarness, MockServices } from 'tuix/testing'
```

## Quick Start

```typescript
import { test, expect } from 'bun:test'
import { testComponent, createMockTerminalService } from 'tuix/testing'
import { MyComponent } from './MyComponent'

// Test a component with mock services
test('MyComponent renders correctly', async () => {
  const testEnv = createTestEnvironment({ width: 80, height: 24 })
  const mockTerminal = createMockTerminalService(testEnv)
  
  const result = await testComponent(MyComponent, {
    services: mockTerminal,
    initialState: { count: 0 }
  })
  
  expect(result.output).toContain('Count: 0')
  expect(result.exitCode).toBe(0)
})

// Test user interactions
test('Component handles key input', async () => {
  const harness = createTestHarness()
  
  await harness.start(MyComponent)
  await harness.sendKey('space')
  
  const output = harness.getOutput()
  expect(output).toContain('Count: 1')
  
  await harness.cleanup()
})
```

## Core Concepts

### Test Environment
Controlled environment for testing terminal applications:
```typescript
const testEnv = createTestEnvironment({
  size: { width: 120, height: 30 },
  capabilities: {
    colors: '256',
    unicode: true,
    mouse: true
  }
})
```

### Mock Services
Replace real terminal services with controllable mocks:
- **MockTerminalService**: Captures output, simulates terminal capabilities
- **MockInputService**: Simulate keyboard and mouse events
- **MockRendererService**: Test rendering without actual display
- **MockStorageService**: In-memory storage for testing

### Test Harness
High-level testing interface for interactive applications:
```typescript
const harness = createTestHarness({
  timeout: 5000,
  captureOutput: true,
  mockMouse: true
})

await harness.start(MyApp)
await harness.sendKeys(['j', 'j', 'k'])  // Navigate
await harness.sendKey('Enter')           // Select
const output = harness.getLastOutput()
```

### Visual Testing
Snapshot testing for terminal UIs:
```typescript
import { visualTest, createVisualSnapshot } from 'tuix/testing'

test('Component visual regression', async () => {
  const snapshot = await createVisualSnapshot(MyComponent, {
    width: 80,
    height: 24,
    theme: 'dark'
  })
  
  expect(snapshot).toMatchSnapshot('my-component.txt')
})
```

### E2E Testing
End-to-end testing with real terminal processes:
```typescript
import { createE2EHarness } from 'tuix/testing'

test('CLI application E2E', async () => {
  const e2e = createE2EHarness()
  
  await e2e.spawn('./my-cli', ['start'])
  await e2e.waitForOutput('Server started')
  await e2e.sendInput('q\n')  // Quit
  
  const exitCode = await e2e.wait()
  expect(exitCode).toBe(0)
})
```

## API Reference

### Test Environment

#### `createTestEnvironment(overrides?: Partial<TestEnvironment>): TestEnvironment`
Creates a test environment with configurable terminal settings.

```typescript
interface TestEnvironment {
  output: ReadonlyArray<string>
  cursor: { x: number; y: number }
  size: WindowSize
  capabilities: TerminalCapabilities
  rawMode: boolean
  alternateScreen: boolean
  mouseEnabled: boolean
}
```

### Mock Services

#### `createMockTerminalService(env?: TestEnvironment): Layer<TerminalService>`
Creates a mock terminal service that captures output.

#### `createMockInputService(): Layer<InputService>`
Creates a mock input service for simulating user input.

#### `createMockRendererService(): Layer<RendererService>`
Creates a mock renderer for testing without display.

#### `createMockStorageService(): Layer<StorageService>`
Creates an in-memory storage service.

### Test Harness

#### `createTestHarness(options?: TestHarnessOptions): TestHarness`
Creates a test harness for component testing.

```typescript
interface TestHarnessOptions {
  timeout?: number
  captureOutput?: boolean
  mockMouse?: boolean
  environment?: Partial<TestEnvironment>
}

interface TestHarness {
  start(component: Component): Promise<void>
  stop(): Promise<void>
  cleanup(): Promise<void>
  sendKey(key: string): Promise<void>
  sendKeys(keys: string[]): Promise<void>
  sendMouse(event: MouseEvent): Promise<void>
  getOutput(): string
  getLastOutput(): string
  waitForOutput(text: string, timeout?: number): Promise<void>
  expectOutput(text: string): void
  expectNoOutput(text: string): void
}
```

### Component Testing

#### `testComponent<M, Msg>(component: Component<M, Msg>, options?: TestComponentOptions): Promise<TestResult>`
Tests a component in isolation.

```typescript
interface TestComponentOptions<M> {
  services?: Layer<any, never, never>
  initialState?: M
  timeout?: number
  inputs?: Array<KeyEvent | MouseEvent>
}

interface TestResult {
  output: string
  exitCode: number
  error?: Error
  duration: number
}
```

### Visual Testing

#### `createVisualSnapshot(component: Component, options?: SnapshotOptions): Promise<string>`
Creates a visual snapshot of a component's rendered output.

#### `visualTest(name: string, component: Component, options?: VisualTestOptions): void`
Creates a visual regression test.

### E2E Testing

#### `createE2EHarness(): E2EHarness`
Creates an end-to-end testing harness.

```typescript
interface E2EHarness {
  spawn(command: string, args?: string[], options?: SpawnOptions): Promise<void>
  sendInput(input: string): Promise<void>
  waitForOutput(pattern: string | RegExp, timeout?: number): Promise<string>
  wait(timeout?: number): Promise<number>
  kill(signal?: string): Promise<void>
  cleanup(): Promise<void>
}
```

## Examples

### Unit Testing Components
```typescript
import { test, expect } from 'bun:test'
import { testComponent, createTestEnvironment } from 'tuix/testing'

test('Counter component increments', async () => {
  const Counter = {
    init: Effect.succeed([{ count: 0 }, []]),
    update: (msg, model) => {
      if (msg === 'increment') {
        return Effect.succeed([{ count: model.count + 1 }, []])
      }
      return Effect.succeed([model, []])
    },
    view: (model) => text(`Count: ${model.count}`)
  }
  
  const result = await testComponent(Counter, {
    inputs: [{ type: 'key', key: 'space', action: 'increment' }]
  })
  
  expect(result.output).toContain('Count: 1')
})
```

### Interactive Testing
```typescript
import { createTestHarness } from 'tuix/testing'

test('Menu navigation', async () => {
  const harness = createTestHarness({
    timeout: 3000
  })
  
  await harness.start(MenuComponent)
  
  // Navigate down
  await harness.sendKey('j')
  await harness.expectOutput('> Item 2')
  
  // Navigate up  
  await harness.sendKey('k')
  await harness.expectOutput('> Item 1')
  
  // Select item
  await harness.sendKey('Enter')
  await harness.waitForOutput('Selected: Item 1')
  
  await harness.cleanup()
})
```

### Mock Service Testing
```typescript
import { createMockTerminalService, createMockInputService } from 'tuix/testing'
import { Layer } from 'effect'

test('Service integration', async () => {
  const testEnv = createTestEnvironment({ width: 40, height: 10 })
  
  const TestServices = Layer.mergeAll(
    createMockTerminalService(testEnv),
    createMockInputService(),
    LiveStorageService
  )
  
  const program = Effect.gen(function* (_) {
    const terminal = yield* TerminalService
    yield* terminal.write('Hello Test!')
    yield* terminal.setCursor(10, 5)
  })
  
  const result = await Effect.runPromise(
    program.pipe(Effect.provide(TestServices))
  )
  
  // Verify terminal interactions
  const finalEnv = await Effect.runPromise(
    Ref.get(testEnv).pipe(Effect.provide(TestServices))
  )
  
  expect(finalEnv.output).toContain('Hello Test!')
  expect(finalEnv.cursor).toEqual({ x: 10, y: 5 })
})
```

### Visual Regression Testing
```typescript
import { visualTest, createVisualSnapshot } from 'tuix/testing'

test('Button component visual snapshot', async () => {
  const ButtonComponent = {
    view: () => box({
      border: 'rounded',
      padding: 1,
      children: [text('Click me!')]
    })
  }
  
  const snapshot = await createVisualSnapshot(ButtonComponent, {
    width: 20,
    height: 5,
    theme: 'default'
  })
  
  expect(snapshot).toMatchSnapshot('button.txt')
})

// Test different states
test('Button states', async () => {
  for (const state of ['normal', 'hover', 'pressed', 'disabled']) {
    const snapshot = await createVisualSnapshot(
      ButtonComponent,
      { width: 20, height: 5, props: { state } }
    )
    
    expect(snapshot).toMatchSnapshot(`button-${state}.txt`)
  }
})
```

### E2E CLI Testing
```typescript
import { createE2EHarness } from 'tuix/testing'

test('CLI workflow', async () => {
  const e2e = createE2EHarness()
  
  // Start the CLI
  await e2e.spawn('bun', ['run', 'cli.ts'])
  await e2e.waitForOutput('Welcome to MyCLI')
  
  // Navigate to menu item
  await e2e.sendInput('j\n')  // Down arrow + Enter
  await e2e.waitForOutput('Selected: Deploy')
  
  // Confirm action
  await e2e.sendInput('y\n')
  await e2e.waitForOutput('Deployment started')
  
  // Wait for completion
  await e2e.waitForOutput('Deployment complete', 30000)
  
  // Exit
  await e2e.sendInput('q\n')
  const exitCode = await e2e.wait()
  
  expect(exitCode).toBe(0)
  
  await e2e.cleanup()
})
```

### Testing with Real Terminal
```typescript
import { createE2EHarness } from 'tuix/testing'

test('Real terminal interaction', async () => {
  const e2e = createE2EHarness({
    pty: true,  // Use real PTY
    env: { TERM: 'xterm-256color' }
  })
  
  await e2e.spawn('./my-app')
  
  // Test color output
  await e2e.waitForOutput('\x1b[32mSuccess\x1b[0m')  // Green "Success"
  
  // Test cursor positioning
  await e2e.sendInput('\x1b[2J\x1b[H')  // Clear screen, move to home
  await e2e.waitForOutput('Home screen')
  
  await e2e.cleanup()
})
```

### Stress Testing
```typescript
test('Component under load', async () => {
  const harness = createTestHarness()
  
  await harness.start(ListComponent)
  
  // Send many rapid inputs
  const inputs = Array(1000).fill(0).map((_, i) => 
    i % 2 === 0 ? 'j' : 'k'  // Alternate up/down
  )
  
  const start = performance.now()
  await harness.sendKeys(inputs)
  const duration = performance.now() - start
  
  // Should handle 1000 inputs quickly
  expect(duration).toBeLessThan(1000)  // Less than 1 second
  
  // Should still be responsive
  await harness.sendKey('Enter')
  await harness.waitForOutput('Selected:', 100)
  
  await harness.cleanup()
})
```

## Integration

The Testing module integrates with all Tuix modules:

- **Core**: Mock services for view rendering and lifecycle testing
- **CLI**: CLI application testing and command validation
- **JSX**: Component testing with JSX syntax
- **Logger**: Log capture and assertion in tests
- **Process Manager**: Process lifecycle testing
- **Config**: Configuration testing and validation

### Bun Test Integration

Tuix testing utilities work seamlessly with Bun's built-in test runner:

```typescript
// test/setup.ts
import { beforeAll, afterAll } from 'bun:test'
import { setupTestEnvironment, cleanupTestEnvironment } from 'tuix/testing'

beforeAll(async () => {
  await setupTestEnvironment({
    mockTerminal: true,
    captureOutput: true
  })
})

afterAll(async () => {
  await cleanupTestEnvironment()
})
```

### Custom Test Matchers

```typescript
import { expect } from 'bun:test'

// Extend Bun's expect with Tuix-specific matchers
expect.extend({
  toContainANSI(received: string, expected: string) {
    const hasANSI = received.includes(expected)
    return {
      pass: hasANSI,
      message: () => `Expected output to contain ANSI sequence: ${expected}`
    }
  },
  
  toHaveCursorAt(received: TestEnvironment, x: number, y: number) {
    const pass = received.cursor.x === x && received.cursor.y === y
    return {
      pass,
      message: () => `Expected cursor at (${x}, ${y}), got (${received.cursor.x}, ${received.cursor.y})`
    }
  }
})
```

## Testing

```bash
# Run testing module tests
bun test src/testing

# Run specific test utilities
bun test src/testing/testUtils.test.ts

# Run E2E tests
bun test src/testing/e2e.test.ts

# Run visual tests
bun test src/testing/visual.test.ts
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT