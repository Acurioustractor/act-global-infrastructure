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
    name: 'meeting-intelligence',
    script: 'scripts/run-meeting-intelligence.mjs',
    args: '--verbose',
    cron_restart: '0 6 * * *', // Daily 6am AEST (after meeting-sync at 5:30am)
  },
  {
    name: 'wiki-watch-meetings',
    script: 'scripts/wiki-watch-meetings.mjs',
    cron_restart: '30 6 * * *', // Daily 6:30am AEST — pulls new meeting records into wiki/raw/
  },
  {
    name: 'wiki-lint',
    script: 'scripts/wiki-lint.mjs',
    args: '--write-report',
    cron_restart: '0 9 * * 1', // Weekly Monday 9am AEST — wiki health report
  },
  {
    name: 'wiki-verify-urls',
    script: 'scripts/wiki-verify-urls.mjs',
    cron_restart: '5 9 * * 1', // Weekly Monday 9:05am AEST — verify GitHub repos + Vercel deploy URLs (before viewer build)
  },
  {
    name: 'wiki-build-viewer',
    script: 'scripts/wiki-build-viewer.mjs',
    cron_restart: '15 9 * * 1', // Weekly Monday 9:15am AEST — regenerate the Wikipedia viewer (after lint + verify-urls)
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
    cron_restart: '0 6 * * *', // Daily 6am AEST (reduced from 6h — health dashboard covers real-time)
  },
  {
    name: 'gmail-watch-renew',
    script: 'scripts/renew-gmail-watch.mjs',
    cron_restart: '0 3 * * *', // Daily 3am AEST (watch expires after 7 days, daily safety margin)
  },
  {
    name: 'gmail-sync',
    script: 'scripts/sync-gmail-to-supabase.mjs',
    args: '--days 1',
    cron_restart: '0 4 * * *', // Daily 4am AEST reconciliation (push handles real-time)
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
    cron_restart: '0 */6 * * *', // Every 6 hours (all accounts via GOOGLE_DELEGATED_USERS)
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
    cron_restart: '0 */2 * * *', // Every 2 hours (reduced from 30min — most insights don't need 30-min freshness)
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
    cron_restart: '15 */6 * * *', // Every 6 hours +15min (after xero-sync at :00)
  },
  {
    name: 'enrich-communications',
    script: 'scripts/enrich-communications.mjs',
    args: '--limit 100',
    cron_restart: '20 */6 * * *', // Every 6h +20min (after gmail-sync at :00, email-to-knowledge at :10)
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
    name: 'weekly-project-pulse',
    script: 'scripts/weekly-project-pulse.mjs',
    cron_restart: '30 5 * * 1', // Monday 5:30am AEST (before daily-briefing at 7am)
  },
  {
    name: 'weekly-digest',
    script: 'scripts/weekly-digest.mjs',
    cron_restart: '0 18 * * 0', // Sunday 6pm AEST
  },
  {
    name: 'push-highlights-notion',
    script: 'scripts/push-highlights-to-notion.mjs',
    cron_restart: '*/30 * * * *', // Every 30 minutes
  },
  {
    name: 'notion-weekly-review',
    script: 'scripts/notion-weekly-review.mjs',
    cron_restart: '0 17 * * 0', // Sunday 5pm AEST (before weekly-digest at 6pm)
  },
  {
    name: 'weekly-relationship-review',
    script: 'scripts/weekly-relationship-review.mjs',
    args: '--verbose',
    cron_restart: '0 18 * * 5', // Friday 6pm AEST
  },
  {
    name: 'project-intelligence',
    script: 'scripts/generate-project-intelligence-snapshots.mjs',
    cron_restart: '0 6 * * *', // Daily 6am AEST (before daily-briefing at 7am)
  },
  {
    name: 'extract-impact',
    script: 'scripts/extract-impact-metrics.mjs',
    cron_restart: '0 3 * * 0', // Sunday 3am AEST (weekly)
  },
  {
    name: 'auto-link-knowledge',
    script: 'scripts/auto-link-knowledge.mjs',
    cron_restart: '0 5 * * *', // Daily 5am AEST (before embed at 5am — runs fast)
  },
  {
    name: 'pipeline-sync',
    script: 'scripts/sync-opportunities-to-unified-pipeline.mjs',
    cron_restart: '30 6 * * *', // Daily 6:30am AEST (after discover-grants at 6am)
  },
  {
    name: 'monthly-financials',
    script: 'scripts/calculate-project-monthly-financials.mjs',
    cron_restart: '0 7 1 * *', // 1st of month at 7am AEST
  },
  {
    name: 'variance-notes',
    script: 'scripts/generate-financial-variance-notes.mjs',
    cron_restart: '0 8 1 * *', // 1st of month at 8am AEST (after monthly-financials)
  },
  {
    name: 'discover-grants',
    script: 'scripts/discover-grants.mjs',
    cron_restart: '0 6 * * *', // Daily 6am AEST
  },
  {
    name: 'enrich-grants',
    script: 'scripts/enrich-grant-opportunities.mjs',
    args: '--batch-size 20',
    cron_restart: '0 7 * * *', // Daily 7am AEST (after discover-grants at 6am)
  },
  // check-grant-deadlines removed — covered by daily briefing grant section + event reactor
  {
    name: 'daily-priorities',
    script: 'scripts/generate-daily-priorities.mjs',
    args: '--verbose',
    cron_restart: '30 6 * * *', // Daily 6:30am AEST (before 7am briefing — scored priority engine)
  },
  {
    name: 'sync-priorities-to-notion',
    script: 'scripts/sync-priorities-to-notion.mjs',
    args: '--verbose',
    cron_restart: '45 6 * * *', // Daily 6:45am AEST (after priorities at 6:30, before briefing at 7)
  },
  {
    name: 'sync-grantscope-matches',
    script: 'scripts/sync-grantscope-matches.mjs',
    cron_restart: '0 5 * * *', // Daily 5am AEST (before priority generation at 6:30am)
  },
{
    name: 'sprint-suggestions',
    script: 'scripts/generate-sprint-suggestions.mjs',
    args: '--verbose',
    cron_restart: '0 7 * * *', // Daily 7am AEST (reduced from 3x — reactor handles urgent items)
  },
  {
    name: 'sync-grants-ghl',
    script: 'scripts/sync-grants-ghl.mjs',
    cron_restart: '15 */6 * * *', // Every 6 hours, 15min after ghl-sync
  },
  {
    name: 'pm2-status-sync',
    script: 'scripts/sync-pm2-status.mjs',
    cron_restart: '* * * * *', // Every minute (lightweight — just reads pm2 jlist + upserts)
  },
  {
    name: 'xero-sync',
    script: 'scripts/sync-xero-to-supabase.mjs',
    args: 'full',
    cron_restart: '0 */6 * * *', // Every 6 hours — keep Xero data fresh for all finance scripts
  },
  {
    name: 'receipt-capture',
    script: 'scripts/capture-receipts.mjs',
    args: '--days 3',
    cron_restart: '30 */6 * * *', // Every 6 hours +30min (after xero-sync at :00)
  },
  {
    name: 'receipt-match',
    script: 'scripts/match-receipts-to-xero.mjs',
    args: '--apply --ai',
    cron_restart: '0 7 * * *', // Daily 7am AEST (after Xero sync)
  },
  {
    name: 'receipt-upload',
    script: 'scripts/upload-receipts-to-xero.mjs',
    cron_restart: '0 8 * * *', // Daily 8am AEST (after matching at 7am)
  },
  {
    name: 'xero-project-tag',
    script: 'scripts/tag-xero-transactions.mjs',
    args: '--apply',
    cron_restart: '0 9 * * *', // Daily 9am AEST (after uploads at 8am)
  },
  {
    name: 'receipt-calendar-suggest',
    script: 'scripts/suggest-receipts-from-calendar.mjs',
    args: '--notify',
    cron_restart: '0 10 * * 1', // Weekly Monday 10am AEST
  },
  {
    name: 'reconciliation-checklist',
    script: 'scripts/generate-reconciliation-checklist.mjs',
    args: '--notify',
    cron_restart: '0 7 1 * *', // 1st of month at 7am AEST
  },
  {
    name: 'collections-autopilot',
    script: 'scripts/chase-overdue-invoices.mjs',
    cron_restart: '0 10 * * 1-5', // Weekdays 10am AEST (after Xero sync + morning briefing)
  },
  {
    name: 'financial-advisor',
    script: 'scripts/financial-advisor-agent.mjs',
    args: '--notify',
    cron_restart: '0 8 * * 1', // Weekly Monday 8am AEST
  },
  {
    name: 'financial-snapshots',
    script: 'scripts/populate-financial-snapshots.mjs',
    args: '--current',
    cron_restart: '0 9 1 * *', // 1st of month at 9am AEST (after Xero sync at 8:30am)
  },
  {
    name: 'finance-daily-briefing',
    script: 'scripts/finance-daily-briefing.mjs',
    cron_restart: '0 7 * * 1-5', // Weekdays 7am AEST (alongside general daily-briefing)
  },
  {
    name: 'finance-health-digest',
    script: 'scripts/finance-engine.mjs',
    args: 'health --notify',
    cron_restart: '0 22 * * 6', // Sunday 8am AEST (Saturday 22:00 UTC)
  },
  {
    name: 'grantscope-to-notion',
    script: 'scripts/sync-grantscope-to-notion.mjs',
    args: '--verbose',
    cron_restart: '0 */3 * * *', // Every 3 hours (new grants don't need 15-min freshness)
  },
  {
    name: 'notion-to-grantscope',
    script: 'scripts/sync-notion-stages-to-grantscope.mjs',
    args: '--verbose',
    cron_restart: '7 */3 * * *', // Every 3 hours +7min (offset from grantscope-to-notion)
  },
];

module.exports = {
  apps: [
    // === Dev Servers ===
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
