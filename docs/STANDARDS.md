# Tuix Framework Standards

## Code Standards

### TypeScript Requirements
- **Strict Mode**: Always enabled in tsconfig.src.json with full strict checks
- **Environment Types**: All env vars typed in types/process-env.d.ts
- **Type Coverage**: 100% of exports must be typed
- **Discriminated Unions**: Use for all message/event types
- **Generic Constraints**: Always specify constraints on generics
- **Return Types**: Explicitly type all function returns
- **No Implicit Any**: Zero tolerance policy
- **Strict Checks**: noUncheckedIndexedAccess, exactOptionalPropertyTypes enabled

### Type Patterns
```typescript
// ✅ GOOD: Discriminated unions
export type Result = 
  | { _tag: 'success'; value: string }
  | { _tag: 'error'; error: Error }

// ✅ GOOD: Branded types
export type UserId = string & { readonly UserId: unique symbol }

// ✅ GOOD: Service interfaces
export interface Logger {
  readonly log: (message: string) => Effect.Effect<void>
  readonly error: (error: Error) => Effect.Effect<void>
}

// ❌ BAD: Using any
function processData(data: any): any { }

// ❌ BAD: Implicit any
function processData(data) { }
```

### Effect.ts Standards
- **Use Generators**: For complex async flows
- **Tagged Errors**: All errors must have tags
- **Layers**: Use for dependency injection
- **Resources**: Always use acquireRelease pattern
- **Services**: Define as interfaces with Effect returns

```typescript
// ✅ GOOD: Effect service pattern
export interface StorageService {
  readonly save: (data: Data) => Effect.Effect<void, SaveError>
  readonly load: (id: string) => Effect.Effect<Data, LoadError>
}

// ✅ GOOD: Tagged errors
export class SaveError {
  readonly _tag = 'SaveError'
  constructor(readonly reason: string) {}
}
```

## Testing Standards

### Coverage Requirements
- **Lines**: Minimum 80% coverage
- **Functions**: Minimum 80% coverage  
- **Branches**: Minimum 70% coverage
- **Statements**: Minimum 80% coverage

### Test Structure
```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('ModuleName', () => {
  // Setup shared state
  let service: Service
  
  beforeEach(() => {
    service = createService()
  })
  
  describe('methodName', () => {
    it('should handle success case', () => {
      // Single focused test
      const result = service.method('input')
      expect(result).toBe('expected')
    })
    
    it('should handle error case', () => {
      // Test error scenarios
      expect(() => service.method(null)).toThrow()
    })
  })
})
```

### Test Requirements
- **Deterministic**: No timing-dependent tests
- **Isolated**: No shared state between tests
- **Fast**: Each test < 100ms
- **Focused**: One assertion per test preferred
- **Complete**: Test both success and error paths

## Documentation Standards

### JSDoc Format
```typescript
/**
 * Processes user data and returns formatted result.
 * 
 * @param data - Raw user data to process
 * @param options - Processing configuration options
 * @returns Formatted user data ready for display
 * @throws {ValidationError} When data is invalid
 * @throws {ProcessingError} When processing fails
 * 
 * @example
 * ```typescript
 * const result = processUserData(data, { 
 *   validate: true,
 *   format: 'detailed' 
 * })
 * ```
 */
export function processUserData(
  data: UserData, 
  options: ProcessOptions
): FormattedData {
  // Implementation
}
```

### Documentation Requirements
- **Public APIs**: All exports must have JSDoc
- **Parameters**: Describe purpose and constraints
- **Returns**: Explain what is returned and when
- **Errors**: Document all error conditions
- **Examples**: Provide runnable code examples
- **Internal**: Use single-line comments sparingly

## Performance Standards

### Benchmarks
Critical paths must meet performance targets:
- **Startup**: < 100ms for module initialization
- **Render**: < 16ms for frame updates
- **Input**: < 50ms response time
- **Memory**: Monitor for leaks in long-running operations

### Optimization Guidelines
- **Measure First**: Profile before optimizing
- **Algorithms**: Choose appropriate data structures
- **Caching**: Implement for expensive operations
- **Lazy Loading**: Defer non-critical initialization

```typescript
// ✅ GOOD: Lazy initialization
let expensiveResource: Resource | undefined

export function getResource(): Resource {
  if (!expensiveResource) {
    expensiveResource = createExpensiveResource()
  }
  return expensiveResource
}
```

## Security Standards

### Input Validation
```typescript
// ✅ GOOD: Validate at boundaries
export function processUserInput(input: unknown): Result {
  const validated = UserInputSchema.safeParse(input)
  if (!validated.success) {
    return { _tag: 'error', error: new ValidationError(validated.error) }
  }
  return processValidated(validated.data)
}
```

### Security Requirements
- **Validate Inputs**: At all module boundaries
- **Sanitize Output**: When rendering user content
- **No Secrets**: Never log passwords, tokens, keys
- **Rate Limiting**: Implement for public APIs
- **Error Messages**: Don't expose internal details

## Module Standards

### Module Structure
Each module must follow this organization:
```
module/
├── index.ts            # Public API only
├── types.ts            # Type definitions
├── errors.ts           # Error definitions
├── constants.ts        # Module constants
├── feature.ts          # Feature implementation (one per feature)
├── feature.test.ts     # Tests for the feature, beside the code
├── feature.md          # Documentation for the feature, beside the code
├── README.md           # Module documentation
├── PLANNING.md         # Module development planning
├── ISSUES.md           # Module-specific issues tracking
```
- **No impl/ or integrations/ folders.**
- **No tests/ folder.**
- **No one-off scripts or examples.**
- **Integration tests live in `src/tests/integration/`.**
- **Every feature must be in its own file with a matching `.test.ts` and `.md` file.**
- **Code, tests, and docs must always be kept in alignment.**

### Project vs Module Documentation
**Project-level docs (root only):**
- RULES.md - Framework-wide NEVER/ALWAYS rules
- STANDARDS.md - Code quality and architectural standards
- CONVENTIONS.md - File naming and organization conventions
- DEPENDENCIES.md - Framework dependencies (Effect, Bun, etc.)
- MODULES.md - Module overview and relationships
- PLUGINS.md - Plugin system documentation

**Module-level docs (each module):**
- README.md - Module purpose, usage, and API documentation
- PLANNING.md - Future development and roadmap
- ISSUES.md - Known issues and improvements tracking

### API Design
- **Minimal Surface**: Export only what's necessary
- **Stable Interface**: Breaking changes require major version
- **Consistent Naming**: Follow framework conventions
- **Error Handling**: Use Effect for all async operations
- **Type Safety**: No any types in public APIs

## Build Standards

### Configuration
- **TypeScript**: Strict mode via tsconfig.src.json
- **Bundling**: Use build.config.ts with Bun's built-in bundler
- **Testing**: Use Bun test runner
- **Linting**: oxlint for primary linting (fast performance)
- **Formatting**: Biome for code formatting and import organization
- **Pre-commit**: Husky hooks run `bun run check` automatically

### Quality Commands
- **Combined Check**: `bun run check` (format + lint + typecheck)
- **Auto-fix**: `bun run check:fix` (format + imports + lint fixes)
- **Individual**: `bun run format`, `bun run lint`, `bun run typecheck:tsc`

### Output Requirements
- **No Console**: Remove debug logs in production
- **Tree Shaking**: Ensure proper ES modules
- **Source Maps**: Include for debugging
- **Type Definitions**: Generate .d.ts files

## Quality Gates

### Pre-Commit
1. Husky hook runs `bun run check` automatically
2. All tests pass (`bun test`)
3. No TypeScript errors (strict mode)
4. No formatting issues (Biome)
5. No linting warnings (oxlint)
6. Coverage thresholds met
7. Documentation complete

### Pre-Merge
1. Code review approved
2. CI pipeline passes
3. No breaking changes (or documented)
4. Performance benchmarks pass
5. Security scan clean

## Monitoring Standards

### Logging
- **Structured**: Use consistent log format
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Context**: Include relevant metadata
- **Performance**: Log slow operations
- **Security**: Never log sensitive data

### Metrics
- **Performance**: Track key operations
- **Errors**: Monitor error rates
- **Usage**: Track feature adoption
- **Resources**: Monitor memory/CPU

## Compliance Checklist

- [ ] TypeScript strict mode enabled (tsconfig.src.json)
- [ ] Environment variables typed (types/process-env.d.ts)
- [ ] 100% type coverage on exports
- [ ] Test coverage meets minimums
- [ ] All exports have JSDoc
- [ ] No any types used
- [ ] Effect patterns followed
- [ ] Security validations in place
- [ ] Performance targets met
- [ ] Module structure correct
- [ ] Build configuration proper (build.config.ts)
- [ ] Code formatted with Biome
- [ ] Linted with oxlint
- [ ] Pre-commit hooks working
- [ ] `bun run check` passes