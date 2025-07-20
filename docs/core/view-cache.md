# View Cache

The view cache system optimizes view rendering through memoization and caching, reducing unnecessary re-renders and improving application performance.

## Overview

The view cache provides:

- **Render Caching**: Cache rendered view content to avoid repeated rendering
- **Automatic Expiry**: Remove stale cache entries based on age
- **Size Management**: Enforce cache size limits with LRU-style eviction
- **Memoization**: Function-level memoization for render operations
- **Global Instance**: Shared cache instance for application-wide use

## ViewCache Class

### Basic Usage

```typescript
import { ViewCache } from "@/core/view-cache"

const cache = new ViewCache({
  maxSize: 1000,    // Maximum cache entries
  maxAge: 30000     // Entry expiry in milliseconds (30 seconds)
})

// Cache a view render
const view = text("Hello, World!")
const key = cache.generateKey(view)
const rendered = await cache.renderCached(key, view)
```

### Constructor Options

```typescript
interface ViewCacheOptions {
  maxSize?: number  // Maximum number of cache entries (default: 1000)
  maxAge?: number   // Entry expiry time in milliseconds (default: 30000)
}

const cache = new ViewCache({
  maxSize: 500,
  maxAge: 60000  // 1 minute
})
```

## Core Methods

### renderCached(key, view)

Render a view with caching:

```typescript
const view = text("Content to cache")
const key = "my-view-key"

// First call renders and caches
const result1 = await cache.renderCached(key, view)

// Second call returns cached result
const result2 = await cache.renderCached(key, view)
```

**Behavior:**
- Returns cached result if valid (not expired)
- Renders and caches if no valid cache entry exists
- Updates access count for cache entry
- Triggers eviction if cache size limit exceeded

### generateKey(view, props?)

Generate a cache key for a view:

```typescript
const view = text("Hello")
const props = { theme: "dark", size: "large" }

const key = cache.generateKey(view, props)
// Returns a unique string based on view and props
```

**Key Generation:**
- Based on view constructor name, dimensions, and props
- Consistent for same view and props
- Uses simple hash function for uniqueness
- Handles undefined dimensions gracefully

### clear()

Clear all cache entries:

```typescript
cache.clear()
console.log(cache.getStats().size) // 0
```

### getStats()

Get cache statistics:

```typescript
const stats = cache.getStats()
console.log(stats)
// {
//   size: 15,           // Number of cached entries
//   totalAccess: 45,    // Total access count across all entries
//   avgAge: 5000        // Average age of entries in milliseconds
// }
```

## Global Cache Instance

A global cache instance is available for application-wide use:

```typescript
import { globalViewCache } from "@/core/view-cache"

// Use global cache
const view = text("Global content")
const key = globalViewCache.generateKey(view)
const rendered = await globalViewCache.renderCached(key, view)
```

**Benefits:**
- Shared across all components and services
- Consistent caching strategy
- Automatic cache management

## Memoization

### memoizeRender Function

Create memoized render functions:

```typescript
import { memoizeRender } from "@/core/view-cache"

// Create a memoized render function
const expensiveRender = (view: View) => 
  Effect.gen(function* (_) {
    // Expensive rendering logic
    yield* _(Effect.sleep("100 millis"))
    return yield* _(view.render())
  })

const memoizedRender = memoizeRender(expensiveRender)

// Usage
const view = text("Expensive content")
const result = await Effect.runPromise(memoizedRender(view))
```

### Custom Key Functions

Provide custom key generation for memoization:

```typescript
const customKeyRender = memoizeRender(
  expensiveRender,
  (view) => `custom-${view.width}-${view.height}`
)
```

## Cache Management

### Automatic Expiry

Entries are automatically removed when they exceed the maximum age:

```typescript
const cache = new ViewCache({ maxAge: 5000 }) // 5 seconds

await cache.renderCached("key", view)
// Entry is cached

// Wait 6 seconds
await new Promise(resolve => setTimeout(resolve, 6000))

// Next access will re-render (cached entry expired)
await cache.renderCached("key", view)
```

### Size-Based Eviction

When cache size exceeds the limit, least-accessed entries are removed:

```typescript
const cache = new ViewCache({ maxSize: 2 })

await cache.renderCached("key1", view1)
await cache.renderCached("key2", view2)
await cache.renderCached("key3", view3) // Triggers eviction

// Cache now contains only 2 most recently accessed entries
```

### Access Tracking

Cache entries track access count for intelligent eviction:

```typescript
// Access patterns affect eviction priority
await cache.renderCached("popular", view)    // Access count: 1
await cache.renderCached("unpopular", view)  // Access count: 1

// Access popular entry multiple times
await cache.renderCached("popular", view)    // Access count: 2
await cache.renderCached("popular", view)    // Access count: 3

// When eviction happens, "unpopular" is removed first
```

## Performance Considerations

### When to Use Caching

**Good candidates for caching:**
- Views with expensive rendering logic
- Views that rarely change
- Views with complex layout calculations
- Views with slow data processing

**Poor candidates for caching:**
- Views with frequently changing content
- Simple text views with fast rendering
- Views with time-sensitive data

### Cache Key Design

Design cache keys to balance uniqueness and reusability:

```typescript
// Good: Specific enough to be unique, general enough to be reusable
const key = cache.generateKey(view, { 
  userId: user.id, 
  theme: theme.name 
})

// Bad: Too specific, reduces cache effectiveness
const key = cache.generateKey(view, { 
  timestamp: Date.now(),
  randomId: Math.random()
})

// Bad: Too general, may cause incorrect cache hits
const key = cache.generateKey(view, { type: "generic" })
```

### Memory Management

Monitor cache usage to prevent memory leaks:

```typescript
// Periodically check cache stats
setInterval(() => {
  const stats = globalViewCache.getStats()
  if (stats.size > 800) { // Near limit
    console.warn("Cache approaching size limit:", stats)
  }
}, 60000)

// Clear cache when needed
if (memoryPressure) {
  globalViewCache.clear()
}
```

## Integration Patterns

### Component-Level Caching

Cache component renders for better performance:

```typescript
import { Component } from "@/core/component"
import { globalViewCache } from "@/core/view-cache"

export const CachedComponent = (props: ComponentProps) => {
  return Component.create({
    init: () => Effect.succeed({}),
    
    update: (msg, model) => Effect.succeed([model, []]),
    
    view: (model) => {
      const key = globalViewCache.generateKey(
        text("placeholder"), // Template view for key generation
        { componentId: props.id, ...model }
      )
      
      return Effect.tryPromise(() =>
        globalViewCache.renderCached(key, createExpensiveView(model))
      ).pipe(
        Effect.map(content => text(content))
      )
    }
  })
}
```

### Service-Level Caching

Cache service responses:

```typescript
import { memoizeRender } from "@/core/view-cache"

class DataVisualizationService {
  private renderChart = memoizeRender(
    (data: ChartData) => this.expensiveChartRender(data),
    (data) => `chart-${data.type}-${data.hash}`
  )
  
  async getChart(data: ChartData): Promise<View> {
    const rendered = await Effect.runPromise(this.renderChart(data))
    return text(rendered)
  }
  
  private expensiveChartRender(data: ChartData) {
    return Effect.gen(function* (_) {
      // Complex chart rendering logic
      yield* _(Effect.sleep("500 millis"))
      return `Chart: ${data.type}`
    })
  }
}
```

### Conditional Caching

Enable/disable caching based on conditions:

```typescript
class ConditionalCache {
  private cache = new ViewCache()
  private cacheEnabled = true
  
  async renderView(view: View, key?: string): Promise<string> {
    if (!this.cacheEnabled || !key) {
      return await Effect.runPromise(view.render())
    }
    
    return await this.cache.renderCached(key, view)
  }
  
  setCacheEnabled(enabled: boolean) {
    this.cacheEnabled = enabled
    if (!enabled) {
      this.cache.clear()
    }
  }
}
```

## Best Practices

### 1. Use Meaningful Cache Keys

Include relevant properties in cache keys:

```typescript
// Good: Includes all properties that affect rendering
const key = cache.generateKey(view, {
  theme: currentTheme,
  language: currentLanguage,
  screenSize: viewport.size
})

// Bad: Missing properties that affect rendering
const key = cache.generateKey(view, { theme: currentTheme })
```

### 2. Configure Appropriate Cache Size

Set cache size based on application needs:

```typescript
// For memory-constrained environments
const cache = new ViewCache({ maxSize: 100, maxAge: 10000 })

// For high-performance applications
const cache = new ViewCache({ maxSize: 5000, maxAge: 300000 })
```

### 3. Handle Cache Invalidation

Clear cache when underlying data changes:

```typescript
class DataComponent {
  private cache = new ViewCache()
  
  updateData(newData: Data) {
    this.data = newData
    this.cache.clear() // Invalidate cache
  }
  
  render() {
    const key = this.cache.generateKey(view, { dataHash: this.data.hash })
    return this.cache.renderCached(key, this.createView())
  }
}
```

### 4. Monitor Cache Performance

Track cache hit rates and adjust accordingly:

```typescript
class CacheMonitor {
  private hits = 0
  private misses = 0
  
  async renderWithTracking(cache: ViewCache, key: string, view: View) {
    const statsBefore = cache.getStats()
    const result = await cache.renderCached(key, view)
    const statsAfter = cache.getStats()
    
    if (statsAfter.totalAccess > statsBefore.totalAccess) {
      this.hits++
    } else {
      this.misses++
    }
    
    return result
  }
  
  getHitRate() {
    const total = this.hits + this.misses
    return total > 0 ? this.hits / total : 0
  }
}
```

### 5. Test Cache Behavior

Write tests to verify cache behavior:

```typescript
test("component should cache expensive renders", async () => {
  let renderCount = 0
  const expensiveView = {
    render: () => Effect.sync(() => `render-${++renderCount}`),
    width: 10,
    height: 1
  }
  
  const cache = new ViewCache()
  const key = "test-key"
  
  const result1 = await cache.renderCached(key, expensiveView)
  const result2 = await cache.renderCached(key, expensiveView)
  
  expect(result1).toBe(result2)
  expect(renderCount).toBe(1) // Only rendered once
})
```

## Troubleshooting

### Cache Misses

If experiencing low cache hit rates:

1. **Check key consistency**: Ensure keys are generated consistently
2. **Review props**: Remove volatile properties from cache keys
3. **Adjust expiry**: Increase maxAge if content doesn't change frequently
4. **Monitor size**: Ensure cache isn't being evicted due to size limits

### Memory Usage

If cache is using too much memory:

1. **Reduce maxSize**: Lower the maximum number of entries
2. **Reduce maxAge**: Expire entries more frequently
3. **Clear manually**: Call `clear()` when appropriate
4. **Review content**: Ensure cached content isn't unnecessarily large

### Performance Issues

If caching is causing performance problems:

1. **Profile key generation**: Ensure `generateKey()` is fast
2. **Review render frequency**: Avoid caching frequently changing views
3. **Optimize eviction**: Reduce eviction frequency by adjusting limits
4. **Consider alternatives**: Use other optimization strategies for simple views

## Related Documentation

- [View System](./view.md) - Basic view primitives
- [Component System](../components/README.md) - Building interactive components
- [Performance Guide](../performance.md) - General performance optimization