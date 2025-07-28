# Cinderlink CLI-Kit Rules

⚠️ **CRITICAL**: These rules are NOT suggestions. They are requirements. Violations MUST be fixed immediately.

## 🚫 NEVER Rules

### Code Quality
- **NEVER** use `any` types—use strict TypeScript with discriminated unions and explicit types.
- **NEVER** create workarounds or temporary fixes—fix the root cause.
- **NEVER** commit without running all tests (`bun test`).
- **NEVER** leave TypeScript errors—zero tolerance for type errors.
- **NEVER** create one-off scripts or one-off examples.
- **NEVER** ignore failing tests—fix immediately or rollback changes.
- **NEVER** leave commented-out code—use git for history.

### Implementation & Structure
- **NEVER** use `impl/` or `integrations/` folders. Each feature must live in its own file or directory.
- **NEVER** create duplicate implementations or multiple versions (no -v2, -enhanced, -simple suffixes).
- **NEVER** use qualifier names (simple-logger, basic-button, enhanced-feature).
- **NEVER** commit backup files (.bak, .old, .backup, .orig).
- **NEVER** mix concerns—maintain single responsibility per file/feature.
- **NEVER** create circular dependencies.
- **NEVER** create files unless absolutely necessary.

### File & Test Naming
- **NEVER** use PascalCase for non-component files (components use PascalCase, docs use UPPERCASE.md).
- **NEVER** use UPPERCASE for non-documentation files.
- **NEVER** use kebab-case when path-based organization works (foo/bar not foo-bar; exception: proper nouns).
- **NEVER** create test-*.ts or demo-*.ts files—use `feature.test.ts` beside the feature.
- **NEVER** place tests in a separate folder (except integration tests at `src/tests/integration/`).
- **NEVER** have code, docs, and tests out of alignment.

### Documentation
- **NEVER** skip documentation—every feature must have up-to-date docs beside its code and tests.
- **NEVER** merge broken code—fix issues first.
- **NEVER** ignore linting errors—address all warnings.

## ✅ ALWAYS Rules

### Code Quality
- **ALWAYS** use strict TypeScript types with full type safety.
- **ALWAYS** colocate tests beside the code they test (`feature.ts` + `feature.test.ts`).
- **ALWAYS** colocate documentation beside the code it documents (`feature.md` or similar).
- **ALWAYS** run all tests before committing (`bun test`).
- **ALWAYS** check types before committing (`bun run tsc --noEmit`).
- **ALWAYS** maintain at least 80% test coverage (70% for branches).
- **ALWAYS** document errors and edge cases.
- **ALWAYS** validate inputs at module boundaries.

### Implementation & Structure
- **ALWAYS** organize code by feature, not by type.
- **ALWAYS** place every feature in its own file or directory, with matching test and doc files.
- **ALWAYS** keep code, tests, and docs in alignment. When changing a feature, update all three.
- **ALWAYS** write docs first, then tests, then code for new features.
- **ALWAYS** review and align code, tests, and docs when changing or fixing features.
- **ALWAYS** update dependent features and integrations, including their code, tests, and docs, when making changes.

### Integration Tests
- **ALWAYS** place integration tests at `src/tests/integration/`.
- **ALWAYS** keep integration tests up to date with feature changes.

### Documentation
- **ALWAYS** colocate documentation with features.
- **ALWAYS** update docs when implementation changes.
- **ALWAYS** document public APIs, errors, edge cases, and usage examples.

## 📋 Verification Checklist

Before any commit:
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] Documentation updated and colocated
- [ ] No duplicate implementations
- [ ] No workarounds or temporary fixes
- [ ] Files use appropriate naming (lowercase paths, PascalCase components, camelCase stores, UPPERCASE.md docs)
- [ ] No use of impl/ or integrations/ folders
- [ ] Tests are beside the code they test
- [ ] Docs are beside the code they document
- [ ] Follows all NEVER and ALWAYS rules

## 🚨 Enforcement

These rules are enforced through:
1. Pre-commit checks
2. CI/CD pipeline validation
3. Code review requirements
4. Automated linting

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
- **ALWAYS** use lowercase path-based naming for files and directories
- **ALWAYS** use PascalCase for components, camelCase for stores, UPPERCASE.md for docs
- **ALWAYS** prefer deep paths over hyphenated names (except proper nouns)
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
- **ALWAYS** consult and update dep docs in docs/dependencies/[dep]/ when needed.

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
- Project root has: RULES.md, STANDARDS.md, CONVENTIONS.md, DEPENDENCIES.md, MODULES.md, PLUGINS.md
- Every module has: README.md, PLANNING.md, ISSUES.md
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
- [ ] Files use appropriate naming (lowercase paths, PascalCase components, camelCase stores, UPPERCASE.md docs)
- [ ] Follows all NEVER rules
- [ ] Follows all ALWAYS rules

## 🚨 Enforcement

These rules are enforced through:
1. Pre-commit checks
2. CI/CD pipeline validation
3. Code review requirements
4. Automated linting

Violations block merging and must be fixed immediately.