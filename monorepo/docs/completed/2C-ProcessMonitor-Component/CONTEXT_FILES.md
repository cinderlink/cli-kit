# Task 2C: ProcessMonitor Component - Context Files

## **📚 ESSENTIAL READING**

### **Task Dependencies**
- `/monorepo/docs/tasks/1F-Component-Base-System/CHANGES.md` - ReactiveComponent foundation
- `/monorepo/docs/tasks/1E-Reactive-System-Foundation/CHANGES.md` - Reactive state patterns
- `/packages/components/src/base/index.ts` - BaseComponent interface
- `/packages/components/src/reactive/index.ts` - ReactiveComponent implementation

### **Kitchen Sink Demo**
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/src/components/ProcessExplorer.tsx` - Example ProcessMonitor usage
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/README.md` - Overall demo requirements

### **Related Tasks**
- `/monorepo/docs/tasks/2A-DataTable-Component/SUBTASK_SPECS.md` - Table display patterns
- `/monorepo/docs/tasks/2D-Process-Manager-Plugin/TASK_OVERVIEW.md` - Process data source

### **Technical References**
- `/packages/core/src/index.ts` - Effect.js exports and Stream types
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
<ProcessMonitor
  refreshInterval={1000}
  sortBy="cpu"
  filterBy={(process) => process.cpu > 1.0}
  onProcessSelect={(pid) => showProcessDetails(pid)}
  showSystemMetrics={true}
  treeView={true}
/>
```

### **From DataTable (Task 2A)**
```typescript
// Efficient table rendering patterns
const visibleStart = Math.floor(scrollTop / rowHeight)
const visibleEnd = visibleStart + Math.ceil(height / rowHeight)
```

---

## **⚠️ IMPORTANT NOTES**

1. **Location**: Work in `/packages/components/src/system/`
2. **Dependencies**: Import from `@tuix/*` packages, not relative paths
3. **Testing**: Place tests in `__tests__/` subdirectory
4. **Documentation**: Update CHANGES.md in task folder continuously
5. **Coordination**: Share table patterns with Task 2A for consistency
6. **Platform Support**: Design for cross-platform compatibility (macOS, Linux)
7. **Permissions**: Handle process management actions safely

Remember: Process monitoring requires system-level permissions and careful error handling!