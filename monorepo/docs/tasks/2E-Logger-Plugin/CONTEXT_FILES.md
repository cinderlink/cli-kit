# Task 2E: Logger Plugin - Context Files

## **📚 ESSENTIAL READING**

### **Task Dependencies**
- `/monorepo/docs/tasks/1C-Core-Plugin-System/CHANGES.md` - Plugin system foundation
- `/packages/plugins/src/base/index.ts` - BasePlugin interface
- `/packages/core/src/plugin/index.ts` - Plugin lifecycle and events

### **Kitchen Sink Demo**
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/src/plugins/logger.ts` - Example plugin usage
- `/monorepo/docs/audit/solutions/kitchen-sink-demo/README.md` - Overall demo requirements

### **Related Tasks**
- `/monorepo/docs/tasks/2B-LogViewer-Component/TASK_OVERVIEW.md` - Primary consumer of log data
- `/monorepo/docs/tasks/1F-Component-Base-System/CHANGES.md` - Component integration patterns

### **Technical References**
- `/packages/core/src/index.ts` - Effect.js exports and Stream types
- `/packages/plugins/src/index.ts` - Plugin system APIs
- `/packages/core/src/errors.ts` - Error handling patterns

### **Workflow & Guidelines**
- `/monorepo/docs/orchestration/WORKFLOW_V2.md` - Development workflow
- `/monorepo/docs/process/DEVELOPER_GUIDELINES_V2.md` - Coding standards

---

## **💡 KEY PATTERNS TO FOLLOW**

### **From Plugin System (Task 1C)**
```typescript
export abstract class BasePlugin {
  constructor(protected metadata: PluginMetadata) {}
  
  abstract initialize(): Promise<void>
  abstract destroy(): Promise<void>
  abstract getAPI(): unknown
}
```

### **From Kitchen Sink Demo**
```typescript
// Plugin registration
app.registerPlugin(new LoggerPlugin({
  level: 'info',
  outputs: ['console', 'file', 'stream'],
  format: 'json'
}))

// Plugin usage
const logger = app.getPlugin('logger')
logger.info('User action completed', { userId: 123 })
```

### **From Effect.js Patterns**
```typescript
// Stream-based log distribution
const logStream = Stream.async<LogEntry>(emit => {
  const handler = (entry: LogEntry) => emit.single(entry)
  this.logEmitter.on('log', handler)
  
  return Effect.sync(() => {
    this.logEmitter.off('log', handler)
  })
})
```

---

## **⚠️ IMPORTANT NOTES**

1. **Location**: Work in `/packages/plugins/src/core/`
2. **Dependencies**: Import from `@tuix/*` packages, not relative paths
3. **Testing**: Place tests in `__tests__/` subdirectory
4. **Documentation**: Update CHANGES.md in task folder continuously
5. **Performance**: Logging must be fast (<1ms per log)
6. **Reliability**: Logging failures should never crash the application
7. **Integration**: Provide log streams to Task 2B (LogViewer Component)
8. **Structured Data**: Design logs for searchability and analysis

Remember: The logger is critical infrastructure - prioritize reliability and performance!