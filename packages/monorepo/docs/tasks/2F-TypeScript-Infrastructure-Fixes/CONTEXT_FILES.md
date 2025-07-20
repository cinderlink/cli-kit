# Context Files for TypeScript Infrastructure Fixes

## Primary Files Requiring Fixes

### Core Type System Files
```
/packages/plugins/src/core/view.ts
/packages/plugins/src/core/types.ts
/packages/plugins/src/core/errors.ts
/packages/plugins/src/core/runtime.ts
/packages/plugins/src/jsx-runtime.ts
```

### Styling and Color System
```
/packages/plugins/src/styling/color.ts
/packages/plugins/src/styling/types.ts
/packages/plugins/src/styling/style.ts
/packages/plugins/src/styling/render.ts
```

### Component Interface Files
```
/packages/plugins/src/components/base.ts
/packages/plugins/src/components/component.ts
/packages/plugins/src/components/Button.ts
/packages/plugins/src/components/TextInput.ts
/packages/plugins/src/components/Table.ts
/packages/plugins/src/components/Box.ts
/packages/plugins/src/components/Modal.ts
/packages/plugins/src/components/List.ts
/packages/plugins/src/components/Tabs.ts
/packages/plugins/src/components/Viewport.ts
/packages/plugins/src/components/FilePicker.ts
/packages/plugins/src/components/ProgressBar.ts
/packages/plugins/src/components/Spinner.ts
/packages/plugins/src/components/Help.ts
/packages/plugins/src/components/LargeText.ts
/packages/plugins/src/components/Text.ts
```

### JSX Component Files
```
/packages/plugins/src/components/jsx/TextInput.tsx
```

### Layout System Files
```
/packages/plugins/src/layout/types.ts
/packages/plugins/src/layout/box.ts
/packages/plugins/src/layout/grid.ts
/packages/plugins/src/layout/flexbox.ts
/packages/plugins/src/layout/spacer.ts
```

### Service Implementation Files
```
/packages/plugins/src/services/renderer.ts
/packages/plugins/src/services/input.ts
/packages/plugins/src/services/terminal.ts
/packages/plugins/src/services/storage.ts
/packages/plugins/src/services/impl/renderer-impl.ts
/packages/plugins/src/services/impl/input-impl.ts
/packages/plugins/src/services/impl/terminal-impl.ts
/packages/plugins/src/services/impl/storage-impl.ts
```

### CLI Framework Files
```
/packages/plugins/src/cli/types.ts
/packages/plugins/src/cli/plugin.ts
/packages/plugins/src/cli/router.ts
/packages/plugins/src/cli/parser.ts
/packages/plugins/src/cli/config.ts
```

## Configuration Files to Review

### TypeScript Configuration
```
/packages/plugins/tsconfig.json
/packages/plugins/tsconfig.src.json
```

### Package Configuration
```
/packages/plugins/package.json
```

## Test Files for Validation

### Core System Tests
```
/packages/plugins/src/core/errors.test.ts
/packages/plugins/src/core/runtime.test.ts
/packages/plugins/src/core/view.test.ts
/packages/plugins/src/core/view-cache.test.ts
```

## Example Files for Integration Testing

### Component Examples
```
/packages/plugins/examples/button-showcase.ts
/packages/plugins/examples/table-showcase.ts
/packages/plugins/examples/modal-demo.ts
/packages/plugins/examples/filepicker-demo.ts
```

### CLI Examples
```
/packages/plugins/examples/cli/simple-cli.ts
```

### Advanced Examples
```
/packages/plugins/examples/git-dashboard.ts
/packages/plugins/examples/package-manager.ts
/packages/plugins/examples/process-monitor.ts
/packages/plugins/examples/log-viewer.ts
```

## Error Patterns by File Category

### View Namespace Errors (Primary Focus)
- **Files**: `src/core/view.ts`, `src/core/types.ts`, components using View types
- **Patterns**: 
  - `Namespace 'View' has no exported member`
  - `Cannot find namespace 'View'`
  - Import/export conflicts

### Error Class Hierarchy Issues
- **Files**: `src/core/errors.ts`, any files extending error classes
- **Patterns**:
  - `This member must have an 'override' modifier`
  - Incorrect error class inheritance

### Color Type Safety Issues
- **Files**: `src/styling/color.ts`, `src/styling/render.ts`
- **Patterns**:
  - `Object is possibly 'undefined'`
  - Missing null checks in color parsing

### Component Interface Issues
- **Files**: All component files in `src/components/`
- **Patterns**:
  - `Property 'X' is missing in type 'Y'`
  - Interface implementation mismatches

### JSX Runtime Issues
- **Files**: `src/jsx-runtime.ts`, JSX component files
- **Patterns**:
  - `JSX element type 'X' does not have any construct signatures`
  - JSX type mismatches

## Dependencies and Import Chain

### Core Dependencies (Fix First)
1. `src/core/types.ts` → Used by almost everything
2. `src/core/view.ts` → Core view system
3. `src/core/errors.ts` → Error handling throughout

### Secondary Dependencies
1. `src/styling/types.ts` → Used by styling system
2. `src/components/base.ts` → Base for all components
3. `src/jsx-runtime.ts` → JSX system foundation

### Tertiary Dependencies (Fix Last)
1. Individual component implementations
2. Service implementations
3. CLI framework components

## Files to Monitor for Regressions

### Critical Runtime Files
- All files in `src/core/`
- All files in `src/jsx-runtime.ts`
- Base component files

### Integration Points
- `src/index.ts` - Main export file
- Example applications
- Test files

## Build and Validation Commands

### TypeScript Compilation Check
```bash
cd /packages/plugins
bun run tsc --noEmit
```

### Test Suite Validation
```bash
cd /packages/plugins
bun test
```

### Example Validation
```bash
cd /packages/plugins
bun examples/button-showcase.ts
bun examples/cli/simple-cli.ts
```

## Known Good State Reference

The last known working state should be referenced from the git history before the current TypeScript errors were introduced. Use this for comparison when fixing types to ensure we don't break working functionality.