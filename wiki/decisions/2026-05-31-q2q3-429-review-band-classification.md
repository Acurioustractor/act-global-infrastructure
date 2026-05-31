---
title: Q2/Q3 General Expenses (429) REVIEW-band classification decisions
slug: q2q3-429-review-band-classification-2026-05-31
status: active
date: 2026-05-31
tags: [decision, finance, xero, recode, bas, standard-ledger, q2-fy26, q3-fy26]
audience: [Ben, Nic, Standard Ledger, Claude]
related:
  - [[act-system-architecture-2026-05-15]]
  - [[finance-4-surface-model]]
---

# Q2/Q3 General Expenses (429) REVIEW-band classification

## Context

After the 2026-05-29 recode, account **429 "General Expenses"** in the sole-trader org ("Nicholas Marchesi", tenant `786af1ed-…`) dropped **$486K → $284K** (90 High/Medium-confidence bills recoded out, reversible, BAS-neutral). The **~$284K remaining** is the judgement-only residue: TFN, the REVIEW band, held duplicates, and archived-contact bills.

This record captures the **human classification decisions** on those items, so the Standard Ledger handoff carries *decisions, not open questions*. Source proposals: `thoughts/shared/recon-pack/01-recode-review-band.md` + `scripts/output/ge-recode-worklist.csv`. Decisions reached with Ben in a grilling session, 2026-05-31.

> Nothing here is written to Xero by Claude. SL executes (several items touch lodged-period / BAS).

## Decisions

### 1. The Funding Network — $144,558 → REVERSE (income, not an expense)

**Decision (Ben, 2026-05-31): Option (a) — this is money ACT *received* via a Funding Network campaign, mis-booked as a payable.**

- The two AUTHORISED ACCPAY bills (2025-11-27 $89,361 + 2025-12-17 $55,197, coded ACT-CE) **should not exist as payables** — reverse them.
- Book the cash ACT actually received via the campaign as **income** (fundraising/donation income — SL to set the exact account).
- **Reverse the GST input credit claimed** — there was no taxable supply *to* ACT, so the input credit is invalid.

**Consequence — revised Q2 BAS.** The GST over-claim from this line is well past the $12,500 debit-error limit (turnover <$20M), so it cannot be swept into a later BAS. **SL: confirm whether the Q2 (Oct–Dec 25) BAS is lodged; if so, prepare a revised Q2 BAS.** This is the single biggest driver of the BAS revision.

**Rationale.** $144K is implausible as a platform fee or as a donation ACT *makes*; ACT is the *beneficiary* on The Funding Network, the bills are unpaid AUTHORISED, and Ben confirmed the funds were raised *through* TFN for ACT. (Considered and rejected: (b) onward-regrant donation → 417; (c) cost-of-fundraising fee.)

### 2. MOL Nyrt. — RESOLVED 2026-05-31: currency error, real value AUD 151.31 (Hungarian fuel)

**It is NOT a $30K expense.** The Dext attachment (Ben opened it) is a **MOL service-station fuel receipt from Hungary** (Budapest/Vecsés), 27 Mar 2026: **37.52 L of EVO100 petrol, total 30,691 HUF (Hungarian Forint) = €90.53 = AUD 151.31**, paid on **NAB Visa #8815 (card ****1656)**.

**Root cause:** the **30,691 *Forint* total was imported into Xero as the dollar amount** (and the recode worklist mislabelled it "native USD"), overstating the line by **~AUD $30,540**. Dext itself extracted the correct figures (EUR 90.53 / AUD 151.31); the bill that reached Xero carried the raw Forint number. "MOL Nyrt." was correct — it really is a MOL petrol station — not a wrong contact.

**Correction — APPLIED 2026-05-31** (Ben authorised) via `scripts/fix-fx-dext-bills.mjs --apply --band mol`:
- ✅ **Amount AUD 30,691 → AUD 151.31** and **account 429 → 493**. Xero POST 2xx, applied=1. Revert log `scripts/output/fix-fx-revert-1780202548965.json`. TaxType (BASEXCLUDED), Tracking, Description preserved.
- **Remaining (manual):** Find & Match the corrected bill to its ~$151 **NAB Visa #8815** line in the Xero UI (API can't reconcile). SL to refine 493 "Travel-National" → the correct international-travel/motor-vehicle account, and confirm the ACT-IN project / business purpose (else drawings).

**Impact on the 429 lump:** removes **~$30,540 of phantom** from account 429. The remaining-429 / REVIEW-band totals in the prep pack were **overstated by that amount** — real residual 429 is ~$30.5K smaller than stated.

### 2b. Systemic — Dext→Xero FX non-conversion (90 lines, 13 vendors)

The MOL line shares a signature with **89 others**: the Dext/gmail auto-push wrote the **foreign "native" amount straight into the AUD total field** and tagged *"adjust AUD to match bank line"* — but the FX adjustment never ran. Scan of `xero_invoices` (2026-05-31): **90 lines, 13 vendors, $33,880.36 booked**.

- **MOL — $30,691 booked → real $151.31** (Forint mis-read; **over**stated $30,540). The only material error.
- **89 software-subscription lines — $3,189 booked** (USD entered as AUD with no conversion → each **under**stated by the FX gap; true ≈ AUD $4,800, ~$1,600 understated). Vendors: Webflow, OpenAI, Anthropic, Vercel, Supabase, Zapier, Dialpad, Mighty Networks, Firecrawl, Stripe, Squarespace, GitHub Copilot — **all tagged ACT-IN, all R&D-eligible infrastructure**.

**Fix — built + dry-run 2026-05-31** via `scripts/fix-fx-dext-bills.mjs` (dry-run default, confidence-gated, GET-fresh→POST, revert log, 2.5s throttle). The dry run resolves the picture by status:

- **AUTHORISED ACCPAY (in the ledger): 16 bills, $31,088** — of which **MOL is $30,691**. Apply MOL only (`--apply --band mol`): amount → $151.31, recode 429 → 493. Material, certain, reversible. **Tier-3 Xero write — needs Ben's explicit go.** (Xero API can't reconcile — afterwards match the corrected bill to its NAB Visa line via Find & Match in the UI.)
- **Other 15 AUTHORISED SaaS ($397 booked, ~$200 understated): 0 high-confidence bank matches** — ambiguous (Webflow/OpenAI have many same-vendor charges) or no clean match. Immaterial; leave for Find & Match or the Pty migration — do NOT auto-write.
- **69 DRAFT ($2,593) + 5 DELETED ($199):** drafts don't hit the P&L — fold into the "drafts to clear before cutover" cleanup, not this fix.

Net ledger effect of the recommended apply (MOL only): **−$30,539.69** from 429.

**Durable fix:** the Dext→Xero pusher never applied FX. Fix the pusher (or consolidate to one receipt tool with auto-FX) **before the Pty org goes live**, or this recurs in FY27.

### 4. Capital-vs-expense cluster — grilled 2026-05-31

- **Hatch Electrical $19,947 (10 Nov 2025, was tagged ACT-FM)** → **Oonchiumpa job** (Ben): electrical + general build support, building out on traditional-owner home land. ACT does **not** own that land/building → **not capital works, not an ACT asset** → a **project-delivery / sub-contract expense**. **Recode 429 → 486; retag ACT-FM → ACT-OO.** Real, AUTHORISED, unpaid → confirm Hatch is still owed. The 2 smaller Hatch-in-429 bills ($3,677 10-Dec, $772 12-Jan, both ACT-FM/Dext) — confirm Oonchiumpa vs Farm before recoding.
- **Mounty Container $11,000 (manual `MOUNTY-CONTAINER-MANUAL`, AUTHORISED, unpaid)** → **made-up duplicate → VOID** (Ben authorised 2026-05-31). No bank spend matches it; "director owner contribution" note is false. The **real** Mounty Yarns container is **Container Options $5,802.50**. **⚠️ Void can't be done via API 2026-05-31** — confirmed dead-end: (1) the void is blocked because contact "Mounty Container Supplier" (`77b9726e…`) is **archived**, and (2) un-archiving it via API also fails — Xero: *"Archived contacts cannot currently be edited via the API"* (UI-only, like reconciliation). **→ Must be done in the Xero UI:** un-archive the contact → void bill `408b05bb` → re-archive. **Bundle with the other 7 archived-contact bills for SL.** Void script `scripts/void-mounty-phantom.mjs` preflight-passes and will work via API only once the contact is active.

> **New operational trap:** Xero API **cannot un-archive a contact** (UI-only) — so the "archived contact blocks edits" trap has *no API workaround*. Any void/edit of a bill on an archived contact must be done in the Xero UI.
- **Container Options $5,802.50** → the genuine Mounty container (NAB Visa, 5 Dec 2025). Recode 429 → 446, keep **ACT-MY**, match to the $5,802.50 card line.
- **RW Pacific $4,200 (off-grid generator) + Total Tools $4,547** → business equipment, each <$20K → instant asset write-off (RW Pacific 446/ACT-GD, Total Tools 447/ACT-HV). Confirm not personal.

### 5. The Matnic Trust — mostly already resolved (verified 2026-05-31)

Matnic Trust is a **materials supplier** (keepers coded **446** across PICC/Goods/Harvest) — **NOT** a rent/landlord (recon-pack's "matnic properties → rent/469" lead was wrong). Each charge had a **Dext duplicate** (429/ACT-IN) shadowing a properly-coded **PAID keeper**:
- $6,441.74 → Dext dup **VOIDED** (2026-05-29) ✓ · keeper PAID **446 / ACT-PI (PICC)**.
- $2,826.92 → Dext dup **VOIDED** ✓ · keeper PAID **446 / ACT-GD (Goods)**.
- **$591.28 (2026-03-11) → Dext dup the sweep MISSED, still AUTHORISED in 429/ACT-IN** · keeper PAID **446 / ACT-HV (Harvest)** → **void candidate** (small; bundle with cleanup).

No rent reclassification needed. **Systemic pattern confirmed:** much of the "remaining 429 REVIEW band" is **Dext-import shadow duplicates** of correctly-coded PAID keepers, not genuine uncoded spend.

### 6. Director / pass-through items — grilled 2026-05-31

- **PayPal — RESOLVED.** The $3,918.50 (recon-pack's "$3,919") is already **PAID, coded 407 (Bank/Merchant Fees), ACT-IN** — done. A separate **$2,650.62 is an old DRAFT (Jun 2025)** → fold into draft cleanup. No action.
- **Nicholas Marchesi $5,149** (3 AUTHORISED 429 bills, descr "Income"):
  - **$1,974.50 ×2 — both 2025-11-24, identical Dext ref `03a26314` = DUPLICATE** → void one (`72d0abe7` / `764b8b05`).
  - **$1,200 (6-Nov) + $1,974.50 (24-Nov)** → Ben: these are **Nic putting money into the business / being repaid — an owner (sole-trader) loan**, not expense or income. Reclassify to an **owner's loan / contributions equity account** (out of 429; not ACCPAY-with-GST). **OPEN for SL.**
- **A Curious Tractor self-bill $6,226 (2025-11-10, AUTHORISED, 429, ACT-IN, Dext):** Ben: **same theme** — relates to **how Nic added money to the business (owner/sole-trader loan) and pays himself back**, not a third-party expense. **OPEN for SL** to structure the owner-loan accounting — do NOT void blindly (real money movement, mis-recorded).

> **Synthesis for SL — owner-funding cluster.** The A Curious Tractor self-bill, the Nicholas "Income" bills, and (per memory) Nic's $15,000 + $6,159 R&D-coded transfers all represent **Nic injecting personal funds into the sole-trader business** (owner contribution / loan), mis-recorded variously as expense / income / R&D. **SL to consolidate into one owner's-loan / equity treatment** and formalise as a **Director's Loan account in the Pty** at cutover (ties to the sole-trader→Pty migration + money-thesis rebuttal). GST input claimed on these movements is almost certainly wrong.

## Status — grill complete (2026-05-31)

**✅ Done (Xero write applied):**
- MOL Nyrt $30,691 → $151.31, 429 → 493 (revert-logged; UI Find&Match still needed).

**Decided — SL / batch to execute:**
- **TFN $144,558** → reverse the 2 AP bills, book as income, reverse GST input → **revised Q2 BAS** (§1).
- **Hatch $19,947** → recode 429 → 486, retag ACT-FM → ACT-OO (Oonchiumpa job).
- **Container Options $5,802.50** → recode 429 → 446, ACT-MY; match to the 5-Dec card line.
- **RW Pacific $4,200 / Total Tools $4,547** → instant-write-off equipment (confirm not personal).
- Project moves (recon-pack High band): Plasticians ACT-IN → ACT-GD; Allclass ACT-IN → ACT-FM.

**Void candidates (cleanup batch):**
- Mounty Container $11,000 phantom — **UI-only** (archived contact, no API path).
- Nicholas Marchesi $1,974.50 duplicate.
- Matnic Trust $591.28 leftover dup (2026-05-29 sweep missed it).
- (+ the existing 7 archived-contact bills, Sand Yard ×3 / Edmonds ×4.)

**🔓 OPEN — for SL discussion (owner-funding cluster, §6):**
- A Curious Tractor self-bill $6,226 + Nicholas Marchesi $1,200 + $1,974.50 → Nic's owner/sole-trader loan; reclassify to owner's-loan/equity; formalise as Pty Director's Loan at cutover.

**Confirm with Ben:** 2 smaller Hatch-in-429 bills ($3,677 10-Dec, $772 12-Jan) — Oonchiumpa or Farm?

**Immaterial / deferred:** 15 SaaS FX bills (~$200, unmatchable — leave/Pty); 69 DRAFT flagged bills ($2,593, draft cleanup); **Everyday bank statement never imported** (reconciliation gap to close before the Pty cutover).
