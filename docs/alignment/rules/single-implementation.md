# Single Implementation Principle

## ⚠️ CRITICAL RULE ⚠️

**This is the most important architectural rule in the codebase.**

## The Rule

**ONE VERSION RULE**: Never create multiple versions of the same feature.

## Forbidden Patterns

### Version Suffixes
- ❌ NO: `-v2`, `-new`, `-old`, `-legacy`, `-improved`, `-enhanced`, `-simple`, `-basic`, `-main`
- ❌ NO: `TextInput.ts` and `TextInputV2.ts`
- ❌ NO: `simple-harness.ts` and `complex-harness.ts`

### Backup Files  
- ❌ NO: `.bak`, `.old`, `.backup`, `.save`, `.orig` files in version control
- ✅ YES: Use git for version history

### Multiple APIs for Same Thing
- ❌ NO: `processData()` and `processDataV2()` functions
- ❌ NO: `Logger` and `SimpleLogger` classes
- ✅ YES: One clean API surface

## Required Actions

### When Improving Code
1. **REPLACE, DON'T APPEND** - Replace the existing implementation entirely
2. **DELETE CLONES** - Remove duplicate or backup implementations immediately  
3. **NO WORKAROUNDS** - Fix the real implementation instead of creating simplified versions
4. **NO BACKWARDS COMPATIBILITY LAYERS** - Features evolve forward, old APIs get deprecated and removed

### When Multiple Variants Are Needed
Use interfaces and proper directory structure:

```typescript
// ❌ BAD: Multiple files with qualifiers
simple-logger.ts
enhanced-logger.ts
basic-logger.ts

// ✅ GOOD: Interface with implementations
logger/
  index.ts         // Exports the main logger and types
  types.ts         // Common Logger interface
  console.ts       // ConsoleLogger implements Logger
  file.ts          // FileLogger implements Logger
  remote.ts        // RemoteLogger implements Logger
```

## Enforcement

### Code Reviews
- Reject PRs that introduce duplicate implementations
- Require justification for any perceived "variants"
- Ensure imports resolve to single implementations

### Development Process
1. **Identify the best implementation** when duplicates exist
2. **Merge the best parts** from each variant
3. **Delete the duplicates** and update all imports
4. **Run tests** to ensure nothing breaks
5. **Document the decision** in commit messages

## Benefits

- **Clarity**: Developers know exactly which implementation to use
- **Maintainability**: One place to fix bugs and add features  
- **Performance**: No confusion about which version is "better"
- **Clean API**: Users import `Button`, not `ButtonV2Enhanced`
- **Git History**: Version control tracks evolution, not file proliferation

## Examples

### Good Evolution Pattern
```typescript
// Commit 1: Initial implementation
function processData(input: string): string {
  return input.toUpperCase()
}

// Commit 2: Enhanced implementation (REPLACES the previous)
function processData(input: string): string {
  return input.trim().toUpperCase()
}

// Commit 3: Further enhanced (REPLACES again)
function processData(input: string): Promise<string> {
  return Promise.resolve(input.trim().toUpperCase())
}
```

### Bad Duplication Pattern
```typescript
// ❌ WRONG: Creating multiple versions
function processData(input: string): string { /* old */ }
function processDataV2(input: string): Promise<string> { /* new */ }
function processDataSimple(input: string): string { /* simplified */ }
```

## Migration Guide

When you find violations:

1. **Audit all variants** - understand what each does
2. **Choose the best** - most features, best API, most recent
3. **Merge capabilities** - incorporate best features from all variants
4. **Update all imports** - ensure no references to old variants
5. **Delete old files** - remove from filesystem and git
6. **Test thoroughly** - ensure nothing breaks
7. **Document changes** - clear commit messages about consolidation

## Related Rules

- [Type Safety Rules](./type-safety.md) - No `any` types in implementations
- [Testing Requirements](./testing.md) - All implementations must be tested
- [Naming Rules](./naming.md) - Use descriptive names, not qualifiers