# {moduleName} Rules

⚠️ **CRITICAL**: These rules are NOT suggestions. They are requirements. Violations MUST be fixed immediately.

## 🚫 NEVER Rules

### Code Quality
- **NEVER** use `any` types - use proper TypeScript with discriminated unions
- **NEVER** create workarounds - fix the root cause
- **NEVER** commit without running tests - all tests MUST pass
- **NEVER** leave TypeScript errors - zero tolerance for type errors

### Implementation
- **NEVER** create multiple versions of the same feature (no -v2, -enhanced, -simple suffixes)
- **NEVER** create duplicate implementations across modules
- **NEVER** use qualifier names (simple-{feature}, basic-{feature}, enhanced-{feature})

### Architecture
- **NEVER** violate module boundaries - use only exported APIs
- **NEVER** reach into internal module files
- **NEVER** bypass the established patterns

## ✅ ALWAYS Rules

### Code Quality
- **ALWAYS** use proper TypeScript types with full type safety
- **ALWAYS** run tests before committing
- **ALWAYS** fix the root cause, not symptoms

### Implementation
- **ALWAYS** replace implementations when improving them
- **ALWAYS** use descriptive names that indicate purpose
- **ALWAYS** follow existing patterns in the codebase

### Architecture
- **ALWAYS** use interfaces for module integration
- **ALWAYS** keep modules focused on their domain
- **ALWAYS** export clean, minimal APIs

## 📋 Module-Specific Rules

### This Module's Domain
{domainDescription}

### Integration Rules
{integrationRules}

## 🔍 Verification Checklist

Before any commit:
- [ ] All tests pass (`bun test`)
- [ ] No TypeScript errors (`bun run tsc --noEmit`)
- [ ] Documentation updated
- [ ] Follows all NEVER rules
- [ ] Follows all ALWAYS rules