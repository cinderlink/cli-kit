# Bun Development Rules

## Core Principle

**BUN FIRST**: Always use Bun APIs and tools over Node.js alternatives.

## Required Tools

### Runtime and Package Management
- ✅ USE: `bun <file>` instead of `node <file>` or `ts-node <file>`
- ✅ USE: `bun install` instead of `npm install`, `yarn install`, or `pnpm install`
- ✅ USE: `bun run <script>` instead of `npm run <script>`
- ✅ USE: `bun test` instead of `jest`, `vitest`, or other test runners
- ✅ USE: `bun build` instead of `webpack`, `vite`, or `esbuild`

### Development Workflow
```bash
# ✅ CORRECT development commands
bun install                 # Install dependencies
bun run dev                # Development server
bun test                   # Run tests
bun test --watch          # Watch mode testing
bun run tsc --noEmit      # Type checking
bun build                 # Production build
```

## Required APIs

### File Operations
```typescript
// ❌ WRONG: Node.js APIs
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'

// ✅ CORRECT: Bun APIs
const file = Bun.file('path/to/file.txt')
const content = await file.text()
const bytes = await file.bytes()
const exists = await file.exists()

// Writing files
await Bun.write('output.txt', 'content')
await Bun.write('data.json', JSON.stringify(data))
```

### Process Execution
```typescript
// ❌ WRONG: External process libraries
import { exec } from 'child_process'
import { spawn } from 'node:child_process'
import { execa } from 'execa'

// ✅ CORRECT: Bun shell
const result = await Bun.$`ls -la`
const output = await Bun.$`git status`.text()
const files = await Bun.$`find . -name "*.ts"`.lines()
```

### Database Access
```typescript
// ❌ WRONG: External database libraries
import Database from 'better-sqlite3'
import { Client } from 'pg'
import Redis from 'ioredis'

// ✅ CORRECT: Bun native APIs
import { Database } from 'bun:sqlite'
const db = new Database('myapp.sqlite')

// For PostgreSQL
const db = Bun.sql`postgresql://user:pass@host:5432/db`

// For Redis
const redis = Bun.redis`redis://localhost:6379`
```

### Web APIs
```typescript
// ❌ WRONG: Express and external web frameworks
import express from 'express'
import { createServer } from 'http'

// ✅ CORRECT: Bun.serve()
const server = Bun.serve({
  port: 3000,
  
  // Route handling
  routes: {
    '/': (req) => new Response('Hello, World!'),
    '/api/users/:id': {
      GET: (req) => Response.json({ id: req.params.id }),
      POST: async (req) => {
        const body = await req.json()
        return Response.json({ created: body })
      }
    }
  },
  
  // WebSocket support (built-in)
  websocket: {
    open: (ws) => ws.send('Connected!'),
    message: (ws, message) => ws.send(`Echo: ${message}`),
    close: (ws) => console.log('Disconnected')
  }
})
```

### Environment and Configuration
```typescript
// ❌ WRONG: dotenv package
import 'dotenv/config'
import { config } from 'dotenv'

// ✅ CORRECT: Bun automatically loads .env
// No imports needed, just use process.env
const dbUrl = process.env.DATABASE_URL
const apiKey = process.env.API_KEY
```

## Testing with Bun

### Test Setup
```typescript
// ✅ CORRECT: Bun test imports
import { test, expect, describe, beforeEach, afterEach } from 'bun:test'

describe('Component tests', () => {
  beforeEach(() => {
    // Setup
  })
  
  test('should work correctly', () => {
    expect(true).toBe(true)
  })
  
  afterEach(() => {
    // Cleanup
  })
})
```

### Performance Testing
```typescript
// ✅ CORRECT: Bun bench for performance tests
import { bench } from 'bun:test'

bench('fast operation', () => {
  // Code to benchmark
})

bench('complex computation', () => {
  // Performance-critical code
}, { iterations: 1000 })
```

### Test Commands
```bash
# ✅ CORRECT test commands
bun test                    # Run all tests
bun test --watch           # Watch mode
bun test Button.test.ts    # Run specific test
bun test --coverage        # With coverage report
```

## Build and Bundle

### Frontend Development
```typescript
// ✅ CORRECT: HTML imports with Bun bundler
// index.html
<html>
  <body>
    <script type="module" src="./app.tsx"></script>
    <link rel="stylesheet" href="./styles.css">
  </body>
</html>

// app.tsx - Bun will automatically transpile and bundle
import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css' // CSS imports work directly

const App = () => <h1>Hello, World!</h1>
createRoot(document.body).render(<App />)
```

### Build Commands
```bash
# ✅ CORRECT build commands
bun build ./src/index.ts --outdir ./dist  # TypeScript build
bun build ./index.html --outdir ./dist    # HTML with bundling
bun build ./app.ts --target browser       # Browser target
bun build ./server.ts --target bun        # Bun runtime target
```

## Development Servers

### Basic Server
```typescript
// ✅ CORRECT: Bun development server
export default {
  port: 3000,
  development: {
    hmr: true,        # Hot module reload
    console: true     # Console output
  },
  
  fetch(req) {
    return new Response('Hello from Bun!')
  }
}
```

### With Hot Reload
```bash
# ✅ CORRECT: Hot reload command
bun --hot ./server.ts
```

## Common Mistakes

### Using Node.js Patterns
```typescript
// ❌ WRONG: Node.js specific patterns
import { readFileSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

// ✅ CORRECT: Bun equivalents
const file = Bun.file('./config.json')
const content = await file.json()
const result = await Bun.$`ls`
```

### Unnecessary Polyfills
```typescript
// ❌ WRONG: Adding Node.js polyfills for Bun
import { Buffer } from 'buffer'
import { process } from 'process'

// ✅ CORRECT: These are built into Bun
// No imports needed, they're global
const buffer = Buffer.from('hello')
const env = process.env.NODE_ENV
```

### Wrong Package Manager
```bash
# ❌ WRONG: Using other package managers
npm install express
yarn add typescript
pnpm install --frozen-lockfile

# ✅ CORRECT: Use Bun
bun install
bun add express
bun add -d typescript
```

## Performance Benefits

### Why Bun APIs Are Better
- **Faster startup**: Native APIs avoid JS→C++ bridge overhead
- **Better memory usage**: Optimized for Bun's JavaScriptCore engine
- **Fewer dependencies**: Reduce package.json size
- **Native integration**: Better error messages and debugging

### Benchmarks to Consider
```typescript
// ✅ GOOD: Benchmark Bun vs Node equivalents
import { bench } from 'bun:test'

bench('Bun.file vs fs.readFile', async () => {
  await Bun.file('large-file.txt').text()
})

bench('Bun.$ vs child_process', async () => {
  await Bun.$`echo "hello"`
})
```

## Configuration Files

### package.json Scripts
```json
{
  "scripts": {
    "dev": "bun --hot ./src/index.ts",
    "build": "bun build ./src/index.ts --outdir ./dist",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "bun run tsc --noEmit"
  }
}
```

### bunfig.toml (Bun Configuration)
```toml
[install]
registry = "https://registry.npmjs.org"
exact = true

[test]
coverage = true
timeout = 5000
```

## Migration Guide

### From Node.js Project
1. **Replace runtime**: Use `bun` instead of `node`
2. **Update scripts**: Change package.json scripts to use Bun
3. **Replace APIs**: Migrate Node APIs to Bun equivalents  
4. **Update tests**: Use `bun:test` instead of Jest/Vitest
5. **Remove dependencies**: Delete packages that Bun provides natively

### From Other Bundlers
1. **Remove bundler**: Delete webpack/vite configuration
2. **Update build**: Use `bun build` commands
3. **Simplify HTML**: Use direct imports, let Bun handle bundling
4. **Update dev server**: Use `bun --hot` or `Bun.serve()`

## Related Documentation

- [Type Safety Rules](../../rules/type-safety.md) - TypeScript with Bun
- [Testing Rules](../../rules/testing.md) - Testing with `bun:test`
- [Development Process](../../processes/development.md) - Bun workflow integration