# Performance Guide

TUIX includes several performance optimizations to ensure fast startup times and smooth rendering. This guide covers best practices, optimization techniques, and performance monitoring.

## Performance Overview

### Benchmark Results

Recent benchmark results show significant performance improvements:

| Operation | Original | Optimized | Improvement |
|-----------|----------|-----------|-------------|
| String width (ASCII) | 3.05ms | 1.44ms | 52.8% |
| String width (Unicode) | 13.31ms | 2.26ms | 83.0% |
| Style rendering | 9.66ms | 0.93ms | 90.3% |
| Styled text creation | 237.45ms | 59.23ms | 75.1% |
| View caching | 2.50ms | 0.35ms | 86.0% |
| Large layout rendering | 9.38ms | 1.02ms | 89.1% |

## Optimization Features

### 1. Lazy Loading with Caching

Commands and modules are loaded on-demand with intelligent caching:

```typescript
import { createLazyHandler, preloadHandlers } from "tuix/cli/lazy-cache"

// Create lazy-loaded command
const lazyCLI = defineConfig({
  commands: {
    build: createLazyHandler(
      "./commands/build",
      () => import("./commands/build")
    ),
    dev: createLazyHandler(
      "./commands/dev", 
      () => import("./commands/dev")
    )
  }
})

// Preload commonly used commands
preloadHandlers([lazyCLI.commands.build, lazyCLI.commands.dev])
```

**Benefits:**
- Faster CLI startup (only load needed commands)
- Automatic caching prevents re-loading
- Background preloading for common commands
- LRU eviction manages memory usage

### 2. View Rendering Cache

Rendered views are cached to avoid re-computation:

```typescript
import { globalViewCache, memoizeRender } from "tuix/core/view-cache"

// Automatic caching for expensive views
const expensiveView = vstack(
  ...Array.from({ length: 100 }, (_, i) => 
    styledText(`Item ${i}`, style().foreground(Colors.blue))
  )
)

// First render: 50ms, cached renders: <1ms
const rendered = await Effect.runPromise(expensiveView.render())
```

**Cache Features:**
- Automatic cache key generation
- TTL-based expiration (30s default)
- LRU eviction when cache is full
- Access tracking for optimization

### 3. Optimized String Width Calculation

Fast Unicode-aware string width calculation:

```typescript
import { stringWidthOptimized } from "tuix/utils/string-width-optimized"

// 83% faster for Unicode strings
const width = stringWidthOptimized("Hello 世界 🌟")

// Cache provides 86%+ improvement for repeated strings
const repeatedWidth = stringWidthOptimized("Same string")
```

**Optimizations:**
- Pre-computed ASCII width table
- Unicode range-based wide character detection
- Automatic caching for repeated calculations
- Fast path for ASCII-only strings

### 4. Style Rendering Optimization

ANSI code generation is cached and optimized:

```typescript
import { styledTextOptimized } from "tuix/styling/render-optimized"

// 90% faster style rendering
const styled = styledTextOptimized("Text", {
  foreground: 'blue',
  bold: true,
  underline: true
})
```

**Features:**
- Pre-computed ANSI escape codes
- Cached style-to-ANSI conversion
- Optimized RGB-to-256-color mapping
- Minimal code generation

## Best Practices

### 1. Component Design

**Use functional components for better caching:**

```typescript
// Good - cacheable
const StatusBadge = ({ status }: { status: string }) => (
  <span color={status === 'success' ? 'green' : 'red'}>
    {status.toUpperCase()}
  </span>
)

// Avoid - creates new function each time
const StatusBadge = () => {
  return (status: string) => (
    <span color={status === 'success' ? 'green' : 'red'}>
      {status.toUpperCase()}
    </span>
  )
}
```

**Keep view rendering pure:**

```typescript
// Good - deterministic
const UserInfo = ({ user }) => (
  <vstack>
    <text>Name: {user.name}</text>
    <text>Email: {user.email}</text>
  </vstack>
)

// Avoid - non-deterministic 
const UserInfo = ({ user }) => (
  <vstack>
    <text>Name: {user.name}</text>
    <text>Generated at: {new Date().toISOString()}</text>
  </vstack>
)
```

### 2. Layout Optimization

**Avoid deep nesting:**

```typescript
// Good - flat structure
<vstack>
  <text>Header</text>
  <text>Content line 1</text>
  <text>Content line 2</text>
  <text>Footer</text>
</vstack>

// Avoid - unnecessary nesting
<vstack>
  <vstack>
    <vstack>
      <text>Header</text>
    </vstack>
    <vstack>
      <text>Content line 1</text>
      <text>Content line 2</text>
    </vstack>
  </vstack>
  <text>Footer</text>
</vstack>
```

**Use hstack efficiently:**

```typescript
// Good - pre-join strings when possible
const statusLine = `${icon} ${label}: ${value}`
<text>{statusLine}</text>

// Less efficient - multiple text nodes
<hstack>
  <text>{icon}</text>
  <text> </text>
  <text>{label}</text>
  <text>: </text>
  <text>{value}</text>
</hstack>
```

### 3. String Operations

**Cache expensive calculations:**

```typescript
// Good - cache width calculations
const memoizedWidth = useMemo(() => 
  stringWidthOptimized(longText), [longText]
)

// Avoid - recalculating every render
const width = stringWidthOptimized(longText)
```

**Batch string operations:**

```typescript
// Good - batch process
const processedItems = items.map(item => ({
  ...item,
  width: stringWidthOptimized(item.text),
  truncated: truncateStringOptimized(item.text, maxWidth)
}))

// Less efficient - individual processing
items.forEach(item => {
  const width = stringWidthOptimized(item.text)
  const truncated = truncateStringOptimized(item.text, maxWidth)
  // process item...
})
```

### 4. CLI Startup

**Use lazy loading for large CLIs:**

```typescript
// Good - lazy load heavy commands
const config = defineConfig({
  commands: {
    // Light command - always loaded
    help: {
      description: "Show help",
      handler: () => showHelp()
    },
    
    // Heavy command - lazy loaded
    build: createLazyHandler(
      "./commands/build",
      () => import("./commands/build")
    )
  }
})
```

**Preload critical commands:**

```typescript
// Preload commands likely to be used
if (process.env.NODE_ENV === 'development') {
  preloadHandlers([
    config.commands.dev,
    config.commands.build,
    config.commands.test
  ])
}
```

## Performance Monitoring

### 1. Built-in Benchmarks

Run performance tests to track improvements:

```bash
# Run all performance benchmarks
bun test:perf

# Run specific benchmark suites
bun test __tests__/performance/rendering.bench.test.ts
bun test __tests__/performance/optimization.bench.test.ts
```

### 2. Cache Statistics

Monitor cache performance:

```typescript
import { globalViewCache } from "tuix/core/view-cache"
import { getStyleCacheStats } from "tuix/styling/render-optimized"
import { getWidthCacheStats } from "tuix/utils/string-width-optimized"

// Get cache statistics
console.log('View cache:', globalViewCache.getStats())
console.log('Style cache:', getStyleCacheStats())
console.log('Width cache:', getWidthCacheStats())
```

### 3. Profiling

Profile your CLI performance:

```typescript
// Profile command execution
const start = performance.now()
await runCommand(args)
const end = performance.now()
console.log(`Command took ${end - start}ms`)

// Profile rendering
const renderStart = performance.now()
const rendered = await Effect.runPromise(view.render())
const renderEnd = performance.now()
console.log(`Render took ${renderEnd - renderStart}ms`)
```

## Memory Management

### 1. Cache Limits

Caches have built-in size limits:

```typescript
// View cache: 1000 entries, 30s TTL
const viewCache = new ViewCache({
  maxSize: 1000,
  maxAge: 30 * 1000
})

// String width cache: 10000 entries
// Style cache: unlimited (cleared manually)
```

### 2. Cache Cleanup

Clear caches when needed:

```typescript
import { clearStyleCache } from "tuix/styling/render-optimized"
import { clearWidthCache } from "tuix/utils/string-width-optimized"

// Clear caches manually
globalViewCache.clear()
clearStyleCache()
clearWidthCache()

// Or clear on exit
process.on('exit', () => {
  globalViewCache.clear()
  clearStyleCache()
  clearWidthCache()
})
```

## Troubleshooting

### Common Performance Issues

1. **Slow startup** - Use lazy loading for commands
2. **Slow rendering** - Check for cache misses, reduce nesting
3. **Memory usage** - Monitor cache sizes, clear when needed
4. **Unicode handling** - Use optimized string functions

### Performance Debugging

```bash
# Profile startup time
time bun my-cli.ts --help

# Check bundle size
bun build --analyze src/index.ts

# Memory usage monitoring
bun --inspect my-cli.ts
```

### Configuration Tuning

```typescript
// Tune cache sizes for your application
const config = defineConfig({
  performance: {
    viewCacheSize: 500,     // Smaller for memory-constrained
    stringCacheSize: 5000,  // Larger for text-heavy apps
    lazyCacheSize: 50       // Based on number of commands
  }
})
```

## Migration to Optimized APIs

### Replace String Width Calls

```typescript
// Before
import { stringWidth } from "tuix/utils/string-width"

// After  
import { stringWidthOptimized } from "tuix/utils/string-width-optimized"

// Update calls
const width = stringWidthOptimized(text) // Drop-in replacement
```

### Use Optimized Styling

```typescript
// Before
const styled = Effect.runSync(renderStyled(text, style))

// After
import { styledTextOptimized } from "tuix/styling/render-optimized"
const styled = styledTextOptimized(text, {
  foreground: 'blue',
  bold: true
})
```

### Enable View Caching

```typescript
// Before
const rendered = await Effect.runPromise(view.render())

// After
import { globalViewCache } from "tuix/core/view-cache"
const key = globalViewCache.generateKey(view)
const rendered = await globalViewCache.renderCached(key, view)
```

The optimizations provide significant performance improvements while maintaining full compatibility with existing code.
