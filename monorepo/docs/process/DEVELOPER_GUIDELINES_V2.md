# Developer Guidelines V2 - Enhanced with Phase 1 Learnings

## **📋 CRITICAL REMINDERS**

### **🚨 LOCATION, LOCATION, LOCATION**
- **CODE goes in**: `/packages/*` - This is the ACTUAL monorepo
- **DOCS go in**: `/monorepo/docs/tasks/*` - This is task tracking only
- **NEVER**: Create packages in /monorepo/packages/ - that's documentation

---

## **🎯 DEVELOPER WORKFLOW**

### **1. Starting Your Task**
```bash
# 1. Read your task documentation
cat monorepo/docs/tasks/[YOUR-TASK]/TASK_OVERVIEW.md
cat monorepo/docs/tasks/[YOUR-TASK]/SUBTASK_SPECS.md

# 2. Update task status
# Edit monorepo/docs/tasks/TASK_TRACKER.md
# Change your task to: in_progress

# 3. Work in the RIGHT location
cd packages/[your-package]/
```

### **2. During Development**

#### **Update Documentation Continuously**
```markdown
# In monorepo/docs/tasks/[YOUR-TASK]/CHANGES.md

## **Update [Date]**
**What I did**: 
- Created X functionality
- Fixed Y issue
- Integrated with Z

**Current Status**: 3/5 subtasks complete
**Blockers**: None
```

#### **Test As You Build**
```bash
# After each feature
bun test

# Check TypeScript continuously  
bun run typecheck

# Never accumulate errors!
```

#### **Coordinate Early**
If you need something from another task:
1. Check their CHANGES.md for status
2. Post in your CHANGES.md what you need
3. Tag the orchestrator if blocked

---

## **✅ CODE QUALITY STANDARDS**

### **TypeScript Discipline**
```typescript
// ❌ NEVER
function processData(data: any): any { }

// ✅ ALWAYS
function processData<T>(data: T): ProcessedData<T> { }
```

### **Effect.ts Patterns**
```typescript
// ✅ Use Effect for async operations
import { Effect } from 'effect'

export const loadData = Effect.gen(function* () {
  const data = yield* fetchData()
  return yield* processData(data)
})
```

### **Testing Standards**
```typescript
// Every feature needs tests
test('feature works correctly', () => {
  // Arrange
  const input = createTestInput()
  
  // Act
  const result = myFeature(input)
  
  // Assert
  expect(result).toMatchExpectedOutput()
})
```

---

## **🤝 COORDINATION BEST PRACTICES**

### **Integration Points**
When your task integrates with others:

```typescript
// 1. Define clear interfaces
export interface YourTaskAPI {
  initialize(): Effect.Effect<void>
  getService(): YourService
  cleanup(): Effect.Effect<void>
}

// 2. Document usage
/**
 * Initialize the system before use:
 * ```
 * const api = await YourTaskAPI.initialize()
 * const service = api.getService()
 * ```
 */
```

### **Communication Protocol**
```markdown
# In your CHANGES.md when you need coordination:

## **🤝 COORDINATION NEEDED WITH TASK XX**

**What I Need**: 
- API for doing Y
- Types for Z functionality

**My Current Interface**:
```typescript
export interface MyAPI {
  // What I'm providing
}
```

**Questions**:
1. How should we handle X?
2. What's your timeline for Y?
```

---

## **📊 PROGRESS TRACKING**

### **Daily Updates**
Even small progress should be documented:
```markdown
## **Update 2025-07-17**
- Fixed TypeScript error in component.ts
- Added test for edge case
- Started integration with Task XX
```

### **Subtask Tracking**
```markdown
### **Subtask 2.1: API Implementation**
**Status**: `completed` ✅
**Started**: 2025-07-17
**Completed**: 2025-07-17

**What Was Done**:
- Implemented core API
- Added comprehensive tests
- Documentation complete
```

---

## **🚀 COMPLETION CHECKLIST**

Before marking `review_requested`:

- [ ] All subtasks complete
- [ ] Tests passing (90%+ coverage)
- [ ] TypeScript compiles cleanly
- [ ] Documentation updated
- [ ] Integration verified
- [ ] CHANGES.md summarizes everything
- [ ] No TODO comments left
- [ ] Examples work

---

## **💡 TIPS FROM PHASE 1**

### **What Successful Developers Did**
1. **Communicated early and often**
2. **Kept documentation updated daily**
3. **Fixed TypeScript errors immediately**
4. **Tested integration points thoroughly**
5. **Asked for clarification when unsure**

### **Common Pitfalls to Avoid**
1. **Working in wrong directory** (monorepo/ vs packages/)
2. **Accumulating TypeScript errors**
3. **Waiting too long to integrate**
4. **Not testing edge cases**
5. **Forgetting to update documentation**

---

## **🎯 REMEMBER**

- **Quality > Speed**: Do it right the first time
- **Communicate > Assume**: Ask if unsure
- **Document > Remember**: Write it down
- **Test > Hope**: Verify everything works
- **Integrate > Isolate**: Work with other tasks

**Your work is building the foundation of TUIX. Make it excellent!** 🚀