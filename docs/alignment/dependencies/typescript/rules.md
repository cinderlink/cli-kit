# TypeScript Development Rules

## Core Principle

**STRICT TYPES**: Use strict TypeScript with proper typing patterns, never `any`.

## TypeScript Configuration

### Required tsconfig.json Settings
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Safety Patterns

### Discriminated Unions (Required)
```typescript
// ✅ CORRECT: Use discriminated unions for variants
type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; code: number }
  | { status: 'loading' }

type UserState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; user: User }
  | { type: 'error'; message: string }

// Usage with type narrowing
function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case 'success':
      // TypeScript knows response.data exists
      return response.data
    case 'error':
      // TypeScript knows response.error and response.code exist
      throw new Error(`${response.code}: ${response.error}`)
    case 'loading':
      return null
  }
}
```

### Type Guards (Required)
```typescript
// ✅ CORRECT: Proper type guards for external data
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'email' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).email === 'string'
  )
}

function isArray<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(itemGuard)
}

// Usage
function processApiData(data: unknown): User[] {
  if (isArray(data, isUser)) {
    return data // TypeScript knows this is User[]
  }
  throw new Error('Invalid API response format')
}
```

### Generic Constraints
```typescript
// ✅ CORRECT: Constrain generics appropriately
interface Identifiable {
  id: string
}

function updateEntity<T extends Identifiable>(
  entity: T,
  updates: Partial<Omit<T, 'id'>>
): T {
  return { ...entity, ...updates }
}

// ✅ CORRECT: Effect-specific constraints
function createService<
  TService,
  TError extends Error,
  TRequirements
>(
  implementation: Effect.Effect<TService, TError, TRequirements>
): Layer.Layer<TService, TError, TRequirements> {
  return Layer.effect(Context.GenericTag<TService>(), implementation)
}
```

### Readonly Types (Preferred)
```typescript
// ✅ CORRECT: Use readonly for immutable data
interface User {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly permissions: readonly Permission[]
  readonly metadata: Readonly<Record<string, unknown>>
}

interface Config {
  readonly database: {
    readonly host: string
    readonly port: number
    readonly ssl: boolean
  }
  readonly features: readonly string[]
}
```

## Error Type Patterns

### Tagged Error Classes
```typescript
// ✅ CORRECT: Structured error hierarchy
abstract class AppError extends Error {
  abstract readonly _tag: string
  
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  readonly _tag = 'ValidationError'
  
  constructor(
    public readonly field: string,
    message: string,
    cause?: unknown
  ) {
    super(`Validation failed for ${field}: ${message}`, cause)
  }
}

export class NetworkError extends AppError {
  readonly _tag = 'NetworkError'
  
  constructor(
    public readonly statusCode: number,
    public readonly url: string,
    message: string,
    cause?: unknown
  ) {
    super(`Network error ${statusCode} for ${url}: ${message}`, cause)
  }
}

// ✅ CORRECT: Union types for error handling
type UserServiceError = 
  | ValidationError
  | NetworkError
  | DatabaseError
```

### Error Discrimination
```typescript
// ✅ CORRECT: Type-safe error handling
function handleError(error: UserServiceError): string {
  switch (error._tag) {
    case 'ValidationError':
      return `Please check ${error.field}: ${error.message}`
    case 'NetworkError':
      return `Connection problem (${error.statusCode}): ${error.message}`
    case 'DatabaseError':
      return `Database error: ${error.message}`
    default:
      // TypeScript ensures exhaustiveness
      const exhaustive: never = error
      return exhaustive
  }
}
```

## Function Type Patterns

### Function Signatures with Effect
```typescript
// ✅ CORRECT: Explicit Effect types in function signatures
interface UserRepository {
  readonly findById: (id: string) => Effect.Effect<User | null, DatabaseError>
  readonly create: (data: CreateUserData) => Effect.Effect<User, ValidationError | DatabaseError>
  readonly update: (id: string, data: Partial<User>) => Effect.Effect<User, UserNotFoundError | ValidationError | DatabaseError>
  readonly delete: (id: string) => Effect.Effect<void, UserNotFoundError | DatabaseError>
}

// ✅ CORRECT: Generic function with constraints
function mapResult<T, U, E>(
  result: Effect.Effect<T, E>,
  mapper: (value: T) => U
): Effect.Effect<U, E> {
  return Effect.map(result, mapper)
}
```

### Return Type Annotations (Required)
```typescript
// ✅ CORRECT: Explicit return types for public APIs
export function createUserService(
  database: DatabaseService
): Effect.Effect<UserService, never> {
  return Effect.succeed({
    findById: (id: string) => database.findUser(id),
    create: (data: CreateUserData) => database.createUser(data)
  })
}

export function validateEmail(email: string): Effect.Effect<string, ValidationError> {
  if (!email.includes('@')) {
    return Effect.fail(new ValidationError('email', 'Must contain @'))
  }
  return Effect.succeed(email)
}
```

## Type Import/Export Patterns

### Separate Type and Value Imports
```typescript
// ✅ CORRECT: Separate type and value imports
import type { User, UserPermissions, CreateUserData } from './user-types'
import type { DatabaseService } from './database-service'
import { Effect, Context, Layer } from 'effect'
import { validateUserData, hashPassword } from './user-utils'

// ✅ CORRECT: Re-export types explicitly
export type { User, UserPermissions, CreateUserData } from './user-types'
export { createUserService, type UserService } from './user-service'
```

### Barrel Exports with Types
```typescript
// ✅ CORRECT: index.ts with both types and values
export { UserService, createUserService } from './user-service'
export { DatabaseService, createDatabaseService } from './database-service'

export type { User, CreateUserData, UpdateUserData } from './user-types'
export type { DatabaseConfig, ConnectionOptions } from './database-types'
export type { ServiceError, ValidationError, NetworkError } from './errors'
```

## Advanced Type Patterns

### Utility Types
```typescript
// ✅ CORRECT: Custom utility types
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Usage
type CreateUser = PartialBy<User, 'id' | 'createdAt'>
```

### Conditional Types
```typescript
// ✅ CORRECT: Conditional types for Effect handling
type ExtractError<T> = T extends Effect.Effect<any, infer E, any> ? E : never
type ExtractSuccess<T> = T extends Effect.Effect<infer A, any, any> ? A : never
type ExtractRequirements<T> = T extends Effect.Effect<any, any, infer R> ? R : never

// Type-level validation
type IsValidEffect<T> = T extends Effect.Effect<any, Error, any> ? true : false
```

### Template Literal Types
```typescript
// ✅ CORRECT: Template literal types for string validation
type EventName = `user:${string}` | `system:${string}` | `error:${string}`
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiEndpoint = `/${string}`

interface ApiCall<TMethod extends HttpMethod, TEndpoint extends ApiEndpoint> {
  method: TMethod
  endpoint: TEndpoint
  headers?: Record<string, string>
}
```

## Testing Types

### Type-Only Tests
```typescript
// ✅ CORRECT: Test type relationships
import { test, expect } from 'bun:test'
import { expectType } from 'tsd'

test('type relationships', () => {
  const user = createUser({ name: 'John', email: 'john@example.com' })
  expectType<User>(user)
  
  const effect = fetchUser('123')
  expectType<Effect.Effect<User, UserNotFoundError, DatabaseService>>(effect)
  
  // Test error type narrowing
  const error: UserServiceError = new ValidationError('email', 'Invalid')
  if (error._tag === 'ValidationError') {
    expectType<string>(error.field)
  }
})
```

### Runtime Type Validation
```typescript
// ✅ CORRECT: Runtime validation with type guards
import { test, expect } from 'bun:test'

test('type guard validation', () => {
  const validUser = { id: '123', name: 'John', email: 'john@example.com' }
  const invalidUser = { id: '123', name: 'John' } // missing email
  
  expect(isUser(validUser)).toBe(true)
  expect(isUser(invalidUser)).toBe(false)
  expect(isUser(null)).toBe(false)
  expect(isUser('not an object')).toBe(false)
})
```

## Common Mistakes

### Using Any Types
```typescript
// ❌ WRONG: Any types lose all safety
function processData(data: any): any {
  return data.whatever.property
}

// ✅ CORRECT: Use unknown and type guards
function processData(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return processValidData(data)
  }
  throw new Error('Invalid data format')
}
```

### Loose Object Types
```typescript
// ❌ WRONG: Index signatures lose type safety
interface Config {
  [key: string]: any
}

// ✅ CORRECT: Specific object types
interface Config {
  readonly host: string
  readonly port: number
  readonly features?: readonly string[]
  readonly metadata?: Readonly<Record<string, string>>
}
```

### Missing Error Types in Effects
```typescript
// ❌ WRONG: Untyped errors
function fetchData(): Effect.Effect<Data> {
  // What errors can this produce?
}

// ✅ CORRECT: Explicit error types
function fetchData(): Effect.Effect<Data, NetworkError | ParseError> {
  // Clear error possibilities
}
```

### Type Assertions Without Validation
```typescript
// ❌ WRONG: Unsafe type assertions
const user = response.data as User
const config = JSON.parse(configString) as Config

// ✅ CORRECT: Validated type assertions
const user = isUser(response.data) 
  ? response.data 
  : (() => { throw new Error('Invalid user data') })()

const config = parseConfig(configString) // Returns Effect with validation
```

## Development Workflow

### Type Checking Commands
```bash
# ✅ REQUIRED: Type check before committing
bun run tsc --noEmit

# ✅ RECOMMENDED: Watch mode during development
bun run tsc --noEmit --watch

# ✅ RECOMMENDED: Strict type checking
bun run tsc --noEmit --strict
```

### IDE Configuration
```json
// .vscode/settings.json
{
  "typescript.preferences.strictFunctionTypes": true,
  "typescript.preferences.noImplicitReturns": true,
  "typescript.suggest.autoImports": true,
  "typescript.suggest.completeFunctionCalls": true
}
```

## Integration with Effect.ts

### Service Type Definitions
```typescript
// ✅ CORRECT: Typed Effect services
interface LoggerService {
  readonly log: (message: string) => Effect.Effect<void>
  readonly error: (message: string, error?: Error) => Effect.Effect<void>
  readonly warn: (message: string) => Effect.Effect<void>
}

const LoggerService = Context.GenericTag<LoggerService>('LoggerService')

// ✅ CORRECT: Implementation with proper types
const LoggerServiceImpl = Layer.succeed(LoggerService, {
  log: (message: string) => Effect.sync(() => console.log(message)),
  error: (message: string, error?: Error) => Effect.sync(() => 
    console.error(message, error)
  ),
  warn: (message: string) => Effect.sync(() => console.warn(message))
})
```

### Effect Composition Types
```typescript
// ✅ CORRECT: Composable Effect types
type DatabaseEffect<A> = Effect.Effect<A, DatabaseError, DatabaseService>
type LoggedEffect<A, E> = Effect.Effect<A, E, LoggerService>

function withLogging<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  operation: string
): Effect.Effect<A, E, R | LoggerService> {
  return effect.pipe(
    Effect.tap(() => Effect.log(`Starting ${operation}`)),
    Effect.tapError(error => Effect.log(`Failed ${operation}: ${error}`)),
    Effect.tap(() => Effect.log(`Completed ${operation}`))
  )
}
```

## Related Documentation

- [Type Safety Rules](../../rules/type-safety.md) - Core type safety requirements
- [Effect Rules](../effect/rules.md) - Effect.ts integration patterns
- [Testing Rules](../../rules/testing.md) - Testing with types