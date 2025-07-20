# Tuix Framework Conventions

## File Naming Conventions

### ⚠️ CRITICAL: Single Implementation Rule
- **ONE VERSION**: Never create multiple versions (-v2, -enhanced, -simple)
- **DESCRIPTIVE NAMES**: Names describe purpose, not complexity level
- **NO QUALIFIERS**: Avoid simple-, basic-, enhanced-, advanced- prefixes

### Naming Rules
- **ALWAYS** use kebab-case for files and directories
- **NEVER** use PascalCase, camelCase, or snake_case for files
- **NEVER** use UPPERCASE except in content (README content is ok, README.md filename is not)

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
- **Features**: noun or noun-verb (user.ts, user-validator.ts)
- **Actions**: verb-noun (validate-user.ts, parse-config.ts)
- **Types**: types.ts or feature-types.ts
- **Tests**: feature.test.ts or feature.spec.ts
- **Constants**: constants.ts or feature-constants.ts
- **Configuration**: config.ts or feature-config.ts

### Path Conventions
- **Deep Nesting**: Prefer deep, specific paths over hyphenated names
  ```
  ✅ GOOD: foo/bar/baz/feature.ts
  ❌ BAD:  foo/bar-baz-feature.ts
  ```
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
All documentation files use lowercase kebab-case:
- `readme.md` (not README.md)
- `contributing.md` (not CONTRIBUTING.md)
- `changelog.md` (not CHANGELOG.md)
- `license.md` (not LICENSE or LICENSE.txt)

### Module Documentation Structure
Every module MUST have these files:
```
module/
├── readme.md       # Module overview and usage
├── rules.md        # Module-specific rules
├── standards.md    # Code and quality standards
├── conventions.md  # Naming and patterns
├── issues.md       # Known issues tracking
├── planning.md     # Future work planning
├── dependencies.md # Dependency documentation
└── index.ts        # Public API
```

## Module Organization

### Standard Module Structure
```
module-name/
├── index.ts              # Public exports only
├── types.ts              # Type definitions
├── errors.ts             # Error types and factories
├── constants.ts          # Module constants
├── impl/                 # Internal implementation
│   ├── core.ts
│   ├── helpers.ts
│   └── utils.ts
├── tests/                # Test files
│   ├── unit/
│   │   ├── core.test.ts
│   │   └── helpers.test.ts
│   └── integration/
│       └── module.test.ts
├── integrations/         # Cross-module integration
│   ├── cli/             # CLI integration
│   │   └── commands.ts
│   └── jsx/             # JSX integration
│       └── components.tsx
└── docs/                 # Module documentation
    ├── readme.md
    ├── rules.md
    └── ...
```

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

## Review Checklist

Before committing:
- [ ] All files use kebab-case
- [ ] No duplicate implementations
- [ ] Clear, descriptive naming
- [ ] Proper directory structure
- [ ] Consistent import/export patterns
- [ ] Documentation files lowercase
- [ ] Tests follow naming conventions
- [ ] No unnecessary nesting or hyphens