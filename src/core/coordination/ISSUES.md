# Coordination Module - Known Issues

## Current Issues

### High Priority

1. **Memory Leak in Event Stream Optimizer** (🔴 Critical)
   - **Issue**: Buffer cleanup not triggered for cancelled streams
   - **Impact**: Memory usage grows over time with high-frequency events
   - **Workaround**: Manually call `optimizer.cleanup()` periodically
   - **Fix ETA**: Next patch release

2. **Workflow Step Timeout Race Condition** (🔴 Critical)
   - **Issue**: Timeout handler can trigger after step completion
   - **Impact**: Duplicate error events and incorrect workflow state
   - **Workaround**: Set conservative timeout values
   - **Fix ETA**: Next patch release

3. **Import Path Issues** (🟡 Medium)
   - **Issue**: Some files still import from old camelCase filenames
   - **Impact**: Build errors in certain configurations
   - **Workaround**: Update imports manually
   - **Fix ETA**: Next release

### Medium Priority

4. **Performance Degradation with Many Event Flows** (🟡 Medium)
   - **Issue**: O(n²) complexity in event flow matching
   - **Impact**: Slow event processing with >100 flows
   - **Workaround**: Use specific event types instead of wildcards
   - **Fix ETA**: v2.0

5. **Error Recovery Strategy Conflicts** (🟡 Medium)
   - **Issue**: Multiple strategies can match same error
   - **Impact**: Unpredictable recovery behavior
   - **Workaround**: Use explicit priority in strategy registration
   - **Fix ETA**: Next minor release

6. **Incomplete TypeScript Types** (🟡 Medium)
   - **Issue**: Generic constraints too loose in some APIs
   - **Impact**: Runtime errors not caught at compile time
   - **Workaround**: Add explicit type annotations
   - **Fix ETA**: Ongoing improvements

### Low Priority

7. **Documentation Gaps** (🟢 Low)
   - **Issue**: Advanced patterns not well documented
   - **Impact**: Developers resort to reading source code
   - **Workaround**: See test files for examples
   - **Fix ETA**: Continuous improvement

8. **Performance Monitor UI Rendering** (🟢 Low)
   - **Issue**: Terminal flicker with rapid updates
   - **Impact**: Visual artifacts in performance dashboard
   - **Workaround**: Reduce update frequency
   - **Fix ETA**: v2.0

## Reported But Not Reproduced

9. **Phantom Workflow Completion Events**
   - **Reports**: 3 users report duplicate completion events
   - **Status**: Cannot reproduce in test environment
   - **Need**: Minimal reproduction case

10. **Integration Pattern Memory Spikes**
    - **Reports**: Memory spikes with process monitoring pattern
    - **Status**: Investigating, possibly related to issue #1
    - **Need**: Memory profiling data

## Feature Requests (Not Bugs)

11. **Workflow Visualization**
    - **Request**: ASCII/Unicode workflow DAG visualization
    - **Status**: Planned for v2.0
    - **Workaround**: Use external tools

12. **Event Flow Debugging**
    - **Request**: Step-through debugger for event flows
    - **Status**: Under consideration
    - **Workaround**: Use extensive logging

## Contributing

To report new issues:
1. Check this list first
2. Provide minimal reproduction code
3. Include Effect and Bun versions
4. Describe expected vs actual behavior

## Issue Labels

- 🔴 **Critical**: Data loss, crashes, or severe degradation
- 🟡 **Medium**: Workaround available but impacts usage
- 🟢 **Low**: Minor inconvenience or cosmetic issue

## Fixed Issues (Last 3 Releases)

- ~~Circuit breaker not resetting~~ (Fixed in v1.2.0)
- ~~Workflow cycles causing stack overflow~~ (Fixed in v1.1.5)
- ~~Event deduplication false positives~~ (Fixed in v1.1.0)