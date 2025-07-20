# Runtime System Analysis Report

## Overview
This document presents a comprehensive analysis of the TUIX runtime system (`src/core/runtime.ts`) and related files, identifying issues related to documentation misalignment, duplicate functionality, dead code, architectural inconsistencies, and missing error handling.

## 1. Misalignments Between Documentation and Implementation

### 1.1 Service Interface Inconsistencies
**Issue**: The runtime expects `InputService` to have a `filterKeys` method, but the service interface definition shows it as a property.

**Location**: `src/core/runtime.ts` line 516-521
```typescript
input.filterKeys(key => {
  const isQuit = (config.quitOnCtrlC && key.ctrl && key.key === 'ctrl+c') ||
                (config.quitOnEscape && key.key === 'escape')
  return isQuit
})
```

**Expected**: Based on `src/services/input.ts`, `filterKeys` is defined as:
```typescript
readonly filterKeys: (
  predicate: (key: KeyEvent) => boolean
) => Stream.Stream<KeyEvent, InputError, never>
```

**Impact**: This is actually correctly implemented - the method returns a Stream which is then piped. No issue here.

### 1.2 Missing Terminal Service Methods
**Issue**: The runtime uses `hideCursor` and `showCursor` methods that are not defined in the `TerminalService` interface in `src/core/types.ts`.

**Location**: 
- `src/core/runtime.ts` line 226: `yield* _(terminal.hideCursor)`
- `src/core/runtime.ts` line 701: `yield* _(terminal.showCursor)`

**Expected Interface**: The `TerminalService` interface should include:
```typescript
readonly hideCursor: Effect.Effect<void, TerminalError, never>
readonly showCursor: Effect.Effect<void, TerminalError, never>
```

### 1.3 Schema Type Mismatches
**Issue**: The `schemas.ts` file defines types that don't match what's used in `types.ts`.

**Example**: 
- `schemas.ts` exports `KeyEvent` as a Zod inferred type
- `types.ts` imports `KeyEvent` from `./keys` module
- This creates potential type conflicts

## 2. Duplicate Functionality

### 2.1 Error Type Definitions
**Issue**: Error types are defined in multiple places:
- Imported from `./errors` in `types.ts`
- Re-exported from `schemas.ts` as Zod inferred types
- This creates two different type definitions for the same concepts

### 2.2 Component Type Definitions
**Issue**: `Component` type is defined in:
- `types.ts` as a proper TypeScript interface with generics
- `schemas.ts` as a Zod schema without proper generic support

**Impact**: The Zod schema version cannot properly type-check component implementations.

### 2.3 View Type Duplication
**Issue**: `View` interface exists in:
- `types.ts` with Effect-based render function
- `schemas.ts` with Promise-based render function

**Conflict**: The schemas version uses Promises while the actual implementation uses Effect.

## 3. Unused/Dead Code

### 3.1 Unused Schema Validations
**Issue**: The `schemas.ts` file contains extensive validation functions that appear to be unused:
- `validateKeyEvent`, `validateMouseEvent`, `validateStyle`, etc.
- `parseKeyEvent`, `parseMouseEvent`, `parseStyle`, etc.

**Search Result**: No imports of these validation functions found in the codebase.

### 3.2 Unused WindowResized Handler
**Issue**: The runtime's `processMessage` function has a case for `WindowResized` that only returns without processing.

**Location**: `src/core/runtime.ts` lines 337-340
```typescript
case "WindowResized":
  // If component handles resize, convert to user message
  // Otherwise ignore
  return
```

**Note**: Comment suggests future functionality but no implementation exists.

### 3.3 Unused Tick Handler
**Issue**: Similar to WindowResized, the `Tick` case is unimplemented.

**Location**: `src/core/runtime.ts` lines 364-366

## 4. Architectural Inconsistencies

### 4.1 Mixed Message Handling Patterns
**Issue**: The runtime handles system messages inconsistently:
- `MouseEvent` is properly routed through MouseRouterService
- `KeyPressed` is ignored entirely (no routing logic)
- `Quit` is handled directly
- Other system messages have no handlers

**Expected**: All system messages should have consistent routing patterns.

### 4.2 Quit Message Special Handling
**Issue**: The `processCmds` function has special logic to detect quit commands by checking for `_tag === 'Quit'`.

**Location**: `src/core/runtime.ts` lines 393-402

**Problem**: This breaks the abstraction - commands should return user messages, not system messages.

### 4.3 Service Layer Bypass
**Issue**: Emergency cleanup directly manipulates `process.stdout` instead of using TerminalService.

**Location**: `src/core/runtime.ts` lines 410-426

**Impact**: Breaks service abstraction and makes testing difficult.

## 5. Missing Error Handling

### 5.1 No Recovery from Render Errors
**Issue**: The render loop doesn't handle potential render errors.

**Location**: `src/core/runtime.ts` lines 649-654
```typescript
// Get view from component
const view = component.view(currentState.model)

// Render the view
yield* _(renderer.beginFrame)
yield* _(renderer.render(view))
yield* _(renderer.endFrame)
```

**Missing**: Error recovery if rendering fails.

### 5.2 Command Error Silencing
**Issue**: Failed commands are silently ignored.

**Location**: `src/core/runtime.ts` line 403
```typescript
Effect.catchAll(() => Effect.void) // Ignore failed commands
```

**Impact**: Users have no visibility into command failures.

### 5.3 Subscription Error Handling
**Issue**: Subscription errors are not handled - they would crash the subscription fiber.

**Location**: `src/core/runtime.ts` lines 571-577

## 6. Edge Cases Not Handled

### 6.1 Rapid Model Changes
**Issue**: The subscription monitoring uses a 16ms delay to check for model changes. Rapid model changes within this window might not trigger subscription updates.

**Location**: `src/core/runtime.ts` line 606

### 6.2 Component Without Dimensions
**Issue**: Views without width/height might cause layout issues, but there's no validation or defaults.

### 6.3 Terminal Capability Checking
**Issue**: No verification that terminal supports requested features (mouse, alternate screen, etc.) before enabling them.

## 7. Performance Concerns

### 7.1 Inefficient Model Comparison
**Issue**: Model comparison uses referential equality which won't detect deep changes in mutable objects.

**Location**: `src/core/runtime.ts` line 601
```typescript
if (currentState.model !== lastModel) {
```

### 7.2 Unbounded Message Queue
**Issue**: The message queue is unbounded, which could lead to memory issues under high message load.

**Location**: `src/core/runtime.ts` line 238
```typescript
const msgQueue = yield* _(Queue.unbounded<SystemMsg<Msg>>())
```

## Recommendations

1. **Align Type Definitions**: Remove duplicate type definitions and use a single source of truth.

2. **Complete Service Interfaces**: Add missing methods to service interfaces or remove their usage.

3. **Implement Message Routing**: Add proper routing for all system messages or document why they're ignored.

4. **Add Error Recovery**: Implement error boundaries for rendering and command execution.

5. **Remove Dead Code**: Delete unused validation functions and schema definitions.

6. **Fix Service Abstraction**: Ensure all terminal operations go through TerminalService.

7. **Add Terminal Capability Detection**: Check terminal features before enabling them.

8. **Improve Model Change Detection**: Consider using immutability helpers or deep comparison for complex models.

9. **Add Queue Bounds**: Consider using bounded queues with backpressure handling.

10. **Complete System Message Handlers**: Implement handlers for WindowResized, KeyPressed, and Tick events.