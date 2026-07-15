# Cron fleet revival

*2026-07-15. Context: `thoughts/shared/strategy/the-relationship-spine-2026-07-15.md`. The PM2 fleet lost ~131 of ~150 configured crons around 29 Jun (the incident window); the reduced state was cemented by a `pm2 save` on 12 Jul. This plan classifies all 131 by blast radius (7 classifier agents + 1 adversarial verifier, workflow run wf_0eaddb07-e1d) and sequences the revival.*

## State after today

- **Registered before today: 19.** Registered now: **32** (field-surfaces + 12 verified-safe batch-A crons revived and `pm2 save`d this session).
- **Deliberate-containment hypothesis weakened:** xero-sync and telegram-queue-drain stayed registered throughout, which no containment posture would allow. The loss looks accidental (kill/resurrect against a stale dump).

## The two credential blockers — BOTH RESOLVED 2026-07-15 (Ben authorized "fix this")

1. **BWS stale key: FIXED.** The poisoned secret was exactly one entry: `SUPABASE_SHARED_SERVICE_ROLE_KEY` (id 4fef4275, legacy JWT for tednluwflfhxyucgwigh). Updated in BWS to the working `sb_secret` key and verified in-store. Proof of fix: gmail-sync tracer 174/174 inserted 0 errors, then the 17-day backfill landed **1,180 messages, 0 errors** — the 29 Jun to 15 Jul spine gap is closed.
   - Left alone in BWS (different project pairing, not ours to guess): `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` pointing at project bhwyqqbovcjoefezgfnq (anon key there is still legacy — flag if anything using that project breaks).
2. **EL key: already re-keyed, just never propagated.** BWS held a valid new-format `EL_SUPABASE_SERVICE_ROLE_KEY` (live-tested HTTP 206 against yvnuayzslukamizrlhwb); `.env.local`'s `EL_SUPABASE_SERVICE_KEY` still carried the dead JWT. Copied the working key into `.env.local`; owes ledger rebuilt same hour (first refresh since 7 Jun). Residue: the PM2 daemon env still carries the dead EL key from before the rotation — the branch adds `dotenv override:true` to the constellation script so `.env.local` wins; a future `pm2 kill && pm2 resurrect` from a clean shell clears the daemon env properly.

**Still pending config (small):** `gmail-watch-renew` needs `GMAIL_PUBSUB_TOPIC` (projects/&lt;id&gt;/topics/&lt;name&gt;) before real-time push can return; deregistered so it doesn't error daily. The 4am gmail-sync covers ingestion meanwhile.

## Batch A: verified safe, local writes only — REVIVED TODAY (12)

Each adversarially verified (full write-path grep, not just headers): close-the-books-monthly, compliance-snapshot, cross-codebase-feed, daily-briefing, money-in-audit, money-out-audit, money-command-digest*, recon-status, wiki-build-viewer, wiki-lint, wiki-verify-urls, wiki-watch-meetings.

- *money-command-digest is safe only while its PM2 `args` stays empty (a `--telegram` flag exists in the script).
- **REFUTED and parked: reconcile-sidecar-weekly.** Looks read-only but `lib/finance/xero-client.mjs` auto-rotates the single-use Xero refresh token and upserts `xero_tokens` + rewrites `.env.local`. On a cron this races every other Xero script (the known token-drift trap). Revive only deliberately, never casually.
- Revert any of these with `pm2 delete <name> && pm2 save`.

## Batch B: writes our own Supabase only (47) — revive after BWS fix, in this order

1. **pm2-status-sync first.** It is the watchdog that reports cron health to the dashboard; its absence is why a 131-cron outage went unnoticed for 16 days.
2. **gmail-sync + email-to-knowledge + calendar-sync** (the ingest spine; gmail-sync backfill `--days 17` needed to close the 29 Jun to now gap; Google service-account creds verified alive via dry-run today).
3. **The relationship derivation layer:** contact-signals, relationship-health, supporter-comms, engagement-status, enrich-communications, auto-tag-emails (each depends on the spine being fresh; pointless before step 2).
4. The rest of B (knowledge pipeline, project health, financial rollups, LLM enrichers). Note several are header-marked STUB (agent-*) — verify output once before trusting.
5. **imessage-sync** reads the local Messages db every 15 min; revive consciously (personal-data ingest).

## Batch C: external-visible writes (49) — per-cron review with Ben, not a bulk revive

Groups, riskiest first:
- **Live GHL writers:** agent-xero-ghl-reconciler (creates opps mechanically, marked STUB), sync-grants-ghl, grant-seed-weekly, ghl-cleanup-auto, contact-reconciliation (`--create-contacts`), goods-auto-tagger, enrich-grants-ghl. **All predate the 2026-07-12 GHL target-state ADR (13 pipelines to 4).** Their pipeline/stage assumptions may now be wrong; do not revive until the D1-D3 migration lands or each is checked against the new pipeline map.
- **Live Xero writer:** xero-project-tag (writes tracking categories to Xero). Day-shift only.
- **Telegram pushes:** telegram-daily-focus, telegram-money-alerts, compliance-alerts, supporters-nudge, financial-advisor, finance-health-digest, weekly-reconciliation, idea-board-reminders, auto-tag-transactions (alert path). Bot token needs verifying post-incident; these are the phone-first surfaces Ben actually wants on the road, so verify token + revive telegram-daily-focus early.
- **Notion mirror pushes:** the ~20 sync-*-to-notion crons (mission-control, opportunities-db-sync, money-stack-sync orchestrator, comms-content-calendar, pppp-scan, newsletter-*-to-notion, ecosystem-digest, notion-daily-focus...). These are why the 9 relationship DBs went stale. Notion token needs verifying; then revive in one pass, money-stack-sync last (it orchestrates 11 of them).
- **Git-push-to-main:** act-now-sync auto-commits and pushes (Vercel redeploy). Revive only after confirming its Notion source is alive.

## Batch D: check-first (22) — mostly stays parked

- 13 entries are commented out in the config on purpose (superseded briefings, deleted Notion DBs, push-ai-tracking-to-xero deliberately stopped 2026-06-11, storyteller-sync disabled by PR #116 design). Leave them.
- gmail-watch-renew: revive with gmail-sync (renews the Pub/Sub push watch; the watch has long expired, so real-time inbound is off until this runs).
- storyteller-link + goods-content-sync: blocked on the EL re-key.
- kpis-sync / money-framework-sync / money-metrics-snapshot / opportunities-db-sync / pile-pages-sync / planning-rhythm-sync: one-shots fired by the money-stack orchestrator, not standalone crons; revive via money-stack-sync in batch C.

## Verification log (this session)

- gmail-sync dry-run: fetched today's mail across mailboxes, Google creds ALIVE.
- gmail-sync real runs: 1,449 fetched / 0 inserted (BWS stale key), then 173/0 with full env override (proves BWS shadows env).
- communications_history live: max created_at still 2026-06-29T19:29; 0 rows since 30 Jun.
- Batch A wave 1+2: all 12 launched, ran their immediate one-shot, exited clean, cron schedules registered, `pm2 save` done (32 processes in dump).
- Sighted in the unfetched mail: replies from dijane@ and vanessa@ standardledger.co (the SL clean-up thread Ben is waiting on), jr@mmeic.org, procurement@youthjustice.qld.gov.au, admin@myerfoundation.org.au. The spine gap is hiding real relationship signal.

## Decision list for Ben

1. Fix BWS Supabase secrets (or grant the Bash rule) → unlocks batch B.
2. Re-key EL instance → unlocks owes ledger + the EL-dependent crons.
3. Approve batch B revival order above (I can execute it all once BWS is fixed).
4. Verify Telegram bot token → telegram-daily-focus back on the road.
5. Batch C GHL writers: hold until D1-D3 migration, then review together.
6. Merge `wip/field-revival-2026-07-15` (owes wiring + honest canary).
