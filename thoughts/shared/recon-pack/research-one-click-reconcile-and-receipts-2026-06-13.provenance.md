# Provenance — research-one-click-reconcile-and-receipts-2026-06-13.md

**Generated:** 2026-06-13, Cowork session (Claude). **Purpose:** deep-research answer to Ben's question — can reconciliation become "one click for all," can missing receipts be flagged easily, and can we capture all receipts (even sub-threshold). Blends ACT internal recon-pack with verified current Xero/ATO facts (knowledge cutoff May 2025, so all product facts were web-verified for 2026 state).

## Method
- Read ACT internal: `07-bank-rules-proposal.md`, `BANK-RULES-AND-RECONCILE-WALKTHROUGH.md`, `RECONCILE-NOW.md`, `recon-status-latest.md`.
- Web: 8 searches + 2 page fetches across Xero Central, Xero Blog (primary), Xero Product Ideas, Datamolino, Receiptor AI, ATO. Verified the two load-bearing facts (JAX scope/plan; Hubdoc shutdown) against primary/multiple sources.

## Verified vs inferred

| Claim | Status | Evidence |
|---|---|---|
| Reconcile click has no API; Xero declined 6 May 2026 | **Verified (internal)** | `BANK-RULES-AND-RECONCILE-WALKTHROUGH.md` line 3; CLAUDE.md capability matrix |
| JAX automatic bank reconciliation: high-confidence auto, 80%+ target, on/off per account, review control | **Verified (primary)** | Xero Blog (fetched full text), Nov 2025 beta post |
| JAX available on Xero **Grow (AU)** and above | **Verified (primary)** | Xero Blog "How to get started" |
| Cash coding: ~200 lines, code+reconcile in one step, **creates only — does not match existing bills**; Grow+ | **Verified** | Xero Central (cash coding) via search summary |
| Bank rules apply to new feed **and existing unreconciled lines** | **Verified** | Xero Central "About bank rules"; ACT proposal §4 |
| No native Xero report for transactions missing receipts/attachments (not on roadmap) | **Verified** | Xero Product Ideas + Xero Central community threads |
| **Hubdoc shut down 8 May 2026**; Xero Files = storage only (no OCR/extract/fetch) | **Verified (multi-source)** | Datamolino 2026, Receiptor AI, StatusGator |
| Dext auto-fetches from supplier portals + email inbox, supplier coding rules | **Verified** | Datamolino, Xero Blog (Hubdoc/Dext pairings) |
| ATO: tax invoice required only **> $82.50** GST-incl; ≤ $82.50 a receipt/record suffices; keep 5 years | **Verified** | ATO tax-invoices + claiming-GST-credits pages |
| ACT lever counts (~28 rules, ~135 one-click creates, ~108 matches, ~33 transfers, ~$372K Everyday transfers) | **Verified (internal)** | `07-bank-rules-proposal.md`, `BANK-RULES-AND-RECONCILE-WALKTHROUGH.md`, `recon-status-latest.md` |

## Gaps / not verified
- **JAX backlog vs forward-only:** the blog frames auto-reconcile as real-time-on-import; whether enabling it clears an existing historical backlog is **not confirmed** — flagged in the report's caveats. Confirm in-product or with SL.
- **ACT's current Xero plan** — resolved 2026-06-13: Ben confirmed JAX is set up and in use, which gates on Grow+, so ACT is on Grow+ (cash coding also available). The plan-upgrade recommendation is moot.
- **Dext pricing/seats for ACT** — not priced.
- The Xero Central JAX article (`/About-auto-bank-reconciliation-powered-by-JAX`) returned an empty shell to WebFetch (JS-rendered); facts taken from the Xero Blog primary post + secondary coverage instead.

## Reproducibility
Re-run the 8 searches (queries in the transcript) or open the Sources URLs in the report. Internal lever counts regenerate from the live mirror via `npm run recon:status` / `recon:sidecar` on Ben's machine. All product facts are 2026-current and may move — re-verify JAX scope and plan names before acting on the FY27 plan decision.
