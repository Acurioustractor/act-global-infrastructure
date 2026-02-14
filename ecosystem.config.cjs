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
    name: 'contact-signals',
    script: 'scripts/compute-contact-signals.mjs',
    args: '--verbose',
    cron_restart: '0 3 * * *', // Daily 3am AEST (before daily briefing at 7am)
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
  {
    name: 'meeting-sync',
    script: 'scripts/sync-notion-meetings.mjs',
    args: '--days 7',
    cron_restart: '30 5 * * *', // Daily 5:30am AEST (before embed at 6am)
  },
  {
    name: 'knowledge-pipeline',
    script: 'scripts/knowledge-pipeline.mjs',
    args: '--verbose',
    cron_restart: '0 8 * * *', // Daily 8am AEST (after embed-knowledge at 6am UTC/4pm AEST)
  },
  {
    name: 'data-freshness',
    script: 'scripts/data-freshness-monitor.mjs',
    cron_restart: '0 */6 * * *', // Every 6 hours
  },
  {
    name: 'gmail-sync',
    script: 'scripts/sync-gmail-to-supabase.mjs',
    args: '--days 3',
    cron_restart: '0 */6 * * *', // Every 6 hours (4 mailboxes, ~500 msgs per run)
  },
  {
    name: 'goods-auto-tagger',
    script: 'scripts/goods-auto-tagger.mjs',
    args: '--days 7',
    cron_restart: '0 9 * * *', // Daily 9am AEST (after gmail sync and briefing)
  },
  {
    name: 'contact-reconciliation',
    script: 'scripts/reconcile-contacts.mjs',
    args: '--create-contacts --skip-refetch --limit 100',
    cron_restart: '30 */6 * * *', // Every 6 hours (30 min after gmail sync)
  },
  {
    name: 'goods-content-sync',
    script: 'scripts/sync-goods-content-library.mjs',
    args: '--verbose',
    cron_restart: '0 10 * * *', // Daily 10am AEST (after auto-tagger at 9am)
  },
  {
    name: 'calendar-sync',
    script: 'scripts/sync-calendar-full.mjs',
    args: '--since 1m --until 2m --all-calendars',
    cron_restart: '0 */12 * * *', // Every 12 hours
  },
  {
    name: 'notion-calendar-sync',
    script: 'scripts/sync-notion-dates-to-calendar.mjs',
    cron_restart: '0 */6 * * *', // Every 6 hours
  },
  {
    name: 'ghl-sync',
    script: 'scripts/sync-ghl-to-supabase.mjs',
    cron_restart: '0 */6 * * *', // Every 6 hours
  },
  {
    name: 'notion-intelligence',
    script: 'scripts/sync-project-intelligence-to-notion.mjs',
    args: '--verbose',
    cron_restart: '30 7 * * *', // Daily 7:30am AEST (after daily-briefing at 7am)
  },
  {
    name: 'notion-checkbox-poll',
    script: 'scripts/poll-notion-checkboxes.mjs',
    args: '--verbose',
    cron_restart: '*/15 * * * *', // Every 15 minutes
  },
  {
    name: 'mission-control',
    script: 'scripts/sync-mission-control-to-notion.mjs',
    args: '--verbose',
    cron_restart: '0 6,12,18 * * *', // 3x daily: 6am, 12pm, 6pm AEST
  },
  {
    name: 'actions-decisions-sync',
    script: 'scripts/sync-actions-decisions-to-notion.mjs',
    args: '--verbose',
    cron_restart: '*/15 * * * *', // Every 15 minutes (matches checkbox polling)
  },
  // contacts-sync removed — People Directory too noisy, focus on knowledge + meetings
  {
    name: 'generate-insights',
    script: 'scripts/generate-insights.mjs',
    args: '--verbose',
    cron_restart: '*/30 * * * *', // Every 30 minutes
  },
  {
    name: 'finance-sync',
    script: 'scripts/sync-finance-to-notion.mjs',
    args: '--verbose',
    cron_restart: '30 8 * * *', // Daily 8:30am AEST (after knowledge pipeline at 8am)
  },
  {
    name: 'auto-tag-transactions',
    script: 'scripts/tag-transactions-by-vendor.mjs',
    args: '--apply',
    cron_restart: '30 9 * * *', // Daily 9:30am AEST (after finance-sync at 8:30am)
  },
  {
    name: 'email-to-knowledge',
    script: 'scripts/email-to-knowledge.mjs',
    args: '--since 1d --limit 50',
    cron_restart: '10 */6 * * *', // Every 6h +10min (after gmail-sync at :00)
  },
  {
    name: 'auto-tag-emails',
    script: 'scripts/tag-emails-by-project.mjs',
    args: '--apply',
    cron_restart: '15 */6 * * *', // Every 6h +15min (after gmail-sync)
  },
  {
    name: 'auto-align-ghl',
    script: 'scripts/align-ghl-opportunities.mjs',
    args: '--apply --threshold 0.7',
    cron_restart: '0 10 * * *', // Daily 10am AEST
  },
  {
    name: 'project-health',
    script: 'scripts/compute-project-health.mjs',
    args: '--apply',
    cron_restart: '0 */6 * * *', // Every 6 hours
  },
  {
    name: 'engagement-status',
    script: 'scripts/update-engagement-status.mjs',
    args: '--apply',
    cron_restart: '0 11 * * *', // Daily 11am AEST (after GHL align + health)
  },
  {
    name: 'weekly-digest',
    script: 'scripts/weekly-digest.mjs',
    cron_restart: '0 18 * * 0', // Sunday 6pm AEST
  },
  {
    name: 'discover-grants',
    script: 'scripts/discover-grants.mjs',
    cron_restart: '0 6 * * *', // Daily 6am AEST
  },
  {
    name: 'check-grant-deadlines',
    script: 'scripts/check-grant-deadlines.mjs',
    cron_restart: '0 */6 * * *', // Every 6 hours
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
