# CLI Kit Coding Standards

This document establishes consistent coding standards for the CLI Kit framework, focusing on type safety, Effect.ts patterns, and clean API design.

## Table of Contents

1. [Type Design Principles](#type-design-principles)
2. [Effect.ts Best Practices](#effectts-best-practices)
3. [API Design Guidelines](#api-design-guidelines)
4. [Code Organization](#code-organization)
5. [Error Handling](#error-handling)
6. [Testing Standards](#testing-standards)
7. [Documentation Requirements](#documentation-requirements)

## Type Design Principles

### 1. Use Proper Generics

**Good:**
```typescript
interface Command<TArgs = any, TOptions = any> {
  handler: (args: TArgs, options: TOptions) => any
  validate?: (args: TArgs, options: TOptions) => boolean
}

// Usage provides type safety
const myCommand: Command<{ name: string }, { verbose: boolean }> = {
  handler: (args, options) => {
    // args.name is typed as string
    // options.verbose is typed as boolean
  }
}
```

**Bad:**
```typescript
interface Command {
  handler: (args: any, options: any) => any
  validate?: (args: any, options: any) => boolean
}
```

### 2. Prefer Discriminated Unions Over Any

**Good:**
```typescript
type CommandResult = 
  | { type: 'success'; data: any }
  | { type: 'error'; error: Error }
  | { type: 'component'; component: Component }
  | { type: 'view'; view: View }
```

**Bad:**
```typescript
type CommandResult = any
```

### 3. Use Branded Types for Domain Objects

**Good:**
```typescript
type CommandPath = string & { readonly __brand: 'CommandPath' }
type PluginName = string & { readonly __brand: 'PluginName' }

const createCommandPath = (path: string): CommandPath => path as CommandPath
```

### 4. Make Impossible States Impossible

**Good:**
```typescript
type PluginState = 
  | { status: 'loading' }
  | { status: 'loaded'; plugin: Plugin }
  | { status: 'error'; error: Error }
```

**Bad:**
```typescript
interface PluginState {
  status: 'loading' | 'loaded' | 'error'
  plugin?: Plugin  // Could be missing when status is 'loaded'
  error?: Error    // Could be missing when status is 'error'
}
```

### 5. Use Const Assertions for Literal Types

**Good:**
```typescript
const HOOK_TYPES = ['beforeCommand', 'afterCommand', 'onError'] as const
type HookType = typeof HOOK_TYPES[number]
```

**Bad:**
```typescript
const HOOK_TYPES = ['beforeCommand', 'afterCommand', 'onError']
type HookType = string
```

## Effect.ts Best Practices

### 1. Use Generators for Complex Flows

**Good:**
```typescript
const processCommand = (command: string[]) => Effect.gen(function* () {
  const config = yield* loadConfig()
  const plugins = yield* loadPlugins(config)
  const result = yield* executeCommand(command, plugins)
  yield* logResult(result)
  return result
})
```

**Bad:**
```typescript
const processCommand = (command: string[]) =>
  loadConfig().pipe(
    Effect.flatMap(config => loadPlugins(config)),
    Effect.flatMap(plugins => executeCommand(command, plugins)),
    Effect.tap(logResult)
  )
```

### 2. Use Tagged Errors for Better Error Handling

**Good:**
```typescript
class CommandNotFoundError extends Error {
  readonly _tag = 'CommandNotFoundError'
  constructor(public command: string[]) {
    super(`Command not found: ${command.join(' ')}`)
  }
}

class ValidationError extends Error {
  readonly _tag = 'ValidationError'
  constructor(public field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`)
  }
}

const executeCommand = (command: string[]) => Effect.gen(function* () {
  const handler = yield* findHandler(command).pipe(
    Effect.mapError(() => new CommandNotFoundError(command))
  )
  const result = yield* handler().pipe(
    Effect.mapError((err) => new ValidationError('args', err.message))
  )
  return result
})
```

### 3. Use Layers for Dependency Injection

**Good:**
```typescript
interface LoggerService {
  log: (message: string) => Effect.Effect<void>
}

const LoggerService = Effect.Tag<LoggerService>()

const LiveLoggerService = Effect.succeed({
  log: (message: string) => Effect.sync(() => console.log(message))
}).pipe(Effect.toLayer(LoggerService))

const useLogger = Effect.gen(function* () {
  const logger = yield* LoggerService
  yield* logger.log('Hello, world!')
})
```

### 4. Use acquireRelease for Resource Management

**Good:**
```typescript
const withDatabase = <A>(operation: (db: Database) => Effect.Effect<A>) =>
  Effect.acquireRelease(
    // Acquire
    Effect.sync(() => new Database()),
    // Release
    (db) => Effect.sync(() => db.close())
  ).pipe(
    Effect.flatMap(operation)
  )
```

### 5. Prefer Effect.all for Parallel Operations

**Good:**
```typescript
const loadAllConfigs = Effect.all([
  loadUserConfig(),
  loadSystemConfig(),
  loadProjectConfig()
], { concurrency: 'unbounded' })
```

**Bad:**
```typescript
const loadAllConfigs = Effect.gen(function* () {
  const user = yield* loadUserConfig()
  const system = yield* loadSystemConfig()
  const project = yield* loadProjectConfig()
  return [user, system, project]
})
```

## API Design Guidelines

### 1. Keep Functions Small and Focused

**Good:**
```typescript
const parseArgs = (argv: string[]) => Effect.sync(() => /* parsing logic */)
const validateArgs = (args: ParsedArgs) => Effect.sync(() => /* validation logic */)
const executeCommand = (args: ParsedArgs) => Effect.sync(() => /* execution logic */)

const runCLI = (argv: string[]) => Effect.gen(function* () {
  const args = yield* parseArgs(argv)
  yield* validateArgs(args)
  return yield* executeCommand(args)
})
```

### 2. Use Builder Pattern for Complex Configuration

**Good:**
```typescript
class CLIBuilder {
  private config: CLIConfig = { name: '', version: '', commands: {} }
  
  name(name: string): this {
    this.config.name = name
    return this
  }
  
  version(version: string): this {
    this.config.version = version
    return this
  }
  
  command(name: string, config: CommandConfig): this {
    this.config.commands[name] = config
    return this
  }
  
  build(): CLIConfig {
    return { ...this.config }
  }
}

// Usage
const cli = new CLIBuilder()
  .name('my-cli')
  .version('1.0.0')
  .command('hello', { handler: () => 'Hello!' })
  .build()
```

### 3. Provide Both Sync and Async APIs

**Good:**
```typescript
// Sync API for simple cases
export const createCLI = (config: CLIConfig): CLI => new CLI(config)

// Async API for complex cases
export const createCLIAsync = (config: CLIConfig | Promise<CLIConfig>): Promise<CLI> =>
  Promise.resolve(config).then(cfg => new CLI(cfg))
```

### 4. Use Function Overloads for Flexible APIs

**Good:**
```typescript
function command(name: string, handler: Handler): CommandConfig
function command(name: string, config: CommandConfig): CommandConfig
function command(name: string, handlerOrConfig: Handler | CommandConfig): CommandConfig {
  if (typeof handlerOrConfig === 'function') {
    return { handler: handlerOrConfig }
  }
  return handlerOrConfig
}
```

### 5. Provide Escape Hatches

**Good:**
```typescript
interface CLIConfig {
  // Standard configuration
  name: string
  version: string
  commands: Record<string, CommandConfig>
  
  // Escape hatch for advanced users
  advanced?: {
    customParser?: (argv: string[]) => ParsedArgs
    customRouter?: (args: ParsedArgs) => RouteResult
  }
}
```

## Code Organization

### 1. Separate by Domain, Not by Type

**Good:**
```
src/
  cli/
    parser.ts
    router.ts
    runner.ts
    types.ts
  components/
    button.ts
    input.ts
    types.ts
  styling/
    color.ts
    layout.ts
    types.ts
```

**Bad:**
```
src/
  types/
    cli.ts
    components.ts
    styling.ts
  services/
    parser.ts
    router.ts
    runner.ts
  components/
    button.ts
    input.ts
```

### 2. Use Barrel Exports

**Good:**
```typescript
// src/cli/index.ts
export { CLIParser } from './parser'
export { CLIRouter } from './router'
export { CLIRunner } from './runner'
export type * from './types'
```

### 3. Keep Related Code Together

**Good:**
```typescript
// parser.ts
export class CLIParser {
  // Implementation
}

export interface ParseOptions {
  // Related types
}

export const createParser = (options: ParseOptions): CLIParser => {
  // Related factory function
}
```

### 4. Use Consistent Naming Conventions

- **Classes**: PascalCase (`CLIParser`, `CommandRouter`)
- **Functions**: camelCase (`parseArgs`, `executeCommand`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`CommandConfig`, `ParsedArgs`)
- **Files**: kebab-case (`cli-parser.ts`, `command-router.ts`)

## Error Handling

### 1. Use Specific Error Types

**Good:**
```typescript
export class ConfigValidationError extends Error {
  readonly _tag = 'ConfigValidationError'
  constructor(public field: string, public value: unknown) {
    super(`Invalid value for ${field}: ${value}`)
  }
}

export class CommandExecutionError extends Error {
  readonly _tag = 'CommandExecutionError'
  constructor(public command: string[], cause: Error) {
    super(`Command execution failed: ${command.join(' ')}`)
    this.cause = cause
  }
}
```

### 2. Provide Context in Errors

**Good:**
```typescript
const parseCommand = (argv: string[], context: ParseContext) =>
  Effect.tryPromise({
    try: () => doParseCommand(argv),
    catch: (error) => new ParseError({
      input: argv,
      position: context.position,
      expected: context.expected,
      cause: error
    })
  })
```

### 3. Use Effect.catchTag for Specific Error Handling

**Good:**
```typescript
const safeExecuteCommand = (command: string[]) =>
  executeCommand(command).pipe(
    Effect.catchTag('CommandNotFoundError', (error) =>
      Effect.succeed({ type: 'not-found', suggestions: getSuggestions(error.command) })
    ),
    Effect.catchTag('ValidationError', (error) =>
      Effect.succeed({ type: 'validation-failed', field: error.field })
    )
  )
```

## Testing Standards

### 1. Test Behavior, Not Implementation

**Good:**
```typescript
test('CLI should suggest similar commands for typos', async () => {
  const cli = createCLI({
    commands: {
      'hello': { handler: () => 'Hello!' },
      'help': { handler: () => 'Help!' }
    }
  })
  
  const result = await cli.run(['helo'])
  
  expect(result.suggestions).toContain('hello')
})
```

**Bad:**
```typescript
test('levenshteinDistance calculates edit distance', () => {
  expect(levenshteinDistance('hello', 'helo')).toBe(1)
})
```

### 2. Use Descriptive Test Names

**Good:**
```typescript
test('should parse command with options and arguments')
test('should fail validation when required argument is missing')
test('should suggest similar commands when command not found')
```

**Bad:**
```typescript
test('parse test')
test('validation')
test('suggestions')
```

### 3. Use Test Utilities for Consistency

**Good:**
```typescript
// test-utils.ts
export const createTestCLI = (commands: Record<string, CommandConfig>) =>
  createCLI({
    name: 'test-cli',
    version: '1.0.0',
    commands
  })

export const expectCommandResult = (result: CommandResult) => ({
  toBeSuccess: () => expect(result.type).toBe('success'),
  toBeError: () => expect(result.type).toBe('error'),
  toHaveData: (data: any) => {
    expect(result.type).toBe('success')
    expect((result as any).data).toEqual(data)
  }
})
```

## Documentation Requirements

### 1. Every Public API Must Have JSDoc

**Good:**
```typescript
/**
 * Creates a new CLI application with the given configuration.
 * 
 * @param config - The CLI configuration including commands and options
 * @returns A configured CLI instance ready to run
 * 
 * @example
 * ```typescript
 * const cli = createCLI({
 *   name: 'my-app',
 *   version: '1.0.0',
 *   commands: {
 *     hello: {
 *       handler: () => console.log('Hello!')
 *     }
 *   }
 * })
 * 
 * await cli.run(['hello'])
 * ```
 */
export function createCLI(config: CLIConfig): CLI {
  return new CLI(config)
}
```

### 2. Document Complex Types

**Good:**
```typescript
/**
 * Configuration for a CLI command.
 * 
 * @example Basic command
 * ```typescript
 * const command: CommandConfig = {
 *   description: 'Say hello',
 *   handler: () => 'Hello, world!'
 * }
 * ```
 * 
 * @example Command with validation
 * ```typescript
 * const command: CommandConfig = {
 *   description: 'Greet a person',
 *   args: {
 *     name: z.string().min(1, 'Name is required')
 *   },
 *   handler: (args) => `Hello, ${args.name}!`
 * }
 * ```
 */
export interface CommandConfig<TArgs = any, TOptions = any> {
  /** Human-readable description of what this command does */
  description: string
  
  /** Command handler function */
  handler: Handler<TArgs, TOptions>
  
  /** Argument validation schema */
  args?: Record<string, z.ZodSchema>
  
  /** Option validation schema */
  options?: Record<string, z.ZodSchema>
  
  /** Nested subcommands */
  commands?: Record<string, CommandConfig>
  
  /** Alternative names for this command */
  aliases?: string[]
  
  /** Hide this command from help output */
  hidden?: boolean
}
```

### 3. Include Performance Considerations

**Good:**
```typescript
/**
 * Loads and caches plugin configurations.
 * 
 * This function uses an LRU cache to avoid reloading plugins on every command.
 * The cache has a default size of 100 entries and TTL of 1 hour.
 * 
 * @performance This function is optimized for repeated calls. First call may be slow
 * due to file I/O, but subsequent calls will return cached results.
 */
export const loadPlugins = /* ... */
```

---

This coding standards document should be followed for all new code and used as a guide when refactoring existing code. The goal is to maintain consistency, type safety, and clean APIs throughout the CLI Kit framework.