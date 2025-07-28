# Tuix Framework Conventions

## File Naming Conventions

### ⚠️ CRITICAL: Single Implementation Rule
- **ONE VERSION**: Never create multiple versions (-v2, -enhanced, -simple)
- **DESCRIPTIVE NAMES**: Names describe purpose, not complexity level
- **NO QUALIFIERS**: Avoid simple-, basic-, enhanced-, advanced- prefixes

### Naming Rules
- **ALWAYS** use lowercase path-based naming for files and directories
- **EXCEPTIONS**:
  - Use PascalCase for component files (.tsx and .ts files that export components)
  - Use camelCase for store files (userStore.ts, pluginStore.ts)
  - Use UPPERCASE.md for documentation files (README.md, ISSUES.md, PLANNING.md)
- **AVOID** kebab-case in favor of path-based organization (foo/bar instead of foo-bar)
- **EXCEPTION**: Use kebab-case for proper nouns (process-manager) where it's part of the name

### Directory Structure
```
❌ BAD:
module/
├── logger-simple.ts
├── logger-enhanced.ts
├── logger-v2.ts
├── LoggerBase.ts
└── CONSTANTS.ts

✅ GOOD:
module/
├── logger/
│   ├── index.ts      # Public API
│   ├── console.ts    # ConsoleLogger implementation
│   ├── file.ts       # FileLogger implementation
│   ├── types.ts      # Logger interface
│   └── constants.ts  # Logger constants
└── index.ts          # Module exports
```

### File Naming Patterns
- **Components**: PascalCase.tsx/ts (Button.tsx, Modal.tsx, TextInput.tsx)
- **Stores**: camelCase.ts (userStore.ts, pluginStore.ts, configStore.ts)
- **Documentation**: UPPERCASE.md (README.md, ISSUES.md, PLANNING.md)
- **Features**: noun or noun/verb (user.ts, user/validator.ts)
- **Actions**: verb/noun (validate/user.ts, parse/config.ts)
- **Types**: types.ts
- **Tests**: feature.test.ts or feature.spec.ts
- **Constants**: constants.ts
- **Configuration**: config.ts

### Path Conventions
- **Deep Nesting**: Always prefer deep, specific paths over hyphenated names
  ```
  ✅ GOOD: foo/bar/baz/feature.ts
  ❌ BAD:  foo-bar-baz-feature.ts
  ❌ BAD:  foo/bar-baz/feature.ts
  ```
- **Exception**: Proper nouns like process-manager keep their hyphens
- **Redundancy**: Avoid redundant naming
  ```
  ✅ GOOD: logger/console.ts
  ❌ BAD:  logger/console-logger.ts
  ```
- **Index Files**: Use for public APIs and module exports
- **Test Proximity**: Tests live next to implementation
  ```
  feature.ts
  feature.test.ts
  ```

## Code Conventions

### Import Conventions
```typescript
// 1. External dependencies (alphabetical)
import { Effect, pipe } from 'effect'
import * as S from '@effect/schema/Schema'

// 2. Framework imports (alphabetical)
import { View } from '@tuix/core'
import { Button } from '@tuix/components'

// 3. Internal imports (relative paths)
import { logger } from '../logger'
import type { Config } from './types'
```

### Export Conventions
```typescript
// Named exports only (no default exports)
export { myFunction }
export type { MyType }

// Group related exports
export * as utils from './utils'
export * as types from './types'

// Public API through index.ts
// module/index.ts
export { Logger } from './logger'
export type { LoggerConfig } from './types'
```

### Documentation File Naming
All documentation files use UPPERCASE.md:
- `README.md` (not readme.md)
- `CONTRIBUTING.md` (not contributing.md)
- `CHANGELOG.md` (not changelog.md)
- `LICENSE.md` (not license.md or LICENSE.txt)

### Module Documentation Structure
Every module MUST have exactly these documentation files:
```
module/
├── README.md       # Module overview and usage
├── PLANNING.md     # Future work planning
├── ISSUES.md       # Known issues tracking
└── index.ts        # Public API
```

Project-level documentation (root directory only):
```
project-root/
├── RULES.md        # Framework-wide NEVER/ALWAYS rules
├── STANDARDS.md    # Code quality standards
├── CONVENTIONS.md  # File naming conventions
├── DEPENDENCIES.md # Framework dependencies
├── MODULES.md      # Module overview
├── PLUGINS.md      # Plugin system docs
├── CLAUDE.md       # AI assistant instructions
└── README.md       # Project overview
```
## Module Organization

### Standard Module Structure
```
module-name/
├── index.ts            # Public exports only
├── types.ts            # Type definitions
├── errors.ts           # Error types and factories
├── constants.ts        # Module constants
├── feature.ts          # Feature implementation (one per feature)
├── feature.test.ts     # Tests for the feature, beside the code
├── feature.md          # Documentation for the feature, beside the code
├── README.md           # Module documentation
├── PLANNING.md         # Module development planning
├── ISSUES.md           # Module-specific issues tracking
```
- **No impl/ or integrations/ folders.**
- **No tests/ folder.**
- **No one-off scripts or examples.**
- **Integration tests live in `src/tests/integration/`.**
- **Every feature must be in its own file with a matching `.test.ts` and `.md` file.**
- **Code, tests, and docs must always be kept in alignment.**

### Integration Patterns
When integrating with other modules:
```
✅ GOOD: module/integrations/cli/
❌ BAD:  module-cli-integration/

✅ GOOD: scope/jsx/components/
❌ BAD:  scope-jsx-components/
```

## Testing Conventions

### Test File Organization
```typescript
describe('ModuleName', () => {
  describe('FeatureName', () => {
    describe('when condition is true', () => {
      it('should behave correctly', () => {
        // Arrange
        // Act
        // Assert
      })
    })
    
    describe('when condition is false', () => {
      it('should handle error', () => {
        // Test error path
      })
    })
  })
})
```

### Test Naming
- **Files**: `feature.test.ts` (not `feature-test.ts` or `test-feature.ts`)
- **Describes**: Match module/class/function names exactly
- **It blocks**: Start with "should" for clarity

## Git Conventions

### Branch Names
- `feature/descriptive-name`
- `fix/issue-description`
- `docs/what-is-documented`
- `refactor/what-is-refactored`
- `chore/what-maintenance`

### Commit Messages
Follow conventional commits:
```
type(scope): description

feat(auth): add oauth2 integration
fix(logger): resolve memory leak in file writer
docs(api): update authentication examples
test(user): add edge case coverage
refactor(core): simplify event handling
chore(deps): update effect to v2.0
```

## Project Structure

### Top-Level Directories
```
project-root/
├── src/              # Source code
├── plugins/          # Plugin packages
├── tests/            # E2E tests
├── docs/             # Project documentation
├── examples/         # Example applications
├── scripts/          # Build and utility scripts
└── temp/             # Temporary files (gitignored)
```

### Source Organization
```
src/
├── core/             # Core runtime
├── cli/              # CLI framework
├── components/       # UI components
├── jsx/              # JSX runtime
├── services/         # Core services
├── reactivity/       # State management
├── layout/           # Layout algorithms
├── styling/          # Styling system
├── testing/          # Test utilities
└── utils/            # Shared utilities
```

## Configuration Files

### Naming Convention
All configuration files use lowercase with appropriate extensions:
- `package.json` (not Package.json)
- `tsconfig.json` (not TSConfig.json)
- `bunfig.toml` (not Bunfig.toml)
- `.gitignore` (not .GitIgnore)
- `eslint.config.js` (not .eslintrc.js for flat config)

### Store Files
Store files always use camelCase:
- `cliStore.ts` (not cli-store.ts or CliStore.ts)
- `commandStore.ts` (not command-store.ts)
- `pluginStore.ts` (not plugin-store.ts)

## Review Checklist

Before committing:
- [ ] All files use appropriate naming (lowercase paths, PascalCase components, camelCase stores, UPPERCASE.md docs)
- [ ] Path-based organization preferred over hyphens (except proper nouns)
- [ ] No duplicate implementations
- [ ] Clear, descriptive naming
- [ ] Proper directory structure
- [ ] Consistent import/export patterns
- [ ] Documentation files use UPPERCASE.md
- [ ] Tests follow naming conventions
- [ ] No unnecessary hyphens