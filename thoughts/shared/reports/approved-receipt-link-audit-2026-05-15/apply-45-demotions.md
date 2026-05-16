# Apply 45 Definitely Wrong Receipt Link Demotions

Date: 2026-05-15

## Action

Demoted the `45` approved receipt evidence links classified as `definitely_wrong` to `needs_review`.

This was a Supabase evidence-mirror update only. It did not write to Xero, publish from Dext, reconcile bank-feed lines, or change accounting state.

## Command

```bash
node scripts/audit-approved-receipt-links.mjs --quarters Q2,Q3,Q4 --apply
```

## Apply Output

- Rows scanned: `1542`
- Approved links scanned before apply: `706`
- Unsafe approved links before apply: `203`
- Definitely wrong links before apply: `45`
- Apply target: `definitely wrong only`
- Links demoted: `45`

## Verification

Fresh read-only audit after apply:

- Approved links scanned after apply: `661`
- Unsafe approved links after apply: `158`
- Definitely wrong links after apply: `0`

## Remaining Review Work

The remaining `158` unsafe links are not approved as definitely wrong by the stricter classifier. They still need human or narrower scripted review.

Example: `Liberty $213.00` on `2026-02-06` still has an approved `Liberty Maleny` evidence link with date delta `29d`. It was not demoted by this pass because it has vendor/amount alignment but stale date alignment.

## Verification Status

verified: `45` definitely wrong approved links were demoted to `needs_review`.

verified: a fresh read-only audit reported `0` definitely wrong links remaining.

unverified: no Xero UI reconciliation state was changed or checked.
