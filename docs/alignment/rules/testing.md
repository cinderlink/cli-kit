# Testing Requirements

## Core Principle

**COMPREHENSIVE TESTING**: Every feature must have tests before it's considered complete.

## Test Coverage Requirements

### Mandatory Coverage
- **100% FILE COVERAGE**: Every `.ts` file must have corresponding `.test.ts` file
- **80% LINE COVERAGE**: Minimum 80% line coverage for all source files
- **80% FUNCTION COVERAGE**: All exported functions must be tested
- **70% BRANCH COVERAGE**: Major code paths must be covered

### Test Organization
```
src/
  components/
    Button.ts
    Button.test.ts        # ✅ Required
  services/  
    Database.ts
    Database.test.ts      # ✅ Required
```

## Testing Strategy Hierarchy

### 1. Component Logic Testing (Preferred)
Use `src/testing/test-utils.ts` for most component testing.

```typescript
import { testComponent } from '../testing/test-utils'

test('Button renders with label', () => {
  const result = testComponent(Button, { label: 'Click me' })
  expect(result).toContain('Click me')
})
```

**When to use:**
- Testing UI component logic
- Testing component state changes  
- Testing component interactions
- Fast, deterministic tests (~1-10ms each)

### 2. Integration Testing
Use `src/testing/e2e-harness.ts` for service interactions.

```typescript
import { createTestHarness } from '../testing/e2e-harness'

test('Database service integrates with logger', async () => {
  const harness = createTestHarness()
  const db = harness.get(DatabaseService)
  const result = await db.findUser('123')
  expect(result).toBeDefined()
})
```

**When to use:**
- Testing service interactions
- Testing Effect workflows
- Testing cross-module communication
- Resource cleanup testing

### 3. Performance Testing
Use Bun's bench for performance-critical code.

```typescript
import { bench } from 'bun:test'

bench('component render performance', () => {
  renderComponent(ComplexComponent, props)
})
```

**When to use:**
- Performance-critical paths
- Optimization validation
- Regression detection

## Test Requirements by File Type

### Component Tests
```typescript
// src/components/Button.test.ts
import { test, expect } from 'bun:test'
import { testComponent } from '../testing/test-utils'
import { Button } from './Button'

test('Button renders correctly', () => {
  const result = testComponent(Button, { label: 'Test' })
  expect(result).toMatchSnapshot()
})

test('Button handles click events', () => {
  let clicked = false
  const result = testComponent(Button, {
    label: 'Test',
    onClick: () => { clicked = true }
  })
  
  result.triggerClick()
  expect(clicked).toBe(true)
})
```

### Service Tests
```typescript
// src/services/Database.test.ts
import { test, expect } from 'bun:test'
import { Effect } from 'effect'
import { DatabaseService } from './Database'

test('Database finds existing user', async () => {
  const effect = DatabaseService.findUser('123')
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Right')
  if (result._tag === 'Right') {
    expect(result.right).toBeDefined()
  }
})

test('Database handles missing user', async () => {
  const effect = DatabaseService.findUser('missing')
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Left')
})
```

### Effect Tests
```typescript
// src/core/pipeline.test.ts
import { test, expect } from 'bun:test'
import { Effect, Layer } from 'effect'

test('Pipeline processes data correctly', async () => {
  const testLayer = Layer.succeed(DataService, mockDataService)
  
  const effect = pipeline
    .pipe(Effect.provide(testLayer))
  
  const result = await Effect.runPromise(effect)
  expect(result).toEqual(expectedOutput)
})
```

## Testing Best Practices

### 1. Deterministic Tests
- ❌ NO: Timing-dependent assertions
- ❌ NO: Random data without seeds
- ❌ NO: Network calls to external services
- ✅ YES: Mocked dependencies
- ✅ YES: Fixed test data
- ✅ YES: Deterministic assertions

### 2. Fast Tests  
- ✅ Component tests: ~1-10ms each
- ✅ Unit tests: ~10-50ms each
- ⚠️ Integration tests: ~50-200ms each
- ❌ Avoid: Tests taking >1 second

### 3. Resource Cleanup
```typescript
test('Service cleans up resources', async () => {
  const service = createService()
  
  try {
    await service.doWork()
    // assertions
  } finally {
    await service.cleanup()
  }
})
```

### 4. Error Testing
```typescript
test('Service handles errors correctly', async () => {
  const effect = service.processInvalidData()
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Left')
  if (result._tag === 'Left') {
    expect(result.left._tag).toBe('ValidationError')
  }
})
```

## Forbidden Test Patterns

### No One-Off Test Files
- ❌ NO: `test-*.ts` files  
- ❌ NO: `demo-*.ts` files
- ❌ NO: `example-*.ts` files
- ✅ YES: Official test suite only

### No Development Test Scripts
- ❌ NO: Temporary test files for debugging
- ❌ NO: One-off verification scripts
- ✅ YES: Add to proper test file in test suite

### No Full Runtime Testing for Simple Logic
- ❌ NO: Complex PTY setup for simple component logic
- ✅ YES: Component logic testing with test utilities

## Test Commands

### Development
```bash
bun test                 # Run all tests
bun test --watch        # Watch mode
bun test Button.test.ts # Run specific test
```

### CI/CD
```bash
bun test --coverage     # Run with coverage
bun run tsc --noEmit   # Type checking
```

## Quality Gates

### Before Committing
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] Coverage thresholds met
- [ ] No development test artifacts

### During Code Review  
- [ ] New code has corresponding tests
- [ ] Tests cover error conditions
- [ ] Tests are deterministic and fast
- [ ] Proper use of test utilities
- [ ] Resource cleanup implemented

## Test File Organization

### Unit Tests
```
src/
  components/
    Button.ts
    Button.test.ts
  services/
    Database.ts  
    Database.test.ts
```

### Integration Tests
```
src/testing/
  e2e-harness.ts         # Test harness utilities
  test-utils.ts          # Component test utilities
  visual-test.ts         # Visual testing utilities
```

### Performance Tests
```typescript
// In relevant .test.ts files
import { bench } from 'bun:test'

bench('critical operation', () => {
  // performance test
})
```

## Mock Patterns

### Effect Service Mocks
```typescript
const mockDatabase = Layer.succeed(DatabaseService, {
  findUser: (id: string) => Effect.succeed(mockUser),
  saveUser: (user: User) => Effect.void
})
```

### Component Prop Mocks
```typescript
const mockProps = {
  onSubmit: vi.fn(),
  data: mockData,
  loading: false
}
```

## Error Testing Requirements

### All Error Paths Must Be Tested
```typescript
test('handles validation errors', async () => {
  const effect = validateInput('')
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Left')
  expect(result.left._tag).toBe('ValidationError')
})

test('handles network errors', async () => {
  const effect = fetchWithNetworkError()
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Left')  
  expect(result.left._tag).toBe('NetworkError')
})
```

## Related Rules

- [Type Safety](./type-safety.md) - Testing type safety requirements
- [Effect Patterns](../dependencies/effect/rules.md) - Effect testing patterns  
- [Single Implementation](./single-implementation.md) - No duplicate test implementations