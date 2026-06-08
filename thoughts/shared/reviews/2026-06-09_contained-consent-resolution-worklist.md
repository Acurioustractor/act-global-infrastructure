# CONTAINED consent-resolution worklist — summary (2026-06-09)

Read-only join of the 269-row CONTAINED import against the live `ghl_contacts` mirror + a **live GHL
provenance pass** (Consent Source + Consent Timestamp per consented contact). Per-row detail:
`2026-06-09_contained-consent-resolution-worklist.csv`. Builder (no writes):
`scripts/build-contained-consent-worklist-2026-06-09.mjs`.

## Headline: the problem is PHANTOM consent, not stripped consent

The fear was that consent got stripped. The data shows the opposite, more dangerous failure:

> **`Newsletter Consent = Yes` alone is NOT real consent.** Real opt-ins carry a `Consent Source`
> *and* a `Consent Timestamp`. A large cohort carries `Yes` with **both blank** — consent that was
> **bulk-set on 2026-01-08, never opted-in.** That is **phantom consent**, and the gate trusts it.

Live-verified provenance across the 269:

| Consent quality | Count | What it is |
|---|---|---|
| **PHANTOM** (`Yes`, no source/timestamp) | **106** | bulk-set, never opted in — **Spam-Act liability** |
| **REAL** (`Yes` + source + timestamp) | 97 | genuine footer / gathering / member signups |
| **NONE** (not `Yes`) | 63 | not consented (correctly) |
| ERR (transient fetch fail) | 3 | re-run to resolve |

**Phantom by source:** PROSPECT (`ACT Intelligence`/agent/calendar) **79** · blank-source **26** · ambiguous 1.
Sample phantom records — all `dateAdded=2026-01-08`, `Consent Source`/`Timestamp` empty:
`alan@streetsmartaustralia.org`, `ampfoundation_tomorrowmakers@amp.com.au`,
`hello@paulramsayfoundation.org.au`, `fiona@reddust.org.au` (orgs/funders, not newsletter subscribers).

## Why this matters (and why the gate as-built is not enough)

The Move 2 Sendable gate I specced was `comms:X-newsletter ∧ Newsletter Consent=Yes ∧ ¬lane:community`.
**Phantom consent passes that gate** — so a send would lawfully-looking-but-unlawfully hit up to 106
people/orgs who never opted in. The gate must also require **proof of opt-in**.

### Gate hardening (the structural fix — do this regardless)
Add one filter to every Sendable Smart List:
> `Consent Source is not empty` (equivalently `Consent Timestamp is not empty`)

i.e. **Sendable = `comms:X-newsletter` ∧ `Newsletter Consent = Yes` ∧ `Consent Source is set` ∧ NOT `lane:community`.**
This makes phantom consent fail the gate by construction — no record can send without a provenance trail,
even before the phantom flags are cleaned up. (Reflected in the Move 2/3 spec.)

## Recommended fix (priority order)

1. **Harden the gate** (above) — no contact writes, pure list-filter change. Do first; it neutralises the
   risk immediately. **Read-only / your UI build.**
2. **Revoke the 106 phantom consents** — set `Newsletter Consent` back to `No`/unset where it's `Yes` with
   no source/timestamp. Revoking consent that was never given is the always-safe direction (worst case:
   re-ask someone who'd have said yes; you never wrongly email a non-consenter). **Tier-2/3 GHL write —
   needs your explicit verb; not auto-run.** Tool can be built mirroring the gated strip pattern.
3. **Merge the 48 dupes** (GHL UI; no merge API) — `benjamin@act.place ×4`, `adam@streetsmartaustralia.org ×4`,
   `toby gowland ×4`, `s.grimsley-ballard@snowfoundation.org.au ×3`, etc.
4. **Find + fix the 2026-01-08 bulk-consent source** — whatever process set `Newsletter Consent=Yes` on 106
   prospects without provenance must be found and stopped, or it regrows. (All phantom rows share that add-date.)
5. **The 97 REAL stay; the 63 NONE need nothing** — genuine signups keep consent; non-consented prospects are
   correctly blocked by the (hardened) gate.

## Provenance
- **Sources:** `JusticeHub/output/ghl-contained-adelaide-audit/contained-ghl-import.csv` (269 rows) +
  `ghl_contacts` mirror (4,441 rows, paginated) + **live GHL `getContactById` per consented row** for
  Consent Source/Timestamp (the authoritative consent signal).
- **Verified:** consent quality is from LIVE GHL custom fields, not the mirror flag (the mirror's
  `newsletter_consent` boolean is accurate per exact-id check, but it does NOT carry source/timestamp, so a
  live pass was required to separate REAL from PHANTOM).
- **Inferred:** source→bucket mapping (which import sources imply a real opt-in) is judgment; the
  consent-quality split (REAL/PHANTOM/NONE) is fact from live fields.
- **Gaps:** 3 ERR rows (transient fetch) — re-run. Non-consented rows weren't live-fetched (mirror
  false-negatives are not expected, but a full live pass would close that).
- **Reproducible:** `node scripts/build-contained-consent-worklist-2026-06-09.mjs` (read-only, ~4 min).
