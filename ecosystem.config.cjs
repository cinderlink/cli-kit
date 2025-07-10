module.exports = {
  apps: [
    {
      name: 'tuix-test-watcher',
      script: 'bun',
      args: ['test', '--watch'],
      cwd: process.cwd(),
      watch: false,
      log_file: './logs/test-watcher.log',
      out_file: './logs/test-watcher.out.log',
      error_file: './logs/test-watcher.error.log',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: false,  // Don't restart on exit - bun test --watch handles it
      merge_logs: true
    },
    {
      name: 'tuix-typecheck-watcher',
      script: 'scripts/typecheck-watch.ts',
      interpreter: 'bun',
      cwd: process.cwd(),
      watch: false,  // Let the script handle watching
      log_file: './logs/typecheck-watcher.log',
      out_file: './logs/typecheck-watcher.out.log',
      error_file: './logs/typecheck-watcher.error.log',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: false,  // Don't restart on typecheck errors
      merge_logs: true
    },
    {
      name: 'tuix-coverage-watcher',
      script: 'scripts/coverage-watch.ts',
      interpreter: 'bun',
      cwd: process.cwd(),
      watch: false,  // Let the script handle watching
      log_file: './logs/coverage-watcher.log',
      out_file: './logs/coverage-watcher.out.log',
      error_file: './logs/coverage-watcher.error.log',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: false,  // Don't restart on test failures
      merge_logs: true
    },
    {
      name: 'tuix-log-rotator',
      script: 'node',
      args: ['scripts/rotate-logs.js'],
      cwd: process.cwd(),
      watch: false,
      autorestart: true,
      log_file: './logs/log-rotator.log',
      out_file: './logs/log-rotator.out.log',
      error_file: './logs/log-rotator.error.log',
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'development'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};