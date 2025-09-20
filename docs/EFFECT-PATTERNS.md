# Effect.ts Patterns and Best Practices

This document establishes patterns and best practices for using Effect.ts throughout the CLI Kit framework.

## Table of Contents

1. [Core Patterns](#core-patterns)
2. [Error Handling](#error-handling)
3. [Resource Management](#resource-management)
4. [Service Layer](#service-layer)
5. [Testing with Effect](#testing-with-effect)
6. [Performance Patterns](#performance-patterns)
7. [Common Anti-Patterns](#common-anti-patterns)

## Core Patterns

### 1. Use Generators for Complex Flows

**✅ Good - Generator Pattern**
```typescript
const processCommand = (command: string[]) => Effect.gen(function* () {
  const config = yield* loadConfig()
  const plugins = yield* loadPlugins(config)
  const result = yield* executeCommand(command, plugins)
  yield* logResult(result)
  return result
})
```

**❌ Avoid - Nested Pipe Chains**
```typescript
const processCommand = (command: string[]) =>
  loadConfig().pipe(
    Effect.flatMap(config => 
      loadPlugins(config).pipe(
        Effect.flatMap(plugins => 
          executeCommand(command, plugins).pipe(
            Effect.tap(logResult)
          )
        )
      )
    )
  )
```

### 2. Use Effect.all for Parallel Operations

**✅ Good - Parallel Execution**
```typescript
const loadAllConfigs = Effect.all([
  loadUserConfig(),
  loadSystemConfig(),
  loadProjectConfig()
], { concurrency: 'unbounded' })
```

**✅ Good - Mixed Parallel/Sequential**
```typescript
const setupApplication = Effect.gen(function* () {
  // Load configs in parallel
  const [userConfig, systemConfig] = yield* Effect.all([
    loadUserConfig(),
    loadSystemConfig()
  ])
  
  // Merge and then load plugins sequentially
  const mergedConfig = mergeConfigs(userConfig, systemConfig)
  const plugins = yield* loadPlugins(mergedConfig)
  
  return { config: mergedConfig, plugins }
})
```

### 3. Use Effect.succeed/fail for Immediate Values

**✅ Good - Immediate Success/Failure**
```typescript
const validateConfig = (config: CLIConfig): Effect.Effect<CLIConfig, ConfigError> => {
  if (!config.name) {
    return Effect.fail(new ConfigError('Name is required'))
  }
  if (!config.version) {
    return Effect.fail(new ConfigError('Version is required'))
  }
  return Effect.succeed(config)
}
```

**❌ Avoid - Unnecessary Promise Wrapping**
```typescript
const validateConfig = (config: CLIConfig) => 
  Effect.tryPromise(() => Promise.resolve(config))
```

## Error Handling

### 1. Use Tagged Errors for Better Discrimination

**✅ Good - Tagged Error Classes**
```typescript
export class ConfigNotFoundError extends Error {
  readonly _tag = 'ConfigNotFoundError'
  constructor(public path: string) {
    super(`Configuration file not found: ${path}`)
  }
}

export class InvalidConfigError extends Error {
  readonly _tag = 'InvalidConfigError'
  constructor(public errors: string[]) {
    super(`Configuration validation failed: ${errors.join(', ')}`)
  }
}

export class PluginLoadError extends Error {
  readonly _tag = 'PluginLoadError'
  constructor(public pluginName: string, public cause: Error) {
    super(`Failed to load plugin '${pluginName}': ${cause.message}`)
    this.cause = cause
  }
}
```

### 2. Use Effect.catchTag for Specific Error Handling

**✅ Good - Specific Error Recovery**
```typescript
const safeLoadConfig = (path: string) =>
  loadConfig(path).pipe(
    Effect.catchTag('ConfigNotFoundError', () =>
      Effect.succeed(getDefaultConfig())
    ),
    Effect.catchTag('InvalidConfigError', (error) =>
      Effect.fail(new Error(`Config validation failed: ${error.errors.join(', ')}`))
    )
  )
```

### 3. Provide Context in Error Messages

**✅ Good - Contextual Error Information**
```typescript
const executeCommand = (command: string[], context: ExecutionContext) =>
  findHandler(command).pipe(
    Effect.mapError(error => new CommandNotFoundError({
      command,
      availableCommands: context.availableCommands,
      suggestions: getSuggestions(command, context.availableCommands),
      cause: error
    }))
  )
```

### 4. Use Effect.retry for Transient Failures

**✅ Good - Retry with Backoff**
```typescript
const loadRemotePlugin = (url: string) =>
  fetchPlugin(url).pipe(
    Effect.retry({
      times: 3,
      delay: (attempt) => Duration.millis(100 * Math.pow(2, attempt))
    }),
    Effect.mapError(error => 
      new PluginLoadError(`Failed to load plugin from ${url} after retries`, error)
    )
  )
```

## Resource Management

### 1. Use acquireRelease for Resource Management

**✅ Good - Proper Resource Cleanup**
```typescript
const withTempFile = <A>(operation: (path: string) => Effect.Effect<A>) =>
  Effect.acquireRelease(
    // Acquire
    Effect.sync(() => {
      const tempPath = `/tmp/tuix-${Date.now()}`
      fs.writeFileSync(tempPath, '')
      return tempPath
    }),
    // Release  
    (tempPath) => Effect.sync(() => {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    })
  ).pipe(
    Effect.flatMap(operation)
  )
```

### 2. Use Scope for Multiple Resources

**✅ Good - Multiple Resource Management**
```typescript
const processWithResources = Effect.gen(function* () {
  const scope = yield* Effect.scope
  
  const db = yield* openDatabase().pipe(
    Effect.acquireRelease(closeDatabase),
    Effect.provide(scope)
  )
  
  const cache = yield* openCache().pipe(
    Effect.acquireRelease(closeCache),
    Effect.provide(scope)
  )
  
  // Use resources
  const result = yield* processData(db, cache)
  
  // Resources automatically cleaned up when scope closes
  return result
})
```

### 3. Use Effect.addFinalizer for Cleanup

**✅ Good - Cleanup Registration**
```typescript
const setupProcess = Effect.gen(function* () {
  const process = yield* startBackgroundProcess()
  
  yield* Effect.addFinalizer(() => 
    Effect.sync(() => process.kill())
  )
  
  return process
})
```

## Service Layer

### 1. Define Services with Effect.Tag

**✅ Good - Service Definition**
```typescript
export interface ConfigService {
  load: (path: string) => Effect.Effect<CLIConfig, ConfigError>
  save: (config: CLIConfig, path: string) => Effect.Effect<void, ConfigError>
  validate: (config: unknown) => Effect.Effect<CLIConfig, ValidationError>
}

export const ConfigService = Effect.Tag<ConfigService>()
```

### 2. Create Live Implementations

**✅ Good - Live Service Implementation**
```typescript
export const LiveConfigService: ConfigService = {
  load: (path: string) => Effect.gen(function* () {
    const exists = yield* Effect.sync(() => fs.existsSync(path))
    if (!exists) {
      return yield* Effect.fail(new ConfigNotFoundError(path))
    }
    
    const content = yield* Effect.tryPromise({
      try: () => fs.promises.readFile(path, 'utf-8'),
      catch: (error) => new ConfigError(`Failed to read config: ${error}`)
    })
    
    const parsed = yield* Effect.try({
      try: () => JSON.parse(content),
      catch: (error) => new ConfigError(`Failed to parse config: ${error}`)
    })
    
    return yield* validateConfig(parsed)
  }),
  
  save: (config: CLIConfig, path: string) => Effect.gen(function* () {
    const content = JSON.stringify(config, null, 2)
    yield* Effect.tryPromise({
      try: () => fs.promises.writeFile(path, content),
      catch: (error) => new ConfigError(`Failed to save config: ${error}`)
    })
  }),
  
  validate: (config: unknown) => Effect.gen(function* () {
    // Use Zod or similar for validation
    const result = CLIConfigSchema.safeParse(config)
    if (!result.success) {
      return yield* Effect.fail(new ValidationError(result.error.errors))
    }
    return result.data
  })
}
```

### 3. Create Layers for Dependency Injection

**✅ Good - Layer Creation**
```typescript
export const ConfigServiceLive = Effect.toLayer(
  ConfigService,
  Effect.succeed(LiveConfigService)
)

export const AppLayers = Effect.mergeAll(
  ConfigServiceLive,
  LoggerServiceLive,
  PluginServiceLive
)
```

### 4. Use Services in Application Code

**✅ Good - Service Usage**
```typescript
const loadApplicationConfig = Effect.gen(function* () {
  const configService = yield* ConfigService
  const logger = yield* LoggerService
  
  yield* logger.info('Loading application configuration...')
  
  const config = yield* configService.load('./cli.json').pipe(
    Effect.catchTag('ConfigNotFoundError', () => 
      configService.load('./cli.config.js')
    ),
    Effect.catchAll(() => 
      Effect.succeed(getDefaultConfig())
    )
  )
  
  yield* logger.info(`Configuration loaded: ${config.name} v${config.version}`)
  return config
})
```

## Testing with Effect

### 1. Create Test Services

**✅ Good - Test Service Implementation**
```typescript
export const TestConfigService: ConfigService = {
  load: (path: string) => {
    const testConfigs: Record<string, CLIConfig> = {
      '/test/valid.json': { name: 'test', version: '1.0.0', commands: {} },
      '/test/invalid.json': null as any
    }
    
    if (path in testConfigs) {
      const config = testConfigs[path]
      return config ? Effect.succeed(config) : Effect.fail(new InvalidConfigError(['Invalid config']))
    }
    
    return Effect.fail(new ConfigNotFoundError(path))
  },
  
  save: () => Effect.succeed(void 0),
  validate: (config) => Effect.succeed(config as CLIConfig)
}

export const TestConfigServiceLayer = Effect.toLayer(
  ConfigService,
  Effect.succeed(TestConfigService)
)
```

### 2. Use Effect.runPromise in Tests

**✅ Good - Effect Testing**
```typescript
import { test, expect } from 'bun:test'

test('should load valid configuration', async () => {
  const result = await Effect.runPromise(
    loadApplicationConfig().pipe(
      Effect.provide(TestConfigServiceLayer)
    )
  )
  
  expect(result.name).toBe('test')
  expect(result.version).toBe('1.0.0')
})

test('should handle configuration errors', async () => {
  await expect(
    Effect.runPromise(
      ConfigService.load('/test/nonexistent.json').pipe(
        Effect.provide(TestConfigServiceLayer)
      )
    )
  ).rejects.toThrow('Configuration file not found')
})
```

## Performance Patterns

### 1. Use Effect.cached for Expensive Operations

**✅ Good - Caching Expensive Operations**
```typescript
const expensiveComputation = (input: string) => Effect.gen(function* () {
  yield* Effect.sleep(Duration.seconds(1)) // Simulate expensive work
  return `processed-${input}`
})

const cachedComputation = Effect.cached(expensiveComputation, Duration.minutes(5))
```

### 2. Use Effect.memoize for Function Memoization

**✅ Good - Memoized Functions**
```typescript
const loadPlugin = Effect.memoize((name: string) => Effect.gen(function* () {
  yield* Effect.log(`Loading plugin: ${name}`)
  const plugin = yield* importPlugin(name)
  yield* Effect.log(`Plugin loaded: ${name}`)
  return plugin
}))
```

### 3. Use Effect.timeout for Bounded Operations

**✅ Good - Operation Timeouts**
```typescript
const safeLoadPlugin = (name: string) =>
  loadPlugin(name).pipe(
    Effect.timeout(Duration.seconds(30)),
    Effect.catchTag('TimeoutException', () =>
      Effect.fail(new PluginLoadError(`Plugin '${name}' took too long to load`))
    )
  )
```

## Common Anti-Patterns

### ❌ Don't Mix Promise and Effect

**❌ Bad - Mixed Async Patterns**
```typescript
const badAsyncPattern = async () => {
  const config = await Effect.runPromise(loadConfig())
  const result = await somePromiseFunction(config)
  return await Effect.runPromise(processResult(result))
}
```

**✅ Good - Pure Effect Pattern**
```typescript
const goodEffectPattern = Effect.gen(function* () {
  const config = yield* loadConfig()
  const result = yield* Effect.tryPromise(() => somePromiseFunction(config))
  return yield* processResult(result)
})
```

### ❌ Don't Use try/catch with Effect

**❌ Bad - Try/Catch with Effect**
```typescript
const badErrorHandling = async () => {
  try {
    return await Effect.runPromise(riskyOperation())
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}
```

**✅ Good - Effect Error Handling**
```typescript
const goodErrorHandling = riskyOperation().pipe(
  Effect.catchAll(error => 
    Effect.gen(function* () {
      yield* Effect.log(`Error: ${error.message}`)
      return null
    })
  )
)
```

### ❌ Don't Run Effects in Constructors

**❌ Bad - Effects in Constructor**
```typescript
class BadService {
  private config: CLIConfig
  
  constructor() {
    // Never do this!
    Effect.runPromise(loadConfig()).then(config => {
      this.config = config
    })
  }
}
```

**✅ Good - Effect-Based Service**
```typescript
const createService = Effect.gen(function* () {
  const config = yield* loadConfig()
  
  return {
    processCommand: (command: string[]) => 
      Effect.gen(function* () {
        // Use config here
        return yield* handleCommand(command, config)
      })
  }
})
```

### ❌ Don't Create Layers Inside Components

**❌ Bad - Layer Creation in Component**
```typescript
const BadComponent = () => {
  // Don't create layers inside components
  const serviceLayer = Effect.toLayer(SomeService, Effect.succeed(implementation))
  
  return Effect.gen(function* () {
    const service = yield* SomeService
    // ...
  }).pipe(Effect.provide(serviceLayer))
}
```

**✅ Good - Provide Layers at Application Level**
```typescript
const main = Effect.gen(function* () {
  const component = yield* createComponent()
  return yield* runComponent(component)
}).pipe(
  Effect.provide(AppLayers)
)
```

---

Following these patterns ensures consistent, maintainable, and performant use of Effect.ts throughout the CLI Kit framework.
