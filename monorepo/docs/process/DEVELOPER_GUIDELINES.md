# Developer Guidelines

## **How to Work with Claude Orchestration**

### **📋 Before Starting Any Task**

1. **Read Context Files** (in this order):
   ```
   /docs/orchestration/README.md           # System overview
   /docs/audit/solutions/LIVING.md         # Master plan  
   /docs/audit/solutions/kitchen-sink-demo/ # Perfect API examples
   /docs/audit/opinions/                   # Problems we're solving
   /README.md                              # Current framework state
   ```

2. **Study Your Task Context**:
   - Read the detailed subtask documentation Claude creates
   - Understand file dependencies and integration points
   - Review kitchen-sink-demo patterns for your feature area
   - Check existing code you'll be modifying

3. **Mark Task Progress**:
   ```markdown
   # In docs/tasks/TASK_TRACKER.md
   - **Status**: `in_progress`
   - **Developer**: `your_name`
   ```

---

## **📁 Task Folder Structure**

When you pick up a task, Claude will create:

```
docs/tasks/[PHASE]-[TASK_ID]/
├── SUBTASK_SPECS.md        # Detailed requirements (Claude creates)
├── CONTEXT_FILES.md        # Files to read first (Claude creates)  
├── CHANGES.md              # Your work log (you maintain)
├── QUESTIONS.md            # Questions for Claude (you maintain)
└── REVIEW.md               # Claude's feedback (Claude creates)
```

---

## **🔧 Development Process**

### **1. Understand Requirements**
- Read `SUBTASK_SPECS.md` completely
- Study all files listed in `CONTEXT_FILES.md`
- Look at kitchen-sink-demo patterns for reference
- Understand how your work integrates with existing code

### **2. Plan Your Approach**
- Document your approach in `CHANGES.md`
- List files you plan to modify
- Note any concerns or questions in `QUESTIONS.md`
- Consider test strategy and documentation updates

### **3. Implement Changes**
- Follow kitchen-sink-demo patterns exactly
- Use proper TypeScript (no `any` types)
- Include comprehensive tests (>90% coverage)
- Add JSDoc comments for all exports
- Update existing documentation as needed

### **4. Document Your Work**
```markdown
# In CHANGES.md
## Changes Made

### Files Modified
- `src/core/runtime.ts:45-67` - Added plugin loading logic
- `packages/core/src/types/plugin.ts` - New plugin interface
- `packages/core/tests/plugin.test.ts` - Comprehensive test suite

### Key Decisions
- Used WeakMap for plugin registry to prevent memory leaks
- Followed kitchen-sink-demo plugin patterns exactly
- Integrated with Effect.ts for error handling

### Testing
- 95% test coverage achieved
- All tests pass in <5ms
- Integration tests with existing components

### Documentation Updated
- Added JSDoc comments to all new exports
- Updated README.md plugin section
- Added usage examples
```

### **5. Request Review**
- Update task status: `review_requested`
- Ensure `CHANGES.md` is complete
- Any questions in `QUESTIONS.md`

---

## **💬 Communication with Claude**

### **File References** (Required Format)
Always include exact file paths and line numbers:
```markdown
- `src/core/runtime.ts:45` - specific line
- `src/core/runtime.ts:45-67` - line range  
- `packages/jsx/src/runtime/` - directory
```

### **Questions Format**
```markdown
# In QUESTIONS.md

## Question 1: Plugin Interface Design
**Context**: Working on `packages/core/src/plugins/types.ts:23`
**Issue**: Should plugin hooks be sync or async?
**Kitchen-sink reference**: See `kitchen-sink-demo/src/plugins/kitchen-sink.tsx:15`
**Specific concern**: Performance impact on terminal rendering
```

### **Changes Format**
```markdown
# In CHANGES.md

## Subtask 1C.1: Plugin Interface Design
**Status**: Completed
**Files**: packages/core/src/plugins/types.ts
**Implementation**: 
- Created Plugin interface with lifecycle hooks
- Used Effect.ts for error handling
- Followed kitchen-sink patterns exactly
**Tests**: 98% coverage, all pass
**Integration**: Works with existing component system
```

---

## **🎯 Quality Requirements**

### **Code Quality (Non-Negotiable)**
- ❌ **NO `any` types** - Use proper TypeScript
- ✅ **>90% test coverage** - Include edge cases
- ✅ **JSDoc comments** - All exports documented
- ✅ **Kitchen-sink patterns** - Follow exactly
- ✅ **Effect.ts integration** - Use throughout

### **Testing Requirements**
- **Unit tests**: Individual functions and classes
- **Integration tests**: Cross-component functionality  
- **Performance tests**: Meet benchmarks
- **Error tests**: Handle edge cases gracefully
- **Fast execution**: <10ms per test

### **Documentation Requirements**
- **JSDoc**: Function descriptions, parameters, returns
- **Usage examples**: Show common patterns
- **File updates**: Keep existing docs in sync
- **Integration notes**: How it connects to other code

---

## **🚨 Common Mistakes to Avoid**

### **❌ Don't Do This**
- Create duplicate functionality
- Use `any` types or excessive casting
- Skip tests or documentation
- Ignore kitchen-sink patterns
- Break existing functionality

### **✅ Do This Instead**
- Reuse existing patterns and utilities
- Use proper TypeScript with inference
- Write comprehensive tests first
- Study kitchen-sink demo for patterns
- Test integration with existing code

---

## **🔄 Review Process**

### **What Claude Will Check**
1. **Code Quality**: TypeScript, patterns, performance
2. **Test Coverage**: Comprehensive, fast, reliable
3. **Documentation**: Complete, accurate, examples
4. **Integration**: Works with existing systems
5. **Standards**: Follows established patterns

### **Possible Outcomes**
- **✅ Approved**: Task complete, moved to completed/
- **🔄 Feedback**: Specific improvements needed
- **❌ Blocked**: Depends on other tasks

### **After Review**
- Address feedback in same task folder
- Update `CHANGES.md` with fixes
- Request re-review when ready

---

## **📚 Reference Materials**

### **Always Available**
- Kitchen-sink demo: `/docs/audit/solutions/kitchen-sink-demo/`
- Task specifications: Your task folder `SUBTASK_SPECS.md`  
- Context files: Your task folder `CONTEXT_FILES.md`
- Quality standards: `/docs/process/ROUND_PROCESS.md`

### **For Specific Areas**
- **Plugin system**: Study existing `src/cli/plugin.ts`
- **Reactivity**: Check `src/reactivity/runes.ts`
- **Components**: Review `src/components/base.ts`
- **Testing**: Look at `src/testing/test-utils.ts`

---

**Remember**: The kitchen-sink demo is our north star. When in doubt, follow its patterns exactly.