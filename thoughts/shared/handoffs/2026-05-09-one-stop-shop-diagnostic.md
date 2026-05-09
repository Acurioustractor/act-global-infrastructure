---
project: ACT-CORE
date: 2026-05-09
author: Claude (session w/ Ben)
type: diagnostic
status: draft-for-ben-review
purpose: Map where ACT state actually lives across the 4-surface model, surface BAS Q2+Q3 reconcile reality from real xero_invoices data, and propose the smallest move toward the Notion-linked "one-stop-shop" Ben flagged as not-yet-nailed.
related:
  - thoughts/shared/handoffs/2026-05-08-money-brain-runbook.md
  - thoughts/shared/reviews/notion-finance-dashboard-2026-05-08.md
  - ~/.claude/plans/rewive-all-the-finciance-agile-pearl.md
---

# ACT one-stop-shop diagnostic — 2026-05-09

## Why this exists

Ben's prompt: *"higher order things — the overall picture of ACT, receivables/reconciles for last two quarters BAS, other logic to work through. Want to start to get closer to the side of a one-stop shop of finances and business needs that is linked to Notion that we have not nailed yet."*

The 4-surface model (Notion=read/decide, command-center=operate, scripts=automate, telegram=push) is implemented and load-bearing. But the one place a CEO would expect to see "ACT, right now, all of it" — money + business + decisions in one linked frame — does not exist. This diagnostic maps the gap and proposes the smallest move that closes it.

## 1. Where ACT state lives today (4-surface map)

| What you need to know | Where it actually is | Latency | Gap |
|---|---|---|---|
| Cash in bank right now | Xero (truth) → `daily-pulse` cron → Notion ACT Money Framework page | 1× / day @ 8:13am | OK for daily ops; not real-time |
| Runway (months) | `scripts/calculate-runway.mjs` → telegram 8am + Notion daily pulse | 1× / day | Logic in script; result in Notion; no shared ground truth |
| Who owes us money (AR) | `xero_invoices.amount_due > 0 AND type=ACCREC` → `/finance/money-alignment` | live | **Not in Notion at all** |
| What we owe (AP) | `xero_invoices.amount_due > 0 AND type=ACCPAY` → `/finance/overview` | live | **Not in Notion at all** |
| Per-project spend | `xero_transactions` tagged by `project_code` → `/finance/projects/[code]` | live | **No per-project finance view in Notion** |
| Pile mix (Voice/Flow/Ground/Grants) vs FY27 target | `act-money-brain:pile-mix` skill | on-demand | Lives in skill output, never persisted to Notion |
| Decisions taken | Notion Decisions Log DB | bidirectional | Capture + display both work; ✅ |
| Action items | Notion Action Items DB | bidirectional | Capture + display both work; ✅ |
| Pipeline (live opportunities) | Notion Opportunities DB (filter by Pile) | bidirectional | ✅ for capture; not aggregated into "money in next 90d" view |
| BAS state by quarter | `xero_invoices` filtered by date + `scripts/prepare-bas.mjs` | on-demand | **Not surfaced anywhere as a reconcile dashboard — you have to run the script and read the output** |
| What needs my attention RIGHT NOW | Telegram daily briefing 8am, Notion ACT Money Framework "Today's Pulse" | daily | Today's Pulse is good but doesn't aggregate non-finance attention items (PR review, Notion captures pending, drafts going stale) |

**Pattern**: command-center has every operational surface. Notion has every capture surface. **Neither has the executive read.** The Money Framework page is the closest thing but it's money-only.

## 2. BAS Q2 + Q3 FY26 reconcile reality (queried 2026-05-09 from `xero_invoices`)

**Both BAS lodgement deadlines are past** (Q2 due 28 Feb 2026, Q3 due 28 Apr 2026). What does the data say?

| Metric | Q2 FY26 (Oct–Dec 25) | Q3 FY26 (Jan–Mar 26) |
|---|---|---|
| Total invoices | 384 | 350 |
| ACCPAY PAID receipt coverage | 296/296 (100%) | 127/127 (100%) |
| ACCPAY AUTHORISED receipt coverage | 42/51 (82%) — **9 bills missing receipts** | 197/197 (100%) |
| Bills outstanding (ACCPAY AUTHORISED, amount_due > 0) | $83,506 | $210,641 |
| Sales outstanding (ACCREC AUTHORISED) | $38,850 (15 invoices) | $22,450 (3 invoices) + $84,700 (2 DRAFT) |
| Sales voided (ACCREC VOIDED) | $17,600 (2) | **$357,500 (5)** ← unusually large |
| Bills voided (ACCPAY VOIDED) | $13,814 (8) | $401 (7) |

**Verified**: receipt coverage and outstanding balances queried directly from `xero_invoices` against the operational DB (`tednluwflfhxyucgwigh`).

**Inferred / open questions**:

1. **9 Q2 bills without receipts** ($83,506 in ACCPAY AUTHORISED, 82% coverage). These are likely BAS-relevant — if these bills hit GST, you've potentially under-claimed input tax credits on the Q2 BAS, OR claimed without contemporaneous receipts (audit risk). Run `scripts/find-receipt` against the 9 specifically.
2. **Q3 ACCREC VOIDED $357,500 across 5 invoices**. Memory mentions Aleisha PICC writeoff $12,150 / 27 invoices — doesn't match (different count, much larger total). Either there's a separate large writeoff that happened in Q3, OR this is the cabin-disposal one-offs that got archived (memory: "cabin disposal one-offs" in archive scripts). Worth a 5-min audit: `SELECT contact_name, total, voided_at FROM xero_invoices WHERE date BETWEEN '2026-01-01' AND '2026-03-31' AND type='ACCREC' AND status='VOIDED'`.
3. **Q3 has 2 DRAFT ACCREC totalling $84,700**. INV-0314 Centrecorp ($84,700) per memory is one of them. The other?
4. **Q3 AP outstanding $210,641 is 2.5× Q2's $83,506**. Has run-rate jumped, or are these subscriptions/contractors that auto-renew and haven't been paid yet?

These are the "other logic to work through" Ben referenced. None are blocking but all are reconcile-debt that compounds.

## 3. What's missing for the "one-stop-shop linked to Notion"

The Notion ACT Money Framework page (357ebcf9...) is the obvious front door. Today it has: Today's Pulse, Cash Forecast, Cash Scenarios, FY26-27 plan, Planning Rhythm. **What it doesn't have**:

- **Receivables card** — who owes us money, in priority order, with last-touch date
- **BAS-by-quarter card** — Q2 / Q3 / upcoming Q4 reconcile state, with red flags (e.g. "9 Q2 bills missing receipts")
- **Per-pile money-in next-90d card** — Voice / Flow / Ground / Grants forecast inflow
- **Decisions-needing-attention card** — Decisions Log filtered by status=draft + age > 7 days
- **Drafts-going-stale card** — `thoughts/shared/drafts/*.md` with date > 14 days ago + status != send-ready
- **Plans-needing-Ben-markup card** — pulls from the 86 review-needed plans (per memory, awaiting Ben's mark-up of `2026-05-08-plans-triage-proposal.md`)

That's 6 cards. The page already has the structural conventions (Today's Pulse format, widget-on-database approach). Adding 6 cards is additive, not architectural.

## 4. Three options ranked by leverage

### Option A — Build "ACT Now" Notion page (highest leverage, ~1-2 sessions)

Single Notion page extending the Money Framework with the 6 missing cards. Backed by:
- A new `scripts/sync-act-now-to-notion.mjs` that runs Mon 8am chain (joins `weekly-reconciliation.mjs` cron, doesn't add a new cron)
- 1-2 new Notion DB views (Receivables view of an existing DB; "stale drafts" filter)
- Reuses: `scripts/prepare-bas.mjs` for BAS state, `daily-pulse` logic for top bar, existing Decisions Log + Action Items DBs

Closes the one-stop-shop gap directly. Notion-native (matches the 4-surface model). Lift is moderate — most of the data already exists; this is a sync + layout exercise, not new capture.

### Option B — Q2+Q3 BAS reconcile sweep (focused, 0.5-1 session)

Run down the four open questions in §2 above:
1. Hunt the 9 Q2 missing-receipt bills via existing receipt-triage flow
2. Audit the $357,500 Q3 ACCREC VOIDED — document why, attach to BAS Q3 working papers
3. Resolve the 2 Q3 DRAFT invoices (send INV-0314 or void with Nic — open CEO action per memory)
4. Spot-check whether Q3 AP run-rate jump is real or accounting

Output: `thoughts/shared/handoffs/2026-05-09-bas-q2-q3-reconcile.md` with verified state per quarter.

Doesn't move toward the one-stop-shop directly — but it's the *content* the one-stop-shop's BAS card would surface. Useful if Option A is too heavy this session, OR if you want clean numbers before building the cockpit on top.

### Option C — Weekly `/finance/overview` HTML snapshot attached to Notion

Render `/finance/overview` (or a server-side snapshot of its data) as static HTML weekly, attach to Notion's Money Sync page.

Reuses the HTML pilot infrastructure. But it's a Notion-*attachment*, not Notion-*native*. Doesn't actually move toward "one-stop-shop linked to Notion" — it's "command-center exported into a Notion file column."

Lowest leverage of the three. Skip unless you want a quick win before tackling A or B.

## 5. Recommendation

**Do Option A.** It's the direct answer to the prompt. Three parallel work parcels inside it:

1. **Cards 1–2 (Receivables, BAS-by-quarter)** — finance-side, biggest CEO value
2. **Cards 3–4 (Per-pile inflow, Decisions-needing-attention)** — connects pipeline state to executive read
3. **Cards 5–6 (Stale drafts, plans-needing-markup)** — "business operations" side, surfaces context-rot

If you want to de-risk: do Option B first as a 30-min focused sweep, then Option A in the next session with clean BAS numbers locked in.

If you want momentum: skip B, go straight to Option A. Cards 1–2 alone close ~60% of the perceived gap.

## 6. What I need from Ben to start Option A

- Confirm: extend the existing ACT Money Framework page, OR create a new "ACT Now" page below it?
- Confirm: which Notion DBs are bidirectional vs outbound-only (per `wiki/decisions/notion-page-policy.md`) — the cards I want to add are read-only widgets, so they're outbound (overwrite-on-sync), but I want to confirm the page itself is OK to extend
- Confirm: cron — Mon-only (joins `weekly-reconciliation.mjs`) or daily (joins `daily-pulse`)?
