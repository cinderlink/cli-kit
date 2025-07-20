# Effect.ts Development Rules

## Core Principle

**EFFECT-FIRST**: All async operations and error handling must use Effect.ts patterns.

## Required Patterns

### Effect Signatures
```typescript
// ✅ CORRECT: Proper Effect signatures
import { Effect, Context, Layer } from 'effect'

// Always specify Success, Error, and Requirements types
function fetchUser(id: string): Effect.Effect<User, UserNotFoundError, DatabaseService> {
  // Implementation
}

// For simple effects without requirements
function validateEmail(email: string): Effect.Effect<string, ValidationError> {
  // Implementation
}

// For effects that don't fail
function logMessage(message: string): Effect.Effect<void> {
  // Implementation
}
```

### Error Types (Required)
```typescript
// ✅ CORRECT: Tagged error classes
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

export class DatabaseError extends Error {
  readonly _tag = "DatabaseError"
  constructor(
    public operation: string,
    message: string
  ) {
    super(message)
  }
}

// ✅ CORRECT: Union types for multiple errors
type ApiError = ValidationError | NetworkError | DatabaseError
```

### Service Patterns (Required)
```typescript
// ✅ CORRECT: Service interface with Effect methods
interface UserService {
  readonly findById: (id: string) => Effect.Effect<User | null, DatabaseError>
  readonly create: (data: CreateUserData) => Effect.Effect<User, ValidationError | DatabaseError>
  readonly update: (id: string, data: UpdateUserData) => Effect.Effect<User, UserNotFoundError | ValidationError | DatabaseError>
  readonly delete: (id: string) => Effect.Effect<void, UserNotFoundError | DatabaseError>
}

// ✅ CORRECT: Service tag for dependency injection
const UserService = Context.GenericTag<UserService>("UserService")

// ✅ CORRECT: Service implementation with Layer
const UserServiceImpl = Layer.effect(UserService, Effect.gen(function* () {
  const database = yield* DatabaseService
  
  return {
    findById: (id: string) => Effect.gen(function* () {
      const result = yield* database.query('SELECT * FROM users WHERE id = ?', [id])
      return result.rows[0] || null
    }),
    
    create: (data: CreateUserData) => Effect.gen(function* () {
      yield* validateUserData(data)
      return yield* database.insert('users', data)
    }),
    
    // ... other methods
  }
}))
```

## Async Flow Patterns

### Generator Functions (Preferred)
```typescript
// ✅ CORRECT: Use generators for complex async flows
function processUserRegistration(data: RegistrationData) {
  return Effect.gen(function* () {
    // Step 1: Validate input
    const validData = yield* validateRegistrationData(data)
    
    // Step 2: Check if user exists
    const existingUser = yield* UserService.findByEmail(validData.email)
    if (existingUser) {
      yield* Effect.fail(new ValidationError('email', 'Email already exists'))
    }
    
    // Step 3: Create user
    const user = yield* UserService.create(validData)
    
    // Step 4: Send welcome email
    yield* EmailService.sendWelcome(user.email)
    
    // Step 5: Log success
    yield* Effect.log(`User created: ${user.id}`)
    
    return user
  })
}
```

### Resource Management (Required)
```typescript
// ✅ CORRECT: Use acquireRelease for resources
const withDatabaseConnection = <A, E, R>(
  effect: (connection: DatabaseConnection) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | DatabaseError, R | DatabasePool> =>
  Effect.acquireRelease(
    // Acquire resource
    Effect.gen(function* () {
      const pool = yield* DatabasePool
      return yield* pool.acquire()
    }),
    // Release resource  
    (connection) => Effect.gen(function* () {
      const pool = yield* DatabasePool
      return yield* pool.release(connection)
    })
  ).pipe(Effect.flatMap(effect))

// Usage
const getUserWithConnection = (id: string) =>
  withDatabaseConnection(connection =>
    connection.query('SELECT * FROM users WHERE id = ?', [id])
  )
```

### Error Handling Patterns
```typescript
// ✅ CORRECT: Structured error handling
function safeApiCall<A>(
  apiCall: Effect.Effect<A, NetworkError>
): Effect.Effect<A, never> {
  return apiCall.pipe(
    Effect.retry({ times: 3, delay: '1 second' }),
    Effect.catchAll(error => Effect.gen(function* () {
      yield* Effect.log(`API call failed: ${error.message}`)
      return yield* Effect.succeed(null as A)
    }))
  )
}

// ✅ CORRECT: Error transformation
function transformDatabaseError<A>(
  effect: Effect.Effect<A, DatabaseError>
): Effect.Effect<A, ApiError> {
  return effect.pipe(
    Effect.mapError(dbError => 
      new ApiError('database', `Database operation failed: ${dbError.message}`)
    )
  )
}
```

## Testing with Effect

### Test Setup
```typescript
// ✅ CORRECT: Effect testing patterns
import { test, expect } from 'bun:test'
import { Effect, Layer } from 'effect'

test('UserService creates user correctly', async () => {
  const mockDatabase = Layer.succeed(DatabaseService, {
    insert: (table: string, data: any) => Effect.succeed({ id: '123', ...data }),
    query: (sql: string, params: any[]) => Effect.succeed({ rows: [] })
  })
  
  const effect = UserService.create({ email: 'test@example.com', name: 'Test' })
    .pipe(Effect.provide(UserServiceImpl))
    .pipe(Effect.provide(mockDatabase))
  
  const result = await Effect.runPromise(effect)
  expect(result.email).toBe('test@example.com')
})

test('UserService handles errors correctly', async () => {
  const mockDatabase = Layer.succeed(DatabaseService, {
    insert: () => Effect.fail(new DatabaseError('insert', 'Connection failed'))
  })
  
  const effect = UserService.create({ email: 'test@example.com', name: 'Test' })
    .pipe(Effect.provide(UserServiceImpl))
    .pipe(Effect.provide(mockDatabase))
  
  const result = await Effect.runPromise(Effect.either(effect))
  expect(result._tag).toBe('Left')
  if (result._tag === 'Left') {
    expect(result.left._tag).toBe('DatabaseError')
  }
})
```

### Testing Error Scenarios
```typescript
// ✅ CORRECT: Test all error paths
test('validates user data correctly', async () => {
  const invalidData = { email: 'invalid-email', name: '' }
  
  const effect = validateUserData(invalidData)
  const result = await Effect.runPromise(Effect.either(effect))
  
  expect(result._tag).toBe('Left')
  if (result._tag === 'Left') {
    expect(result.left._tag).toBe('ValidationError')
    expect(result.left.field).toBe('email')
  }
})
```

## Forbidden Patterns

### Don't Use Promises Directly
```typescript
// ❌ WRONG: Direct Promise usage
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()
  return data
}

// ✅ CORRECT: Effect wrapping async operations
function fetchUser(id: string): Effect.Effect<User, NetworkError> {
  return Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then(r => r.json()),
    catch: (error) => new NetworkError(500, `Failed to fetch user: ${error}`)
  })
}
```

### Don't Use Try-Catch
```typescript
// ❌ WRONG: Traditional try-catch
async function processData(data: unknown) {
  try {
    const validated = validateData(data)
    const result = await saveData(validated)
    return result
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

// ✅ CORRECT: Effect error handling
function processData(data: unknown): Effect.Effect<SaveResult, ValidationError | DatabaseError> {
  return Effect.gen(function* () {
    const validated = yield* validateData(data)
    const result = yield* saveData(validated)
    return result
  }).pipe(
    Effect.tapError(error => Effect.log(`Processing failed: ${error.message}`))
  )
}
```

### Don't Use Callbacks
```typescript
// ❌ WRONG: Callback-based APIs
function readFile(path: string, callback: (err: Error | null, data: string) => void) {
  // callback implementation
}

// ✅ CORRECT: Effect-based APIs
function readFile(path: string): Effect.Effect<string, FileError> {
  return Effect.async<string, FileError>(resume => {
    // async implementation that calls resume
  })
}
```

## Integration Patterns

### With Bun APIs
```typescript
// ✅ CORRECT: Wrapping Bun APIs in Effects
function readFileEffect(path: string): Effect.Effect<string, FileError> {
  return Effect.tryPromise({
    try: () => Bun.file(path).text(),
    catch: (error) => new FileError('read', `Failed to read ${path}: ${error}`)
  })
}

function executeCommand(cmd: string): Effect.Effect<string, CommandError> {
  return Effect.tryPromise({
    try: () => Bun.$`${cmd}`.text(),
    catch: (error) => new CommandError(cmd, `Command failed: ${error}`)
  })
}
```

### With React/JSX Components
```typescript
// ✅ CORRECT: Effect in component lifecycle
import { useEffect, useState } from 'react'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const effect = UserService.findById(userId).pipe(
      Effect.provide(UserServiceImpl),
      Effect.either
    )
    
    Effect.runPromise(effect).then(result => {
      if (result._tag === 'Right') {
        setUser(result.right)
      } else {
        setError(result.left.message)
      }
    })
  }, [userId])
  
  if (error) return <div>Error: {error}</div>
  if (!user) return <div>Loading...</div>
  return <div>{user.name}</div>
}
```

## Performance Considerations

### Use Streaming for Large Data
```typescript
// ✅ CORRECT: Stream processing for large datasets
import { Stream } from 'effect'

function processLargeDataset(
  source: Stream.Stream<DataItem, never>
): Stream.Stream<ProcessedItem, ProcessingError> {
  return source.pipe(
    Stream.mapEffect(item => processItem(item)),
    Stream.buffer({ capacity: 100 }),
    Stream.timeout('30 seconds')
  )
}
```

### Use Batching for API Calls
```typescript
// ✅ CORRECT: Batched API calls
function batchFetchUsers(
  ids: string[]
): Effect.Effect<User[], NetworkError> {
  const batches = chunk(ids, 50) // Process in batches of 50
  
  return Effect.forEach(batches, batch =>
    fetchUserBatch(batch).pipe(
      Effect.retry({ times: 3 })
    )
  ).pipe(
    Effect.map(results => results.flat())
  )
}
```

## Common Mistakes

### Mixing Promises and Effects
```typescript
// ❌ WRONG: Mixing paradigms
async function mixedApproach(id: string) {
  const user = await Effect.runPromise(UserService.findById(id))
  const profile = await fetch(`/api/profiles/${user.id}`)
  return profile.json()
}

// ✅ CORRECT: Pure Effect approach
function pureEffectApproach(id: string) {
  return Effect.gen(function* () {
    const user = yield* UserService.findById(id)
    const profile = yield* fetchProfile(user.id)
    return profile
  })
}
```

### Not Handling All Error Types
```typescript
// ❌ WRONG: Unhandled error types
function processUser(id: string): Effect.Effect<ProcessResult, never> {
  return UserService.findById(id).pipe(
    Effect.flatMap(user => processUserData(user))
    // Missing error handling!
  )
}

// ✅ CORRECT: Handle all possible errors
function processUser(id: string): Effect.Effect<ProcessResult, UserNotFoundError | ProcessingError> {
  return Effect.gen(function* () {
    const user = yield* UserService.findById(id)
    const result = yield* processUserData(user)
    return result
  })
}
```

## Related Documentation

- [Type Safety Rules](../../rules/type-safety.md) - TypeScript with Effect
- [Testing Rules](../../rules/testing.md) - Testing Effect code
- [Development Process](../../processes/development.md) - Effect workflow integration