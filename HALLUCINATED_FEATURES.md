# Hallucinated Features in Documentation

This is a quick reference of features that are documented but don't exist in the codebase.

## JSX CLI System (`docs/jsx-cli-guide.md`)

### Non-existent imports:
```typescript
// DOCUMENTED BUT WRONG:
import { jsx, App, Command, Arg, Option, Help } from 'tuix/cli'

// ACTUAL (from examples):
import { jsx, App, Command, Arg, Option } from '../src/cli/components'
// or
import { jsx } from '../src/jsx-app'
```

### Non-existent hooks in context:
- `onMount`, `onDestroy`, `beforeUpdate`, `afterUpdate` - These are documented as available but the actual implementation in jsx-app.ts doesn't provide them in the shown way

## JSX Guide (`docs/jsx-guide.md`)

### Non-existent functions:
```typescript
// DOCUMENTED BUT DON'T EXIST:
createJSXApp()
createJSXPlugin() 
jsxCommand()

// ACTUAL:
// These exist but in src/jsx/app.ts with different signatures
```

### Wrong import paths:
```typescript
// DOCUMENTED:
import { jsx } from "tuix/jsx-app"

// SHOULD BE:
import { jsx } from "tuix/jsx"
// or
import { jsx } from "tuix"
```

## Logger Documentation (`docs/logger.md`)

### Completely fictional plugin system:
```typescript
// DOCUMENTED BUT DOESN'T EXIST:
app.registerPlugin(new LoggerPlugin({...}))
const logger = app.getPlugin('logger')

// ACTUAL:
import { createConsoleLogger } from 'tuix/logger'
const logger = createConsoleLogger('info')
```

### Non-existent features:
- `logger.subscribeToLogs()` - No streaming API
- `logger.getLogHistory()` - No history storage
- `logger.searchLogs()` - No search functionality
- `LogViewer` component - Doesn't exist as shown
- Circular buffer with statistics - Not implemented

## README.md Quick Start

### Wrong imports:
```typescript
// DOCUMENTED:
import { jsx, Plugin, Command, Arg, Flag } from "tuix"

// ACTUAL:
// These aren't all exported from main entry
// Plugin is an intrinsic JSX element, not an import
```

### Non-existent CLI builder:
```typescript
// DOCUMENTED:
const cli = createCLI({...})

// ACTUAL:
// No createCLI function exported
```

## Component Imports

### Missing stream component exports:
```typescript
// DOCUMENTED:
import { Stream, Pipe, Transform } from 'tuix/components/streams'

// ACTUAL:
// No export path for /components/streams
```

## Missing Features Summary

1. **LoggerPlugin** class - Doesn't exist
2. **App plugin system** (`registerPlugin`, `getPlugin`) - Not implemented 
3. **Log streaming/subscription** - Not implemented
4. **Log history and search** - Not implemented
5. **createCLI** function - Not exported
6. **Stream component subpath** - Not in package.json exports
7. **tuix init templates** - Limited or different than documented

## Features That DO Exist (but are documented incorrectly)

1. **JSX Runtime** - Exists in src/jsx/runtime.ts with intrinsic elements
2. **CLI Components** - Exist in src/cli/components/ but with different API
3. **Logger Module** - Exists in src/logger/ but as standalone, not plugin
4. **Process Manager** - Exists and mostly matches documentation
5. **Runes** - Work as documented for state management
6. **Package exports** - Most subpaths are configured in package.json