# View Module - Known Issues

## Current Issues

### High Priority

1. **Memory Leak in View Cache** (🔴 Critical)
   - **Issue**: Cached views not properly evicted when TTL expires
   - **Impact**: Memory grows unbounded with long-running applications
   - **Workaround**: Manually call `cache.clear()` periodically
   - **Fix ETA**: Next patch release
   - **Tracking**: #VIEW-001

2. **Flexbox Layout Width Calculation** (🔴 Critical)
   - **Issue**: Flex-grow doesn't account for content width properly
   - **Impact**: Content overflow in flex containers
   - **Workaround**: Set explicit widths on flex items
   - **Fix ETA**: Next patch release
   - **Tracking**: #VIEW-002

3. **File Rename Import Issues** (🟡 Medium)
   - **Issue**: dynamicLayout.ts renamed but imports not updated
   - **Impact**: Build errors in some configurations
   - **Workaround**: Update imports manually
   - **Fix ETA**: Immediate

### Medium Priority

4. **Grid Layout Gap Rendering** (🟡 Medium)
   - **Issue**: Gaps between grid items render incorrectly with borders
   - **Impact**: Visual artifacts in grid layouts
   - **Workaround**: Use margin instead of gap
   - **Fix ETA**: v2.0
   - **Tracking**: #VIEW-003

5. **View Composition Performance** (🟡 Medium)
   - **Issue**: Deep view hierarchies cause exponential render time
   - **Impact**: Slow rendering for complex UIs
   - **Workaround**: Flatten view hierarchy where possible
   - **Fix ETA**: Next minor release
   - **Tracking**: #VIEW-004

6. **Lifecycle Hook Race Conditions** (🟡 Medium)
   - **Issue**: onMount can fire before view is actually rendered
   - **Impact**: DOM queries fail in lifecycle hooks
   - **Workaround**: Add delay or use onAfterRender
   - **Fix ETA**: Next minor release
   - **Tracking**: #VIEW-005

### Low Priority

7. **Center Alignment with Unicode** (🟢 Low)
   - **Issue**: Unicode characters throw off center calculations
   - **Impact**: Misaligned text with emoji/unicode
   - **Workaround**: Use monospace fonts or manual padding
   - **Fix ETA**: v2.0
   - **Tracking**: #VIEW-006

8. **Box Border Style Limitations** (🟢 Low)
   - **Issue**: Limited border style options (no dashed, dotted)
   - **Impact**: Less visual variety
   - **Workaround**: Use custom border characters
   - **Fix ETA**: Future release
   - **Tracking**: #VIEW-007

## Performance Issues

9. **Render Batching Inefficiency** (🟡 Medium)
   - **Issue**: Multiple renders in same tick not properly batched
   - **Impact**: Unnecessary re-renders and flicker
   - **Workaround**: Manually batch updates
   - **Status**: Requires architecture change

10. **Large List Rendering** (🟡 Medium)
    - **Issue**: No virtualization for long lists
    - **Impact**: Memory and CPU usage scales with list size
    - **Workaround**: Implement manual pagination
    - **Status**: Planned for v2.0

## Platform-Specific Issues

### Windows Terminal
11. **Box Drawing Characters**
    - **Issue**: Some box characters render with gaps
    - **Impact**: Broken borders on Windows
    - **Workaround**: Use ASCII borders on Windows
    - **Status**: Terminal bug, awaiting fix

### macOS Terminal.app
12. **Width Calculation for Emoji**
    - **Issue**: Terminal.app counts emoji as 1 char width
    - **Impact**: Layout breaks with emoji
    - **Workaround**: Avoid emoji or use iTerm2
    - **Status**: Won't fix (terminal limitation)

## Known Limitations

13. **No True Overlapping Views**
    - **Issue**: Layered views use character replacement
    - **Impact**: Can't have semi-transparent overlays
    - **Workaround**: Use clever character choices
    - **Status**: Terminal limitation

14. **No Pixel-Perfect Positioning**
    - **Issue**: Limited to character grid
    - **Impact**: Can't have smooth animations
    - **Workaround**: Use character-based animations
    - **Status**: Terminal limitation

## Edge Cases

15. **Zero-Width Views**
    - **Issue**: Views with width=0 cause layout errors
    - **Impact**: Crashes in some layout algorithms
    - **Workaround**: Filter out zero-width views
    - **Fix ETA**: Next release

16. **Circular Layout Dependencies**
    - **Issue**: Parent size depends on child, child on parent
    - **Impact**: Infinite loop in layout calculation
    - **Workaround**: Break circular dependencies
    - **Fix ETA**: v2.0 with new layout engine

## Recent Fixes

- ~~View cache key collisions~~ (Fixed in v1.5.2)
- ~~Flexbox justify-content space-evenly~~ (Fixed in v1.5.1)
- ~~Memory leak in lifecycle manager~~ (Fixed in v1.5.0)
- ~~Grid layout with single cell~~ (Fixed in v1.4.9)

## Reporting Issues

To report view issues:
1. Check this list first
2. Provide minimal view hierarchy
3. Include terminal info
4. Show expected vs actual output
5. Note any Unicode/emoji usage

## Common Workarounds

```typescript
// Workaround for flex width calculation
const fixedFlex = flexbox({
  children: items.map(item => ({
    ...item,
    width: item.width || 10 // Force width
  }))
})

// Workaround for grid gaps with borders
const gridWithMargins = grid({
  children: items.map(item => 
    box(item, { margin: 1 }) // Use margin instead of gap
  )
})

// Workaround for center alignment with Unicode
const properCenter = (text: string, width: number) => {
  const actualWidth = stringWidth(text) // Proper width calculation
  const padding = Math.max(0, width - actualWidth)
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + text + ' '.repeat(right)
}

// Workaround for lifecycle race conditions
const safeMount = () => Effect.gen(function* (_) {
  yield* _(Effect.sleep(Duration.millis(10)))
  yield* _(actualMountLogic())
})
```

## Performance Tips

1. **Cache Computed Layouts**
   ```typescript
   const layoutCache = new Map()
   const getCachedLayout = (key: string) => 
     layoutCache.get(key) || computeAndCache(key)
   ```

2. **Avoid Deep Nesting**
   ```typescript
   // Bad: Deep nesting
   box(center(box(center(box(text("nested"))))))
   
   // Good: Flatten when possible
   styledText("content", style().border().center())
   ```

3. **Use View Pooling**
   ```typescript
   const viewPool = []
   const getPooledView = () => 
     viewPool.pop() || createNewView()
   ```