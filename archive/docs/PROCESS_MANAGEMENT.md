# Process Management & Logging

Complete process management and logging system for development workflows.

## Quick Start

```bash
# Start development environment
tuix dev --services typecheck,test-watch --interactive

# Monitor processes interactively
tuix pm status --watch --timeout 30

# View merged logs from multiple services
tuix logs --merge typecheck,test-watch --filter "error|warn"

# Wait for specific events
tuix logs test-watch --wait --until "pass|fail" --timeout 60
```

## Process Management

### Commands

```bash
# Service management
tuix pm start <service> [--preset <type>]     # Start with preset (vitest, vite, tsc, eslint, bun)
tuix pm stop <service>                        # Graceful shutdown
tuix pm restart <service>                     # Restart service
tuix pm status [service] [--watch]            # Status (interactive with --watch)
tuix pm logs <service> [--follow]             # Service logs
tuix pm groups [start|stop] [group]           # Group operations

# Development environment
tuix dev [start|stop|status]                 # Complete dev environment
tuix dev --services typecheck,lint,build     # Custom service selection
tuix dev --coverage --interactive            # With coverage and monitoring
```

### Service Presets

| Preset   | Command                        | Health Check           | Log Format |
|----------|--------------------------------|------------------------|------------|
| `vitest` | `bun test --watch`             | Test completion        | Test colors|
| `vite`   | `bun run dev`                  | Server ready           | Build logs |
| `tsc`    | `bun run tsc --noEmit --watch` | Error count            | TS errors  |
| `eslint` | `bun run lint --watch`         | Lint completion        | Lint format|
| `bun`    | `bun test --watch`             | Test results           | Bun format |

### Example Configuration

```typescript
// Saved to processes.json automatically
{
  "name": "typecheck",
  "command": "bun run tsc --noEmit --watch",
  "autorestart": false,
  "group": "quality",
  "logPreset": "tsc",
  "healthCheck": {
    "pattern": "Found \\d+ errors|No errors found",
    "timeout": 10000
  }
}
```

## Log Management

### Commands

```bash
# Basic log viewing
tuix logs <service>                           # Recent logs
tuix logs <service> --interactive             # Rich TUI explorer
tuix logs <service> --tail [--timeout 30]     # Follow logs

# Advanced filtering & processing
tuix logs <service> --filter "error|warn"     # Regex filter
tuix logs <service> --preset vitest           # Tool-specific formatting
tuix logs --merge service1,service2           # Combined logs
tuix logs <service> --wait --until "ready"    # Wait for event
```

### Log Presets & Formatting

Each preset provides intelligent color coding and pattern recognition:

- **Vitest**: Test results, coverage, pass/fail detection
- **Vite**: Build status, HMR updates, server ready
- **TypeScript**: Error highlighting, compilation status  
- **ESLint**: Lint results, error/warning classification
- **Bun**: Test output, benchmark results

### Interactive Features

- **LogExplorer**: Expandable entries, search, filters
- **ProcessMonitor**: Real-time TUI with stats and logs
- **Health Checks**: Automatic readiness detection
- **Event Waiting**: Block until specific log patterns appear

## Configuration

### Global Options

```bash
--timeout <seconds>     # Auto-stop watchers (AI assistant friendly)
--interactive, -i       # Start interactive TUI mode
--coverage, -c          # Enable test coverage collection
```

### Service Groups

```bash
# Predefined groups
tuix pm groups start development    # Start all dev services
tuix pm groups stop quality         # Stop linting/typecheck
```

Groups are automatically created and can include:
- `development`: Main dev services
- `testing`: Test runners
- `quality`: Linting, type checking
- `build`: Build processes

## Integration Examples

### Replace PM2 Setup

```bash
# Old: pm2 start ecosystem.config.js
# New: 
tuix dev --services typecheck,test-watch,lint

# Old: pm2 logs app --lines 100
# New:
tuix logs app --tail --filter "error"

# Old: pm2 stop all  
# New:
tuix dev stop
```

### CI/CD Integration

```bash
# Wait for tests to complete
tuix logs test-runner --wait --until "Tests completed" --timeout 300

# Check for build success
if tuix logs build --wait --until "✓.*built" --timeout 120; then
  echo "Build successful"
else 
  echo "Build failed"
  exit 1
fi
```

### Development Workflow

```bash
# Start full development environment
tuix dev --services typecheck,test-watch,lint --interactive

# In another terminal, monitor specific issues
tuix logs --merge typecheck,lint --filter "error" --tail

# Wait for tests to pass before deploying
tuix logs test-watch --wait --until "All tests passed" --timeout 180
```

## Advanced Features

- **Persistent State**: Process logs and configuration survive CLI restarts
- **Health Monitoring**: Automatic detection of service readiness
- **Dependency Management**: Service startup ordering and dependencies
- **Resource Tracking**: Memory and CPU usage monitoring
- **Event Correlation**: Cross-service log analysis and pattern matching
- **Graceful Shutdown**: Proper cleanup and state saving on exit

## Best Practices

1. **Use Presets**: Always specify `--preset` for known tools
2. **Group Related Services**: Organize services into logical groups
3. **Health Checks**: Let services fully start before depending on them
4. **Interactive Monitoring**: Use `--watch` and `--interactive` for development
5. **Event-Driven Workflows**: Use `--wait --until` for automation
6. **Timeout AI Commands**: Always use `--timeout` for automated tooling

---

Built with Bun, Effect.ts, and rich terminal UI components.