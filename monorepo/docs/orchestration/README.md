# TUIX Monorepo Orchestration System

## **Mission**: Transform TUIX from Prototype to Production-Ready Framework

### **Context Files - READ THESE FIRST**
- `/docs/audit/solutions/LIVING.md` - Complete solution plan with 38 tasks
- `/docs/audit/solutions/kitchen-sink-demo/` - Perfect API examples
- `/docs/audit/opinions/` - Audit findings we're addressing
- `/README.md` - Current TUIX framework understanding

---

## **How This System Works**

### **Developer Workflow**
1. **Pick a Task**: Check `docs/tasks/TASK_TRACKER.md` for available tasks
2. **Mark In Progress**: Update your task status to `in_progress`
3. **Read Context**: Study the subtask documentation I've created for you
4. **Do the Work**: Implement according to specifications
5. **Document Changes**: Update your task document with what you did
6. **Request Review**: Mark task as `review_requested`

### **Claude's Orchestration Role**
1. **Start Round**: Create detailed subtask docs with ALL context needed
2. **Monitor Progress**: Review developer updates and provide feedback
3. **Quality Assurance**: Test/lint/check all changes for compliance
4. **Task Completion**: Remove subtask docs, update tracker, learn from work
5. **Phase Evolution**: Update future tasks based on learnings
6. **Round End**: Provide process reminder and next task instructions

---

## **Communication Protocol**

### **For Developers**
- **Task Documents**: `docs/tasks/[PHASE]-[TASK_ID]/`
- **Changes Log**: Always document what you changed in `CHANGES.md`
- **Questions**: Add to `QUESTIONS.md` in your task folder
- **Code Context**: Reference file paths with line numbers (e.g., `src/core/runtime.ts:45`)

### **For Claude**
- **Review Notes**: Added to developer's task folder as `REVIEW.md`
- **Follow-up Tasks**: Listed in `FOLLOWUP.md` if needed
- **Quality Checks**: Document test results in `QA.md`

---

## **File Organization**

```
monorepo/
├── docs/
│   ├── orchestration/          # Process documentation
│   ├── tasks/                  # Active task work
│   │   └── [PHASE]-[TASK]/     # Individual task folders
│   ├── completed/              # Completed task archives
│   └── process/                # Workflow documentation
├── packages/                   # Monorepo packages (@tuix/*)
└── apps/                      # Example applications
```

---

## **Quality Standards**

### **Code Requirements**
- **NO `any` types** - Use proper TypeScript
- **100% test coverage** for new code
- **Follow kitchen-sink demo patterns** exactly
- **Effect.ts integration** throughout
- **Bun-first** tooling and patterns

### **Documentation Requirements**
- **JSDoc comments** for all exports
- **Usage examples** for complex functions
- **File path references** with line numbers
- **Update existing docs** when changing behavior

---

## **Phase Structure**

### **Phase 1: Foundation** (13 developers)
- Core type system and monorepo structure
- Plugin architecture foundation
- JSX runtime refactoring
- Base reactivity system

### **Phase 2: Enhancement** (15 developers)  
- Stream-first architecture
- Advanced component system
- Production tooling
- Performance optimization

### **Phase 3: Production** (10 developers)
- Real-world validation
- Community tooling
- Documentation completion
- Deployment systems

---

## **Success Criteria**
- **Test Coverage**: 3% → 90%
- **Type Safety**: 75% → 98%
- **Performance**: 60% → 85%
- **Production Ready**: Passes all quality gates

---

**Next**: Read `TASK_TRACKER.md` to see available tasks
**Remember**: Always follow kitchen-sink demo patterns for consistency