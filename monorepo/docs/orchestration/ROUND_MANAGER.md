# TUIX Round-Based Development Orchestration

## **🎯 Mission Statement**
Transform TUIX from prototype to production-ready framework using orchestrated parallel development across 25 developers (5 teams of 5) in 3 phases, maintaining perfect API consistency and quality standards.

---

## **👥 ROLES AND RESPONSIBILITIES**

### **🎯 Claude (Process Manager)**
- **Role**: Orchestrate parallel development across 5 teams
- **Responsibilities**:
  - Create detailed task documents for individual developers
  - Monitor progress and provide guidance through task documents
  - Verify completed work and provide feedback
  - Update documentation and prepare next round
  - Maintain API compliance with kitchen-sink demo patterns

### **👨‍💻 Developer Teams (5 teams of 5 developers each)**
- **Role**: Execute assigned tasks following specifications
- **Responsibilities**:
  - Acknowledge rules and process at task start
  - Follow task specifications exactly
  - Document changes and questions in task documents
  - Communicate status updates through Drew
  - Confirm completion and provide progress summary

### **📋 Drew (Communication Hub)**
- **Role**: Relay messages between Claude and developers
- **Responsibilities**:
  - Distribute task documents to developers
  - Relay short status messages between parties
  - Coordinate longer discussions through task documents
  - Manage developer assignments and availability

---

## **📋 Round Process (Repeat Each Round)**

### **🚀 ROUND START: Claude's Process Management**
1. **Process Acknowledgment**: State rules, role, and progress
2. **Context Reset**: Re-read kitchen-sink-demo patterns and LIVING.md plan
3. **Task Selection**: Select next 5 available tasks (one per team)
4. **Task Document Creation**: Create complete task specifications
   - **TASK_OVERVIEW.md**: Rules, process, and requirements
   - **SUBTASK_SPECS.md**: Detailed technical specifications
   - **CONTEXT_FILES.md**: Exact files to read with line numbers
   - **CHANGES.md**: Template for developer progress tracking
   - **QUESTIONS.md**: Template for developer questions
5. **Task Assignment**: Provide Drew with task list and locations
6. **Quality Gate Setup**: Define success criteria and review process

### **🔄 ROUND DURING: Monitoring & Support**
1. **Progress Tracking**: Monitor task status updates through Drew
2. **Question Response**: Answer developer questions in their QUESTIONS.md files
3. **Guidance Provision**: Provide clarification and direction through task documents
4. **Issue Resolution**: Help developers overcome blockers via task document updates
5. **Status Communication**: Receive and process developer updates through Drew

### **✅ ROUND END: Quality Assurance & Completion**
1. **Work Verification**: Thoroughly examine all changes in developer CHANGES.md files
2. **Quality Verification**: Run tests, lint, type checking, performance checks
3. **Integration Testing**: Ensure changes work with existing codebase
4. **Feedback Provision**: Document review results and required changes
5. **Task Correction**: Work with developers to address any issues
6. **Documentation Update**: Update all related docs and checklists
7. **Process Summary**: State progress and prepare for next round
8. **Next Round Preparation**: Create task list for next 5 tasks

---

## **🎯 Target Reminders (Never Forget)**

### **Perfect API Reference**
- **Kitchen-Sink Demo**: `/docs/audit/solutions/kitchen-sink-demo/` is our north star
- **API Patterns**: Every implementation must match demo patterns exactly
- **Developer Experience**: Must enable the clean, intuitive patterns shown
- **Architecture Consistency**: Maintain plugin system, reactivity, Effect integration

### **Quality Standards (Non-Negotiable)**
- **TypeScript**: 100% typed, no `any`, proper inference
- **Test Coverage**: >90% with fast execution (<10ms per test)
- **Effect.ts**: Functional patterns throughout, proper error channels
- **Performance**: Terminal UI must be responsive and efficient
- **Documentation**: JSDoc comments, usage examples, integration notes

### **Production Readiness Goals**
- **Test Coverage**: 3% → 90% (current audit finding)
- **Type Safety**: 75% → 98% (eliminate `any` types)
- **Performance**: 60% → 85% (responsive terminal UIs)
- **Architecture**: Plugin system, monorepo, stream-first design

---

## **🔄 Communication Protocol**

### **Developer → Claude**
- **Task Updates**: Update status in TASK_TRACKER.md
- **Questions**: Add to QUESTIONS.md with file references
- **Changes**: Document in CHANGES.md with specific file paths
- **Review Requests**: Mark task as `review_requested`

### **Claude → Developer**
- **Task Specifications**: Complete SUBTASK_SPECS.md with requirements
- **Context Files**: Detailed CONTEXT_FILES.md with reading order
- **Review Feedback**: REVIEW.md with specific improvement requests
- **Quality Assessment**: QA.md with test results and compliance check

---

## **⚠️ Critical Success Factors**

### **Prevent Common Failures**
- **Code Duplication**: Reuse patterns, don't recreate
- **Breaking Changes**: Maintain backward compatibility
- **Type Workarounds**: Fix types properly, don't cast around problems
- **Test Gaps**: Every feature needs comprehensive testing
- **Documentation Drift**: Keep all docs synchronized with code

### **Ensure Consistent Quality**
- **Kitchen-Sink Adherence**: Every pattern must match the demo exactly
- **Effect Integration**: All async operations use Effect.ts patterns
- **Plugin Architecture**: Maintain clean plugin boundaries
- **Performance Standards**: Meet or exceed benchmarks
- **Integration Testing**: Verify cross-component functionality

---

## **📊 Success Metrics (Track Each Round)**

### **Code Quality**
- ✅ TypeScript compliance (no `any` types)
- ✅ Test coverage >90%
- ✅ Performance benchmarks met
- ✅ Effect.ts patterns used correctly

### **Architecture Integrity**
- ✅ Plugin system boundaries maintained
- ✅ Monorepo structure followed
- ✅ Kitchen-sink patterns implemented exactly
- ✅ Service integration working

### **Documentation Quality**
- ✅ JSDoc comments complete
- ✅ Usage examples provided
- ✅ Integration notes accurate
- ✅ Existing docs updated

---

## **🎯 Phase Management**

### **Current Phase**: Phase 1 Foundation (13 tasks)
**Focus**: Core type system, monorepo structure, plugin architecture, JSX refactoring

### **Available Tasks** (Priority Order)
1. **Task 1A**: Core Type System Tests (ready for assignment)
2. **Task 1B**: Monorepo Structure Migration
3. **Task 1C**: Core Plugin System
4. **Task 1D**: JSX Runtime Refactoring
5. **Task 1E**: Reactive System Foundation
6. **Task 1F**: Component Base System
7. **Task 1G**: Service Integration Testing
8. **Task 1H**: Layout System Foundation
9. **Task 1I**: Styling System Core
10. **Task 1J**: Testing Infrastructure
11. **Task 1K**: CLI Integration Framework
12. **Task 1L**: Documentation Foundation
13. **Task 1M**: Build System & Quality Gates

---

## **🔄 End-of-Round Checklist**

### **Before Moving to Next Round**
- [ ] All quality gates passed
- [ ] Integration testing complete
- [ ] Documentation updated
- [ ] Task archived properly
- [ ] Lessons learned integrated
- [ ] Next task prepared

### **Round Completion Message**
```
Round completed successfully. Task [ID] delivered [outcome]. 
Quality metrics: [coverage]% tests, [performance] performance, [compliance] standards.
Next round: Task [next_id] ready for assignment.
Developer message: "[one_line_instruction]"
```

---

**Remember**: Every round must maintain the perfect API patterns from kitchen-sink-demo while building toward production-ready framework excellence.