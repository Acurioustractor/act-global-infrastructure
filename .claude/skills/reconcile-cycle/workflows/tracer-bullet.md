# Tracer-bullet — prove one line end-to-end before any batch

The money-work rule: one record proves the full path before any bulk run. Do this once when the cockpit
is new, and again before turning on any Phase-2 write batch. It's how we catch a silent wrong edge case
while it costs one line, not 459.

## Phase 1 (read-only) tracer — verify the cockpit tells the truth

Pick ONE line of each verdict and confirm the cockpit's claim against reality in Xero.

1. **A DUPLICATE** (e.g. the Airbnb $4,621 example):
   - Cockpit says: bill X + card txn Y, same purchase.
   - In Xero: confirm both exist, same amount, same week. ✅ if real.
2. **A MATCH_BILL with a surcharge**:
   - Cockpit says: bank $A vs bill $B, surcharge $A−B.
   - In Xero: confirm the bill amount = $B and the Δ is a plausible card fee. ✅ if the maths holds.
3. **A CREATE from a receipt**:
   - Cockpit shows a project + a receipt image.
   - Confirm the receipt image actually is that purchase, and the project is right. ✅ if it matches.

If all three check out, the cockpit is trustworthy → it can drive the weekly triage. If any is wrong,
capture the failure in `vendor-aliases.md` / `confirmed-duplicates.md` and (if it's a logic bug) fix
`apps/command-center/src/lib/finance/reconcile.ts` + its test before relying on the cockpit.

## Phase 2 (write) tracer — before the first write batch (NOT yet — Phase 2 is unwired)

When the write path exists, prove ONE create + attach end-to-end:

1. Pick one clean CREATE line (unambiguous vendor, has a receipt, confident coding).
2. Dry-run: confirm the matcher still says CREATE (no bill/txn appeared since) — dedup-safe.
3. Create the single coded bill/spend in Xero; attach the one receipt image.
4. **Eyeball it in Xero**: right account, right project, right contact, receipt visible.
5. Confirm attempted (1) = actual (1).
6. Only after this passes, run a small batch (5–10), re-verify counts, then scale.

Stop criteria for the batch run: stop when attempted ≠ actual, when any line's verdict changed between
dry-run and write, or when Xero returns an auth/rate error — never push through it.
