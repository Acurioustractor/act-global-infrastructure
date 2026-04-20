# Spending Intelligence System v2 — Session Handoff
**Date:** 2026-04-13
**Previous handoff:** `thoughts/shared/handoffs/spending-intelligence-system-handoff.md`

## What was built this session

### The discovery
Xero API cannot expose raw bank feed statement lines. ~35% of card spend was invisible to the entire system. The Mounty Yarns investigation ($27.5k JR NSW invoice) revealed $20k+ of supplier charges sitting unreconciled in Xero's bank feed.

### Backend system — COMPLETE
- `bank_statement_lines` table — 914 rows, Q2 FY26 (Oct-Dec 2025), 100% of card charges
- `location_project_rules` — 31 suburb-to-project rules
- `subscription_patterns` — 38 recurring vendors with expected amounts
- Receipt matcher with Dice coefficient fuzzy matching, GST tolerance, high-frequency vendor handling
- Project tagger with vendor overrides, location rules, trip date rules, meal/travel classifiers
- Gmail deep search across 4 mailboxes for missing receipts

### Scripts
| Script | Purpose |
|--------|---------|
| `reconciliation-report.mjs --match --apply` | THE one script before Xero |
| `tag-statement-lines.mjs --apply` | Project tagger |
| `resolve-ambiguous-matches.mjs --apply` | Uber/Qantas disambiguator |
| `weekly-reconciliation.mjs` | Monday cron + Telegram (wired to PM2) |
| `ingest-statement-lines-raw.mjs <file>` | Parse Xero UI paste |
| `xero-export-statements.mjs` | Playwright auto-export (session saved) |

### Current Q2 FY26 state
- **91.6% BAS coverage by value**
- 472 matched to receipts, 373 no-receipt-needed
- 27 gaps remaining ($27k) — chase list with Gmail search results
- **100% project tagged** (zero untagged)
- $119.30 GST forfeited on 5 items where bank statement is sufficient but no tax invoice

### Mounty Yarns response to Daniel
- Cost breakdown ready — 6 lines totalling $25k ex GST / $27.5k inc GST
- Every line has receipt-backed actual costs aligned to invoice amounts
- INV-0295 needs updating in Xero (script ready, not run)

## What needs building NEXT SESSION

### 1. React frontend — wire to bank_statement_lines
The existing `/finance/reconciliation` page at `apps/command-center/src/app/finance/reconciliation/page.tsx` queries `xero_transactions` (65% of spend). It needs a new or updated API route that serves `bank_statement_lines` data.

**Key API route:** `apps/command-center/src/app/api/finance/reconciliation/route.ts`
- Currently queries `xero_transactions` for everything
- Needs to query `bank_statement_lines` as source of truth for card spend
- Keep `xero_transactions` view for ACCPAY bills and R&D tracking

**New features the UI should show:**
- BAS readiness score by quarter (from bank_statement_lines)
- Statement line ↔ receipt match with confidence score
- Project spend breakdown (already in DB, just needs UI)
- Missing receipt chase list with action steps
- Subscription tracker — expected vs actual charges
- One-click "mark as no-receipt-needed" with GST impact warning

### 2. Project-level financial views
- Each project code (ACT-MY, ACT-GD, ACT-HV, etc.) should have a spend view
- Show: total card spend, receipt coverage, top vendors, R&D eligible amount
- Link to the existing `/finance/projects/[code]` pages

### 3. R&D tagging
- The `bank_statement_lines` table needs an `rd_eligible` column
- R&D eligible project codes: ACT-EL, ACT-IN (software), ACT-JH, ACT-GD
- Show: total R&D eligible spend, receipt coverage on R&D items, 43.5% offset at risk
- Flag items where missing receipt = lost R&D offset (highest priority to chase)

### 4. Agent-powered weekly loop
The vision: an AI agent runs every Monday that:
1. Pulls latest statement lines from Xero (via Playwright)
2. Runs the matcher + tagger
3. For new unmatched items, searches Gmail for receipts
4. For subscription mismatches, checks if the vendor emailed a receipt
5. Generates a structured action list
6. Posts to Notion (or WhatsApp/Telegram) with:
   - "Here's your BAS score this week"
   - "These 3 receipts need chasing — here's where to find them"
   - "New subscription detected: Codeguide $44/month"
   - "Defy Design invoice overdue — last charge was Nov 20"

**Implementation options:**
- Telegram bot (already exists at `src/lib/telegram/bot.ts`) — simplest
- Notion integration (MCP available) — structured, searchable
- WhatsApp via Beeper (MCP available) — most likely to be read
- Combination: Telegram for alerts, Notion for the structured data

### 5. Learning system
Each BAS cycle should feed learnings back:
- New vendor patterns discovered → add to `subscription_patterns`
- New location patterns → add to `location_project_rules`  
- Receipt sources that worked → update vendor notes
- Receipt sources that failed → flag for next quarter
- Store in `.claude/skills/bas-cycle/references/quarterly-learnings.md`

### 6. Ingest Q3 FY26 (Jan-Mar 2026)
- Run `xero-export-statements.mjs --quarter Q3` (Playwright session saved)
- Or paste from Xero UI into file, run `ingest-statement-lines-raw.mjs`
- Then run tagger + matcher + report

## Prompt for next session

```
Read the handoff at thoughts/shared/handoffs/spending-intelligence-v2-handoff.md

We built a spending intelligence system that ingests raw bank feed statement lines from Xero (which the API can't expose), matches them to receipts, tags them to projects, and generates BAS readiness reports. The backend is complete — 91.6% Q2 FY26 coverage, 100% project-tagged.

Now we need to:

1. Wire the React frontend at apps/command-center/src/app/finance/reconciliation/ to use bank_statement_lines instead of xero_transactions as the source of truth. The existing API route is at apps/command-center/src/app/api/finance/reconciliation/route.ts — it needs updating.

2. Add R&D tagging to bank_statement_lines so we can track the 43.5% R&D tax offset at risk from missing receipts.

3. Build the agent-powered weekly loop: auto-pull statement lines, match receipts, search Gmail for gaps, post structured action list to Telegram/Notion with BAS score and chase items.

4. Build project-level spend views showing card spend, receipt coverage, and R&D eligible amounts per project.

5. Add a learning loop so each BAS cycle feeds patterns back into the rules (new vendors, new locations, receipt sources).

6. Ingest Q3 FY26 statement lines.

The full architecture plan is at thoughts/shared/plans/spending-intelligence-system.md. The key tables are bank_statement_lines, location_project_rules, subscription_patterns. Key scripts: reconciliation-report.mjs, tag-statement-lines.mjs, weekly-reconciliation.mjs.
```

## Key files
| File | Purpose |
|------|---------|
| `thoughts/shared/plans/spending-intelligence-system.md` | Full architecture plan |
| `thoughts/shared/handoffs/spending-intelligence-system-handoff.md` | First handoff (backend build) |
| `scripts/reconciliation-report.mjs` | Main report script |
| `scripts/tag-statement-lines.mjs` | Project tagger with trip rules |
| `scripts/weekly-reconciliation.mjs` | Monday cron |
| `scripts/xero-export-statements.mjs` | Playwright export |
| `scripts/resolve-ambiguous-matches.mjs` | Uber/Qantas resolver |
| `scripts/ingest-statement-lines-raw.mjs` | Raw paste parser |
| `apps/command-center/src/app/api/finance/reconciliation/route.ts` | React API (needs updating) |
| `apps/command-center/src/app/finance/reconciliation/page.tsx` | React UI |
| `.playwright-state/xero-session.json` | Saved Xero browser session |
| `data/statement-lines-oct-nov-2025.txt` | Raw statement data |
