# Process Manager Best Practices

## When to Use File Watching

### ❌ Don't Use File Watching For:

1. **Development servers with built-in watching**
   - Vite, webpack-dev-server, Next.js, etc.
   - These tools have optimized HMR/file watching
   - Adding external watching causes conflicts

2. **Test runners with watch mode**
   - Jest --watch, Vitest --watch, etc.
   - They handle their own file monitoring

3. **Build tools with watch mode**
   - TypeScript tsc --watch
   - ESBuild --watch
   - Rollup --watch

### ✅ Use File Watching For:

1. **Simple scripts without built-in watching**
   ```typescript
   {
     name: 'api-server',
     command: 'bun',
     args: ['run', 'server.ts'],
     watch: true,
     watchPaths: ['./src/api'],
     ignoreWatch: ['**/*.test.ts', '**/node_modules/**']
   }
   ```

2. **Background workers**
   ```typescript
   {
     name: 'email-worker',
     command: 'bun',
     args: ['run', 'workers/email.ts'],
     watch: true,
     watchDebounce: 2000 // Wait 2s after changes
   }
   ```

3. **Custom services**
   ```typescript
   {
     name: 'websocket-server',
     command: 'bun',
     args: ['run', 'ws-server.ts'],
     watch: true,
     watchPaths: ['./src/websocket'],
     watchDebounce: 1000
   }
   ```

## Health Check Strategy

### Choose the Right Health Check Type

1. **HTTP Health Checks** - For web services
   ```typescript
   healthCheck: {
     type: 'http',
     url: 'http://localhost:3000/health',
     expectedStatus: [200, 204],
     interval: 30000,
     timeout: 5000,
     retries: 3
   }
   ```

2. **TCP Health Checks** - For databases, cache servers
   ```typescript
   healthCheck: {
     type: 'tcp',
     host: 'localhost',
     port: 6379,
     interval: 30000,
     timeout: 3000
   }
   ```

3. **Output Pattern Checks** - For services with startup messages
   ```typescript
   healthCheck: {
     type: 'output',
     outputPattern: 'Server started|Listening on|Ready',
     interval: 60000,
     startPeriod: 10000
   }
   ```

4. **Custom Script Checks** - For complex health verification
   ```typescript
   healthCheck: {
     type: 'script',
     script: 'bun run health-check.ts',
     interval: 45000,
     timeout: 10000
   }
   ```

## Resource Management

### Set Appropriate Limits

```typescript
{
  // Memory limit depends on service type
  maxMemory: 512,   // API servers: 512MB-1GB
  maxMemory: 2048,  // Build tools: 2GB-4GB
  maxMemory: 256,   // Simple workers: 256MB-512MB
  
  // CPU limits prevent runaway processes
  maxCpu: 80,       // Leave 20% for system
  maxCpu: 50,       // For background workers
  maxCpu: 100,      // For build processes (temporary spikes OK)
}
```

### Environment Variables

```typescript
{
  env: {
    // Node.js memory settings
    NODE_OPTIONS: '--max-old-space-size=2048',
    
    // Increase file descriptor limits
    UV_THREADPOOL_SIZE: '16',
    
    // Development vs Production
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Service-specific
    PORT: '3000',
    DATABASE_URL: process.env.DATABASE_URL
  }
}
```

## Process Groups

### Organize Related Services

```typescript
// Core services that must run together
pm.createGroup({
  name: 'core',
  processes: ['api', 'database', 'cache'],
  startOrder: 'sequential', // Start in order
  stopOrder: 'sequential'   // Stop in reverse order
})

// Optional development tools
pm.createGroup({
  name: 'dev-tools',
  processes: ['typescript-check', 'linting', 'tests'],
  startOrder: 'parallel'
})

// All services
pm.createGroup({
  name: 'all',
  processes: ['api', 'database', 'cache', 'workers', 'dev-tools']
})
```

## Error Handling

### Restart Strategies

```typescript
{
  // Quick restart for transient failures
  autorestart: true,
  restartDelay: 1000,
  maxRestarts: 5,
  
  // Slower restart for persistent issues
  autorestart: true,
  restartDelay: 5000,
  maxRestarts: 3,
  
  // No restart for one-time tasks
  autorestart: false
}
```

### Crash Recovery

```typescript
// Monitor for crash loops
pm.on('process:stopped', (event) => {
  const proc = pm.status(event.process)
  if (proc.restarts >= 3) {
    // Alert on repeated crashes
    console.error(`Process ${event.process} crashing repeatedly`)
    // Could trigger alerts, notifications, etc.
  }
})
```

## Logging Best Practices

### Log Rotation

```typescript
{
  // Use external log rotation
  logFile: `logs/${name}-${new Date().toISOString().split('T')[0]}.log`,
  
  // Or integrate with logging service
  env: {
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json'
  }
}
```

### Structured Logging

```typescript
// In your application
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'api',
  message: 'Request processed',
  metadata: { userId, requestId, duration }
}))
```

## Production Deployment

### 1. Use Specific Versions

```typescript
{
  // Development
  command: 'bun',
  args: ['run', 'dev'],
  
  // Production - use specific versions
  command: '/usr/local/bin/bun',
  args: ['run', '--production', 'server.ts'],
  env: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'error'
  }
}
```

### 2. Graceful Shutdown

```typescript
// In your application
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')
  
  // Stop accepting new connections
  server.close()
  
  // Wait for existing connections
  await waitForConnections()
  
  // Clean up resources
  await db.close()
  
  process.exit(0)
})
```

### 3. Zero-Downtime Deployments

```typescript
// Blue-green deployment pattern
const blueConfig = { name: 'api-blue', port: 3000 }
const greenConfig = { name: 'api-green', port: 3001 }

// Deploy new version
await pm.add(greenConfig)
await pm.start('api-green')

// Wait for health check
await waitForHealthy('api-green')

// Switch traffic (update load balancer)
await updateLoadBalancer('api-green')

// Stop old version
await pm.stop('api-blue')
```

## Monitoring Integration

### Metrics Collection

```typescript
pm.on('process:stats', (event) => {
  // Send to monitoring service
  prometheus.gauge('process_cpu_usage', event.data.cpu, {
    process: event.process
  })
  
  prometheus.gauge('process_memory_bytes', event.data.memory, {
    process: event.process
  })
})
```

### Health Status

```typescript
pm.on('process:unhealthy', (event) => {
  // Send alerts
  alerting.send({
    severity: 'warning',
    title: `Process ${event.process} unhealthy`,
    description: event.data.message,
    runbook: `https://docs.example.com/runbooks/${event.process}`
  })
})
```

## Common Patterns

### 1. Development Setup

```typescript
// All-in-one development
export const devConfig: ProcessConfig = {
  name: 'dev',
  command: 'bun',
  args: ['run', 'dev:all'],
  healthCheck: {
    type: 'output',
    outputPattern: 'Ready for connections'
  },
  // No file watching - dev script handles it
  watch: false
}
```

### 2. Microservices

```typescript
// API Gateway
export const gatewayConfig: ProcessConfig = {
  name: 'gateway',
  command: 'bun',
  args: ['run', 'gateway/index.ts'],
  port: 3000,
  healthCheck: {
    type: 'http',
    url: 'http://localhost:3000/health'
  },
  dependencies: ['auth-service', 'user-service']
}
```

### 3. Background Jobs

```typescript
// Cron-like jobs
export const schedulerConfig: ProcessConfig = {
  name: 'scheduler',
  command: 'bun',
  args: ['run', 'scheduler.ts'],
  healthCheck: {
    type: 'output',
    outputPattern: 'Scheduler running'
  },
  // Restart on failure but not file changes
  autorestart: true,
  watch: false
}
```

## Troubleshooting Tips

1. **Start Simple** - Get basic process management working first
2. **Add Health Checks** - Gradually add health monitoring
3. **Monitor Resources** - Watch for memory leaks and CPU spikes
4. **Use Doctor Command** - Let it diagnose and fix common issues
5. **Check Logs** - Most issues are visible in process logs

## Security Considerations

1. **Environment Variables** - Never commit sensitive data
   ```typescript
   env: {
     API_KEY: process.env.API_KEY, // Load from environment
     DATABASE_URL: process.env.DATABASE_URL
   }
   ```

2. **File Permissions** - Restrict access to logs and PID files
   ```bash
   chmod 600 logs/*
   chmod 600 .pids/*
   ```

3. **Network Security** - Bind to localhost for internal services
   ```typescript
   args: ['--host', '127.0.0.1', '--port', '3000']
   ```

Remember: The best configuration depends on your specific needs. Start simple and add complexity as needed!