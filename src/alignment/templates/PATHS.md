# Project Paths Documentation

> Note: This file is for projects without a formal module/plugin structure. If your project uses modules, see [MODULES.md](./MODULES.md).

## Directory Structure

```
project-root/
├── src/               # Source code
│   ├── components/    # UI components
│   ├── utils/        # Utility functions
│   ├── services/     # Service layer
│   └── types/        # Type definitions
├── tests/            # Test files
├── docs/             # Documentation
└── examples/         # Example usage
```

## Path Conventions

### Source Organization
- **components/**: Reusable UI elements
- **utils/**: Pure utility functions
- **services/**: Business logic and external integrations
- **types/**: Shared type definitions

### Import Paths
```typescript
// Absolute imports from src
import { Component } from '@/components'
import { util } from '@/utils'

// Relative imports within module
import { helper } from './helper'
```

## File Naming

### General Rules
- Use kebab-case for files
- Group related files in directories
- Colocate tests with source

### Examples
```
✅ Good:
src/
├── user/
│   ├── user-service.ts
│   ├── user-service.test.ts
│   └── user-types.ts

❌ Bad:
src/
├── userService.ts
├── user_service_test.ts
└── UserTypes.ts
```

## Path Aliases

### Configuration
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

### Usage
```typescript
import { Button } from '@components/button'
import { formatDate } from '@utils/date'
```

## Special Paths

### Configuration Files
- `config/`: Application configuration
- `.env`: Environment variables
- `settings/`: User settings

### Generated Files
- `dist/`: Build output
- `coverage/`: Test coverage
- `.cache/`: Temporary cache

### Documentation
- `docs/`: Main documentation
- `api/`: API documentation
- `guides/`: User guides

## Path Guidelines

1. **Consistency**: Use the same patterns throughout
2. **Clarity**: Path should indicate purpose
3. **Depth**: Avoid deeply nested structures
4. **Grouping**: Related files stay together
5. **Isolation**: Each directory has clear ownership