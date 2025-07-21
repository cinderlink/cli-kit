# CLI

## Overview

The CLI module provides a powerful framework for building command-line applications with Tuix. It includes command routing, plugin architecture, configuration management, help generation, and lazy loading capabilities.

## Installation

```bash
# CLI is included with tuix
import { cli } from '@tuix/cli'
```

## Quick Start

```typescript
import { cli } from '@tuix/cli'
import { z } from 'zod'

// Define a simple command
cli.command('hello', {
  description: 'Say hello',
  args: {
    name: z.string().optional().describe('Name to greet')
  },
  action: async (args) => {
    return `Hello, ${args.name || 'World'}!`
  }
})

// Run the CLI
cli.run()
```

## Core Concepts

{coreConcepts}

## API Reference

### {mainApiSection}

{apiDetails}

## Examples

### {exampleName}
```typescript
{exampleCode}
```

## Integration

{integrationGuide}

## Testing

```bash
# Run tests
bun test {testPattern}
```

## Contributing

See [contributing.md](../contributing.md) for development setup and guidelines.

## License

MIT