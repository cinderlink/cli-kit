# Task 3A Integration Testing - Context Files

## Overview
This document lists the key files relevant to the integration testing task and their current status.

## Test Infrastructure Files (Need TypeScript Fixes)

### Core Test Utilities
- **src/testing/test-utils.ts** - Main test utilities (has TypeScript errors)
- **src/testing/e2e-harness.ts** - E2E test harness (has TypeScript errors)
- **src/testing/simple-harness.ts** - Simple test harness (has TypeScript errors)
- **src/testing/input-adapter.ts** - Input simulation adapter (has TypeScript errors)
- **src/testing/visual-test.ts** - Visual testing utilities (has TypeScript errors)
- **src/testing/index.ts** - Test exports (needs review)

### Deleted Test Files (Referenced by utilities)
These files were deleted but are still referenced in test utilities:
- ~~__tests__/unit/components/Box.test.ts~~
- ~~__tests__/unit/components/Table.test.ts~~
- ~~__tests__/unit/components/base.test.ts~~
- ~~__tests__/unit/services/renderer.test.ts~~
- ~~__tests__/unit/services/input.test.ts~~
- ~~__tests__/unit/services/terminal.test.ts~~
- ~~__tests__/unit/services/storage.test.ts~~
- ~~__tests__/e2e/button-showcase.test.ts~~
- ~~__tests__/e2e/layout-patterns.test.ts~~

## Component Files (Need Integration Tests)

### Display Components
- **src/display/log-viewer.ts** - Log viewer component
- **src/display/process-monitor.ts** - Process monitor component

### Core Components
- **src/components/Box.ts** - Box component
- **src/components/Table.ts** - Table component
- **src/components/Button.ts** - Button component
- **src/components/TextInput.ts** - Text input component
- **src/components/Modal.ts** - Modal component
- **src/components/List.ts** - List component
- **src/components/Tabs.ts** - Tabs component

### Component Infrastructure
- **src/components/base.ts** - Base component functionality
- **src/components/component.ts** - Component interfaces
- **src/components/lifecycle.ts** - Component lifecycle
- **src/components/reactivity.ts** - Reactive component features

## Service Files (Need Integration Tests)

### Core Services
- **src/services/renderer.ts** - Rendering service
- **src/services/input.ts** - Input handling service
- **src/services/terminal.ts** - Terminal service
- **src/services/storage.ts** - Storage service
- **src/services/focus.ts** - Focus management service
- **src/services/mouse-router.ts** - Mouse routing service

### Service Implementations
- **src/services/impl/renderer-impl.ts** - Renderer implementation
- **src/services/impl/input-impl.ts** - Input implementation
- **src/services/impl/terminal-impl.ts** - Terminal implementation
- **src/services/impl/storage-impl.ts** - Storage implementation

## Effect Infrastructure

### Core Effect Files
- **src/core/runtime.ts** - Effect runtime
- **src/core/errors.ts** - Error types
- **src/core/types.ts** - Core types
- **src/core/view.ts** - View system

## Example Files (Can be used for testing)

### Component Examples
- **examples/button-showcase.ts** - Button examples
- **examples/table-showcase.ts** - Table examples
- **examples/modal-demo.ts** - Modal examples
- **examples/log-viewer.ts** - Log viewer example
- **examples/process-monitor.ts** - Process monitor example

### CLI Examples
- **examples/cli/simple-cli.ts** - Simple CLI example
- **examples/advanced-jsx-cli.tsx** - Advanced JSX CLI

## Configuration Files

### TypeScript Configuration
- **tsconfig.json** - Main TypeScript config
- **tsconfig.src.json** - Source TypeScript config
- **tsconfig.tests.json** - Test TypeScript config

### Test Configuration
- **bun.lockb** - Bun lock file
- **package.json** - Package configuration

## Priority Files for Phase 2 Fixes

1. **src/testing/test-utils.ts** - Fix TypeScript errors first
2. **src/testing/e2e-harness.ts** - Update to remove deleted file dependencies
3. **src/testing/simple-harness.ts** - Fix type mismatches
4. **src/testing/input-adapter.ts** - Update input simulation types
5. **src/testing/visual-test.ts** - Fix visual testing utilities

## Files to Create for Integration Testing

Once Phase 2 fixes are complete:

1. **tests/integration/components/** - Component integration tests
2. **tests/integration/services/** - Service integration tests
3. **tests/integration/cli/** - CLI integration tests
4. **tests/integration/setup.ts** - Integration test setup
5. **tests/integration/utils.ts** - Integration test utilities