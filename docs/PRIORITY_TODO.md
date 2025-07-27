# Prioritized Todo List for API Proposal Issues

> **⚠️ ARCHIVED DOCUMENT**: This is a historical priority list from January 2025. It is kept for reference only. For current priorities and tasks, check active GitHub issues and project boards.

## Priority 1: Critical Issues (Must Fix Immediately)

1. **Fix Failing Tests**
   - 12 failing tests in core integration and logger modules
   - Fix test assertions for module registry statistics (expected 10, got 9)
   - Fix bootstrap status assertions (expected 'initialized', got undefined)
   - Fix event system integration tests
   - Fix logger test failures due to "Not a valid effect: {}" errors

2. **Resolve TypeScript Errors**
   - 4,196 TypeScript errors currently in the codebase
   - Focus on type safety at module boundaries
   - Fix Effect-related type issues causing runtime failures

## Priority 2: High Impact Code Quality Issues

3. **Eliminate 'as any' Casting**
   - 1,092 instances of 'as any' casting in the codebase
   - Prioritize removing casts that affect type safety at module boundaries
   - Replace with proper TypeScript generics and type assertions

4. **Replace console.log with Proper Logging**
   - 5,332 instances of console.log usage
   - Replace with structured logger calls
   - Ensure proper log levels (debug, info, warn, error)

## Priority 3: Architecture and Best Practices

5. **Replace process.exit with Proper Shutdown**
   - 165 instances of process.exit calls
   - Implement graceful shutdown with Effect runtime
   - Use proper error handling and resource cleanup patterns

6. **Fix Inline $state Usage**
   - 92 instances of $state usage that need to be properly integrated
   - Ensure $state is used with proper MVU patterns
   - Fix any direct mutation of state outside of update functions

## Priority 4: UI Architecture

7. **Migrate Remaining UI Components to MVU**
   - 15 UI components in src/ui/components
   - Audit each component for MVU compliance
   - Implement proper model-view-update patterns
   - Ensure components are properly isolated and testable

## Implementation Strategy

1. **Phase 1: Stabilize** (Week 1-2)
   - Fix all failing tests
   - Resolve critical TypeScript errors that prevent compilation
   - Address logger Effect runtime issues

2. **Phase 2: Code Quality** (Week 2-4)
   - Eliminate 'as any' casting in core modules
   - Replace console.log with proper logging in core modules
   - Remove process.exit calls from core modules

3. **Phase 3: Architecture Compliance** (Week 4-6)
   - Complete removal of all 'as any' casting
   - Migrate all console.log to proper logging
   - Replace all process.exit with graceful shutdown
   - Fix all $state usage issues

4. **Phase 4: UI Modernization** (Week 6-7)
   - Audit and migrate all UI components to MVU pattern
   - Ensure complete test coverage for all components

## Success Metrics

- 0 failing tests
- < 50 TypeScript errors (down from 4,196)
- 0 'as any' casts
- 0 console.log calls
- 0 process.exit calls
- 100% MVU compliant UI components
- Proper $state usage in all components