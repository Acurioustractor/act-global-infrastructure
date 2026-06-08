# Phantom consent — root-cause finding (2026-06-09)

**What:** 106 of the 269 CONTAINED contacts (and likely others) carry GHL `Newsletter Consent = Yes` with
**no `Consent Source` and no `Consent Timestamp`** = consent that was never actually given. A naive
`Yes`-only send gate trusts it → Spam Act exposure. Detail + per-row: `2026-06-09_contained-consent-resolution-worklist.{md,csv}`.

## Root cause: a manual GHL-UI import, NOT a script

**The codebase is ruled out as the source** (verified by reading every consent-writer in both repos):

| Script | Verdict |
|---|---|
| `scripts/goods-contact-hygiene.mjs` | `shouldConsent = false` — explicitly refuses to infer consent. Not it. |
| `scripts/backfill-newsletter-consent.mjs` | writes all **three** consent fields *with* a real source; phantoms have **blank** source → didn't touch them. Not it. |
| `scripts/ghl-taxonomy-migrate.mjs` | only **reads/gates** on the consent field (`hasNewsletterConsent`), never writes `Yes`. Not it. |
| `scripts/sync-ghl-to-supabase.mjs` | GHL→mirror read only; consent is sticky-from-GHL. Not it. |

No code path writes `Newsletter Consent = Yes` without a source/timestamp. The phantom signature
therefore cannot have come from the scripts.

**The records' own evidence (verified live):**
- Created **2026-01-08**, GHL `source = "ACT Intelligence"` — a *research-prospect list* (orgs/funders ACT
  identified: StreetSmart, AMP Foundation, Paul Ramsay Foundation, Red Dust, Julalikari), **not signups**.
- `Newsletter Consent = Yes`; `Consent Source` + `Consent Timestamp` **blank**.
- `dateUpdated = 2026-06-08T06:57` (all same minute) = the June-8 CONTAINED **tag** run — which did NOT set
  the `Yes` (the CONTAINED import CSV labels them `Consent Status = "Needs consent check"`, never wrote Yes).

**Conclusion — confidence levels (per verification.md):**
- **Verified:** the codebase does not produce this signature (every consent-writer read and excluded).
- **Strongly inferred:** the `Yes` was set by a **manual GHL-UI CSV import of the January "ACT Intelligence"
  prospect list** that mapped/defaulted a "Newsletter Consent = Yes" column with no source/timestamp columns.
  It is a UI action — which is exactly why there is no script or git commit for it.

## Why it won't silently regrow — and the guards

Because no automation writes phantom consent, **it only returns if a human re-imports a list with
`Newsletter Consent = Yes` again.** Three guards close that:
1. **Hardened send gate (done):** every Sendable Smart List now requires `Consent Source is not empty` —
   phantom consent fails the gate by construction, even before cleanup. (`2026-06-09_move2-move3-smartlists-views-spec.md`.)
2. **Standing import rule:** never map `Newsletter Consent = Yes` on a GHL import without a real
   `Consent Source` + `Consent Timestamp` column. Pin in the comms-architecture / consent policy docs and
   brief anyone who bulk-imports.
3. **Recurring monitor:** `scripts/phantom-consent-guard.mjs` (dry-run = audit) flags any
   `Yes ∧ Consent Source empty` — cron it; alert when count > 0. `--apply` revokes (held; explicit verb).

## Remediation status
- **Revoke the existing 106:** `phantom-consent-guard.mjs --apply` (sets `Newsletter Consent = No`, never Yes,
  re-verifies live first). **HELD — needs explicit "revoke".**
- The hardened gate already neutralises the live risk; revoke is hygiene, not an emergency.
