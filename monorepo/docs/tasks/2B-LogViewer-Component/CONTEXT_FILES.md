# Task 2B: LogViewer Component - Context Files

## **📚 ESSENTIAL READING**

### **Current Implementation Files** ✅
- `/packages/components/src/display/log-viewer.ts` - Main component (TUIX MVU pattern)
- `/packages/components/src/display/log-stream.ts` - Stream management
- `/packages/components/src/display/log-analysis.ts` - Analysis capabilities
- `/packages/components/src/display/log-syntax.ts` - Syntax highlighting
- `/packages/components/src/display/types.ts` - Type definitions
- `/packages/components/src/display/__tests__/log-viewer.test.ts` - Tests (needs API update)

### **TUIX Core References**
- `/src/core/types.ts` - UIComponent, View, Cmd types
- `/src/testing/test-utils.ts` - testComponent utility for testing
- `/src/services/index.ts` - AppServices interface
- `/src/styling/index.ts` - Style system

### **Component Architecture**
- `/packages/components/src/base.ts` - Component base types (UIComponent pattern)
- Follows TUIX MVU (Model-View-Update) architecture, NOT class-based

### **Workflow & Guidelines**
- `/monorepo/docs/orchestration/WORKFLOW_V2.md` - Development workflow
- `/monorepo/docs/process/DEVELOPER_GUIDELINES_V2.md` - Coding standards

---

## **💡 KEY PATTERNS TO FOLLOW**

### **TUIX MVU Component Pattern (ACTUAL IMPLEMENTATION)**
```typescript
export interface LogViewerModel {
  readonly logs: ReadonlyArray<LogEntry>
  readonly viewport: Viewport
  readonly searchQuery: string
  readonly followMode: boolean
  // ... other state
}

export type LogViewerMsg =
  | { readonly _tag: 'scroll'; readonly offset: number }
  | { readonly _tag: 'search'; readonly query: string }
  | { readonly _tag: 'appendLogs'; readonly logs: ReadonlyArray<LogEntry> }
  // ... other messages

export function logViewer(props: LogViewerProps = {}): UIComponent<LogViewerModel, LogViewerMsg> {
  return {
    init: () => init(props),
    update,
    view
  }
}
```

### **Testing Pattern (NEEDS IMPLEMENTATION)**
```typescript
import { testComponent } from "@tuix/testing"

const tester = testComponent(logViewer({ logs: testLogs }))
const [model, _] = await tester.testInit()
const [updatedModel, _] = await tester.testUpdate(
  { _tag: 'search', query: 'error' },
  model
)
```

### **Virtual Scrolling (IMPLEMENTED)**
```typescript
// From actual implementation
const visibleLines = pipe(
  model.logs,
  ReadonlyArray.slice(model.viewport.visibleStart, model.viewport.visibleEnd),
  ReadonlyArray.map((log, idx) => renderLogLine(log, idx + model.viewport.visibleStart, model))
)
```

---

## **⚠️ IMPORTANT NOTES**

1. **Location**: ✅ Component implemented in `/packages/components/src/display/`
2. **Dependencies**: ✅ All imports use `@tuix/*` packages
3. **Testing**: ⚠️ Tests exist but need API update to functional pattern
4. **Architecture**: ✅ Uses TUIX MVU pattern, NOT class-based components
5. **Status**: Component is 100% functional, only tests need updating

### **What's Left To Do**
- Update test file to use `testComponent` utility
- Replace all class-based test expectations with functional patterns
- Remove `.getState()`, `.cleanup()` and other class method calls
- Test the MVU update cycle properly

Remember: The component works perfectly - only the tests are outdated!