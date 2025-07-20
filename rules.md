# Tuix Framework Rules

⚠️ **CRITICAL**: These rules are NOT suggestions. They are requirements. Violations MUST be fixed immediately.

## 🚫 NEVER Rules

### Code Quality
- **NEVER** use `any` types - use proper TypeScript with discriminated unions
- **NEVER** create workarounds - fix the root cause
- **NEVER** commit without running tests - all tests MUST pass
- **NEVER** leave TypeScript errors - zero tolerance for type errors
- **NEVER** create one-off scripts - use the test suite or CLI commands
- **NEVER** ignore failing tests - fix immediately or rollback changes
- **NEVER** add JSX pragmas - JSX is configured at build level

### Implementation
- **NEVER** create multiple versions of the same feature (no -v2, -enhanced, -simple suffixes)
- **NEVER** create duplicate implementations across modules
- **NEVER** use qualifier names (simple-logger, basic-button, enhanced-feature)
- **NEVER** commit backup files (.bak, .old, .backup, .orig)
- **NEVER** leave commented-out code - use git for history
- **NEVER** create "temporary" fixes - all fixes must be permanent

### File Naming
- **NEVER** use PascalCase or UPPERCASE for files (use kebab-case)
- **NEVER** use hyphenated names unnecessarily (foo/bar not foo/bar-foo)
- **NEVER** create test-*.ts or demo-*.ts files - use proper test suite
- **NEVER** use inconsistent naming within a module

### Architecture
- **NEVER** violate module boundaries - use only exported APIs
- **NEVER** reach into internal module files
- **NEVER** bypass the established patterns
- **NEVER** mix concerns - maintain single responsibility
- **NEVER** create circular dependencies
- **NEVER** assume module implementation details

### Development Process
- **NEVER** skip documentation - all exports need JSDoc
- **NEVER** merge broken code - fix issues first
- **NEVER** work around framework limitations - report and fix them
- **NEVER** ignore linting errors - address all warnings
- **NEVER** create files unless absolutely necessary
- **NEVER** create documentation proactively unless requested

## ✅ ALWAYS Rules

### Code Quality
- **ALWAYS** use proper TypeScript types with full type safety
- **ALWAYS** run tests before committing (`bun test`)
- **ALWAYS** check types before committing (`bun run tsc --noEmit`)
- **ALWAYS** fix the root cause, not symptoms
- **ALWAYS** maintain 80% test coverage (70% for branches)
- **ALWAYS** document errors and edge cases

### Implementation
- **ALWAYS** replace implementations when improving them
- **ALWAYS** use descriptive names that indicate purpose
- **ALWAYS** follow existing patterns in the codebase
- **ALWAYS** clean up resources in lifecycle hooks
- **ALWAYS** use Effect.ts patterns for async operations
- **ALWAYS** validate inputs at module boundaries

### File Organization
- **ALWAYS** use kebab-case for files and directories
- **ALWAYS** prefer deep paths over hyphenated names
- **ALWAYS** colocate tests with implementation
- **ALWAYS** use index.ts for public APIs
- **ALWAYS** organize by feature, not by type

### Architecture
- **ALWAYS** use interfaces for module integration
- **ALWAYS** keep modules focused on their domain
- **ALWAYS** use subdirectories for cross-module integration
- **ALWAYS** export clean, minimal APIs
- **ALWAYS** maintain backwards compatibility when possible
- **ALWAYS** deprecate before removing public APIs

### Development Process
- **ALWAYS** read existing documentation before changing code
- **ALWAYS** update documentation when changing behavior
- **ALWAYS** create tests for new features
- **ALWAYS** use Bun instead of Node.js tooling
- **ALWAYS** prefer editing existing files over creating new ones
- **ALWAYS** follow the Single Implementation Principle

### Documentation
- **ALWAYS** read these key documents before starting work:
  - rules.md (this file)
  - standards.md
  - conventions.md
- **ALWAYS** check module-specific documentation
- **ALWAYS** update docs when implementation changes
- **ALWAYS** verify examples still work

## 📋 Framework-Wide Rules

### Module Ownership
- Each module completely owns its domain
- No duplicate implementations across modules
- Integration happens through clean interfaces
- Cross-module code goes in subdirectories

### Testing Requirements
- Unit tests for all public functions
- Integration tests for module boundaries
- Performance tests for critical paths
- Type tests for complex utilities

### Documentation Standards
- Every module has: readme.md, rules.md, standards.md, conventions.md, issues.md, planning.md, dependencies.md
- All exports have JSDoc comments
- Examples must be executable
- Keep docs synchronized with code

## 🔍 Verification Checklist

Before any commit:
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] Documentation updated
- [ ] No duplicate implementations
- [ ] No workarounds or temporary fixes
- [ ] Files use kebab-case naming
- [ ] Follows all NEVER rules
- [ ] Follows all ALWAYS rules

## 🚨 Enforcement

These rules are enforced through:
1. Pre-commit checks
2. CI/CD pipeline validation
3. Code review requirements
4. Automated linting

Violations block merging and must be fixed immediately.