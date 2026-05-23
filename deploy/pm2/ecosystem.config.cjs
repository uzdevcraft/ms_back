const path = require('node:path');

const appRoot = path.resolve(__dirname, '../..');

module.exports = {
  apps: [
    {
      name: 'telegram-marketplace-api',
      script: path.join(appRoot, 'dist/server.js'),
      cwd: appRoot,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      time: true,
      merge_logs: true,
      out_file: path.join(appRoot, 'logs/out.log'),
      error_file: path.join(appRoot, 'logs/err.log'),
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
