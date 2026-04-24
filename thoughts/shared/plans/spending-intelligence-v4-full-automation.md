# Spending Intelligence v4 — Full Automation Plan

**Date:** 2026-04-22
**Owner:** Ben + Claude
**Goal:** Take receipt + reconciliation workflow from ~60% automated → **>95% automated**, with JAX + Xero MCP doing the heavy lifting.
**Target BAS quarter:** Q4 FY26 (Apr–Jun) completed with <2 hours of manual effort.

---

## Context

Prior state (v3, 2026-04-13): 95.3% Q2+Q3 receipted, 290 Draft bills pushed to Xero with vendor-rule coding, 173 items in triage.

**New leverage available** (April 2026):
- Xero **JAX** (auto-reconcile 80%+ of bank lines) — [release](https://www.xero.com/us/media-releases/xeros-ai-financial-superagent-jax-launches-powerful-new-features/)
- Xero **MCP Server** (40+ tools exposed) — [GitHub](https://github.com/XeroAPI/xero-mcp-server)
- Xero **AI Toolkit** (OpenAI Agents SDK + LangChain examples) — [developer.xero.com/ai](https://developer.xero.com/ai)

**Hard blockers today:**
1. Card 1656 not in Xero bank feed → JAX can't touch it
2. Multi-currency not on Xero plan → USD bills post as AUD with manual FX note
3. Xero API has no Bank Rules endpoint → can't automate the "one-click vendor" pattern via API
4. Xero MCP lacks Attachments + Bank Rules tools → raw REST still needed for those

---

## Phased task ledger

### Phase 1 — Foundation (unblocks everything else)

- [ ] **1.1 Get card 1656 into Xero bank feed**
  - Path A: NAB direct feed via Xero → Accounting → Bank Accounts → Add bank feed (card 1656)
  - Path B (fallback): automated CSV import replacing the Xero-UI-paste hack
  - Acceptance: new charges on 1656 appear in Xero's reconcile queue automatically, `xero_transactions` mirror grows without manual intervention
  - Why first: JAX can't auto-reconcile what it can't see
  - Risk: NAB may not support direct feed for Visa cards; fallback is nightly CSV push via script
  - Est: 30 min if feed works; 4 hr if CSV automation needed

- [ ] **1.2 Upgrade Xero plan to multi-currency**
  - Accounting → Subscription & billing → Change plan (Premium tier)
  - ~AU$85/mo instead of $65/mo
  - Acceptance: USD bills post with `CurrencyCode: USD`, Xero applies daily RBA rate, FX gain/loss auto-posts to exchange difference account
  - Why first: ~20 USD subscriptions × 4 quarters = ~80 manual FX adjustments/year eliminated
  - Est: 5 min (account change, takes effect immediately)

- [ ] **1.3 Add missing Xero Project Tracking options**
  - ACT-IN — ACT Infrastructure ✓ (done 2026-04-22)
  - ACT-FM — The Farm ✓ (done 2026-04-22)
  - ACT-PI — PICC (dedicated umbrella code)
  - ACT-JH — JusticeHub (rename legacy)
  - ACT-JP — June's Patch (rename legacy)
  - Acceptance: `PROJECT_TRACKING_NAME` map in push script covers 100% of active project codes with no fallbacks needed
  - Est: 10 min

### Phase 2 — Smart OCR retry + MCP refactor

- [ ] **2.1 AI re-OCR of 131 missing-amount receipts**
  - Build `scripts/re-ocr-missing-amounts.mjs`
  - For each row with null `amount_detected`: download file → send to Gemini 2.5 Flash Lite with structured prompt targeting "TOTAL / AMOUNT DUE / Grand Total line, preserve currency"
  - Auto-update `amount_detected` on confident extractions; flag low-confidence for manual review
  - Acceptance: <20 items remain needing human triage (down from 131)
  - Est: 2 hr build + 15 min run
  - Cost: ~$0.02 total (Gemini 2.5 Flash Lite @ $0.04 per 333 receipts)

- [ ] **2.2 Refactor push-receipts-to-xero.mjs to use Xero MCP where possible**
  - Replace `xeroFetch` calls for invoice create with MCP `create-invoice` tool
  - Keep raw fetch for attachments (MCP has no Attachments tool)
  - Xero MCP server already running in this session — just wire it up
  - Acceptance: fewer lines of auth/token-refresh code; MCP handles OAuth automatically
  - Est: 3 hr

- [ ] **2.3 Build reconcile-batch endpoint**
  - New script `scripts/reconcile-bills-to-bank-lines.mjs`
  - For each Draft/AUTHORISED bill in Xero without a linked payment: find matching `bank_statement_line` by amount + date + vendor, create `/BankTransactions` SPEND entry linked to bill, mark `bank_statement_lines.receipt_match_status = matched`
  - Acceptance: batch reconciles 100s of bank lines without UI clicks
  - Est: 4 hr

### Phase 3 — JAX priming

- [ ] **3.1 Bulk-approve the 290 Draft bills**
  - In Xero UI: Bills → Draft tab → Select all → Approve
  - Pre-flight: eyeball the 10 largest to catch coding errors
  - Acceptance: 290 bills move from Draft → Awaiting Payment
  - Est: 20 min

- [ ] **3.2 Teach JAX via manual reconciliation of representative bank lines**
  - After Phase 1.1 is live, manually reconcile the first 5-10 of each vendor category (Uber, Qantas, Stripe, Vercel, Bunnings, etc.)
  - JAX learns the vendor → account → project pattern
  - Acceptance: on the 11th+ charge for that vendor, JAX auto-suggests with ≥95% confidence
  - Est: 90 min over first week post-feed-live

- [ ] **3.3 Monitor JAX auto-reconcile coverage**
  - Weekly check: % of bank lines JAX auto-reconciled vs manual
  - Target: 80%+ by end of Q4 FY26
  - Feed gaps back into our vendor rules for edge cases JAX doesn't catch

### Phase 4 — Sunset & scale

- [ ] **4.1 Contact dedup via Xero MCP**
  - Script: `list-contacts` → group by normalised name (strip Pty Ltd, INC, ALL CAPS) → identify duplicates
  - Manual confirm merges in Xero UI (Xero has native merge)
  - Acceptance: no two contacts share >80% name similarity
  - Est: 2 hr build, 30 min review

- [ ] **4.2 Dext sunset**
  - Preconditions: all 1640 Dext items scraped into Supabase Storage ✓ already done
  - Cancel Dext subscription after final CSV export + scrape
  - Saves $28-42/mo
  - Replace with: Xero Me (mobile) + Gmail auto-forward to Xero inbox email + our OCR pipeline
  - Est: 1 hr cleanup + verification

- [ ] **4.3 Real-time Telegram alerts for high-value / foreign charges**
  - Webhook or polling: new `bank_statement_lines` row where amount > $500 OR currency != AUD → Telegram push
  - Message: "Snap receipt now for {vendor} {amount} on {date}"
  - Keeps receipt-at-point-of-purchase discipline
  - Est: 2 hr (bot already exists, just add this tool)

- [ ] **4.4 Agentic wrapper for ambiguous reconciliation**
  - For cases JAX's 20% miss (new vendors, OCR errors, duplicate charges): local agent reads context, calls Xero MCP + Supabase, asks Claude Opus for judgment, posts decision back
  - Wrap as a cron that runs after JAX's daily sweep
  - Acceptance: 95% auto-coverage (JAX 80% + our agent 15%), 5% manual
  - Est: 1 day

---

## Decision log

| Decision | Why |
|---|---|
| Prioritise Phase 1 over all else | Without card 1656 in the bank feed, JAX can't see it, and no Phase 3 work is possible |
| Use Gemini 2.5 Flash Lite for re-OCR | 10× cheaper than Claude Haiku at same quality for receipts (per `memory/MEMORY.md`) |
| Keep our push script alongside JAX | JAX needs bank-feed data to work; we already have bill-creation infrastructure that works for non-feed cards |
| DRAFT status for pushed bills, not AUTHORISED | Safer — Ben reviews before approving, avoids auto-recording bad coding to BAS |
| Multi-currency upgrade before USD auto-push | Cleaner accounting, avoids 80+ manual FX adjustments/year |
| Xero MCP for new reads/writes, raw REST for attachments | MCP covers most surface; Attachments API is the one gap |

---

## Risk & open questions

1. **NAB card 1656 bank feed availability** — not all business cards support direct feed via Xero. Fallback is CSV-upload automation.
2. **Multi-currency plan change impact** — does it retroactively apply to existing AUD bills? Probably not; need to confirm whether to keep legacy bills or update them.
3. **JAX Assure accuracy on niche vendors** — JAX is trained on cross-tenant data; obscure vendors (Kallega, Oonchiumpa-specific) may not have enough signal. Our vendor rules fill the gap.
4. **MCP server stability in long-running scripts** — the `xero-mcp-wrapper.sh` refreshes tokens on spawn; if a script runs >60 min, token may expire. May need a keepalive mechanism.
5. **Dext sunset timing** — must scrape all permalinks before cancel (already done). Confirm 0 items remaining with `rbnk.me` URLs.

---

## Verification log

- [x] Xero MCP Server is running (3 processes verified 2026-04-22)
- [x] 290 Draft bills in Xero with vendor-coded account + tracking
- [x] 450 vendor rules in `vendor_project_rules` with `xero_account_code`, `xero_tax_type`, `xero_currency` columns
- [x] Supabase Storage has 1640 Dext files scraped (no surviving `rbnk.me` dependencies)
- [ ] Card 1656 in Xero bank feed
- [ ] Multi-currency plan active
- [ ] JAX 80% auto-reconcile target met

---

## Success metrics (check at end of Q4 FY26)

| Metric | Current | Target |
|---|---|---|
| % bank lines auto-reconciled | ~0% (manual) | ≥80% (JAX) |
| Gap % by value (BAS) | ~5% | <1% |
| Manual receipt-chase time per quarter | ~8 hr | <2 hr |
| USD FX manual adjustments | ~20/quarter | 0 (via multi-currency) |
| Receipts stuck in `review`/`captured` | 173 | <20 |

---

## Migration readiness — new entity Xero setup

**Context (added 2026-04-22):** Ben's new Pty Ltd will have its own Xero tenant. Everything we build should be transplantable — the goal is the new Xero launches fully-automated from day 1.

### What transfers as-is (portable IP)
- `vendor_project_rules` table (450 vendors w/ account codes, tax types, currency, project mapping)
- `subscription_patterns` (38 recurring vendors)
- `location_project_rules` (31 suburb-to-project rules)
- `push-receipts-to-xero.mjs` — just swap tenant ID in env
- `ocr-dext-processing.mjs`, `reconciliation-report.mjs`, `align-bills-to-statements.mjs`
- Triage UI at `/finance/receipts-triage`
- All receipt files in Supabase Storage (immutable archive)
- Receipt data in `receipt_emails`
- Learnings from weekly-reconciliation cron

### What needs recreation in new tenant (one-shot migration script)
- **Chart of accounts** — current codes (421 Meals, 485 Subs, 493 Travel, 429 default, etc.). Clone via Xero API `create-account` calls
- **Tracking categories** — Business Divisions + Project Tracking with all ACT-XX options
- **Contact list** — migrate via `list-contacts` → `create-contact` with cleanup/dedup pass first
- **Bank accounts** — new NAB Visa connection
- **Tax rates** — mirror existing GST on Expenses, BAS Excluded, etc.

### What is per-tenant and starts fresh
- JAX reconciliation history (learns as you use it)
- Xero Bank Rules (can't API-automate, must recreate manually)
- Historical bills / invoices (not migrated)
- BAS periods

### Migration playbook sketch

1. **Pre-launch checklist** in new tenant:
   - [ ] Chart of accounts seeded via script
   - [ ] Tracking categories seeded (Business Divisions + Project Tracking)
   - [ ] Multi-currency enabled (Premium plan from day 1)
   - [ ] Bank feed connected for new Pty Ltd card(s)
   - [ ] OAuth app reconnected with new tenant ID
   - [ ] `.env.local` updated with new XERO_TENANT_ID
   - [ ] Test push of 5 receipts

2. **Day-1 config**:
   - Auto-push pipeline live
   - Gmail auto-forward rules set to Xero inbox email
   - Weekly cron on
   - Triage UI pointed at new tenant

3. **Ongoing from day 1**: zero legacy debt — every receipt flows through the automated pipeline, no accumulated backlog

### Learnings captured so far (carry forward)

- Dext is not needed — Gmail + Xero Me + our OCR covers most cases
- Bank rules are API-blind — sidestep via pre-coded bills, not Xero rules
- Multi-currency at ~$20/mo saves ~80 manual FX adjustments/year
- OCR low-confidence + no amount = non-receipt → auto-junk (saved 49/91 review items this run)
- Receipts before BAS lock date create duplicates — push script needs a date floor
- Project tracking options must exist in Xero before pushing — script fails silently if missing

### TODO to make fully transplantable

- [ ] Build `scripts/migrate-to-new-xero.mjs` — idempotent one-shot setup (chart of accounts, tracking categories, tax rates)
- [ ] Add `--min-date` flag to push-receipts-to-xero.mjs to respect BAS lock dates
- [ ] Add `xero_tenant_id` column to tables that should be tenant-aware, or use env-based routing
- [ ] Document current chart of accounts + tracking categories in `config/xero-chart.json` (source of truth for migration)

---

## References

- [Xero AI Toolkit (developer.xero.com/ai)](https://developer.xero.com/ai)
- [Xero MCP Server (GitHub)](https://github.com/XeroAPI/xero-mcp-server)
- [Xero Agent Toolkit examples (GitHub)](https://github.com/XeroAPI/xero-agent-toolkit)
- [JAX automatic bank reconciliation beta (Xero blog)](https://blog.xero.com/product-updates/automatic-bank-reconciliation-jax-beta/)
- [Prior handoff — v3](thoughts/shared/handoffs/spending-intelligence-v3-handoff.md)
- [Current push script](scripts/push-receipts-to-xero.mjs)
- [Triage UI](apps/command-center/src/app/finance/receipts-triage/page.tsx)
