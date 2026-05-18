# Archived 2026-05-19 — receipt-pipeline duplicators

## What's here

- `gmail-to-xero-pipeline.mjs` — fetched receipts from Gmail, OCR'd, then pushed bills/attachments into Xero.
- `push-receipts-to-xero.mjs` — uploaded already-extracted receipts as Xero bill attachments.

## Why archived

These scripts ran in parallel with the **Dext → Xero** path. Both wrote bills to Xero, producing duplicate bills (same vendor/amount/date, two different `xero_id`s). The 2026-05-18 audit traced the bulk of bill+bill duplicates ($61K exposure, 4 definite + 16 probable groups visible on `/finance/audit`) to this exact double-write.

The crons that triggered them are already stopped (`gmail-sync`, `receipt-capture`, `receipt-match` — all `status=stopped` in PM2 as of 2026-05-18). Archiving the source removes the foot-gun if anyone runs them by hand.

## Canonical path going forward

**Dext + auto-billing connectors** (Qantas, Uber, Webflow, Virgin, Booking, etc.) are the single canonical receipt-capture path. Dext setting must be flipped to "Auto-publish" (not "Save as Draft") — see handoff item #5.

Bill attachments are copied to matching bank txns via `scripts/sync-bill-attachments-to-txns.mjs`.

## Restore (if needed)

```bash
git mv scripts/_archive/2026-05-19-receipt-pipeline-duplicators/gmail-to-xero-pipeline.mjs scripts/
git mv scripts/_archive/2026-05-19-receipt-pipeline-duplicators/push-receipts-to-xero.mjs scripts/
```

Before restoring: verify Dext is no longer the canonical path, AND that you've added dedup guards to prevent the same double-write happening again. The two scripts have NO dedup against Dext-created bills — that's the bug.

## Historical refs (kept for context)

- Handoff: `thoughts/shared/handoffs/money-state-of-play/current.md` (item #4 of open critical-path items)
- BAS cycle skill: `.claude/skills/bas-cycle/workflows/adding-a-new-vendor.md` (mentions the pipeline pattern — update if/when canonical path docs are rewritten)
- Plan refs: `thoughts/shared/plans/spending-intelligence-expert-review.md`, `new-entity-xero-launch-playbook.md`, others
