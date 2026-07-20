---
title: Dext + Xero AI alignment — the receipt & reconciliation setup (canonical)
status: Active
canonical_slug: dext-xero-ai-alignment
date: 2026-07-08
owner: ben
description: |
  How receipts should flow through Dext, the vendor connectors, and Xero — and
  where our custom AI layer (OCR, matching, tagging, reconcile cockpit) fits — so
  every receipt lands once, coded, on the right Xero record, and the weekly
  reconcile is a click not a hunt. Written to collapse the current THREE-rail
  mess into one primary rail (Dext) with the rest feeding into it.
---

# Dext + Xero AI alignment

> **The one-line thesis:** Dext is already doing 99% of the work — make it the
> *single* receipt front door, demote the parallel Gmail scraper from "publisher"
> to "gap-detector", let Xero bank rules mop up the receiptless recurring lines,
> and keep our custom layer for the two things neither Dext nor Xero can do:
> **project-tagging reconciliation** and the **per-line reconcile cockpit**.

---

## The evidence (live, 2026-07-08)

| Rail | Volume | Linked to Xero | Verdict |
|---|---:|---:|---|
| **Dext** (`source='dext_import'`) | 1,550 | **1,539 (99.3%)** | Working. This is the rail. |
| **Gmail scraper** (`source='gmail'`) | 817 | 411 (50%) | **275 stuck in `review`, 97 `captured`, 17 `failed` — all unlinked.** The orphan pile. |
| **Xero Me** (`source='xero_me'`) | 110 | 110 | Fine, low volume. |
| **Manual upload** | 15 | 4 | Negligible. |
| Dext `review`/`junk`/`captured` | 90 | 0 | 39 real Dext items awaiting review + 49 junk (marketing noise). |

**Reconcile state (SPEND, excl DELETED/VOIDED):** FY26 NAB Visa is essentially
done — **10 residual unreconciled lines ($2.3K)**; Everyday clean. FY27 has **19
fresh lines ($1.8K)** already. **Every one of the 29 open lines already has a
receipt attached** — the gap is the *reconcile click* (Xero UI-only), not receipts.

**Read this way:** receipts are NOT the problem. Dext + connectors capture them.
The problems are (a) a parallel Gmail rail that publishes nothing useful and piles
up orphans, and (b) the reconcile click, which no tool can automate.

---

## The four rails, and what each is FOR

1. **Dext — the primary rail (keep + lean in).**
   Receipt → Dext (email-in / mobile app / auto-fetch) → Dext AI extracts →
   publishes to Xero as an ACCPAY bill with the image attached → mirrored to
   `receipt_emails` as `dext_import`. 99% linked. No item-level Dext API — all
   config is in the Dext UI (this is fine; config once, runs forever).

2. **Vendor connectors — free and reliable (keep).**
   Qantas / Uber / Webflow / Virgin / Booking.com auto-create ACCPAY bills with
   PDFs. **The receipt is already in Xero, on the bill side** — it just needs
   Find & Match to the bank line (the reconcile cockpit surfaces these). Never
   download from the vendor portal for these; it's a duplicate.

3. **Custom Gmail pipeline — DEMOTE from publisher to gap-detector.**
   Today it OCRs Gmail receipts and tries to publish them itself — which created
   the 275-review / 97-captured orphan pool (receipts half-processed, never
   landed in Xero, cluttering the mirror). **Stop it publishing.** Repoint it to
   answer one question: *"which receipts are in Gmail that Dext did NOT capture?"*
   Those get **forwarded into Dext** (one email), so there's a single publisher.

4. **Xero Me / manual — leave as-is.** Low volume, already linked.

---

## Target architecture — one front door

```
                         ┌─────────────────────────────┐
  point-of-purchase ───▶ │  DEXT (single receipt inbox) │ ──▶ Xero ACCPAY bill
  (Dext mobile app)      │  • email-in address          │      + image attached
                         │  • supplier rules: account   │
  finance mailbox   ───▶ │    + project tracking        │
  (auto-forward to Dext) │  • auto-publish high-conf    │
                         └─────────────────────────────┘
  vendor connectors ───▶  Xero ACCPAY bills (Qantas/Uber/…) ──▶ Find & Match weekly

  Gmail scraper (ours) ─▶  GAP REPORT: "in Gmail, not in Dext" ──▶ forward to Dext
                           (no longer publishes directly)

  ┌── our custom AI layer (owns what Dext/Xero can't) ──────────────────────────┐
  │  • project-tag reconciliation: cross-check Dext's tracking vs project-resolver│
  │  • reconcile cockpit /finance/reconcile: per-line verdict, dup + surcharge    │
  │  • bas-completeness: the 6-path coverage model                                │
  │  • R&D eligibility tagging (rd_eligible / rd_category)                         │
  └──────────────────────────────────────────────────────────────────────────────┘

  RECONCILE CLICK ──▶ always Xero UI (API cannot set IsReconciled, permanently)
```

---

## Who does what (division of AI labour)

| Job | Best tool | Why |
|---|---|---|
| Read a receipt image → structured fields | **Dext AI** (primary), our Gemini OCR (fallback for Gmail gap-detect) | Dext is purpose-built + already 99% here; Gemini 2.5 Flash-Lite is our cheap fallback (10× cheaper than Haiku, parity on AU receipts). |
| Auto-code supplier → account + project | **Dext supplier rules** | Publishes pre-coded so the reconcile is a match, not a decision. |
| Recurring receiptless lines (bank fees, subs) | **Xero bank rules** (UI; no API) | Set once, auto-codes forever. Shrinks the CREATE pile. |
| Duplicate / surcharge detection | **Our reconcile cockpit** | Xero's suggested-match is amount-only → the Mar↔May date trap; ours gates amount + date + vendor token. |
| Project-tag correctness across the ledger | **Our project-resolver + tagging cockpit** | Dext tracking is a starting guess; the resolver + `/finance/tagging` is the source of truth. |
| "Is this receipt there to click on?" | **Our bas-completeness (6-path model)** | No single tool sees all six coverage paths. |
| The reconcile click | **Human, in Xero UI** | Not automatable. Ever. Driven off the weekly sidecar sheet. |

**Rule of thumb:** let Dext + Xero do the *capture and first-pass coding*; our
layer does the *reconciliation of truth* (project tags, duplicates, coverage) and
*surfaces* the click. Never let two rails publish the same receipt.

---

## Setup checklist (Dext + Xero config — Ben, in the UIs)

**Dext:**
- [ ] Confirm the Dext **email-in address**; make it the ONE receipt destination.
- [ ] Add a Gmail **auto-forward rule**: `accounts@act.place` receipts → Dext email-in (so Gmail receipts enter the single rail instead of the scraper).
- [ ] Install / confirm the **Dext mobile app** on the phones that do field spend — the NT Empathy Ledger trip (Elliott Store, Arlparra, Diplomat Motel…) should be snapped at the till, not chased later.
- [ ] Set **supplier rules** for the top recurring vendors → auto-set account + project tracking category (start with the ACT-EL / ACT-GD / ACT-IN regulars).
- [ ] Set **auto-publish** for high-confidence extractions; hold low-confidence in Dext's review, not ours.
- [ ] Turn on **Dext duplicate detection** (belt with the cockpit's dedup).

**Xero:**
- [ ] Create **bank rules** for the truly recurring receiptless lines (bank fees, no-invoice subs) so they auto-code on import.
- [ ] Turn **OFF** "Suggest previous entries" on the bank rec screen (the amount-only green matches are the Mar↔May trap — reconcile off our sidecar sheet instead).
- [ ] Confirm the connectors (Qantas/Uber/Webflow/Virgin/Booking) are still authorised and publishing.

**Our side (already built — just point it right):**
- [ ] Repoint the Gmail scraper to **gap-report mode** (detect "in Gmail, not in Dext" → forward), stop it publishing.
- [ ] Clear the existing backlog: triage the **275 gmail-`review` + 97 `captured` + 39 dext-`review`** — real & not-in-Xero → forward to Dext; junk → mark `junk`.

---

## Cutover implication (do this once, replicate on the Pty org)

Xero is still connected to the **sole-trader org** ("Nicholas Marchesi", ABN
21591780066) as of 2026-07-08 — the Pty cutover hasn't switched Xero yet. When
A Curious Tractor Pty Ltd's Xero org goes live, this entire Dext/Xero setup must
be **re-established against the new org**: Dext publishes to the new org, connectors
re-authorise, bank rules and supplier rules re-created. **Documenting the config now
(this file + the checklist) means it's a clean replication, not a rebuild.** Track
it against the cutover line in `compliance-calendar.md` and the migration checklist
`thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`.

---

## Decisions that need Ben (blocking a "perfect" setup)

1. **Dext plan tier** — does the current plan include supplier rules + auto-publish
   + the volume we're pushing (~1,900/yr)? If not, the upgrade pays for itself in
   reconcile time.
2. **Auto-publish confidence threshold** — how aggressive? (Recommend: auto-publish
   high-confidence, hold the rest — never blind-publish sub-threshold.)
3. **Which mailbox forwards to Dext** — `accounts@`? `hi@`? all four?
4. **Retire or keep** the custom Gmail *publisher*? (Recommend: retire the publish
   path, keep the gap-detector.)

Answer these and the setup is fully specified. Until then, the weekly cadence
(`weekly-finance-checkin.md`) already keeps the pile from growing.

## See also

- `wiki/finance/weekly-finance-checkin.md` — the weekly ritual that runs this setup.
- `.claude/skills/bas-cycle/` — receipts / 6-path coverage / GST.
- `.claude/skills/reconcile-cycle/` — the card-line cockpit + matching engine.
- `.claude/references/xero-tax-rd-expert.md` — Xero architecture + connector notes.
