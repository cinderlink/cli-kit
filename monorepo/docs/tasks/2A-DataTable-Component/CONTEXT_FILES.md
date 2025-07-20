# Task 2A: DataTable Component - Context Files

## **🔧 FILES REQUIRING IMMEDIATE FIXES**

### **Critical Import Fix Required**
- `/packages/components/src/base.ts` - Line 58 has broken import path
  - Change: `import { Style, style, Colors } from "../../src/styling"`
  - To: `import { Style, style, Colors } from "@tuix/styling"`

### **Interface Compliance Issues**
- `/packages/components/src/interactive/DataTable.ts` - Must implement UIComponent interface correctly
  - Fix `init()` method signature
  - Fix `update()` parameter order
  - Fix `handleMouse()` return type

## **📚 ESSENTIAL READING**

### **Task Dependencies**
- `/monorepo/docs/tasks/1F-Component-Base-System/CHANGES.md` - ReactiveComponent foundation
- `/monorepo/docs/tasks/1E-Reactive-System-Foundation/CHANGES.md` - Reactive state patterns
- `/packages/components/src/base/index.ts` - BaseComponent interface
- `/packages/components/src/reactive/index.ts` - ReactiveComponent implementation

### **Kitchen Sink Demo**
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/src/components/ProcessList.tsx` - Example DataTable usage
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/README.md` - Overall demo requirements

### **Technical References**
- `/packages/core/src/index.ts` - Effect.ts exports and Stream types
- `/packages/reactive/src/index.ts` - $state, $derived, $effect APIs
- `/packages/components/src/index.ts` - Existing component patterns

### **Workflow & Guidelines**
- `/monorepo/docs/orchestration/WORKFLOW_V2.md` - Development workflow
- `/monorepo/docs/process/DEVELOPER_GUIDELINES_V2.md` - Coding standards

---

## **💡 KEY PATTERNS TO FOLLOW**

### **From ReactiveComponent (Task 1F)**
```typescript
export class ReactiveComponent extends BaseComponent {
  protected reactive: ReactiveComponentIntegration
  
  constructor() {
    super()
    this.reactive = ReactiveSystemAPI.createIntegration()
  }
}
```

### **From Kitchen Sink Demo**
```typescript
<DataTable
  data={processes}
  columns={processColumns}
  onRowSelect={handleProcessSelect}
  stream={processUpdates$}
/>
```

### **From Effect.ts Patterns**
```typescript
Effect.gen(function* () {
  const data = yield* fetchData()
  return yield* processData(data)
})
```

---

## **⚠️ IMPORTANT NOTES**

1. **Location**: Work in `/packages/components/src/interactive/`
2. **Dependencies**: Import from `@tuix/*` packages, not relative paths
3. **Testing**: Place tests in `__tests__/` subdirectory
4. **Documentation**: Update CHANGES.md in task folder continuously

Remember: Quality over speed. Virtual scrolling is complex - get it right!