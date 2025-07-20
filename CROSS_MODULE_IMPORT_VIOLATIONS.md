# Cross-Module Import Violations Report

This report identifies imports that violate the separation of concerns principle in the tuix codebase.

## Critical Violations

### 1. Core importing from higher-level modules

**Problem**: The `core` module should be the lowest level and should not depend on application-specific modules.

- `src/core/bootstrap.ts`:
  - Imports from `cli/module` (line 14)
  - Imports from `config/module` (line 19) 
  - Imports from `process-manager/module` (line 20)
  - Imports from `logger/module` (line 21)
  - Imports from `styling/module` (line 22)
  - Imports from `components/module` (line 28)

- `src/core/view.ts`:
  - Imports from `styling/index` (line 59) - View primitives should not depend on styling

- `src/core/coordination/*.ts`:
  - Multiple files import event types from higher-level modules like `cli/events`, `process-manager/events`, `config/events`, `logger/events`

### 2. JSX importing from application modules

**Problem**: JSX runtime should be independent of specific application features.

- `src/jsx/runtime.ts`:
  - Imports from `config/index` (lines 12-13)
  - Imports from `cli/jsx/components` (line 43)
  - Imports from `plugins/jsx/stores` (line 60)
  - Imports from `cli/jsx/stores` (line 61)

- `src/jsx/app.ts`:
  - Heavy coupling with `cli/jsx/*` and `plugins/jsx/*` modules

### 3. Styling importing from JSX

**Problem**: Styling should not depend on JSX runtime.

- `src/styling/module.ts`:
  - Imports `JSXRenderEvent` from `jsx/events` (line 22)

## Architecture Violations Summary

1. **Bootstrap Anti-pattern**: The bootstrap module in core creates a circular dependency by importing all the modules it's supposed to be independent of.

2. **View-Styling Coupling**: Core view primitives are tightly coupled to the styling system, preventing independent use.

3. **JSX-CLI Coupling**: The JSX runtime is tightly coupled to CLI-specific functionality, making it impossible to use JSX without CLI.

4. **Event Type Dependencies**: Coordination modules depend on concrete event types from application modules instead of defining interfaces.

## Recommended Fixes

1. **Invert Bootstrap Dependencies**:
   - Move bootstrap out of core into a separate `app` or `bootstrap` top-level module
   - Or use dependency injection to pass module constructors to bootstrap

2. **Decouple View from Styling**:
   - Remove styling imports from `core/view.ts`
   - Create a separate `styled-view` module that combines views with styling

3. **Extract JSX-CLI Integration**:
   - Keep JSX runtime pure in the `jsx` module
   - Move CLI-specific JSX components to `cli/jsx`
   - Create a separate integration layer

4. **Use Event Interfaces**:
   - Define event interfaces in core
   - Have application modules implement these interfaces
   - Use type imports only for interfaces, not concrete types

5. **Module Hierarchy**:
   ```
   core/          (no imports from other modules)
   ├── services/  (imports from core only)
   ├── styling/   (imports from core only)
   ├── layout/    (imports from core only)
   ├── reactivity/(imports from core only)
   ├── jsx/       (imports from core, reactivity)
   ├── tea/       (imports from core, services, styling, layout)
   ├── components/(imports from core, services, styling, layout, tea)
   ├── cli/       (imports from all lower levels)
   ├── config/    (imports from core, services)
   ├── logger/    (imports from core, services)
   ├── process-manager/ (imports from core, services)
   └── plugins/   (imports from all)
   ```

## Impact

These violations make it impossible to:
- Use core functionality without pulling in application dependencies
- Test modules in isolation
- Create alternative implementations
- Maintain clear architectural boundaries
- Understand module responsibilities

The current structure creates a "big ball of mud" where everything depends on everything else, defeating the purpose of modular architecture.