# Type Safety Rules

## Core Principle

**NO `any` TYPES**: Use proper TypeScript typing with discriminated unions, never `any` or excessive type casting.

## Forbidden Patterns

### Any Types
- ❌ NO: `function process(data: any): any`
- ❌ NO: `const result = data as any`  
- ❌ NO: `// @ts-ignore` comments
- ✅ YES: Use `unknown` and type guards

### Type Workarounds
- ❌ NO: Casting around type problems
- ❌ NO: `(foo as SomeType).property`
- ❌ NO: Disabling TypeScript checks
- ✅ YES: Fix the types properly

### Unsafe Casts
- ❌ NO: `value as string` without validation
- ❌ NO: `<string>value` syntax
- ✅ YES: Type guards and proper validation

## Required Patterns

### Use Unknown Instead of Any
```typescript
// ❌ BAD
function processData(input: any): any {
  return input.whatever
}

// ✅ GOOD
function processData(input: unknown): string {
  if (typeof input === 'string') {
    return input.toUpperCase()
  }
  throw new Error('Input must be string')
}
```

### Discriminated Unions
```typescript
// ✅ GOOD: Use discriminated unions for variants
type ApiResponse = 
  | { status: 'success'; data: User[] }
  | { status: 'error'; message: string }
  | { status: 'loading' }

function handleResponse(response: ApiResponse) {
  switch (response.status) {
    case 'success':
      // TypeScript knows response.data exists
      return response.data
    case 'error':
      // TypeScript knows response.message exists  
      throw new Error(response.message)
    case 'loading':
      return null
  }
}
```

### Type Guards
```typescript
// ✅ GOOD: Proper type guards
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUser(value: unknown): value is User {
  return typeof value === 'object' && 
         value !== null &&
         'id' in value &&
         'name' in value
}

// Usage
if (isUser(data)) {
  // TypeScript knows data is User
  console.log(data.name)
}
```

### Effect Type Signatures
```typescript
// ✅ GOOD: Proper Effect signatures
import { Effect } from "effect"

// Clear success, error, and requirement types
function fetchUser(id: string): Effect.Effect<User, UserNotFoundError, Database> {
  // Implementation
}

// Tagged error types
class UserNotFoundError extends Error {
  readonly _tag = "UserNotFoundError"
  constructor(public userId: string) {
    super(`User ${userId} not found`)
  }
}
```

### Service Interfaces
```typescript
// ✅ GOOD: Properly typed service interfaces
interface DatabaseService {
  readonly findUser: (id: string) => Effect.Effect<User | null, DatabaseError>
  readonly saveUser: (user: User) => Effect.Effect<void, DatabaseError>
}

// ✅ GOOD: Error discrimination
type DatabaseError = 
  | ConnectionError
  | QueryError
  | ValidationError

class ConnectionError extends Error {
  readonly _tag = "ConnectionError"
}
```

## Required Practices

### 1. Type Imports
```typescript
// ✅ GOOD: Separate type and value imports
import type { User, UserPermissions } from './types'
import { createUser, validateUser } from './user-service'
```

### 2. Generic Constraints
```typescript
// ✅ GOOD: Constrain generics properly
function processEntity<T extends { id: string }>(entity: T): T {
  // TypeScript knows T has id property
  console.log(`Processing entity ${entity.id}`)
  return entity
}
```

### 3. Return Type Annotations
```typescript
// ✅ GOOD: Explicit return types for public APIs
export function createDatabase(config: DatabaseConfig): Effect.Effect<Database, DatabaseError> {
  // Implementation
}
```

### 4. Readonly Properties
```typescript
// ✅ GOOD: Use readonly for immutable data
interface User {
  readonly id: string
  readonly email: string
  readonly permissions: readonly Permission[]
}
```

## Testing Type Safety

### Type-Only Tests
```typescript
// ✅ GOOD: Test type relationships
import { expectType } from 'tsd'

const user = createUser({ name: 'John', email: 'john@example.com' })
expectType<User>(user)

const effect = fetchUser('123')
expectType<Effect.Effect<User, UserNotFoundError, Database>>(effect)
```

### Runtime Type Validation
```typescript
// ✅ GOOD: Validate external data
import { Schema } from "@effect/schema"

const UserSchema = Schema.struct({
  id: Schema.string,
  name: Schema.string,
  email: Schema.string
})

function parseUser(data: unknown): Effect.Effect<User, ParseError> {
  return Schema.parse(UserSchema)(data)
}
```

## Error Handling Types

### Structured Errors
```typescript
// ✅ GOOD: Use tagged error types
export class ValidationError extends Error {
  readonly _tag = "ValidationError"
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

export class NetworkError extends Error {
  readonly _tag = "NetworkError"
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
  }
}

// ✅ GOOD: Union types for multiple errors
type ApiError = ValidationError | NetworkError | DatabaseError
```

## Common Mistakes

### 1. Using Any for External Data
```typescript
// ❌ BAD
function handleApiResponse(response: any) {
  return response.data.users
}

// ✅ GOOD  
function handleApiResponse(response: unknown): User[] {
  const parsed = parseApiResponse(response)
  if (parsed.status === 'success') {
    return parsed.data.users
  }
  throw new Error('API request failed')
}
```

### 2. Loose Object Types
```typescript
// ❌ BAD
function processConfig(config: { [key: string]: any }) {
  // Loses all type safety
}

// ✅ GOOD
interface Config {
  readonly host: string
  readonly port: number
  readonly ssl?: boolean
}

function processConfig(config: Config) {
  // Full type safety
}
```

### 3. Missing Error Types in Effects
```typescript
// ❌ BAD: Untyped errors
function fetchData(): Effect.Effect<Data> {
  // What errors can this throw?
}

// ✅ GOOD: Explicit error types
function fetchData(): Effect.Effect<Data, NetworkError | ParseError> {
  // Clear error possibilities
}
```

## Enforcement

### Pre-commit Checks
- Run `bun run tsc --noEmit` - no TypeScript errors allowed
- Use ESLint rules to catch `any` usage
- Review for proper Effect type signatures

### Code Review Checklist
- [ ] No `any` types used
- [ ] Discriminated unions for variants  
- [ ] Proper type guards for external data
- [ ] Effect signatures include error types
- [ ] Type imports separated from value imports
- [ ] Generic constraints where appropriate

## Related Rules

- [Effect Patterns](../dependencies/effect/rules.md) - Effect-specific typing
- [Testing Requirements](./testing.md) - Type testing requirements
- [Single Implementation](./single-implementation.md) - No duplicate type definitions