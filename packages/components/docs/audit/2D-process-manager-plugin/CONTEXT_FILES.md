# Context Files for Task 2D: Process Manager Plugin

## Core Plugin Files
- `src/process-manager/` - Existing process manager directory
- `src/cli/plugin.ts` - Plugin system implementation
- `plugins/` - Plugin directory structure

## Process Management Examples
- `examples/bun-process-manager-demo.ts` - Process manager demo
- `examples/process-manager-integration.tsx` - Integration example
- `examples/pm-app/` - Process manager application

## CLI Framework
- `src/cli/index.ts` - CLI framework core
- `src/cli/types.ts` - CLI type definitions
- `src/cli/hooks.ts` - Plugin hooks system
- `src/cli/router.ts` - Command routing
- `src/cli/parser.ts` - Command parsing

## Plugin System
- `src/cli/plugin.ts` - Plugin base implementation
- `src/cli/plugin-test-utils.ts` - Plugin testing utilities
- `src/cli/registry.ts` - Plugin registry
- `src/cli/loader.ts` - Plugin loader

## Services
- `src/services/storage.ts` - For state persistence
- `src/logger/` - Logging integration
- `src/services/terminal.ts` - Terminal output

## Configuration
- `src/cli/config.ts` - Configuration system
- `src/config/` - Configuration utilities
- `processes.json` - Process configuration example

## Testing
- `src/testing/test-utils.ts` - Testing utilities
- Plugin test examples in examples/

## Type Definitions
- `src/core/types.ts` - Core types
- `src/core/schemas.ts` - Schema definitions
- Process manager specific types