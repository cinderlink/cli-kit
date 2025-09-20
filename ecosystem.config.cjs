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
    }
  ]
};
