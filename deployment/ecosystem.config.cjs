/**
 * PM2 Ecosystem Configuration for ACT Projects
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 logs
 *   pm2 monit
 */

const nodePath = '/Users/benknight/.nvm/versions/node/v20.19.3/bin/node';
const npmPath = '/Users/benknight/.nvm/versions/node/v20.19.3/bin/npm';

module.exports = {
  apps: [
    {
      name: 'act-studio',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/act-regenerative-studio',
      env: {
        PORT: 3002,
        NODE_ENV: 'development',
        PATH: process.env.PATH,
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/act-studio-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/act-studio-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'empathy-ledger',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/empathy-ledger-v2',
      env: {
        PORT: 3030,  // Changed from 3001 to match package.json dev script
        NODE_ENV: 'development',
        PATH: process.env.PATH,
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/empathy-ledger-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/empathy-ledger-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'justicehub',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/JusticeHub',
      env: {
        PORT: 3003,
        NODE_ENV: 'development',
        PATH: process.env.PATH,
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/justicehub-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/justicehub-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'harvest',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/The Harvest Website',
      env: {
        PORT: 3004,
        NODE_ENV: 'development',
        PATH: process.env.PATH,
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/harvest-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/harvest-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'act-farm',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/act-farm',
      env: {
        PORT: 3005,
        NODE_ENV: 'development',
        PATH: process.env.PATH,
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/act-farm-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/act-farm-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'placemat',
      script: npmPath,
      args: 'run dev',
      cwd: '/Users/benknight/Code/ACT Placemat',
      env: {
        PORT: 3999,
        NODE_ENV: 'development',
        PATH: process.env.PATH,
        // Redis is optional - placemat will work without it
        REDIS_DISABLE: 'true',
      },
      error_file: '/Users/benknight/act-global-infrastructure/deployment/logs/placemat-error.log',
      out_file: '/Users/benknight/act-global-infrastructure/deployment/logs/placemat-out.log',
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
