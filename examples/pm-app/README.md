# Process Manager Demo

This directory contains a demonstration of the Tuix Process Manager functionality with example services that showcase different behaviors:

## Services

- **worker-logger.ts** - A background worker that logs random messages every few seconds
- **file-watcher.ts** - Watches for file changes and processes them (creates/deletes test files)
- **failing-service.ts** - A service that fails to start, demonstrating error handling

## Running the Demo

```bash
# From the examples/pm-app directory
bun demo.ts
```

This will:
1. Initialize the process manager
2. Load process configurations from `processes.json`
3. Start all processes with retry logic
4. Show process statuses
5. Let them run for 10 seconds
6. Stop all processes cleanly

## What You'll See

- **Successful starts**: worker-logger and file-watcher should start and run normally
- **Failed start**: failing-service will fail with error details
- **Error handling**: The process manager will show detailed error summaries
- **Logs**: All output will be captured in `.tuix/logs/`

## Configuration

The `processes.json` file demonstrates different process configurations:
- Auto-start behavior
- Restart policies (on-failure, never)
- Restart delays
- Process descriptions

This showcases the improved error handling, retry logic, and exit code functionality added to the process manager.