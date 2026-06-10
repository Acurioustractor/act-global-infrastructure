# Reconcile Weekly Log

> The learning loop for the reconciliation engine. One entry per weekly session.
> Ritual (Monday, 30–40 min, day-shift): run `node scripts/recon-status.mjs` → run
> `node scripts/reconcile-sidecar.mjs --scope fy26 --verify --limit 100` → do the
> reconcile clicks in Xero off the sidecar sheet (never bulk-accept green Match
> suggestions) → create ≤3 proposed bank rules in the UI → run the destructive
> dedup/void worklist verb if one is staged → append an entry here.
> Master plan: `thoughts/shared/plans/2026-06-10-bas-reconciliation-automation-engine.md` §8.

## Entry template

```
## Week of YYYY-MM-DD
- Clicks done / remaining backlog:
- Receipts closed / new gaps:
- Bank rules created (and the evidence that justified each):
- Mirror lies caught (single-GET disagreed with mirror):
- False matches / wrong auto-codings caught (trap family):
- What the agents got wrong this week:
- One improvement shipped or filed (issue #):
- Human minutes spent:
```

## Week of 2026-06-08

- Plan shipped: BAS/receipt/reconciliation automation engine (`thoughts/shared/plans/2026-06-10-bas-reconciliation-automation-engine.md`), built from a 15-agent adversarial review. P0 backlog published as issues #158–#169.
- Day zero executed 2026-06-11: the three unattended Xero-write crons (`push-ai-tracking-to-xero`, `receipt-match --apply` chain, `receipt-upload`) deleted from PM2 and commented out of `ecosystem.config.cjs`. Code check found `receipt-match --apply` was mirror-only all along — the true Xero writers were the other two.
- Capability research (verified 2026-06-10): API reconciliation is impossible permanently; no Bank Rules API; no item-level Dext API; JAX beta has no API surface. The floor is honest now.
- New tooling: `scripts/recon-status.mjs` (always-current mirror overview) + `scripts/reconcile-sidecar.mjs` (per-line receipt links + action buckets, optional single-GET `--verify`).
- Sprint goal set: Q2+Q3 FY26 fully reconciled by Friday 2026-06-12.
- Improvement filed: the whole P0 ladder (#158–#169).
- Human minutes spent: cron stop + issue review ~20 min.
