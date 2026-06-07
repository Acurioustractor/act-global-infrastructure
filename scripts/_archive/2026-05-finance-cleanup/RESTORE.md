# Archived 2026-05-08 — finance scripts cleanup

30 scripts archived as part of the 4-surface model consolidation
(plan: `~/.claude/plans/rewive-all-the-finciance-agile-pearl.md`).

## What's in here

### Early prototypes / superseded
- `act-money.mjs`, `act-ghl.mjs`, `act-grants.mjs` — pre-skill architecture; replaced by `act-money-brain` plugin
- `finance-daily-briefing.mjs` — superseded by `daily-money-briefing.mjs` (richer + live in 8am cron)

### One-off operational tasks (complete)
- `cabin-cost-base.mjs`, `cabin-cost-base-clean.mjs`, `cabin-cost-base-xero.mjs`, `cabin-fy24-cost-base.mjs` — FY24 cabin disposal
- `migrate-xero-contacts.mjs` — one-shot Xero contact migration
- `recode-xero-bills.mjs`, `xero-bas-review.mjs` — old BAS prep helpers (use `prepare-bas.mjs` + `bas-completeness.mjs`)
- `update-mounty-invoices.mjs`, `draft-bail-invoice.mjs`, `draft-jvt-palm-island-invoice.mjs` — specific invoice ops
- `push-goods-stub-renames-to-ghl.mjs`, `push-goods-to-ghl.mjs` — Goods migration to GHL (complete)

### One-off audits
- `audit-finance-data-temp.mjs`, `audit-ghl-ecosystem.mjs`, `analyze-receipts.mjs`, `analyze-ghl-ecosystem-strategy.mjs`
- `xero-export-statements.mjs`, `xero-pfi-financials.mjs`, `xero-receivables-detailed.mjs`
- `test-xero-attachment-reality.mjs`

### Superseded by canonical scripts
- `bank-receipt-reconcile.mjs` — replaced by `match-receipts-to-xero.mjs`
- `flag-junk-receipts.mjs` — folded into `receipt-pipeline.mjs`
- `receipt-reconciliation-agent.mjs` — replaced by `receipt-pipeline.mjs`
- `query-xero-invoices.mjs` — Xero MCP covers this
- `chase-overdue-invoices.mjs` — replaced by daily-money-briefing surfacing overdue + manual chase
- `project-budget-alerts.mjs` — alerts now in daily-money-briefing
- `ingest-knowledge-base-files.mjs` — replaced by wiki pipeline

## Restore one script

```bash
git mv scripts/_archive/2026-05-finance-cleanup/<script>.mjs scripts/<script>.mjs
```

If the script was wired to a PM2 cron, also re-enable in `ecosystem.config.cjs` (search for the script name — disabled entries are commented).

## Why archive instead of delete?

Reversibility. These scripts were untouched for 30+ days OR explicitly superseded; archiving keeps git history clean while removing them from the working tree. To find them: `find scripts/_archive/2026-05-finance-cleanup/`.
