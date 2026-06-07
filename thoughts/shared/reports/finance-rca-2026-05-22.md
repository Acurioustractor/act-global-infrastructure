---
title: Finance Root-Cause Analysis
date: 2026-05-22
status: complete
audit: thoughts/shared/reports/finance-audit-2026-05-21.md
author: claude (direct, after 2 RCA agents stalled at watchdog)
---

# Why These Problems Keep Coming Back

Companion to `finance-audit-2026-05-21.md`. The audit lists ~45 symptoms across 8 sections. This document names the 5 structural mechanisms that **produce** those symptoms.

If you only fix the 10 specific findings from §8 of the audit without addressing these patterns, the same classes of failure will re-emerge within 30 days under different names.

---

## The 5 structural patterns

### Pattern 1 — Multiple writers, no canonical owner

**Manifestation in audit:**
- §3 Duplicate bills/spends (Telford $59K quadruple, Maleny $3.9K triple, 15 Jan-Harvest bill+spend pairs)
- §4.5 Three parallel tagger rule stores (JSON 30 + DB vendor_project_rules 507 + tag_inference_rules 17)
- §4.6/§4.7 Vendor codes conflict across stores and within DB
- §5 Two write-side scripts archived 2026-05-19 (gmail-to-xero, push-receipts) but PM2 still referenced them

**Why it recurs:** Every new automation feature gets added by writing a new script that touches the same Xero/Supabase surface. Nobody pauses to ask "who else writes here?" The manual-guard (`project_code_source LIKE 'manual%'`) had to be patched into THREE separate tagger scripts because each one was written without ownership of the tag-write surface.

**Evidence trail:**
- `scripts/sync-xero-to-supabase.mjs`, `scripts/tag-xero-transactions.mjs`, `scripts/tag-transactions-by-vendor.mjs` — three scripts, same surface, each patched separately for the manual-guard rule
- `scripts/_archive/2026-05-19-receipt-pipeline-duplicators/RESTORE.md` — same pattern in pipeline writers
- `vendor_project_rules` table + `tag_inference_rules` table + `config/tag-suggester-rules.json` — three rule stores, no policy on which wins

**Fix shape:** For each shared surface, declare ONE canonical writer in a `WRITERS.md` per directory. New code that wants to write must either route through it or be fenced explicitly. Not a code change — a policy with a linter.

---

### Pattern 2 — Silent failure, no back-pressure

**Manifestation in audit:**
- §6.1 Daemon-wide PM2 outage — 0 of ~110 entries running for finance; discovered only by audit
- §6.6 `money-stack-sync` has no telegram-on-failure hook
- §7.5 ALL 389 AUTHORISED bills past due — payments happening outside Xero with no alert
- §7.7 1,010 unreconciled bank txns; oldest from 2025-01-28 — grew for 16 months unnoticed

**Why it recurs:** Crons + scripts exit on partial failure with no outbound signal. The 4-Surface Model assumes Notion + Telegram are the "push" surfaces, but the push only happens when scripts SUCCEED. When they die, the dashboards just go stale. There's no "did the Mon-morning sync chain run today?" watchdog.

**Evidence trail:**
- `pm2 list` shows 0 finance entries online but no alert ever fired
- `weekly-reconciliation.mjs` runs once a week — if PM2 is down for 8 days, nobody knows
- `daily-money-briefing` intentionally disabled per QW4 2026-05-21 (§6.3) but CLAUDE.md still says it runs — even the docs trust crons we know are off

**Fix shape:** Heartbeat table (`cron_runs` in Supabase). Every cron writes a row on success. A separate "watchdog" cron checks for missing heartbeats and posts to Telegram. Failures become loud by default.

---

### Pattern 3 — Config drift / multiple sources of truth

**Manifestation in audit:**
- §5.2 PM2 `ecosystem.config.cjs:642-668` has the entire receipt-capture chain LIVE with active `cron_restart`, even though the scripts it points to were archived 3 days ago
- §4.5 Tagger rules in 3 places — none authoritative
- §6.3 CLAUDE.md says "daily 8am Telegram briefing" but it's actually `telegram-daily-focus` at 7:30
- §7.1 Xero tracking categories: legacy free-text "Goods." (305 line uses) coexisting with canonical "ACT-GD — Goods" (62)
- §6.5 `agent-funder-cadence` runs in `pm2 list` but not in `ecosystem.config.cjs` (orphan, won't survive reload)

**Why it recurs:** Refactors update the new surface but leave the old surface dangling. There's no "delete the old way" step in the migration playbook. PM2's `ecosystem.config.cjs` is treated as append-only. Xero tracking categories renamed without retiring the originals. The result: every system has a fossil layer.

**Evidence trail:**
- `ecosystem.config.cjs` has commented-out entries from 2026-04 sitting alongside live ones — implies "comment out to disable" was the migration pattern, never "delete to remove"
- §7.1's 8 duplicate tracking categories suggest the Xero tracking cleanup (2026-05-18) renamed but didn't merge legacy free-text uses

**Fix shape:** Migrations include a `DELETE OLD` step. PM2 disabled entries get removed from config, not commented. Xero category renames are followed by a `xero-relabel-tracking-options.mjs` pass that moves legacy uses to canonical codes.

---

### Pattern 4 — Manual approve-step bottlenecks

**Manifestation in audit:**
- §7.4 159 DRAFT bills / $30,089 stuck — Dext lands them as DRAFT, no one approves
- §7.5 389 AUTHORISED bills past due, $735K — Xero needs payment record applied (payments happened outside Xero)
- §7.7 1,010 unreconciled bank txns — reconciliation is UI-only, no batch action
- §3 Duplicates often surface as `DRAFT + PAID` pairs (Telford `f47c47b4` AUTHORISED + `843767e6` PAID = same bill, double recorded)

**Why it recurs:** The Xero pipeline has UI-only mandatory steps (approve DRAFT → AUTHORISED → mark PAID → reconcile bank line). Each step requires a human click. When the human stops, work queues forever and accumulates duplicates because new pipelines re-create what's already DRAFT.

**Evidence trail:**
- Handoff 2026-05-19 names this directly: "Receipts ARE being captured — they just stop at the AUTHORISE step"
- Dext-to-Xero integration is set to "Save as Draft" not "Auto-publish" (handoff item #5)
- No script in the repo automates `MarkAsPaid` — because Xero API limitation, not a missing feature

**Fix shape:** Either auto-publish where safe (flip Dext setting + rely on dedup-on-create), OR daily Telegram "you have N items to approve" with deep links. The current state of "queue and forget" is the worst of both worlds.

---

### Pattern 5 — Identity fragmentation in Xero contacts

**Manifestation in audit:**
- §7.6 Defy split as "Defy" + "Defy Manufacturing" hiding $179,935 from concentration view
- §7.6 Qantas spread across 5 contact records ($134K total)
- §7.6 10 case/punctuation duplicate pairs (Fish Bowl/Fishbowl, Mitre 10/Mitre10)
- Known historical: Flight Bar Witta misrouting NT-trip charges

**Why it recurs:** Xero auto-creates contacts from new bill/invoice imports using whatever vendor string came in. Dext exports use the OCR'd name. Manual entry uses whatever's typed. No canonical-contact merge step. Every new import surface adds new variants.

**Evidence trail:**
- §7.6 fuzzy-match analysis showed 8+ vendor splits — these accumulated organically over months
- Defy split came from one supplier appearing under different ABNs in their own invoicing

**Fix shape:** Periodic alias-detection script (fuzzy match on contact names > 0.85 similarity). Posts to Telegram weekly with "merge these 3 candidates" prompts. Merge is still UI-only in Xero but the discovery is automated.

---

## What's actually different from last month

**New emergence (got worse):**
- Daemon-wide PM2 outage (no prior flag in handoff archive)
- Discovery of third rule store (`tag_inference_rules`) — only 2 were previously known
- Telford Smith $59K quadruple-record (likely sat undiscovered for months — 2025-12-22 dates)

**Resolved (don't recur):**
- `gmail-to-xero-pipeline.mjs` + `push-receipts-to-xero.mjs` actually archived 2026-05-19 (not just deprecated)
- Manual-guard now patched into all 3 tagger scripts (vs just one previously)
- Mon-morning sync chain consolidated as `money-stack-sync` (commit 0b78bf9)
- Dext CSV cross-match script exists (`scripts/match-dext-csv-to-unreceipted.mjs`)

**Still-running bandaids:**
- `void-duplicate-bills.mjs` is plan-only — finds dups but doesn't act (intentional, but leaves the cleanup burden manual)
- Dext is still set to "Save as Draft" not "Auto-publish" (handoff item #5 — pending Ben decision)
- The 3 tagger scripts all have manual-guard but a 4th could be added without it (no test, no lint)

---

## "Next month" prediction

If only the 10 specific findings get fixed but these 5 patterns aren't addressed, here's what will appear by 2026-06-22:

1. **A fourth rule store will emerge** — likely from the orphaned `agent-funder-cadence` (§6.5) or a new feature. Same 3-system conflict pattern, with 4 systems.
2. **PM2 will die again, silently** — same daemon-wide pattern, different trigger (Mac reboot / brew update / disk full). No alert. Discovered only by next audit.
3. **100-200 new DRAFT bills will accumulate** — Dext still on Save-as-Draft; no daily approve-prompt; same queue-and-forget pattern.
4. **One new contact-split case** hiding $50K-$100K concentration — possibly Total Tools (already split-ish) or a new utility vendor.
5. **Bank reconciliation count will pass 1,200** — UI-only reconciliation + no batch script + no alert at threshold.

---

## What to instrument to detect recurrence

Three signals to build, each ~30 min of work:

### Signal 1 — Heartbeat watchdog
- New Supabase table: `cron_runs (name TEXT, ran_at TIMESTAMPTZ, status TEXT, summary TEXT)`
- Every PM2 entry writes a row on completion (success or error)
- New daily cron (`cron-watchdog.mjs`) checks for missing heartbeats against expected schedule
- Posts to Telegram if any expected run is > 2× its interval overdue
- **Why this matters:** Catches Pattern 2 (silent failure) — the daemon-wide outage would have triggered within 25 hours

### Signal 2 — Same-day same-vendor same-amount detector
- Query `xero_bills` + `xero_transactions` for pairs matching (vendor, amount, |date diff| < 7d)
- Runs daily, posts to Telegram if count > N (calibrate from current baseline)
- **Why this matters:** Catches Pattern 1 (multiple writers) — Telford Smith quadruple would have triggered within 48 hours of the December imports

### Signal 3 — Vendor-name fuzzy-match weekly report
- Cron `weekly-contact-aliases.mjs` — `SELECT contact_name` from `xero_contacts`, compute Jaro-Winkler pairs > 0.85
- Posts top 5 to Telegram for merge triage
- **Why this matters:** Catches Pattern 5 (identity fragmentation) — Defy split would have surfaced weeks ago

Total instrumentation cost: ~90 min one-time + ~$0/month (uses existing Supabase + Telegram).

---

## How this maps back to the audit's Top 10

| Audit §8 item | Pattern it surfaces | Fixed by symptom alone? |
|---|---|---|
| 8.1 Void Telford quadruple | Pattern 1 + Pattern 4 | No — next dup will appear |
| 8.2 Loosen NAB bank-fee filter | (data quality, not structural) | Yes |
| 8.3 Bulk-approve DRAFTs + Dext auto-publish | Pattern 4 | Partially — fixes today's queue, not tomorrow's |
| 8.4 PM2 daemon root-cause | Pattern 2 | No — silent failure mode will recur |
| 8.5 PM2 config contradiction | Pattern 3 | Partially — needs Pattern-3 enforcement |
| 8.6 AP backlog reconciliation | Pattern 4 | No — backlog will reaccumulate |
| 8.7 Pick ONE rule store | Pattern 1 + Pattern 3 | No — 4th store will appear unless enforced |
| 8.8 Rename Xero tracking categories | Pattern 3 | No — same drift will recur on next category change |
| 8.9 Merge split Xero contacts | Pattern 5 | No — new splits will appear |
| 8.10 Bank reconciliation sprint | Pattern 4 | No — backlog will regrow |

**Read:** 8/10 fixes are symptom-level. They clear today's pile. None prevent tomorrow's. The 3 instrumentation signals above are what convert a one-time cleanup into a self-maintaining system.

---

## TL;DR

- **5 structural patterns** produce the audit's 45 symptoms
- **Multiple writers + silent failure + config drift + manual approve-steps + identity fragmentation** are the names
- **3 watchdog signals** (heartbeat, dup-detector, alias-detector) would catch the next round before it accumulates
- **Without the 3 signals**, all 5 patterns will produce equivalent new symptoms within 30 days
