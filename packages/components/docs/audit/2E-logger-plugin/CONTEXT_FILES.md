# Context Files for Task 2E: Logger Plugin

## Core Logger Files
- `src/logger/` - Existing logger directory
- `docs/logger.md` - Logger documentation
- `bin/tuix-logs.ts` - Log viewing utility

## Plugin System
- `src/cli/plugin.ts` - Plugin base class
- `src/cli/types.ts` - Plugin type definitions
- `src/cli/hooks.ts` - Plugin hooks
- `src/cli/registry.ts` - Plugin registry

## Related Components
- `src/components/LogViewer.ts` - For log display integration
- `src/components/Text.ts` - For console output
- `src/styling/color.ts` - For colored output

## Services
- `src/services/storage.ts` - For file operations
- `src/services/terminal.ts` - For console output
- `src/core/errors.ts` - Error handling patterns

## Configuration
- `src/cli/config.ts` - Configuration system
- `src/config/` - Configuration utilities
- `src/core/schemas.ts` - Schema validation

## Examples
- `examples/cli/simple-cli.ts` - CLI integration example
- `examples/plugins/` - Plugin examples

## Testing
- `src/testing/test-utils.ts` - Testing utilities
- `src/cli/plugin-test-utils.ts` - Plugin testing

## Type System
- `src/core/types.ts` - Core types
- `src/core/type-utils.ts` - Type utilities
- Logger-specific types to be created

## Performance
- `src/utils/` - Utility functions
- Benchmarking utilities for performance testing