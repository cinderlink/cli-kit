# Monorepo Packages

> Note: This file is for projects organized as monorepos. If your project uses a modular structure instead, see [MODULES.md](./MODULES.md).

## Package Structure

```
packages/
├── core/              # Core functionality packages
├── components/        # UI component packages
├── plugins/          # Plugin packages
├── utils/            # Utility packages
└── apps/             # Application packages
```

## Core Packages

### @monorepo/package-name
**Version**: 1.0.0
**Purpose**: Brief description
**Status**: Stable | Beta | Experimental

Dependencies:
- Internal: `@monorepo/other-package`
- External: `external-package`

## Package Guidelines

### Creating New Packages
1. Create directory in appropriate category
2. Initialize with package.json
3. Add required documentation
4. Set up build configuration
5. Configure testing
6. Update this file

### Package Standards
- Independent versioning
- Minimal dependencies
- Clear interfaces
- Comprehensive tests
- Full documentation

### Inter-Package Communication
- Use workspace protocol
- Explicit dependencies
- No circular dependencies
- Version compatibility

## Development Workflow

### Local Development
```bash
# Install all dependencies
bun install

# Build all packages
bun run build

# Test all packages
bun test

# Run specific package
bun --filter @monorepo/package-name run dev
```

### Publishing
```bash
# Version packages
bun run changeset

# Publish packages
bun run release
```

## Package Templates

Place package template files in each package root as needed.