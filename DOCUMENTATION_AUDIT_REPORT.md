# Documentation Audit Report

## Overview
This report identifies discrepancies between documentation and actual implementation in the Tuix (formerly @cinderlink/cli-kit) codebase.

## Key Findings

### 1. JSX CLI Guide (`docs/jsx-cli-guide.md`)

The documentation references a JSX CLI system that doesn't match the actual implementation:

#### Non-existent imports and APIs:
- `import { jsx, App, Command, Arg, Option, Help } from 'tuix/cli'` - This import path doesn't exist
- The actual JSX app system is in `src/jsx-app.ts` with different exports
- The documented component structure (`<App>`, `<Command>`, `<Arg>`) doesn't match the actual implementation

#### Actual implementation:
- JSX runtime is in `src/jsx/runtime.ts` 
- CLI components are in `src/cli/components/` but have different structure
- The jsx-app.ts uses a different API pattern with `jsx()` function that returns an Effect

### 2. JSX Guide (`docs/jsx-guide.md`)

#### Hallucinated APIs:
- `createJSXApp`, `createJSXPlugin`, `jsxCommand` - These are mentioned but implemented differently
- `import { jsx } from "tuix/jsx-app"` - The actual import would be from the main package
- The guide shows a different initialization pattern than what's implemented

#### Missing clarification:
- The actual JSX system uses declarative plugin registration through `<Plugin>` and `<Command>` intrinsic elements
- The runtime processes these during JSX evaluation for side effects

### 3. Logger Documentation (`docs/logger.md`)

#### Incorrect plugin system:
- Documents `LoggerPlugin` as a class-based plugin for an app.registerPlugin() system
- Actual implementation has no LoggerPlugin class
- The logger is a standalone module, not a plugin

#### Non-existent APIs:
- `app.registerPlugin()` - No such method exists
- `app.getPlugin('logger')` - Plugin system works differently
- Real-time streaming APIs like `subscribeToLogs()` don't exist as documented

#### Actual logger:
- Logger is in `src/logger/` with `createConsoleLogger()` and other factory functions
- Uses Effect.ts layers and services, not a plugin architecture
- No built-in log history or streaming capabilities as documented

### 4. README.md Issues

#### Import paths that don't exist:
- `import { jsx, Plugin, Command, Arg, Flag } from "tuix"` - These aren't exported from the main entry
- `import { createCLI, z } from 'tuix'` - createCLI isn't in the main exports
- Module paths like `tuix/components/streams` aren't set up correctly

#### Incorrect examples:
- The quick start example uses JSX elements that don't match the actual implementation
- Plugin registration pattern shown doesn't match the declarative JSX plugin system

### 5. Examples Referencing Non-existent Features

Several example files use APIs that don't exist:
- `examples/jsx-cli-demo.tsx` imports from paths that don't exist
- Uses `Help` component that isn't exported as shown
- Component structure doesn't match documented patterns

### 6. Missing Core Documentation

Important features that exist but aren't well documented:
- The actual JSX declarative plugin system using `<Plugin>` elements
- How the jsx runtime processes plugin registration as side effects
- The real CLI framework architecture in `src/cli/`
- Effect.ts integration patterns

### 7. Outdated Test References

The codebase had many test files deleted (visible in git status), but documentation still references testing patterns and coverage requirements that may not align with current test structure.

## Recommendations

1. **Update jsx-cli-guide.md** to reflect the actual JSX CLI system implementation
2. **Rewrite logger.md** to document the actual logger module, not a fictional plugin system  
3. **Fix README.md** examples to use correct import paths and APIs
4. **Add documentation** for the real plugin system using JSX declarative elements
5. **Create accurate examples** that can actually be run
6. **Document the Effect.ts** integration patterns used throughout
7. **Update or remove** references to deleted test files

### 8. Process Manager Documentation (`docs/process-manager.md`)

The process manager documentation appears to be accurate and the APIs exist as documented. However:
- Import paths shown (`tuix/process-manager`) assume a specific package export structure
- The integration with config system is documented correctly

### 9. Component Import Paths

Throughout the documentation, component imports are shown as:
- `import { Text, Button, Box } from 'tuix/components'`
- `import { Stream, Pipe } from 'tuix/components/streams'`

But the actual structure would require these to be exported from the main package or have proper path exports configured in package.json.

### 10. Missing Package.json Exports Configuration

The documentation assumes subpath exports like:
- `tuix/cli`
- `tuix/components`  
- `tuix/process-manager`
- `tuix/logger`

But package.json would need proper "exports" field configuration for these to work.

## Impact

These documentation issues will cause significant confusion for users trying to use the library. The examples won't run, the import paths don't work, and the documented APIs don't exist. This needs to be addressed before the 1.0.0 release.

## Additional Notes

1. **Working Examples**: Some examples like `simple-jsx-cli.tsx` use relative imports that work, but the documentation shows package imports that won't work without proper configuration.

2. **JSX System**: The actual JSX system exists but works differently than documented:
   - Uses intrinsic elements in jsx/runtime.ts
   - Has a plugin registry for declarative plugin definition
   - Processes JSX for side effects during evaluation

3. **CLI Framework**: The core CLI framework in src/cli/ is functional but the JSX integration layer (jsx-app.ts) doesn't match what's documented.

4. **Package Exports**: Good news - package.json does have proper exports configured for subpaths like `tuix/cli`, `tuix/components`, etc. However:
   - Some documented imports still don't match (e.g., `import { jsx, App, Command } from 'tuix/cli'` should be from different paths)
   - The stream components path `tuix/components/streams` isn't exported

5. **tuix init Command**: The jsx-guide.md references `tuix init` command with templates, but this functionality appears to be minimal or different in the actual CLI.