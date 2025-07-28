# Services Module - Known Issues

## Current Issues

### High Priority

1. **Terminal Service Memory Leak on Windows** (🔴 Critical)
   - **Issue**: Output buffer not properly cleared on Windows Terminal
   - **Impact**: Memory usage grows with extended sessions
   - **Workaround**: Restart application periodically
   - **Fix ETA**: Next patch release
   - **Tracking**: #SVC-001

2. **Input Service Key Repeat Detection** (🔴 Critical)
   - **Issue**: Some terminals send key repeat as separate events
   - **Impact**: Cannot distinguish held keys from rapid presses
   - **Workaround**: Implement custom debouncing
   - **Fix ETA**: Next patch release
   - **Tracking**: #SVC-002

3. **Import Path Errors** (🟡 Medium)
   - **Issue**: serviceModule.ts renamed but imports not updated everywhere
   - **Impact**: Build failures in some configurations
   - **Workaround**: Manual import updates
   - **Fix ETA**: Immediate

### Medium Priority

4. **Renderer Flicker on Rapid Updates** (🟡 Medium)
   - **Issue**: Double buffering fails with > 60fps updates
   - **Impact**: Visual flicker in high-frequency animations
   - **Workaround**: Limit update rate to 60fps
   - **Fix ETA**: v2.0
   - **Tracking**: #SVC-003

5. **Storage Transaction Deadlocks** (🟡 Medium)
   - **Issue**: Nested transactions can deadlock with SQLite backend
   - **Impact**: Application hangs during complex operations
   - **Workaround**: Avoid nested transactions
   - **Fix ETA**: Next minor release
   - **Tracking**: #SVC-004

6. **Mouse Coordinates on Scaled Displays** (🟡 Medium)
   - **Issue**: HiDPI displays report incorrect mouse positions
   - **Impact**: Click targets missed on 4K/Retina displays
   - **Workaround**: Apply manual scaling factor
   - **Fix ETA**: Next minor release
   - **Tracking**: #SVC-005

### Low Priority

7. **Focus Manager Tab Order** (🟢 Low)
   - **Issue**: Dynamic components break tab order
   - **Impact**: Inconsistent keyboard navigation
   - **Workaround**: Manually set tabIndex
   - **Fix ETA**: v2.0
   - **Tracking**: #SVC-006

8. **Storage Migration Rollback** (🟢 Low)
   - **Issue**: No automatic rollback for failed migrations
   - **Impact**: Manual intervention needed for recovery
   - **Workaround**: Backup before migrations
   - **Fix ETA**: Future release
   - **Tracking**: #SVC-007

## Platform-Specific Issues

### macOS
9. **Terminal.app Color Limitations**
   - **Issue**: macOS Terminal.app doesn't support 24-bit color
   - **Impact**: Degraded color rendering
   - **Workaround**: Use iTerm2 or other modern terminals
   - **Status**: Won't fix (terminal limitation)

### Windows
10. **ConPTY Buffer Issues**
    - **Issue**: Windows ConPTY has buffer size limitations
    - **Impact**: Large renders get truncated
    - **Workaround**: Enable legacy console mode
    - **Status**: Waiting for Windows update

### Linux
11. **Wayland Mouse Events**
    - **Issue**: Mouse events unreliable under Wayland
    - **Impact**: Mouse features don't work properly
    - **Workaround**: Use X11 compatibility mode
    - **Status**: Investigating

## Performance Issues

12. **Renderer CPU Usage** (🟡 Medium)
    - **Issue**: Diff algorithm O(n²) for large changes
    - **Impact**: High CPU usage with full screen updates
    - **Workaround**: Use incremental updates
    - **Fix ETA**: v2.0 (new algorithm)

13. **Storage Query Performance** (🟢 Low)
    - **Issue**: No query optimization for complex filters
    - **Impact**: Slow queries on large datasets
    - **Workaround**: Use simple queries with post-filtering
    - **Fix ETA**: Future release

## Integration Issues

14. **Service Event Order**
    - **Issue**: Service initialization events can arrive out of order
    - **Impact**: Race conditions during startup
    - **Workaround**: Add explicit delays
    - **Fix ETA**: Next minor release

15. **Mock Service Type Inference**
    - **Issue**: TypeScript cannot infer mock service types
    - **Impact**: Manual type annotations needed in tests
    - **Workaround**: Use explicit type parameters
    - **Fix ETA**: Ongoing improvements

## Fixed Recently

- ~~Terminal resize events lost during rapid resizing~~ (Fixed in v1.5.0)
- ~~Input service crashes with invalid UTF-8~~ (Fixed in v1.4.8)
- ~~Storage corruption with concurrent writes~~ (Fixed in v1.4.5)
- ~~Renderer memory leak with large views~~ (Fixed in v1.4.0)

## Reporting Issues

To report service issues:
1. Check this list first
2. Include service configuration
3. Provide minimal reproduction
4. Note platform and terminal
5. Include Effect and Bun versions

## Severity Levels

- 🔴 **Critical**: Data loss, crashes, or major functionality broken
- 🟡 **Medium**: Workaround available but impacts normal usage
- 🟢 **Low**: Minor issue or edge case

## Workaround Collection

Common workarounds for service issues:

```typescript
// Workaround for key repeat detection
const debouncedKeys = keyStream.pipe(
  Stream.debounce(50),
  Stream.distinctUntilChanged()
)

// Workaround for HiDPI mouse coordinates
const scaledMouse = mouseEvent.pipe(
  map(event => ({
    ...event,
    x: Math.floor(event.x / window.devicePixelRatio),
    y: Math.floor(event.y / window.devicePixelRatio)
  }))
)

// Workaround for transaction deadlocks
const flattened = Effect.gen(function* (_) {
  const data = yield* _(storage.get('data'))
  const processed = processData(data)
  yield* _(storage.set('data', processed))
})
```