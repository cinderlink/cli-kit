# Required Fixes for LogViewer Component (Task 2B)

## Critical Issues to Address

### 1. Fix Broken Test Suite ⚠️ HIGHEST PRIORITY

**Current State:** Tests completely broken and non-functional
**Required Actions:**

#### A. Replace Invalid Testing Infrastructure
```typescript
// ❌ REMOVE: Non-existent import
import { testComponent } from "@tuix/testing"

// ✅ REPLACE WITH: Proper TUIX testing approach
import { Effect } from "effect"
import { init, update, view } from "../log-viewer"
```

#### B. Fix Test Implementation Patterns
The current tests use imperative API calls that don't exist:
```typescript
// ❌ BROKEN: These methods don't exist
viewer.search('query')
viewer.toggleLevel('info')  
viewer.setState(...)
viewer.getState()
viewer.appendLogs(...)

// ✅ REPLACE WITH: Proper MVU testing
const [model, cmds] = Effect.runSync(init({ logs: testLogs }))
const [newModel, newCmds] = Effect.runSync(update({ type: 'search', query: 'user' }, model))
```

#### C. Undefined Variables
Fix references to undefined `viewer` variable throughout test file.

### 2. Fix TypeScript Compilation Errors

**Current Errors:**
- Missing module imports (`@tuix/core`, `@tuix/styling`, `@tuix/testing`)
- Type incompatibilities in Effect usage
- Missing LogLevel type import

**Required Actions:**
- Replace missing module imports with actual local imports
- Fix Effect type signatures to match actual API
- Add proper type imports from local type files

### 3. Remove False Documentation Claims

**Current Issues:**
- Tests claim performance metrics without actual benchmarks
- Tests skip performance tests but claim they exist
- Documentation suggests test coverage that doesn't exist

**Required Actions:**
- Remove or properly implement performance benchmark tests
- Update documentation to reflect actual test coverage
- Remove misleading claims about test completeness

### 4. Implement Proper TUIX MVU Testing

**Replace Current Approach:**
```typescript
// ❌ Current broken approach
function createTestLogViewer(logs: LogEntry[] = []) {
  const component = logViewer({ logs })
  return testComponent(component)
}

// ✅ Required MVU approach  
function testLogViewerInit(props: LogViewerProps) {
  return Effect.runSync(init(props))
}

function testLogViewerUpdate(msg: LogViewerMsg, model: LogViewerModel) {
  return Effect.runSync(update(msg, model))
}
```

## Specific Test Failures to Fix

### Test File: `src/display/__tests__/log-viewer.test.ts`

1. **Lines 15, 62-64**: Fix missing testComponent import and usage
2. **Lines 217-494**: Replace all `viewer.` API calls with proper MVU testing
3. **Lines 422-424, 466, 469**: Add proper LogLevel type import
4. **Lines 205, 506**: Fix Effect type signature mismatches

## Implementation Standards

### Testing Requirements
- ✅ Use Effect.runSync for deterministic testing
- ✅ Test init/update/view functions directly
- ✅ Verify model state changes explicitly
- ❌ No imperative component API calls
- ❌ No undefined variables or imports

### TypeScript Standards
- ✅ All imports must resolve to actual files
- ✅ All types must be properly imported
- ✅ Effect signatures must match actual implementation
- ❌ No `any` types or loose type assertions

### Performance Claims
- ✅ Only document actual measured performance
- ✅ Implement performance tests if claiming metrics
- ❌ No false performance/coverage claims

## Success Criteria

### Required Before Resubmission:
1. `bun test src/display/__tests__/log-viewer.test.ts` passes completely
2. `bun tsc --noEmit src/display/__tests__/log-viewer.test.ts` passes without errors
3. All tests use proper TUIX MVU patterns
4. No false documentation claims

### Validation Commands:
```bash
# Must pass:
bun test src/display/__tests__/log-viewer.test.ts
bun tsc --noEmit src/display/__tests__/log-viewer.test.ts

# Optional but recommended:
bun test src/display/
```

---
**Note:** The core LogViewer implementation is architecturally sound. These fixes focus solely on making the test suite functional and truthful.