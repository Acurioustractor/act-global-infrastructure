const CWD = '/Users/benknight/Code/act-global-infrastructure';

// AEST = UTC+10, cron uses system local time (AEST on this machine)
const cronScripts = [
  {
    name: 'imessage-sync',
    script: 'scripts/sync-imessage.mjs',
    args: '--no-images',
    cron_restart: '*/15 * * * *', // Every 15 minutes
  },
  {
    name: 'embed-imessages',
    script: 'scripts/embed-imessages.mjs',
    cron_restart: '0 5 * * *', // Daily 5am AEST
  },
  {
    name: 'detect-episodes',
    script: 'scripts/detect-episodes.mjs',
    cron_restart: '0 6 * * *', // Daily 6am AEST
  },
  {
    name: 'daily-briefing',
    script: 'scripts/daily-briefing.mjs',
    cron_restart: '0 7 * * *', // Daily 7am AEST
  },
  {
    name: 'storyteller-sync',
    script: 'scripts/sync-storytellers-to-ghl.mjs',
    cron_restart: '30 4 * * *', // Daily 4:30am AEST (before embed)
  },
  {
    name: 'storyteller-link',
    script: 'scripts/link-storytellers-to-contacts.mjs',
    cron_restart: '45 4 * * *', // Daily 4:45am AEST (after sync)
  },
  {
    name: 'notion-sync',
    script: 'scripts/sync-notion-to-supabase.mjs',
    args: '--hours 1',
    cron_restart: '*/5 * * * *', // Every 5 minutes (near real-time)
  },
  {
    name: 'agent-learning',
    script: 'scripts/agent-learning-job.mjs',
    cron_restart: '0 2 * * *', // Daily 2am AEST (before storyteller sync)
  },
];

module.exports = {
  apps: [
    // === Dev Servers ===
    {
      name: 'act-api',
      script: 'packages/act-dashboard/api-server.mjs',
      cwd: CWD,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      env: {
        NODE_ENV: 'development'
      },
      error_file: '/tmp/act-api-error.log',
      out_file: '/tmp/act-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'act-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: CWD + '/apps/command-center',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'development'
      },
      error_file: '/tmp/act-frontend-error.log',
      out_file: '/tmp/act-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },

    // === Scheduled Scripts ===
    ...cronScripts.map(s => ({
      name: s.name,
      script: s.script,
      args: s.args || '',
      cwd: CWD,
      cron_restart: s.cron_restart,
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: `/tmp/${s.name}-error.log`,
      out_file: `/tmp/${s.name}-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    })),
  ]
}
