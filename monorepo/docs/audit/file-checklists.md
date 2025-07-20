# File Checklists for Comprehensive Audit

## Documentation Files to Review

### Root Documentation
- [ ] `./README.md` - Main project documentation
- [ ] `./docs/README.md` - Documentation index

### Core Documentation ✅ ROUND 3 COMPLETE
- [x] `./docs/core/errors.md` - Error handling documentation ✅ AUDITED
- [x] `./docs/core/runtime.md` - Runtime system documentation ✅ AUDITED
- [x] `./docs/core/view-cache.md` - View caching documentation ✅ AUDITED
- [x] `./docs/core/view.md` - View system documentation ✅ AUDITED

### Guide Documentation
- [ ] `./docs/jsx-cli-guide.md` - JSX CLI usage guide
- [ ] `./docs/jsx-guide.md` - JSX integration guide

### Audit Documentation
- [ ] `./docs/audit/AUDIT_RULES.md` - Audit rules and process
- [ ] `./docs/audit/docs-audit.md` - Master audit document

## Source Files Requiring Tests

### CLI Module (14 files) ✅ ROUND 5 COMPLETE
- [x] `src/cli/config.ts` → needs `src/cli/config.test.ts` ✅ AUDITED
- [x] `src/cli/help.ts` → needs `src/cli/help.test.ts` ✅ AUDITED
- [x] `src/cli/hooks.ts` → needs `src/cli/hooks.test.ts` ✅ AUDITED
- [x] `src/cli/index.ts` → needs `src/cli/index.test.ts` ✅ AUDITED
- [x] `src/cli/lazy-cache.ts` → needs `src/cli/lazy-cache.test.ts` ✅ AUDITED
- [x] `src/cli/lazy.ts` → needs `src/cli/lazy.test.ts` ✅ AUDITED
- [x] `src/cli/loader.ts` → needs `src/cli/loader.test.ts` ✅ AUDITED
- [x] `src/cli/parser.ts` → needs `src/cli/parser.test.ts` ✅ AUDITED
- [x] `src/cli/plugin-test-utils.ts` → needs `src/cli/plugin-test-utils.test.ts` ✅ AUDITED
- [x] `src/cli/plugin.ts` → needs `src/cli/plugin.test.ts` ✅ AUDITED
- [x] `src/cli/registry.ts` → needs `src/cli/registry.test.ts` ✅ AUDITED
- [x] `src/cli/router.ts` → needs `src/cli/router.test.ts` ✅ AUDITED
- [x] `src/cli/runner.ts` → needs `src/cli/runner.test.ts` ✅ AUDITED
- [x] `src/cli/types.ts` → needs `src/cli/types.test.ts` ✅ AUDITED

### Components Module (22 files)
- [x] `src/components/base.ts` → needs `src/components/base.test.ts` ✅ AUDITED
- [x] `src/components/Box.ts` → needs `src/components/Box.test.ts` ✅ AUDITED
- [x] `src/components/builders/Button.ts` → needs `src/components/builders/Button.test.ts` ✅ AUDITED
- [ ] `src/components/builders/index.ts` → needs `src/components/builders/index.test.ts`
- [ ] `src/components/builders/Panel.ts` → needs `src/components/builders/Panel.test.ts`
- [x] `src/components/Button.ts` → needs `src/components/Button.test.ts` ✅ AUDITED
- [x] `src/components/component.ts` → needs `src/components/component.test.ts` ✅ AUDITED
- [ ] `src/components/Exit.ts` → needs `src/components/Exit.test.ts`
- [ ] `src/components/FilePicker.ts` → needs `src/components/FilePicker.test.ts`
- [x] `src/components/Help.ts` → needs `src/components/Help.test.ts` ✅ AUDITED
- [ ] `src/components/index.ts` → needs `src/components/index.test.ts`
- [ ] `src/components/LargeText.ts` → needs `src/components/LargeText.test.ts`
- [ ] `src/components/lifecycle.ts` → needs `src/components/lifecycle.test.ts`
- [ ] `src/components/List.ts` → needs `src/components/List.test.ts`
- [ ] `src/components/MarkdownRenderer.ts` → needs `src/components/MarkdownRenderer.test.ts`
- [ ] `src/components/Modal.ts` → needs `src/components/Modal.test.ts`
- [ ] `src/components/mouse-aware.ts` → needs `src/components/mouse-aware.test.ts`
- [ ] `src/components/ProgressBar.ts` → needs `src/components/ProgressBar.test.ts`
- [ ] `src/components/reactivity.ts` → needs `src/components/reactivity.test.ts`
- [ ] `src/components/Spinner.ts` → needs `src/components/Spinner.test.ts`
- [ ] `src/components/streams/index.ts` → needs `src/components/streams/index.test.ts`
- [ ] `src/components/streams/spawn.ts` → needs `src/components/streams/spawn.test.ts`
- [ ] `src/components/Table.ts` → needs `src/components/Table.test.ts`
- [ ] `src/components/Tabs.ts` → needs `src/components/Tabs.test.ts`
- [ ] `src/components/Text.ts` → needs `src/components/Text.test.ts`
- [ ] `src/components/TextInput.ts` → needs `src/components/TextInput.test.ts`
- [ ] `src/components/Viewport.ts` → needs `src/components/Viewport.test.ts`

### Core Module (10 files, 4 have tests) ✅ ROUND 3 COMPLETE
- [x] `src/core/errors.ts` → has `src/core/errors.test.ts` ✅ AUDITED
- [x] `src/core/index.ts` → needs `src/core/index.test.ts` ✅ AUDITED
- [x] `src/core/interactive.ts` → needs `src/core/interactive.test.ts` ✅ AUDITED
- [x] `src/core/keys.ts` → needs `src/core/keys.test.ts` ✅ AUDITED
- [x] `src/core/runtime.ts` → has `src/core/runtime.test.ts` ✅ AUDITED
- [x] `src/core/schemas.ts` → needs `src/core/schemas.test.ts` ✅ AUDITED
- [x] `src/core/type-utils.ts` → needs `src/core/type-utils.test.ts` ✅ AUDITED
- [x] `src/core/types.ts` → needs `src/core/types.test.ts` ✅ AUDITED
- [x] `src/core/view-cache.ts` → has `src/core/view-cache.test.ts` ✅ AUDITED
- [x] `src/core/view.ts` → has `src/core/view.test.ts` ✅ AUDITED

### Additional Modules (66 more files)
- [ ] `src/health/index.ts` → needs `src/health/index.test.ts`
- [ ] `src/index.ts` → needs `src/index.test.ts`
- [x] `src/jsx-app.ts` → needs `src/jsx-app.test.ts` ✅ AUDITED
- [x] `src/jsx-components.ts` → needs `src/jsx-components.test.ts` ✅ AUDITED
- [x] `src/jsx-render.ts` → needs `src/jsx-render.test.ts` ✅ AUDITED
- [x] `src/jsx-runtime.ts` → needs `src/jsx-runtime.test.ts` ✅ AUDITED

### Layout Module (10 files)
- [ ] `src/layout/box.ts` → needs `src/layout/box.test.ts`
- [ ] `src/layout/dynamic-layout.ts` → needs `src/layout/dynamic-layout.test.ts`
- [ ] `src/layout/flexbox-simple.ts` → needs `src/layout/flexbox-simple.test.ts`
- [ ] `src/layout/flexbox.ts` → needs `src/layout/flexbox.test.ts`
- [ ] `src/layout/grid.ts` → needs `src/layout/grid.test.ts`
- [ ] `src/layout/index.ts` → needs `src/layout/index.test.ts`
- [ ] `src/layout/join.ts` → needs `src/layout/join.test.ts`
- [ ] `src/layout/simple.ts` → needs `src/layout/simple.test.ts`
- [ ] `src/layout/spacer.ts` → needs `src/layout/spacer.test.ts`
- [ ] `src/layout/types.ts` → needs `src/layout/types.test.ts`

### Logger Module (8 files)
- [ ] `src/logger/bun-logger.ts` → needs `src/logger/bun-logger.test.ts`
- [ ] `src/logger/bun-transports.ts` → needs `src/logger/bun-transports.test.ts`
- [ ] `src/logger/components/LogExplorer.ts` → needs `src/logger/components/LogExplorer.test.ts`
- [ ] `src/logger/formatters.ts` → needs `src/logger/formatters.test.ts`
- [ ] `src/logger/index.ts` → needs `src/logger/index.test.ts`
- [ ] `src/logger/logger.ts` → needs `src/logger/logger.test.ts`
- [ ] `src/logger/test-logger.ts` → needs `src/logger/test-logger.test.ts`
- [ ] `src/logger/transports.ts` → needs `src/logger/transports.test.ts`
- [ ] `src/logger/types.ts` → needs `src/logger/types.test.ts`

### Process Manager Module (10 files)
- [ ] `src/process-manager/bun-fs.ts` → needs `src/process-manager/bun-fs.test.ts`
- [ ] `src/process-manager/bun-ipc.ts` → needs `src/process-manager/bun-ipc.test.ts`
- [ ] `src/process-manager/bun-wrapper.ts` → needs `src/process-manager/bun-wrapper.test.ts`
- [ ] `src/process-manager/components/ProcessMonitor.ts` → needs `src/process-manager/components/ProcessMonitor.test.ts`
- [ ] `src/process-manager/doctor.ts` → needs `src/process-manager/doctor.test.ts`
- [ ] `src/process-manager/index.ts` → needs `src/process-manager/index.test.ts`
- [ ] `src/process-manager/ipc.ts` → needs `src/process-manager/ipc.test.ts`
- [ ] `src/process-manager/manager.ts` → needs `src/process-manager/manager.test.ts`
- [ ] `src/process-manager/templates.ts` → needs `src/process-manager/templates.test.ts`
- [ ] `src/process-manager/types.ts` → needs `src/process-manager/types.test.ts`
- [ ] `src/process-manager/wrapper.ts` → needs `src/process-manager/wrapper.test.ts`

### Reactivity Module (2 files)
- [ ] `src/reactivity/index.ts` → needs `src/reactivity/index.test.ts`
- [x] `src/reactivity/runes.ts` → needs `src/reactivity/runes.test.ts` ✅ AUDITED
- [x] `src/runes.ts` → needs `src/runes.test.ts` ✅ AUDITED

### Screenshot Module (7 files)
- [ ] `src/screenshot/capture.ts` → needs `src/screenshot/capture.test.ts`
- [ ] `src/screenshot/external.ts` → needs `src/screenshot/external.test.ts`
- [ ] `src/screenshot/index.ts` → needs `src/screenshot/index.test.ts`
- [ ] `src/screenshot/protocol.ts` → needs `src/screenshot/protocol.test.ts`
- [ ] `src/screenshot/reconstruct.ts` → needs `src/screenshot/reconstruct.test.ts`
- [ ] `src/screenshot/storage.ts` → needs `src/screenshot/storage.test.ts`
- [ ] `src/screenshot/types.ts` → needs `src/screenshot/types.test.ts`

### Services Module (11 files)
- [ ] `src/services/focus.ts` → needs `src/services/focus.test.ts`
- [ ] `src/services/hit-test.ts` → needs `src/services/hit-test.test.ts`
- [ ] `src/services/impl/index.ts` → needs `src/services/impl/index.test.ts`
- [ ] `src/services/impl/input-impl.ts` → needs `src/services/impl/input-impl.test.ts`
- [ ] `src/services/impl/renderer-impl.ts` → needs `src/services/impl/renderer-impl.test.ts`
- [ ] `src/services/impl/storage-impl.ts` → needs `src/services/impl/storage-impl.test.ts`
- [ ] `src/services/impl/terminal-impl.ts` → needs `src/services/impl/terminal-impl.test.ts`
- [ ] `src/services/index.ts` → needs `src/services/index.test.ts`
- [ ] `src/services/input.ts` → needs `src/services/input.test.ts`
- [ ] `src/services/mouse-router.ts` → needs `src/services/mouse-router.test.ts`
- [ ] `src/services/renderer.ts` → needs `src/services/renderer.test.ts`
- [ ] `src/services/storage.ts` → needs `src/services/storage.test.ts`
- [ ] `src/services/terminal.ts` → needs `src/services/terminal.test.ts`

### Styling Module (8 files)
- [ ] `src/styling/advanced.ts` → needs `src/styling/advanced.test.ts`
- [ ] `src/styling/borders.ts` → needs `src/styling/borders.test.ts`
- [ ] `src/styling/color.ts` → needs `src/styling/color.test.ts`
- [ ] `src/styling/gradients.ts` → needs `src/styling/gradients.test.ts`
- [ ] `src/styling/index.ts` → needs `src/styling/index.test.ts`
- [ ] `src/styling/render-optimized.ts` → needs `src/styling/render-optimized.test.ts`
- [ ] `src/styling/render.ts` → needs `src/styling/render.test.ts`
- [ ] `src/styling/style.ts` → needs `src/styling/style.test.ts`
- [ ] `src/styling/types.ts` → needs `src/styling/types.test.ts`

### Testing Module (6 files)
- [ ] `src/testing/e2e-harness.ts` → needs `src/testing/e2e-harness.test.ts`
- [ ] `src/testing/index.ts` → needs `src/testing/index.test.ts`
- [ ] `src/testing/input-adapter.ts` → needs `src/testing/input-adapter.test.ts`
- [ ] `src/testing/simple-harness.ts` → needs `src/testing/simple-harness.test.ts`
- [ ] `src/testing/test-utils.ts` → needs `src/testing/test-utils.test.ts`
- [ ] `src/testing/visual-test.ts` → needs `src/testing/visual-test.test.ts`

### Theming Module (3 files)
- [ ] `src/theming/adaptive-color.ts` → needs `src/theming/adaptive-color.test.ts`
- [ ] `src/theming/index.ts` → needs `src/theming/index.test.ts`
- [ ] `src/theming/theme.ts` → needs `src/theming/theme.test.ts`

### Utils Module (4 files)
- [ ] `src/utils/ansi.ts` → needs `src/utils/ansi.test.ts`
- [ ] `src/utils/index.ts` → needs `src/utils/index.test.ts`
- [ ] `src/utils/string-width-optimized.ts` → needs `src/utils/string-width-optimized.test.ts`
- [ ] `src/utils/string-width.ts` → needs `src/utils/string-width.test.ts`

## Existing Test Files

### Core Module Tests (4 files)
- [ ] `src/core/errors.test.ts` - Test coverage review needed
- [ ] `src/core/runtime.test.ts` - Test coverage review needed
- [ ] `src/core/view-cache.test.ts` - Test coverage review needed
- [ ] `src/core/view.test.ts` - Test coverage review needed

## Summary Statistics
- **Total Source Files**: 122
- **Files with Tests**: 4
- **Files Missing Tests**: 118
- **Test Coverage**: 3.3%
- **Documentation Files**: 10

## Priority Order for Audit
1. **Core Module** - Foundation of the system
2. **Components Module** - User-facing components
3. **Services Module** - Core services
4. **CLI Module** - Command-line interface
5. **JSX/Runtime** - JSX integration
6. **Layout Module** - Layout system
7. **Styling Module** - Styling system
8. **Remaining Modules** - Supporting functionality