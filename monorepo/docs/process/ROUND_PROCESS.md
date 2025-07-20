# Round-Based Development Process

## **Claude's Role Each Round**

### **🚀 Round Start Process**
1. **Context Reminder**: Re-read perfect API examples in kitchen-sink-demo/
2. **Task Selection**: Choose next available task from TASK_TRACKER.md
3. **Detailed Documentation**: Create comprehensive subtask docs with:
   - **File Context**: What files to read and understand first
   - **Dependencies**: What other code/tasks this connects to  
   - **Specifications**: Exact requirements and patterns to follow
   - **Quality Gates**: How success will be measured
   - **Examples**: Code snippets showing expected patterns

### **📋 During Round Process**  
1. **Monitor Progress**: Check developer updates and questions
2. **Provide Feedback**: Answer questions and provide guidance
3. **Code Review**: When developer requests review, thoroughly check:
   - **Code Quality**: No `any` types, proper TypeScript
   - **Pattern Compliance**: Follows kitchen-sink demo exactly
   - **Test Coverage**: Comprehensive tests included
   - **Documentation**: JSDoc comments and examples
   - **Integration**: Works with existing code

### **✅ Round Completion Process**
1. **Final Quality Check**: Run tests, lint, type check
2. **Integration Testing**: Ensure changes work with whole system
3. **Documentation Update**: Update any affected docs
4. **Task Cleanup**: Remove subtask docs, update tracker
5. **Learning Integration**: Update future tasks based on insights
6. **Archive Work**: Move completed docs to completed/ folder

---

## **Developer Responsibilities Each Round**

### **📝 Task Pickup**
- Read ALL context files listed in subtask documentation
- Understand how this task connects to overall architecture
- Study kitchen-sink-demo patterns relevant to the task
- Mark task as `in_progress` in TASK_TRACKER.md

### **🔧 Development Work**
- Follow specifications exactly as documented
- Use kitchen-sink-demo patterns as reference
- No `any` types - use proper TypeScript throughout
- Include comprehensive tests with >90% coverage
- Add JSDoc comments for all exports

### **📤 Work Submission**
- Document all changes in task folder CHANGES.md
- Include any questions or concerns in QUESTIONS.md
- Reference specific files and line numbers
- Mark task as `review_requested` in tracker

---

## **File Context Requirements**

### **Always Reference These Context Files**
- `/docs/audit/solutions/LIVING.md` - Master plan
- `/docs/audit/solutions/kitchen-sink-demo/` - Perfect API patterns
- `/docs/audit/opinions/` - Problems we're solving
- `/README.md` - Current framework state
- `/CLAUDE.md` - Bun tooling preferences

### **For Each Task, Also Study**
- Related source files in current codebase
- Test files that already exist
- Documentation that needs updating
- Dependencies and integration points

---

## **Quality Standards (Non-Negotiable)**

### **Code Standards**
- **TypeScript**: 100% typed, no `any`, proper inference
- **Testing**: >90% coverage, fast tests (<10ms each)
- **Documentation**: JSDoc for exports, usage examples
- **Performance**: Benchmarked against existing code
- **Effect.ts**: Functional patterns throughout

### **Architecture Standards**  
- **Kitchen-sink patterns**: Exactly match demo structure
- **Package boundaries**: Respect monorepo separation
- **Plugin architecture**: Follow established interfaces
- **Error handling**: Use Effect error channels
- **Reactivity**: Svelte 5 rune patterns

### **Process Standards**
- **Communication**: Clear, specific, with file references
- **Documentation**: Update existing docs when changing behavior
- **Integration**: Test with existing functionality
- **Learning**: Feed insights back to future tasks

---

## **Orchestration Reminders**

### **Keep Focus On**
- **Perfect API Examples**: Kitchen-sink-demo is our north star
- **Production Quality**: This is shipping to real users
- **Architecture Integrity**: Don't break established patterns
- **Developer Experience**: Make it easy and intuitive
- **Performance**: Terminal UIs must be fast

### **Prevent Common Issues**
- **Code Duplication**: Reuse patterns, don't reinvent
- **Breaking Changes**: Maintain backward compatibility
- **Documentation Drift**: Keep docs synchronized
- **Test Gaps**: Every feature needs comprehensive tests
- **Type Workarounds**: Fix types properly, don't cast

---

## **Success Metrics Each Round**
- **Code Quality**: All quality gates pass
- **Integration**: Works seamlessly with existing code  
- **Documentation**: Complete and accurate
- **Performance**: Meets or exceeds benchmarks
- **Learning**: Insights fed forward to improve future tasks

---

**This process repeats each round to ensure consistency, quality, and continuous learning integration.**