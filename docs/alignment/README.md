# TUIX Development Alignment Guide

## 🎯 Purpose

This is the **single source of truth** for all development standards, processes, and rules for the TUIX framework. All team members and AI assistants must follow these guidelines.

## 📁 Documentation Structure

```
docs/
├── alignment/              # ← You are here - Team alignment documentation
│   ├── README.md          # This file - single source of truth
│   ├── rules/             # Core architectural and coding rules
│   ├── processes/         # Development workflows and procedures  
│   ├── orchestration/     # Complex process coordination guides
│   ├── templates/         # Document templates for consistency
│   ├── checklists/        # Validation and quality checklists
│   └── dependencies/      # Dependency-specific documentation
├── tracking/              # Process tracking and progress documentation
└── [framework-docs]/      # TUIX framework user documentation
```

## ⚡ Quick Start for Team Members

### For Development Work
1. **Read relevant rules** from `rules/` before starting
2. **Follow development process** in `processes/development.md`
3. **Use pre-commit checklist** in `checklists/pre-commit.md`
4. **Track complex work** using `templates/process-tracking.md`

### For Code Reviews
1. **Use code review process** in `processes/code-review.md`
2. **Check against core rules** in `rules/`
3. **Validate dependencies** using `dependencies/` guides

### For AI Assistants
1. **ALWAYS read rules** before making any code changes
2. **Follow exact processes** defined in `processes/`
3. **Use appropriate templates** for tracking work
4. **Validate against checklists** before completing tasks

## 🚨 Critical Rules (MUST READ)

### 1. Single Implementation Principle
**Location**: [rules/single-implementation.md](./rules/single-implementation.md)

**Rule**: Never create multiple versions of the same feature.
- ❌ NO: `-v2`, `-new`, `-old`, `-legacy`, `-simple`, `-enhanced` suffixes
- ❌ NO: Backup files (.bak, .old) in version control  
- ✅ YES: One canonical implementation that evolves

### 2. Type Safety Requirements
**Location**: [rules/type-safety.md](./rules/type-safety.md)

**Rule**: No `any` types, use proper TypeScript typing.
- ❌ NO: `any` types or excessive casting
- ❌ NO: Type workarounds or ignoring TypeScript errors
- ✅ YES: Discriminated unions, type guards, Effect signatures

### 3. Testing Requirements  
**Location**: [rules/testing.md](./rules/testing.md)

**Rule**: Every feature must have comprehensive tests.
- ✅ REQUIRED: Every `.ts` file has `.test.ts` companion
- ✅ REQUIRED: 80% line/function coverage, 70% branch coverage
- ✅ PREFERRED: Component logic testing for UI components

### 4. Technology Stack
**Location**: [dependencies/](./dependencies/)

**Requirements**:
- **Runtime**: Bun (not Node.js) - see [dependencies/bun/](./dependencies/bun/)
- **Async**: Effect.ts patterns - see [dependencies/effect/](./dependencies/effect/)
- **Types**: Strict TypeScript - see [dependencies/typescript/](./dependencies/typescript/)
- **UI**: JSX + Svelte 5 Runes (preferred)

## 🔄 Development Workflows

### Standard Development Process
**Location**: [processes/development.md](./processes/development.md)

**Workflow**:
1. **Plan** → Read docs, create todos, break down work
2. **Implement** → Follow patterns, test as you go, update docs
3. **Validate** → Run tests, type check, clean up

### Code Review Process
**Location**: [processes/code-review.md](./processes/code-review.md)

**Workflow**:
1. **Pre-review** → Self-check against rules and checklists
2. **Review** → Check implementation against standards
3. **Approve** → Validate quality gates are met

### Quality Validation
**Location**: [checklists/pre-commit.md](./checklists/pre-commit.md)

**Required Commands**:
```bash
bun test                # All tests must pass
bun run tsc --noEmit   # No TypeScript errors allowed
```

## 🔍 Audit and Quality Processes

### Comprehensive Audit Process
**Location**: [processes/audit.md](./processes/audit.md)

**Round-Based Methodology**:
1. **Framework Setup** → Create audit structure and standards
2. **Documentation Review** → Verify accuracy and completeness
3. **Code Review** → Check test coverage and documentation
4. **Standards Compliance** → Validate Effect patterns and TypeScript
5. **Cleanup** → Remove redundancies and artifacts
6. **Validation** → Final testing and verification

**Quality Gates**: All tests pass, no TypeScript errors, claims verified

### Documentation Audit Process
**Location**: [processes/documentation-audit.md](./processes/documentation-audit.md)

**Phases**:
1. **Inventory and Assessment** → Catalog all documentation
2. **Claims Verification** → Verify all assertions against code
3. **API Documentation Review** → Ensure complete JSDoc coverage
4. **Example Validation** → Test all code examples
5. **Structure and Navigation** → Optimize organization
6. **Redundancy Elimination** → Remove duplicate content

## 🎛️ Large-Scale Orchestration

### Refactor Orchestration Process
**Location**: [orchestration/refactor-orchestration.md](./orchestration/refactor-orchestration.md)

**Core Principles**:
- **Phase-Based Architecture** → Manageable phases with clear dependencies
- **Event-Driven Decoupling** → Replace direct coupling with events
- **Scope System Design** → Hierarchical context management

**Migration Safety Rules**:
- Read phase plans before changes
- Run existing tests to establish baseline
- Follow single implementation principle
- Update tests incrementally

### Phase-Based Development Planning
**Location**: [orchestration/phase-planning.md](./orchestration/phase-planning.md)

**Phase Types**:
- **Foundation Phase** → Establish core infrastructure
- **Integration Phase** → Connect new with existing systems
- **Enhancement Phase** → Build new functionality
- **Optimization Phase** → Performance and cleanup

**Success Criteria Framework**:
- Technical implementation complete
- All tests passing and coverage maintained
- Integration validation successful
- Documentation updated

## 📋 AI Assistant Instructions

### When You Are Asked to Code

#### MUST READ FIRST
1. **[rules/single-implementation.md](./rules/single-implementation.md)** - No duplicate implementations
2. **[rules/type-safety.md](./rules/type-safety.md)** - TypeScript requirements  
3. **[rules/testing.md](./rules/testing.md)** - Testing requirements
4. **[processes/development.md](./processes/development.md)** - Development workflow

#### Task-Specific Reading Requirements

| Task Type | Required Reading |
|-----------|------------------|
| **Component development** | `rules/` + `dependencies/effect/` + `checklists/pre-commit.md` |
| **Service development** | `rules/` + `dependencies/effect/` + `processes/development.md` |
| **Bug fixes** | `rules/testing.md` + `checklists/pre-commit.md` |
| **Refactoring** | `rules/single-implementation.md` + `orchestration/refactor-orchestration.md` |
| **Large-scale refactor** | `orchestration/refactor-orchestration.md` + `orchestration/phase-planning.md` |
| **Documentation** | `processes/documentation-audit.md` + `templates/` |
| **Code review** | `processes/code-review.md` + `rules/` |
| **Audit work** | `processes/audit.md` + `processes/documentation-audit.md` |

#### Validation Requirements
- ✅ ALWAYS run `bun test` after changes
- ✅ ALWAYS run `bun run tsc --noEmit` after changes  
- ✅ ALWAYS use TodoWrite for complex tasks
- ✅ ALWAYS update documentation for API changes

#### Forbidden Actions
- ❌ NEVER create multiple versions of same feature
- ❌ NEVER use `any` types
- ❌ NEVER skip tests for new features
- ❌ NEVER create one-off test files or scripts
- ❌ NEVER commit with failing tests

### When You Are Asked to Research

#### MUST READ PATTERNS
1. **Use Task tool** for broad searches across multiple files
2. **Use Read tool** for specific file analysis
3. **Follow existing patterns** found in codebase
4. **Document findings** using appropriate templates

### When You Are Working on Complex Tasks

#### Use Process Tracking
1. **Create tracking directory**: `docs/tracking/[process-type]/[process-id]/`
2. **Use template**: Copy `templates/process-tracking.md`
3. **Track progress**: Update status and findings
4. **Link documentation**: Reference relevant alignment docs

## 📚 Dependency-Specific Guidelines

### Bun Development
**Location**: [dependencies/bun/](./dependencies/bun/)
- Use Bun APIs over Node.js alternatives
- `bun test` for testing, `bun build` for bundling
- `Bun.file` over `node:fs`, `Bun.$` over execa

### Effect.ts Patterns  
**Location**: [dependencies/effect/](./dependencies/effect/)
- All async operations use Effect.Effect<Success, Error, Requirements>
- Tagged errors for discrimination
- Generators for complex async flows
- Layers for dependency injection

### TypeScript Requirements
**Location**: [dependencies/typescript/](./dependencies/typescript/)
- Strict mode enabled
- No `any` types allowed
- Discriminated unions for variants
- Type guards for external data

### Testing Strategy
**Location**: [dependencies/testing/](./dependencies/testing/)
- Component logic testing preferred
- Integration testing for services
- Performance testing for critical paths
- Deterministic tests only

## 🔧 Templates and Tools

### Available Templates
- **[templates/process-tracking.md](./templates/process-tracking.md)** - For tracking complex work
- **[templates/audit-findings.md](./templates/audit-findings.md)** - For audit documentation
- **[templates/phase-plan.md](./templates/phase-plan.md)** - For phase-based planning

### Available Checklists
- **[checklists/pre-commit.md](./checklists/pre-commit.md)** - Pre-commit validation
- **[checklists/documentation.md](./checklists/documentation.md)** - Documentation quality
- **[checklists/testing.md](./checklists/testing.md)** - Test coverage validation

## 🎯 Quality Gates

### Before Any Code Change
- [ ] Read relevant rules from `rules/`
- [ ] Understand existing patterns in codebase
- [ ] Plan implementation approach

### During Development
- [ ] Follow single implementation principle
- [ ] Use proper TypeScript types (no `any`)
- [ ] Write tests alongside implementation
- [ ] Update documentation for API changes

### Before Committing
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] JSDoc updated for changed APIs
- [ ] Pre-commit checklist completed

### During Code Review
- [ ] Implementation follows established patterns
- [ ] Proper error handling with Effect
- [ ] Adequate test coverage
- [ ] Documentation complete and accurate

## 🚀 Getting Started Examples

### For New Team Members
1. Read this README completely
2. Review [processes/development.md](./processes/development.md)
3. Study examples in codebase that follow patterns
4. Start with small changes using [checklists/pre-commit.md](./checklists/pre-commit.md)

### For AI Assistants on New Task
1. Read task-specific required docs (see table above)
2. Create todo list using TodoWrite tool
3. Read existing code to understand patterns
4. Implement following [processes/development.md](./processes/development.md)
5. Validate using [checklists/pre-commit.md](./checklists/pre-commit.md)

### For Complex Projects
1. Use [templates/process-tracking.md](./templates/process-tracking.md)
2. Break into phases following [orchestration/](./orchestration/) guides
3. Track progress in `docs/tracking/` directory
4. Reference dependency guides in [dependencies/](./dependencies/)

## 📞 Getting Help

### Documentation Hierarchy
1. **This README** - Start here for any task
2. **Rules directory** - Core architectural principles
3. **Process directory** - Workflow guidance
4. **Dependency guides** - Technology-specific requirements
5. **Framework docs** - TUIX API and usage documentation

### When Stuck
1. **Check similar implementations** in the codebase
2. **Review existing test patterns** for guidance
3. **Read dependency guides** for technology-specific help
4. **Use templates** to organize complex work
5. **Ask for clarification** if requirements are unclear

### Common Scenarios

| Scenario | Read These Docs |
|----------|----------------|
| "Add new component" | `rules/single-implementation.md` + `dependencies/effect/` + `processes/development.md` |
| "Fix bug" | `rules/testing.md` + `checklists/pre-commit.md` |
| "Refactor code" | `rules/single-implementation.md` + `orchestration/refactor-orchestration.md` |
| "Large architectural change" | `orchestration/refactor-orchestration.md` + `orchestration/phase-planning.md` |
| "Add new service" | `rules/` + `dependencies/effect/` + `processes/development.md` |
| "Update documentation" | `processes/documentation-audit.md` + `templates/` |
| "Review code" | `processes/code-review.md` + `checklists/` |
| "Audit codebase" | `processes/audit.md` + `processes/documentation-audit.md` |
| "Plan complex project" | `orchestration/phase-planning.md` + `templates/process-tracking.md` |

---

## 🎯 Remember

This alignment system ensures:
- **Consistency** across all team members and AI assistants
- **Quality** through enforced standards and validation
- **Efficiency** through clear processes and reusable templates
- **Maintainability** through single implementation principle
- **Scalability** through proper architecture and testing

**When in doubt, read the relevant alignment docs. When still in doubt, ask for clarification.**