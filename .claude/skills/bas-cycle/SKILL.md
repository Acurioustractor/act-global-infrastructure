---
name: bas-cycle
description: BAS quarter preparation, receipt acquittal, and learning loop for ACT. Use for BAS prep, missing receipt hunts, vendor reconciliation, and quarterly retrospectives. Accumulates patterns and learnings across quarters so each BAS cycle gets cleaner.
triggers:
  - "BAS"
  - "prepare BAS"
  - "receipt acquittal"
  - "missing receipts"
  - "reconcile quarter"
  - "BAS retrospective"
  - "Q1 FY"
  - "Q2 FY"
  - "Q3 FY"
  - "Q4 FY"
---

# BAS Cycle Skill

A long-memory assistant for the BAS quarter. Knows how Xero + Dext + bank feeds + our receipt pool fit together, remembers what worked last time, and codifies patterns so every quarter closes cleaner than the last.

## What this skill is for

- **Preparing a BAS quarter** — end-to-end workflow from "new quarter starts" to "BAS lodged"
- **Hunting missing receipts** — using all six coverage paths, not just direct attachments
- **Running a retrospective** — after a quarter is lodged, extract what worked and feed it back into the skill's own knowledge
- **Building vendor-specific playbooks** — "Qantas does X, Uber does Y, small SaaS does Z"

## The 6 coverage paths (the model for "receipt is there to click on")

When you ask "does this bank transaction have a receipt?" the answer can come through any of:

1. **DIRECT** — Attachment on the bank transaction itself (`has_attachments=true`)
2. **BILL_LINKED** — Transaction is linked (Xero Find & Match) to an ACCPAY bill that has an attachment
3. **FILES_LIBRARY** — Receipt exists in Xero's Files library and references this txn
4. **POOL_MATCH** — Receipt exists in our `receipt_emails` pool and is plausibly this txn
5. **GMAIL_RAW** — Receipt exists in raw Gmail (missed by Dext) and is plausibly this txn
6. **NO_RECEIPT_NEEDED** — Bank fee, bank transfer, owner drawing, below-$75 no-GST, write-off-accepted

**Anything not in paths 1-6 is a genuine missing receipt and needs chasing.**

## Commands (run from repo root)

### Prepare a quarter
```bash
# Full picture for any quarter (uses the 6-path classifier)
node scripts/bas-completeness.mjs Q2

# Only the genuine missing receipts (path 7 — chase list)
node scripts/bas-completeness.mjs Q2 --gap-only
```

### Hunt missing receipts
```bash
# Raw Gmail search for unreceipted txns in a quarter
node scripts/gmail-deep-search.mjs Q2

# Scan Xero Files library for loose receipts
node scripts/xero-files-library-scan.mjs

# Match pool receipts to Xero (already in place, now scorer-fixed)
node scripts/match-receipts-to-xero.mjs --apply

# Copy bill attachments to matching bank txns
node scripts/sync-bill-attachments-to-txns.mjs Q2 Q3 --apply
```

### Learn from a completed quarter
```bash
# Run AFTER lodging. Produces references/quarterly-retro-{quarter}.md
node scripts/bas-retrospective.mjs Q1-FY26
```

### Routine hygiene (weekly)
```bash
node scripts/ocr-dext-processing.mjs --apply       # OCR new Dext rows
node scripts/match-receipts-to-xero.mjs --apply    # Auto-match new receipts
node scripts/sync-bill-attachments-to-txns.mjs --apply  # Copy bill receipts
```

## References

- `references/vendor-patterns.md` — per-vendor playbook (Qantas, Uber, Apple, etc.)
- `references/reconciliation-rules.md` — when a txn doesn't need a receipt
- `references/quarterly-learnings.md` — patterns accumulated across quarters
- `references/q1-fy26-retro.md` — baseline retrospective
- `workflows/quarterly-checklist.md` — step-by-step BAS prep runbook
- `workflows/weekly-hygiene.md` — routine maintenance

## How this skill learns

**After each BAS is lodged:**
1. Run `bas-retrospective.mjs {quarter}`
2. It reads: starting state, ending state, what scripts ran, what Nic did manually
3. It writes: a new retro file in `references/` + appends new patterns to `vendor-patterns.md`
4. Next quarter's prep starts by reading the accumulated `quarterly-learnings.md`

Over time, this skill becomes the institutional memory of ACT's bookkeeping — every edge case, every vendor quirk, every hard-won lesson codified.

## Current state snapshot

- **Q1 FY26**: Lodged. Baseline retro pending.
- **Q2 FY26**: Overdue ~6 weeks. In active prep.
- **Q3 FY26**: Due 28 Apr 2026. In active prep.
- **Q4 FY26**: Starts Apr 1 2026.

See `thoughts/shared/handoffs/bas-fy26-session-handoff.md` for the live working state.
