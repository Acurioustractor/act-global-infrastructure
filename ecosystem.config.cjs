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
    name: 'xero-bank-balances',
    script: 'scripts/sync-xero-bank-balances.mjs',
    cron_restart: '0 6 * * *', // Daily 6am AEST — refresh bank closing balances (Reports/BankSummary) BEFORE the 7am briefings + 8:13 daily-pulse. Was manual-only until 2026-05-27, so cash ran ~27d stale ($586K shown vs true ~$130K). Balance-only upsert — no transaction re-tag risk.
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
    // Phase 1 mirror — Supabase v_canonical_contacts → Notion DB (ADR 2026-05-14).
    // Notion Workers admin CLI is blocked on this account, so we run the same
    // sync as a regular PM2 cron. Same outcome, same DB, different runtime.
    name: 'notion-canonical-contacts',
    script: 'scripts/sync-canonical-contacts-to-notion.mjs',
    args: '--apply',
    cron_restart: '20 * * * *', // Hourly at :20 — offset from notion-sync at :*/5
  },
  {
    // Weekly Monday 8:30am AEST digest — posts a "Weekly Digest YYYY-MM-DD"
    // page under Mission Control summarising money / pipeline / stories /
    // actions / cadence. The Notion AI-indexable surface for Ben + Nic to
    // read first thing on a Monday.
    name: 'notion-weekly-digest',
    script: 'scripts/notion-weekly-digest.mjs',
    args: '--apply',
    cron_restart: '30 8 * * 1', // Weekly Monday 8:30am AEST
  },
  {
    // Weekly Monday 7:55am AEST: cross-repo digest of what shipped in the
    // last 7 days across all 9 ACT codebases, grouped by `Plan: <slug>`
    // commit trailer. Pushes into Notion page cfg.ecosystemDigest. Lands
    // before notion-weekly-digest (8:30) so ecosystem context arrives first.
    name: 'ecosystem-digest',
    script: 'scripts/weekly-ecosystem-digest.mjs',
    args: '--notion',
    cron_restart: '55 7 * * 1', // Weekly Monday 7:55am AEST
  },
  {
    // Daily 06:35am AEST: drain the quiet-hours Telegram queue. Anything
    // queued during 21:00-06:30 (held by scripts/lib/telegram.mjs) gets
    // consolidated + sent as ONE morning summary. See
    // thoughts/shared/plans/telegram-noise-audit-2026-05-23.md
    name: 'telegram-queue-drain',
    script: 'scripts/drain-telegram-queue.mjs',
    cron_restart: '35 6 * * *',
  },
  {
    // Daily 7:00am AEST: cross-codebase activity feed (last 24h).
    // Scans 6 ACT codebases for commits w/ Plan trailers, new wiki/plan/
    // decision/handoff files. Pulls EL stories + wiki_pages from shared
    // Supabase. Output to thoughts/shared/cross-codebase-feed/<date>.json
    // + latest.{json,md}. Substrate for newsletter selectors, bot RAG,
    // and ask-act.mjs.
    name: 'cross-codebase-feed',
    script: 'scripts/build-cross-codebase-feed.mjs',
    args: '--since 1d',
    cron_restart: '0 7 * * *',
  },
  {
    // Daily 7:30am AEST (30min after cross-codebase-feed completes):
    // Sync the feed into newsletter_candidates Supabase table. Computes
    // auto_audiences via source-type deterministic rule. Status='proposed'
    // on first insert; subsequent runs upsert (won't overwrite human
    // include/exclude/defer status).
    // Plan: act-communication-pipeline-2026-05-23-locked
    name: 'newsletter-candidates-sync',
    script: 'scripts/sync-feed-to-newsletter-candidates.mjs',
    cron_restart: '30 7 * * *',
  },
  {
    // Daily 7:35am AEST: push new candidates from Supabase → Notion
    // (Newsletter candidates DB). Creates a row per new candidate so Ben
    // can tap include/exclude/defer in Notion's UI.
    name: 'newsletter-candidates-to-notion',
    script: 'scripts/sync-candidates-to-notion.mjs',
    args: '--apply',
    cron_restart: '35 7 * * *',
  },
  {
    // Business hours every 30 min: read Notion status taps back to Supabase.
    // Status changes (include/exclude/defer) + audiences overrides flow
    // back here so the drafter sees them.
    name: 'newsletter-status-from-notion',
    script: 'scripts/sync-notion-candidate-status.mjs',
    args: '--apply',
    cron_restart: '0,30 9-18 * * *',
  },
  {
    // Every 10 min: push newsletter drafts (Supabase) → Notion drafts DB.
    // Drafts arrive in Notion soon after the drafter creates them. Ben
    // reviews + picks subject + edits + marks send-ready in Notion.
    name: 'newsletter-drafts-to-notion',
    script: 'scripts/sync-drafts-to-notion.mjs',
    args: '--apply',
    cron_restart: '*/10 * * * *',
  },
  {
    // Daily 06:00am AEST: rebuild the supporter intelligence view.
    // Joins Xero invoices + funders.json + GHL contacts into one row per
    // supporter org. Output: supporters_intelligence Supabase table +
    // thoughts/shared/reports/supporters-intelligence-latest.json.
    name: 'supporters-intelligence',
    script: 'scripts/build-supporters-intelligence.mjs',
    cron_restart: '0 6 * * *',
  },
  {
    // Daily 06:05am AEST (5min after the build above): push the supporter
    // intelligence to Notion "Supporters" DB. Notion becomes the human
    // surface for tier + outstanding alerts + framing notes per org.
    name: 'supporters-to-notion',
    script: 'scripts/sync-supporters-to-notion.mjs',
    args: '--apply',
    cron_restart: '5 6 * * *',
  },
  {
    // Daily 06:10am AEST: roll up GHL opportunities into project_pipelines
    // (project_code × pipeline_name). Output: project_pipelines Supabase
    // table + thoughts/shared/reports/project-pipelines-latest.{json,md}.
    // Watchlist (bot-scraped research grants) are project_code='WATCH' and
    // excluded from project totals.
    name: 'project-pipelines',
    script: 'scripts/build-project-pipelines.mjs',
    cron_restart: '10 6 * * *',
  },
  {
    // Daily 06:15am AEST: aggregate communications_history into supporter_comms_summary
    // (per email-domain rollup: last_touch_at, last_touch_channel, in/out 30d, waiting count).
    // Feeds the /supporters command-center page + the needs-reply nudge below.
    name: 'supporter-comms',
    script: 'scripts/build-supporter-comms.mjs',
    cron_restart: '15 6 * * *',
  },
  {
    // Daily 07:15am AEST: Telegram nudge for CRITICAL outstanding supporters
    // that haven't been touched in 14+ days. Pulls from /api/supporters.
    name: 'supporters-nudge',
    script: 'scripts/nudge-supporters-critical.mjs',
    cron_restart: '15 7 * * *',
  },
  {
    // Daily 7am AEST: refresh "🎯 Today's Focus" + sweep for drift signals
    // (stuck opps · overdue invoices · FAIL cadence · easy-win storyteller
    // transcripts) and auto-create new Action Items rows.
    name: 'notion-daily-focus',
    script: 'scripts/notion-daily-focus.mjs',
    args: '--apply',
    cron_restart: '0 7 * * *', // Daily 7am AEST
  },
  {
    // Daily 7:30am AEST: phone-first daily focus push to Ben's Telegram.
    // Runs after notion-daily-focus so the data is fresh.
    name: 'telegram-daily-focus',
    script: 'scripts/telegram-daily-focus.mjs',
    args: '--apply',
    cron_restart: '30 7 * * *', // Daily 7:30am AEST
  },
  {
    // Nightly 11pm AEST: pull Notion Contacts changes (Tags + Projects)
    // back to ghl_contacts so the next morning's outbound sync respects
    // any tagging Ben did in Notion. Closes the round-trip.
    name: 'notion-inbound-contacts',
    script: 'scripts/sync-notion-inbound-contacts.mjs',
    args: '--apply',
    cron_restart: '0 23 * * *', // Daily 11pm AEST
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
    name: 'quarterly-rd-checklist',
    script: 'scripts/create-quarterly-rd-checklist.mjs',
    cron_restart: '0 9 1 1,4,7,10 *', // 9am AEST on 1 Jan / 1 Apr / 1 Jul / 1 Oct — quarterly R&D founder discipline checklist
  },
  {
    name: 'weekly-reconciliation',
    script: 'scripts/weekly-reconciliation.mjs',
    args: '',  // auto-detects current quarter
    cron_restart: '0 8 * * 1', // Weekly Monday 8am AEST — reconciliation report + Telegram
  },
  // CRON ORDER (2026-05-08 reshuffle, see thoughts/shared/reviews/notion-finance-dashboard-2026-05-08.md):
  //   8:15  dashboard-hub      — full-page replace, writes nav + Right now / Quick actions
  //   8:18  daily-pulse        — adds "📡 Today's Pulse" section at top
  //   8:20  opportunities-db
  //   8:25  pile-pages
  //   8:30  cash-forecast
  //   8:35  kpis
  //   8:40  budget-actual
  //   8:45  cash-scenarios
  //   8:50  money-metrics-snapshot
  //   8:55  planning-rhythm
  //   9:00  entity-hub
  //   9:10  money-framework    — section-replace (LAST: appends panels at bottom)
  // The ordering matters: dashboard-hub does full-page replace, money-framework
  // does marker-based section-replace. If money-framework ran first, the hub
  // would wipe its panels. With this order both coexist on moneyFramework.
  // 2026-05-21 S5 — Money-stack orchestrator replaces 11 separate Mon-morning cron entries.
  // Single entry runs sync-money-stack.mjs at 8:15 Mon, which sequentially invokes all 11
  // sync-*-to-notion scripts in dependency order. Benefits: one log, halt-on-fail support
  // (--halt-on-fail flag), order changes happen in the script not by tweaking 11 cron strings.
  // The 11 individual entries below are commented out — to revert, uncomment them and remove
  // this orchestrator entry.
  {
    name: 'money-stack-sync',
    script: 'scripts/sync-money-stack.mjs',
    cron_restart: '15 8 * * 1', // Weekly Monday 8:15am AEST — orchestrates all 11 sync-*-to-notion scripts in order
  },
  {
    name: 'dashboard-hub-sync',
    script: 'scripts/sync-money-dashboard-hub.mjs',
    // cron_restart: '15 8 * * 1',  // 2026-05-21 S5: superseded by money-stack-sync orchestrator
    autorestart: false,
  },
  {
    name: 'act-now-sync',
    script: 'scripts/cron-act-now.mjs',
    cron_restart: '11 8 * * *', // Daily 8:11am AEST — wrapper: refreshes Notion child page (35bebcf9...) AND renders act-now.html into apps/command-center/public/, auto-commits + pushes if HTML changed (Vercel auto-redeploys https://command.act.place/act-now.html). See thoughts/shared/handoffs/2026-05-09-one-stop-shop-diagnostic.md.
  },
  {
    name: 'daily-pulse-sync',
    script: 'scripts/sync-daily-pulse-to-notion.mjs',
    cron_restart: '13 8 * * *', // Daily 8:13am AEST — "Today's Pulse" at top of moneyFramework (bank, runway, today's actions)
  },
  // 2026-05-21 S5: The 10 entries below are superseded by money-stack-sync orchestrator above.
  // Kept (with autorestart:false) so PM2 doesn't lose them on reload — easier to restore.
  {
    name: 'opportunities-db-sync',
    script: 'scripts/sync-opportunities-to-notion-db.mjs',
    autorestart: false,
  },
  {
    name: 'pile-pages-sync',
    script: 'scripts/sync-pile-pages-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'cash-forecast-sync',
    script: 'scripts/sync-cash-forecast-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'kpis-sync',
    script: 'scripts/sync-kpis-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'budget-actual-sync',
    script: 'scripts/sync-budget-vs-actual-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'cash-scenarios-sync',
    script: 'scripts/sync-cash-scenarios-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'money-metrics-snapshot',
    script: 'scripts/sync-money-metrics-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'planning-rhythm-sync',
    script: 'scripts/sync-planning-rhythm-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'entity-hub-sync',
    script: 'scripts/sync-entity-hub-to-notion.mjs',
    autorestart: false,
  },
  {
    name: 'money-framework-sync',
    script: 'scripts/sync-money-framework-to-notion.mjs',
    autorestart: false,
  },
  // 2026-05-21 QW4 — Telegram daily-push consolidation (Option A).
  // Reason: 3 overlapping Telegram messages each morning. Kept telegram-daily-focus (7:30)
  // as the single phone-first push. Snapshot scripts still run (data lands in command-center),
  // they just don't post.
  // To revert: uncomment cron_restart on daily-money-briefing + re-add args:'--telegram' below.
  {
    name: 'daily-money-briefing',
    script: 'scripts/daily-money-briefing.mjs',
    // cron_restart: '0 8 * * *',  // 2026-05-21 QW4: disabled (overlaps telegram-daily-focus 7:30)
    autorestart: false,
  },
  {
    name: 'money-command-digest',
    script: 'scripts/money-command-digest.mjs',
    args: '',  // 2026-05-21 QW4: dropped --telegram (snapshot still runs, just no push)
    cron_restart: '15 8 * * *', // Daily 8:15am AEST — snapshot /finance/command (coverage, drift, 90d incoming, lifetime)
  },
  {
    name: 'compliance-snapshot',
    script: 'scripts/build-compliance-calendar.mjs',
    cron_restart: '0 7 * * *', // Daily 7am AEST — rebuild compliance snapshot before alerts cron at 7:30
  },
  {
    name: 'compliance-alerts',
    script: 'scripts/compliance-alerts.mjs',
    cron_restart: '30 7 * * *', // Daily 7:30am AEST — fires Telegram only when T-30/T-7/T-1 lead time matches exactly
  },
  {
    name: 'compliance-notion-sync',
    script: 'scripts/sync-compliance-calendar-to-notion.mjs',
    cron_restart: '45 7 * * *', // Daily 7:45am AEST — push latest snapshot to Notion mirror page (no-op if NOTION_COMPLIANCE_PAGE_ID unset)
  },
  {
    name: 'idea-board-reminders',
    script: 'scripts/idea-board-reminders.mjs',
    cron_restart: '0 8 * * *', // Daily 8am AEST — per-owner DM with stale ideas + inline buttons (idea 90d, scope 30d, fundraise 14d). Cap 5 per DM.
  },
  {
    name: 'telegram-money-alerts',
    script: 'scripts/telegram-money-alerts.mjs',
    cron_restart: '0 13 * * *', // Daily 1pm AEST — afternoon alert (silent if nothing actionable)
  },
  {
    name: 'weekly-money-digest',
    script: 'scripts/weekly-money-digest.mjs',
    cron_restart: '0 15 * * 5', // Weekly Friday 3:00pm AEST — Friday Money Digest (week wins, burns, stale, actions)
  },
  {
    // Sonnet 4.6 reads the money-command data + week deltas and writes the
    // "5 things to know this week" narrative in Curtis voice. Writes to
    // wiki/cockpit/weekly-narrative-YYYY-MM-DD.md and Telegram.
    name: 'weekly-narrative',
    script: 'scripts/narrate-weekly-digest.mjs',
    args: '--telegram',
    cron_restart: '15 15 * * 5', // Weekly Friday 3:15pm AEST — after weekly-money-digest at 3:00pm
  },
  {
    // Single-entry replacement for the Mon 5:30-9:10 chain (6 separate PM2
    // entries). Runs each step in sequence with failure isolation — one
    // step failing doesn't stop the rest. Single Telegram summary at the
    // end + wiki/cockpit/monday-chain-YYYY-MM-DD.md log.
    //
    // To migrate: enable this entry, then disable the 6 individual entries
    // (weekly-project-pulse, ghl-cleanup-auto, grant-seed-weekly,
    // xero-payments-sync, weekly-reconciliation, money-framework-sync).
    // Until migration: this is OFF by default — uncomment to enable.
    //
    // name: 'monday-morning-chain',
    // script: 'scripts/monday-morning-chain.mjs',
    // args: '--telegram',
    // cron_restart: '30 5 * * 1', // Mon 5:30am AEST — orchestrates the full chain
  },
  {
    // Polls finance_receipt_documents for newly-OCR'd Dext docs that have no
    // AI suggestion yet, grades them with Sonnet 4.6, writes to
    // finance_ai_routing_suggestions. The workbench surfaces the grades so
    // you see project_code + risk_flags before you publish to Xero.
    name: 'pre-publish-dext-grader',
    script: 'scripts/poll-pre-publish-dext-grader.mjs',
    args: '--batch 25 --telegram',
    cron_restart: '*/15 8-18 * * 1-5', // Every 15 min, 8am-6pm AEST, Mon-Fri
  },
  {
    // Issue #66 (pivot) — push AI tracking suggestions to Xero.
    // ai-route-dext-doc.mjs --apply writes project_code to xero_transactions
    // in Supabase but doesn't touch the Xero record. This polls finance_ai_
    // routing_suggestions for high-conf, applied-locally-but-not-in-Xero rows
    // and POSTs Business Division + Project Tracking via the Xero API.
    // Runs offset from pre-publish-dext-grader so the grader has time to
    // finish writing.
    // Issue #66 paired grader — grades freshly-arrived xero_transactions
    // (rows that landed via Xero sync but have no project_code yet) and
    // writes high-confidence suggestions to finance_ai_routing_suggestions
    // with applied_to_source=true. Runs at xx:00 and xx:30 — 7 min before
    // push-ai-tracking-to-xero so the suggestions are written first.
    name: 'ai-router-xero-mode',
    script: 'scripts/ai-route-dext-doc.mjs',
    args: '--source xero --apply --limit 30 --min-confidence 0.85',
    cron_restart: '0,30 8-18 * * 1-5', // xx:00 and xx:30, Mon-Fri 8am-6pm AEST
  },
  {
    name: 'push-ai-tracking-to-xero',
    script: 'scripts/push-ai-tracking-to-xero.mjs',
    args: '--limit 50',
    cron_restart: '7,37 8-18 * * 1-5', // 8:07, 8:37, ..., 18:37 Mon-Fri AEST
  },
  {
    name: 'ghl-cleanup-auto',
    script: 'scripts/cleanup-stale-ghl-opps.mjs',
    args: '--apply',
    cron_restart: '0 6 * * 1', // Weekly Monday 6:00am AEST — auto-archive past-deadline grants + ACT Events invitations BEFORE the framework/db sync runs
  },
  {
    name: 'grant-seed-weekly',
    script: 'scripts/seed-ghl-grants.mjs',
    args: '--count 5',
    cron_restart: '30 6 * * 1', // Weekly Monday 6:30am AEST — seed top 5 fresh ACT-fit grants into GHL
  },
  {
    name: 'xero-payments-sync',
    script: 'scripts/sync-xero-payments.mjs',
    args: '--days=180',
    cron_restart: '50 6 * * 1', // Weekly Monday 6:50am AEST — sync Xero Payments (deposit↔invoice link table)
  },
  {
    name: 'money-in-audit',
    script: 'scripts/audit-money-in-alignment.mjs',
    cron_restart: '0 7 * * 1', // Weekly Monday 7:00am AEST — generate money-in alignment markdown report
  },
  {
    name: 'money-out-audit',
    script: 'scripts/audit-money-out-alignment.mjs',
    cron_restart: '5 7 * * 1', // Weekly Monday 7:05am AEST — generate money-out alignment markdown report
  },
  {
    name: 'money-alignment-notion',
    script: 'scripts/sync-money-alignment-to-notion.mjs',
    cron_restart: '10 7 * * 1', // Weekly Monday 7:10am AEST — push both alignment reports to Notion
  },
  {
    name: 'wiki-build-viewer',
    script: 'scripts/wiki-build-viewer.mjs',
    cron_restart: '15 9 * * 1', // Weekly Monday 9:15am AEST — regenerate the viewer and sync the command-center wiki mirror
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
  // Removed 2026-05-06 — target Live Alerts Notion DB does not exist in current
  // workspace. actions/projects/decisions DBs ARE accessible but the script's
  // Notion calls hit a missing ID and abort. Re-add only after Live Alerts DB
  // is recreated and config/notion-database-ids.json:liveAlerts is updated.
  // {
  //   name: 'actions-decisions-sync',
  //   script: 'scripts/sync-actions-decisions-to-notion.mjs',
  //   args: '--verbose',
  //   cron_restart: '*/15 * * * *',
  // },
  // contacts-sync removed — People Directory too noisy, focus on knowledge + meetings
  {
    name: 'generate-insights',
    script: 'scripts/generate-insights.mjs',
    args: '--verbose',
    cron_restart: '0 */2 * * *', // Every 2 hours (reduced from 30min — most insights don't need 30-min freshness)
  },
  // finance-sync DISABLED 2026-05-08: target page (financeOverview) deprecated.
  // Canonical hub is now ACT Money Framework — see scripts/sync-money-framework-to-notion.mjs
  // (runs in Monday cron via populate-money-dashboards.mjs).
  // {
  //   name: 'finance-sync',
  //   script: 'scripts/sync-finance-to-notion.mjs',
  //   args: '--verbose',
  //   cron_restart: '30 8 * * *',
  // },
  {
    name: 'auto-tag-transactions',
    script: 'scripts/tag-transactions-by-vendor.mjs',
    args: '--apply',
    cron_restart: '15 */6 * * *', // Every 6 hours +15min (reverted 2026-05-23: 2h cron was spamming the same unmatched-vendor alert)
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
  // push-highlights-notion DISABLED 2026-05-08: depends on liveAlerts page key
  // which was retired with 17 other stale operational dashboard keys (see
  // thoughts/shared/reviews/notion-finance-dashboard-2026-05-08.md). Re-enable
  // by re-creating the Live Alerts DB in Notion and re-adding the key.
  // {
  //   name: 'push-highlights-notion',
  //   script: 'scripts/push-highlights-to-notion.mjs',
  //   cron_restart: '*/30 * * * *',
  // },
  // Removed 2026-05-06 — target weeklyReports DB (2d6ebcf9...) renders broken
  // ('Something went wrong / Try again' in Notion UI). Re-add after the page
  // is repaired or recreated and config/notion-database-ids.json:weeklyReports
  // points at a working DB.
  // {
  //   name: 'notion-weekly-review',
  //   script: 'scripts/notion-weekly-review.mjs',
  //   cron_restart: '0 17 * * 0',
  // },
  {
    name: 'weekly-relationship-review',
    script: 'scripts/weekly-relationship-review.mjs',
    args: '--verbose',
    cron_restart: '0 18 * * 5', // Friday 6pm AEST
  },
  {
    name: 'relationship-health',
    script: 'scripts/relationship-health.mjs',
    args: 'update',
    cron_restart: '15 3 * * *', // Daily 3:15am AEST — recompute relationship scores. The populator was never scheduled (only the Fri consumer was), so relationship_health froze ~4 weeks (last Apr 29) until re-lit 2026-05-27. Feeds the 7 /relationships + intelligence routes + the Fri review.
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
  // Removed 2026-05-06 — hardcoded MISSION_CONTROL_OS_DB id (3db68c5f...) does
  // not exist in any accessible Notion workspace (search returns no match).
  // Re-add after a Mission Control OS database is created and the script's
  // hardcoded id is updated to its new uuid.
  // {
  //   name: 'sync-priorities-to-notion',
  //   script: 'scripts/sync-priorities-to-notion.mjs',
  //   args: '--verbose',
  //   cron_restart: '45 6 * * *',
  // },
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
  // collections-autopilot removed 2026-05-07: scripts/chase-overdue-invoices.mjs
  // never existed on disk. PICC + Aleisha snooze/write-off flow now uses
  // xero_invoices.metadata.do_not_chase_until as the snooze mechanism.
  // When a real chase autopilot is built it should read that field.
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
  // finance-daily-briefing DISABLED 2026-05-08: redundant with daily-money-briefing
  // (8am AEST, daily, richer output with chain-health + R&D pack score). Script
  // archived to scripts/_archive/2026-05-finance-cleanup/.
  // {
  //   name: 'finance-daily-briefing',
  //   script: 'scripts/finance-daily-briefing.mjs',
  //   cron_restart: '0 7 * * 1-5',
  // },
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

  // === Goods Agents (2026-04-23) ===
  // Daily Xero ↔ GHL drift detector — prevents the invisible-DRAFT-invoice pattern
  {
    name: 'agent-xero-ghl-reconciler',
    script: 'scripts/agents/agent-xero-ghl-reconciler.mjs',
    cron_restart: '0 5 * * *', // Daily 05:00 AEST (before weekly reconciliation at 08:00)
  },
  // Weekly wiki ↔ Xero financial-claim drift detector
  {
    name: 'agent-invoice-drift-detector',
    script: 'scripts/agents/agent-invoice-drift-detector.mjs',
    cron_restart: '30 8 * * 1', // Monday 08:30 AEST (after weekly reconciliation)
  },
  // A1 — Weekly procurement sweep ranking top 3 buyer touches for the week
  {
    name: 'agent-procurement-analyst',
    script: 'scripts/agents/agent-procurement-analyst.mjs',
    cron_restart: '0 8 * * 1', // Monday 08:00 AEST
  },
  // A2 — Daily funder-silence watcher drafting progress notes for review
  {
    name: 'agent-funder-cadence',
    script: 'scripts/agents/agent-funder-cadence.mjs',
    cron_restart: '0 6 * * *', // Daily 06:00 AEST
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
