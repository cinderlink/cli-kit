# Broken Items Report

> **⚠️ ARCHIVED DOCUMENT**: This is a historical report documenting issues that existed at a specific point in time. It is kept for reference only. For current issues, run tests and check active GitHub issues.

## 1. Test Suite Failures

### Primary Test Failure
- **File**: `src/core/serviceIntegration.test.ts`
- **Error**: Cannot find module '../core/runtime/module/base' from '/Users/aewing/Projects/cinderlink/cli-kit/src/logger/impl/module.ts'
- **Cause**: Incorrect import path in logger module implementation

### Import Path Issues
Multiple modules have incorrect import paths after restructuring:
- `src/logger/impl/module.ts` - imports from wrong path
- `src/process-manager/impl/module.ts` - imports from wrong path  
- Various test files importing from non-existent paths

### Missing Exports
- `ProcessManagerLive` not found in `/src/process-manager/index.ts`
- `createCLI` not found in `/src/cli/index.ts`

## 2. Runes Implementation Issues

### Incorrect Usage in Components
- **File**: `src/ui/components/display/text/Text.tsx`
- **Lines**: 172, 173, 186, 192
- **Issue**: Accessing `colorIndex.value` and `bright.value` but runes are functions, not objects
- **Fix needed**: Should use `colorIndex()` and `colorIndex.$set()` instead

### JSX Lifecycle Integration Working
- `jsxLifecycle` module exists at `src/core/update/reactivity/jsxLifecycle.ts`
- Properly exports `$effect`, `onMount`, `onDestroy` etc.
- Issue is with components using runes incorrectly

## 3. Configuration Module Issues

### Method Not Found Errors
- `cfg.toJSON is not a function`
- `createConfig().defaults({ a: 1, b: 2 }).env is not a function`
- Configuration API has changed but tests not updated

## 4. Plugin System Issues

### Plugin Registration Errors
- Multiple "Plugin must have a name in metadata" errors
- Plugin metadata validation is failing

## 5. Debug Module Issues

### TUIX_DEBUG Integration
- Debug wrapper is supposed to activate with `TUIX_DEBUG=true`
- JSX app checks for debug mode but integration is incomplete
- Debug components exist but aren't properly integrated with runtime

## 6. Missing Test Utilities
- `src/testing/testUtils.test.ts` can't find `./test-utils`
- Test utilities have been moved or renamed

## 7. Type and State Issues
- `undefined is not an object (evaluating 'state.performance.length')`
- State initialization problems in various components

## 8. MVU Architecture Not Properly Integrated

### JSX App Creates Dummy MVU Component
- **File**: `src/jsx/app.ts` lines 296-301
- Creates minimal component with empty init/update functions
- Doesn't actually use MVU architecture for state management
- Just wraps JSX elements in a fake MVU component structure

### No Real Model-View-Update Implementation
- The `createJSXApp` function bypasses MVU entirely
- State management scattered across various stores
- No central update function or message handling
- Violates the core architectural principle stated in FINAL_API_PROPOSAL.md

## Summary of Key Problems

1. **Import paths are broken** after module restructuring
2. **Runes are used incorrectly** - accessing `.value` instead of calling as functions
3. **MVU architecture is fake** - JSX app creates dummy MVU component instead of real integration
4. **Configuration API changed** but tests not updated
5. **Plugin validation too strict** - requires metadata that isn't being provided
6. **Debug mode partially implemented** - components exist but integration incomplete
7. **No real state management** - violates single source of truth principle

## Priority Fixes

1. Fix import paths in logger and process-manager modules
2. Correct runes usage in Text component (use `colorIndex()` not `colorIndex.value`)
3. Implement real MVU integration in createJSXApp
4. Update configuration tests to match new API
5. Fix plugin metadata validation
6. Complete debug mode integration
7. Create proper MVU-based state management instead of scattered stores