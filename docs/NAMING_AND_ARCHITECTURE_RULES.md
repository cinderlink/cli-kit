# Naming and Architecture Rules

## Core Principles

### 1. Single Implementation Rule
**Every feature should have ONE canonical implementation.**

- ❌ NO: `TextInput.ts`, `TextInputV2.ts`, `TextInputSimple.ts`, `TextInputEnhanced.ts`
- ✅ YES: `TextInput.ts` (the best, complete implementation)

### 2. No Version Qualifiers
**Never use version qualifiers in names.**

- ❌ NO: `-v2`, `-new`, `-old`, `-legacy`, `-improved`, `-enhanced`, `-simple`, `-basic`, `-main`
- ✅ YES: Use the actual name that describes what it does

### 3. Interface-Based Variants
**When multiple variants are truly needed, use interfaces and proper directory structure.**

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

### 4. Descriptive Names Over Qualifiers
**Use names that describe what something does, not how "simple" or "complex" it is.**

- ❌ BAD: `simple-harness.ts` (what makes it simple?)
- ✅ GOOD: `harness.ts` or `harness/node.ts` and `harness/browser.ts`

- ❌ BAD: `bun-native-manager.ts` 
- ✅ GOOD: `process-manager/manager.ts` or `process-manager/implementations/bun.ts`

### 5. Evolution, Not Duplication
**When improving code, replace it. Don't create new versions alongside.**

```typescript
// ❌ BAD: Keep both old and new
function processData() { /* old implementation */ }
function processDataV2() { /* new implementation */ }

// ✅ GOOD: Replace the implementation
function processData() { /* new, better implementation */ }
```

### 6. Backup Files Must Go
**Never commit backup files to version control.**

- ❌ NO: `.bak`, `.old`, `.backup`, `.save`, `.orig`
- ✅ YES: Use git for version history

## Examples

### Example 1: Test Harnesses
```typescript
// ❌ BAD
testing/
  simple-harness.ts
  complex-harness.ts
  e2e-harness.ts

// ✅ GOOD
testing/
  harness.ts           // Main harness (lightweight, no PTY)
  e2e-harness.ts      // E2E harness (full PTY support)
  
// OR if they share an interface:
testing/
  harness/
    index.ts          // Exports createHarness with options
    types.ts          // Harness interface
    node.ts           // Node.js implementation
    pty.ts            // PTY-based implementation
```

### Example 2: Components
```typescript
// ❌ BAD
components/
  Button.ts
  ButtonSimple.ts
  ButtonEnhanced.ts
  button-v2.ts

// ✅ GOOD
components/
  forms/
    button/
      Button.tsx      // The one Button component
      index.ts        // Exports
      types.ts        // ButtonProps, etc.
```

### Example 3: Process Managers
```typescript
// ❌ BAD
process-manager/
  manager.ts
  bun-native-manager.ts
  simple-manager.ts
  
// ✅ GOOD
process-manager/
  manager.ts          // The ProcessManager
  types.ts           // Common types
  
// OR if multiple implementations needed:
process-manager/
  index.ts           // Exports ProcessManager
  types.ts           // ProcessManager interface
  implementations/
    bun.ts           // BunProcessManager implements ProcessManager
    node.ts          // NodeProcessManager implements ProcessManager
```

## Migration Guide

When you find code that violates these rules:

1. **Identify the best implementation**
   - Which one has the most features?
   - Which one has the best API?
   - Which one is most recently updated?

2. **Merge the best parts**
   - Take the best features from each variant
   - Ensure backward compatibility where reasonable

3. **Delete the duplicates**
   - Remove all variant files
   - Update all imports
   - Run tests to ensure nothing breaks

4. **Document the decision**
   - Add comments explaining what was merged
   - Update documentation to reflect the single API

## Enforcement

1. **Code Reviews**: Reject PRs that introduce duplicate implementations
2. **Linting**: Add rules to catch version qualifiers in filenames
3. **Tests**: Ensure imports resolve to single implementations
4. **Documentation**: Keep examples updated with correct imports

## Benefits

- **Clarity**: Developers know exactly which implementation to use
- **Maintainability**: One place to fix bugs and add features  
- **Performance**: No confusion about which version is "better"
- **Clean API**: Users import `Button`, not `ButtonV2Enhanced`
- **Git History**: Version control tracks evolution, not file proliferation