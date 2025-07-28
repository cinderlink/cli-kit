/**
 * Process Configuration Templates
 *
 * Common patterns for different types of processes
 */

import type { ProcessConfig } from './types'

/**
 * Template for development servers that have their own file watching
 */
export const devServerTemplate = (options: {
  name: string
  port: number
  command?: string
  args?: string[]
}): ProcessConfig => ({
  name: options.name,
  command: options.command || 'bun',
  args: options.args || ['run', 'dev'],
  autostart: true,
  autorestart: true,
  restartDelay: 3000,
  maxRestarts: 5,
  watch: false, // Dev servers handle their own watching
  healthCheck: {
    type: 'http',
    url: `http://localhost:${options.port}`,
    expectedStatus: [200, 404],
    interval: 30000,
    timeout: 5000,
    retries: 3,
    startPeriod: 15000,
  },
  maxMemory: 2048,
  maxCpu: 80,
  env: {
    NODE_ENV: 'development',
    PORT: options.port.toString(),
  },
})

/**
 * Template for API servers
 */
export const apiServerTemplate = (options: {
  name: string
  port: number
  script: string
  watch?: boolean
}): ProcessConfig => ({
  name: options.name,
  command: 'bun',
  args: ['run', options.script],
  autostart: true,
  autorestart: true,
  restartDelay: 2000,
  maxRestarts: 10,
  watch: options.watch ?? true,
  watchPaths: ['./src', './config'],
  ignoreWatch: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**', '**/.git/**'],
  watchDebounce: 1000,
  healthCheck: {
    type: 'http',
    url: `http://localhost:${options.port}/health`,
    method: 'GET',
    expectedStatus: [200],
    interval: 30000,
    timeout: 5000,
    retries: 3,
  },
  maxMemory: 1024,
  maxCpu: 70,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: options.port.toString(),
  },
})

/**
 * Template for background workers
 */
export const workerTemplate = (options: {
  name: string
  script: string
  concurrency?: number
  watch?: boolean
}): ProcessConfig => ({
  name: options.name,
  command: 'bun',
  args: ['run', options.script],
  autostart: true,
  autorestart: true,
  restartDelay: 5000,
  maxRestarts: 5,
  watch: options.watch ?? true,
  watchPaths: ['./src/workers', './src/lib'],
  watchDebounce: 2000,
  healthCheck: {
    type: 'output',
    outputPattern: 'Worker started|Ready to process|Listening for jobs',
    interval: 60000,
    timeout: 10000,
    retries: 2,
    startPeriod: 10000,
  },
  maxMemory: 512,
  maxCpu: 50,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    WORKER_CONCURRENCY: (options.concurrency || 1).toString(),
  },
})

/**
 * Template for database processes
 */
export const databaseTemplate = (options: {
  name: string
  port: number
  dataDir: string
  type: 'postgres' | 'mysql' | 'redis' | 'mongodb'
}): ProcessConfig => {
  const commands: Record<typeof options.type, { command: string; args: string[] }> = {
    postgres: {
      command: 'postgres',
      args: ['-D', options.dataDir, '-p', options.port.toString()],
    },
    mysql: {
      command: 'mysqld',
      args: ['--datadir', options.dataDir, '--port', options.port.toString()],
    },
    redis: {
      command: 'redis-server',
      args: ['--port', options.port.toString(), '--dir', options.dataDir],
    },
    mongodb: {
      command: 'mongod',
      args: ['--dbpath', options.dataDir, '--port', options.port.toString()],
    },
  }

  const { command, args } = commands[options.type]

  return {
    name: options.name,
    command,
    args,
    autostart: true,
    autorestart: true,
    restartDelay: 5000,
    maxRestarts: 3,
    watch: false, // Never watch database files
    healthCheck: {
      type: 'tcp',
      host: 'localhost',
      port: options.port,
      interval: 30000,
      timeout: 5000,
      retries: 3,
      startPeriod: 30000, // Databases can take time to start
    },
    env: {
      // Database-specific env vars
    },
  }
}

/**
 * Template for build/compile watchers
 */
export const buildWatcherTemplate = (options: {
  name: string
  command: string
  args?: string[]
}): ProcessConfig => ({
  name: options.name,
  command: options.command,
  args: options.args || [],
  autostart: false, // Usually started manually
  autorestart: true,
  restartDelay: 1000,
  maxRestarts: 3,
  watch: false, // Build tools have their own watching
  healthCheck: {
    type: 'output',
    outputPattern: 'Watching for file changes|Build completed|Compiled successfully',
    interval: 60000,
    retries: 2,
  },
  maxMemory: 2048,
  maxCpu: 100, // Build tools can use full CPU
  env: {
    NODE_ENV: 'development',
  },
})

/**
 * Template for test runners
 */
export const testRunnerTemplate = (options: {
  name: string
  framework: 'jest' | 'vitest' | 'mocha' | 'bun'
  watch?: boolean
}): ProcessConfig => {
  const commands: Record<typeof options.framework, { command: string; args: string[] }> = {
    jest: {
      command: 'npx',
      args: ['jest', options.watch ? '--watch' : '--watchAll=false'],
    },
    vitest: {
      command: 'npx',
      args: ['vitest', options.watch ? '' : 'run'],
    },
    mocha: {
      command: 'npx',
      args: ['mocha', options.watch ? '--watch' : ''],
    },
    bun: {
      command: 'bun',
      args: ['test', options.watch ? '--watch' : ''],
    },
  }

  const { command, args } = commands[options.framework]

  return {
    name: options.name,
    command,
    args: args.filter(Boolean),
    autostart: false,
    autorestart: false,
    watch: false, // Test runners handle their own watching
    healthCheck: {
      type: 'output',
      outputPattern: 'Test Suites:|Tests:|PASS|✓',
      interval: 120000,
    },
    maxMemory: 1024,
    maxCpu: 80,
    env: {
      NODE_ENV: 'test',
    },
  }
}

/**
 * Template for WebSocket servers
 */
export const websocketTemplate = (options: {
  name: string
  port: number
  script: string
  watch?: boolean
}): ProcessConfig => ({
  name: options.name,
  command: 'bun',
  args: ['run', options.script],
  autostart: true,
  autorestart: true,
  restartDelay: 2000,
  maxRestarts: 10,
  watch: options.watch ?? true,
  watchPaths: ['./src/websocket', './src/handlers'],
  watchDebounce: 1000,
  healthCheck: {
    type: 'tcp',
    host: 'localhost',
    port: options.port,
    interval: 30000,
    timeout: 3000,
    retries: 3,
  },
  maxMemory: 512,
  maxCpu: 60,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    WS_PORT: options.port.toString(),
  },
})

/**
 * Template for scheduled jobs/cron tasks
 */
export const scheduledJobTemplate = (options: {
  name: string
  script: string
  schedule?: string
}): ProcessConfig => ({
  name: options.name,
  command: 'bun',
  args: ['run', options.script],
  autostart: true,
  autorestart: true,
  restartDelay: 60000, // Wait 1 minute before restart
  maxRestarts: 3,
  watch: false, // Scheduled jobs shouldn't restart on file change
  healthCheck: {
    type: 'output',
    outputPattern: 'Scheduler started|Next run at|Job scheduled',
    interval: 300000, // Check every 5 minutes
    timeout: 10000,
  },
  maxMemory: 256,
  maxCpu: 30,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    SCHEDULE: options.schedule || '0 * * * *', // Default hourly
  },
})

/**
 * Create a custom configuration by merging template with overrides
 */
export function createConfig(
  template: ProcessConfig,
  overrides: Partial<ProcessConfig>
): ProcessConfig {
  return {
    ...template,
    ...overrides,
    env: {
      ...template.env,
      ...overrides.env,
    },
    healthCheck: overrides.healthCheck || template.healthCheck,
  }
}

/**
 * Example usage:
 *
 * const viteServer = createConfig(
 *   devServerTemplate({ name: 'vite', port: 5173 }),
 *   {
 *     args: ['run', 'vite', '--host'],
 *     maxMemory: 4096
 *   }
 * )
 *
 * const apiServer = apiServerTemplate({
 *   name: 'api',
 *   port: 3000,
 *   script: 'src/server.ts',
 *   watch: true
 * })
 *
 * const emailWorker = workerTemplate({
 *   name: 'email-worker',
 *   script: 'src/workers/email.ts',
 *   concurrency: 5
 * })
 */
