# Standard Ledger — MASTER Reconciliation + Recode Pack (Q2/Q3 FY26)

**Date:** 2026-05-29 · **For:** Standard Ledger (bookkeeper-ready) · **Prepared by:** Ben (via Claude)
**Org:** "Nicholas Marchesi" sole-trader (NJ Marchesi T/as ACT) · Xero `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`
**Period:** Oct 2025 – Mar 2026 (FY26 Q2 + Q3) · Australian FY Jul–Jun
**Two-account rule:** ACT spend = NAB Visa ACT #8815 (card) + NJ Marchesi T/as ACT Everyday (bank). NM Personal and Maximiser excluded throughout.

> **Status:** Nothing has been written to Xero, GHL, Notion or any external system. Everything here is *prepared for SL review and execution*. Ben's standing instruction: **recode the General Expenses lump now, in the sole-trader org** (not deferred to the Pty) — to fix the Q3 BAS and create the clean expense base needed for the retrospective "on behalf of" R&D reclass at the 30 Jun Pty cutover.

> **This is the single skimmable entry point.** It consolidates the two earlier reviews AND the six deep-dive track files (`recon-pack/01..06`), each of which queried the live data directly. The MASTER carries the cross-cutting ordering, the judgement-call register, the mechanical-execution totals, and the **new verdicts** the tracks produced. Full per-item tables live in the linked track files (§6) — this MASTER does not restate them.

> **✅ Track files now present.** The prior version of this MASTER was written under a fallback because `recon-pack/01..06` did not yet exist. They now do, and this rewrite folds their deltas in. The headline changes since the fallback version: (a) **The Funding Network is no longer an open question — it has a verdict** (grant income entered backwards; $13,141.64 of falsely-claimed GST to reverse); (b) the **bill-vs-payment double-count is now quantified at ~$272,797** of at-risk expense overstatement, with a confirmed quadruple-counted Telford Smith job; (c) the **missing-receipt panic shrinks to one $11,000 item**; (d) all **23 voided/deleted sales invoices are explained — $0 lost revenue**.

---

## 1. Executive action checklist for SL — ordered by $ impact × dependency

Every line carries the **dollar figure** and the **source track** (T01–T06 = recon-pack tracks; PP = SL prep pack; HR = Xero health review; CSV = recode worklist). Do them top-down; the first item gates everything.

| # | Action | $ at stake | Type | Source |
|---|---|---|---|---|
| **0** | **Sign the Ignition BAS proposal** (6 reminders outstanding) + get **Xero access** on this org + coordinate Pty ATO Client-to-Agent linking with Nic. **The single unblocker — nothing below can be *finished* without it.** | gates all | Dependency | PP §F, HR §7 |
| **1** | **Reverse The Funding Network — it's income, not expense.** Void both ACCPAY bills, recognise $144,558 as GST-free grant income, **claw back $13,141.64 of falsely-claimed input GST.** Verdict reached (T02). Only open item: confirm which bank account the two deposits landed in. ~30% of the whole 429 lump. | **$144,558** + **$13,142 GST** | Reverse-direction (judgement-confirmed, §2) | **T02**, PP §A1 |
| **2** | **Stop the bill-vs-payment double-counting** — reconcile each matched bank SPEND *against its open bill* instead of expensing it again. 90 expense-coded pairs overstate the P&L. Pull Telford Smith out first (it's quadruple-counted). | **~$272,797** P&L at risk | De-dup recon (the biggest single P&L lever) | **T03**, **T04 §2b**, PP §B |
| **3** | **Recode the rest of General Expenses (429) → proper accounts + project tracking.** After pulling TFN ($144,558) + MOL ($30,691) out, work the CSV: **High → Medium (mechanical), then REVIEW (judgement, proposals in T01).** | **$263,067** mechanical + **$223,133** REVIEW | Recode | **T01**, PP §A, CSV |
| **4** | **Reconcile the internal transfers** — 57 pairs, all 1:1 exact-amount/same-date, card-side legs already reconciled. Pure plumbing, do first to clear noise. | **$483,517** | Mechanical recon | **T04 §1**, PP §B |
| **5** | **Reconcile real spend against PAID bills** — 113 lines; bank spend = the payment. Confirm no bill has two payments recorded. | **$145,581** | Mechanical recon | **T04 §2a** |
| **6** | **Categorise the no-bill spend** — 182 lines, **all already carry a receipt attachment** → categorisation only, no receipt-hunt. Defy/Qantas/insurance/travel dominate. | **$101,507** | Categorise | **T04 §3** |
| **7** | **Resolve Telford Smith** — one ~$19,800 job booked 4× ($79,200, ~$59,400 phantom): 2 bills (PAID+AUTH, acct 400) + 2 bank SPENDs (acct 446, mismatched tax codes INPUT/EXEMPTEXPENSES). Void phantom bill, recover/credit one payment, fix tax code — *if* it's one job. | **$19,800** recoverable (of $39,600/side) | Judgement (§2) | **T03 §A**, **T04 §2a** |
| **8** | **Clear duplicate bills** — 14 vendors, **$60,047 excess** (Telford $19.8K, Carla $11.2K, Centre Canvas $10.3K, Sophie/Joey labour, Cognition AI, Easel both-DRAFT). | **$60,047** | De-dup (some need §2 calls) | **T03 §C** |
| **9** | **Clear 137 DRAFT ACCPAY bills** — approve or delete; don't carry drafts into the Pty. (Includes the Easel $216 both-DRAFT pair — delete one.) | **$15,993** | Housekeeping | **T03 §C**, PP §E, HR §8 |
| **10** | **File the voided/deleted ACCREC narrative** — all 23 explained (T06), **$0 lost revenue / $0 paid / $0 due.** No recode on the void rows. Only live item: the open Centrecorp production-plant deal (§2). | $455,100 documented (not at risk) | Narrative (done — see T06) | **T06**, PP §E, HR §8 |
| **11** | **Resolve the founder ("Nicholas") payments** — structural, not a receipt hunt. Both post to **equity acct 880 (owner drawings)**, blank descriptions. Convert to the Pty's $120K base + Director's Loan policy with contemporaneous R&D time records. | **$21,159** (15,000 + 6,159) | Judgement / structural (§2) | **T05**, PP §D, HR §6 |
| **12** | **Chase the one genuinely-missing receipt** — Mounty Container Supplier $11,000, unpaid bill, no invoice #, no document, no email. First confirm it's a real purchase, not a mis-named Mounty-Yarns accrual to void. | **$11,000** | Receipt / void call (§2) | **T05 §4** |
| **13** | **Confirm the Q3 BAS position** once items 1–12 are clean (the TFN GST reversal is the material mover). | — | Sign-off | PP §F |
| **14** | **Feed the clean expense base into the 30 Jun Pty cutover** — "on behalf of" R&D reclass, opening balances only, founder salary/Director's Loan. | — | Migration | PP §F, HR §7 |

> **Why the order changed from the fallback MASTER:** the double-count work (item 2) jumped up because T03 quantified it at ~$272,797 — bigger than the *net* GE recode benefit — and because reconciling-spend-against-bill is the single move that both clears the payable and removes the duplicate expense. TFN (item 1) moved to the top of the substantive work because it now has a verdict and a hard GST number ($13,142) that directly hits the BAS.

---

## 2. Judgement calls for Ben / SL (cannot be done mechanically)

Each needs a decision before or during execution. Source docs are attached in Xero except where noted.

| Call | Amount | The question / current verdict | Source |
|---|---|---|---|
| **🟢 The Funding Network — VERDICT REACHED** | **$144,558** (+$13,142 GST) | **Not an expense — it's grant INCOME entered backwards.** Two TFN "bills" (27 Nov $89,361 + 17 Dec $55,197) are the two tranches of ~$163,303 raised for A Curious Tractor at TFN's *Healthy People Healthy Planet* event (2 Sept 2025), proven by grant-distribution emails ("funds will reach your account") + grant-letter PDFs + TFN's public DGR flow-through model. Coded 429/INPUT → falsely claims **$13,141.64 input GST** ($144,558÷11). **Fix:** void both bills, recognise GST-free income (likely GL 260), reverse the GST. **The one thing only Ben/SL can confirm:** which bank account received the two deposits (no matching RECEIVE ≥$40K in either ACT account in synced data — may have hit NM Personal/Maximiser or an unsynced window) **and** whether the Q2 BAS already claimed the credit (→ BAS correction). Also: which project the event funded (likely a food-systems/June's Patch project, not generic ACT-CE) and what the Sept $6,000+$500 TFN bills (correctly 417/GST-free) were. | **T02** |
| **🔴 Telford Smith Engineering** | **$19,800** recoverable (of $39,600/side) | One ~$19,800 job recorded **4×** = $79,200 booked, ~$59,400 phantom: 2 bills (PAID + AUTHORISED, both acct 400) + **2 bank SPENDs** (both acct 446, tax codes INPUT vs EXEMPTEXPENSES — itself a GST error). Is it one job (→ void phantom bill, recover one $19,800 payment, fix tax code) or two genuine $19,800 stages of a $39,600 job? Pull the actual invoice. | **T03 §A**, **T04 §2a** |
| **🔴 Founder "Nicholas" payments** | **$21,159** | $15,000 (2025-11-17) + $6,159 (2025-11-21), both R&D-flagged ACT-CORE, **both post to equity acct 880 (owner drawings), blank descriptions — no receipt can or should exist.** Weak R&D substantiation + related-party flag. Resolve structurally (Pty salary + Director's Loan with contemporaneous R&D time records), NOT by finding a receipt. Decide: salary vs loan repayment vs R&D contractor time, and the R&D basis. (Also: the pipeline's INV-0248 Dext link on the $6,159 is a spurious mis-match — don't use as evidence. And confirm Vanessa's 14 Apr Knight FT TFN request was actioned offline.) | **T05 §1–2**, PP §D, HR §6 |
| **🔴 MOL Nyrt.** | **$30,691** | A single 2026-03-27 AUTHORISED bill, **native USD 30,691, BASEXCLUDED, no invoice #**, description literally "*adjust AUD to match bank line*". MOL Nyrt. = a Hungarian oil & gas major — an AU sole-trader doesn't buy $30K of fuel from it. Almost certainly a **wrong-contact on an FX/USD bank line** (a real overseas SaaS/cloud vendor posted to the wrong contact) or a transfer in suspense; possibly a duplicate. **Do not recode the account until the real vendor is identified** — pull the bank line + attachment. | **T01**, PP §A2, CSV |
| **🔴 A Curious Tractor self-bill** | **$6,226** | A bill **FROM ACT to itself** (ACT's own trading name), 2025-11-10 AUTHORISED, INPUT (GST claimed), "Other". A self-billed ACCPAY claiming a GST input credit is almost always an error — wrong-contact import, reimbursement, or intercompany entry to eliminate. Likely should not exist as a 429 expense. Identify the real counterparty or void. | **T01** |
| **🟡 Other UNKNOWN-vendor 429 lines** | **$9,068** | **Nicholas Marchesi bills $5,149** (incl. a Dext line literally "NEEDS CODING" + two "Income" lines — code per underlying receipts, check vs drawings to avoid double-count) and **PayPal $3,919** (payment-processor pass-through — open the statement line to find the true merchant; if fees → 411). | **T01** |
| **🟡 Capital-vs-expense calls** | **~$53,400** | Items likely to be **capital assets**, not 429 expense: Mounty Container $10,000, the Hatch Electrical $19,947 install line, Container Options $5,803, RW Pacific generators $4,200, Total Tools $4,547, Allclass items. SL to decide capitalise vs expense per line. | **T01** |
| **🟡 The Matnic Trust** | **$9,269** | 2 bills coded ACT-IN/"Other". Companion vendor rule names it "matnic properties" → a property/landlord entity, so likely **rent (469) or property outgoings (473)**, and likely **related-party**. Confirm nature + related-party treatment. | **T01** |
| **🟡 Defy / Defy Manufacturing cluster** | **~$22K** (~7 matches) | The Defy bill↔SPEND matches hit acct **400 (suspense/revenue)** on the bank side, not an expense account (one even hit 412 Consulting for a manufacturer). Are these *payments settling* the Defy bills (book to clearing, no P&L duplicate) or genuinely double-expensed? Confirm Defy's intended treatment before netting. | **T03 §B/F** |
| **🟡 Duplicate-bill verdicts** | within $60,047 | Centre Canvas $10,285 dated 31 Mar (deliberate period-end accrual + payment, or duplicate?); Sophie Hickey / Joseph Kirmos labour dups (same invoice twice, or two engagements?); Carla Furnishers (2 bills + 1 spend at $11,180 — which is the real expense?). | **T03 §C**, **T05 §3** |
| **🟢 Voided ACCREC narrative — DONE** | $455,100 (not at risk) | All 23 explained (T06): 14× Aleisha Keating $450 weekly = benign repeating-template churn ($6,300); Centrecorp $411,400 = duplicate Tennant-Creek drafts + re-scoped production-plant; Just Reinvest $17,600 consolidated into PAID INV-0295; PICC $19,800 inferred re-issue. **One open question:** is the Centrecorp **production-plant deal** ($84,700, re-priced to $97,900/$61,050/$106,150 across Feb–May, none yet PAID) still live, and at what final figure / which invoice number? That's the single genuinely-open revenue line. Also: switch off Keating's $450 weekly repeating template; confirm PICC INV-0317 was a corrected line (Medium confidence only). | **T06** |
| **AUTHORISED (owing) bills triage** | **$679,192** vs $304K cash | Confirm which payables are genuinely due vs related-party / non-urgent before cutover. | PP §E |
| **NAB Visa ledger balance** | **−$173,925** | Confirm the card ledger reconciles to the actual NAB statement. | PP §E, HR §2 |
| **Non-standard project codes** | — | ACT-OO, ACT-PI, ACT-DL appear on matched lines but aren't in the standard code list — confirm they map to real projects before the recode locks them in. | **T04** |

> **The 66 AUTHORISED-bill ↔ SPEND matches (T04 §2b, $164,281) are the highest-risk reconciliation bucket.** For each line the bill still shows as *owing* AND a matching bank spend already left the account. Per line it's either (i) the spend pays the bill → reconcile spend→bill, closes the payable (correct); or (ii) spend + bill are two records of one transaction → genuine duplicate, remove one. **Wrong call either double-counts the expense or leaves a phantom payable.** Includes RNM $26,846, Hatch $19,947, Oonchiumpa $19,305, the two Allclass cross-account pairs, and Telford. This bucket needs SL eyes line-by-line — it is *not* mechanical, which is why it sits in §2 not §3.

---

## 3. Ready to execute mechanically — totals (no Ben decision needed)

A bookkeeper with Xero access can clear these directly. **Pull the named §2 items OUT first** so they don't get swept into a bulk pass (TFN, MOL, A Curious Tractor, Telford, the Defy 400-coded matches, the 66 AUTHORISED-bill matches).

### 3a. Bank reconciliation — mechanical (T04)
| Item | Lines | Amount | How |
|---|---|---|---|
| Internal transfers (Everyday↔card, all 1:1 same-date) | 57 | **$483,517** | Reconcile each Everyday leg as a Transfer vs its already-reconciled card leg. Nets to zero. **Do first.** |
| SPEND → PAID bill (bank spend = the payment) | 113 | **$145,581** | Apply each spend to its PAID bill; confirm no bill has two payments. |
| SPEND no-bill, **receipts already attached** | 182 | **$101,507** | Categorise to the chart (Defy/Qantas/insurance/travel). Flag Defy + RW Pacific R&D. |
| **Mechanical recon subtotal** | **352** | **$730,605** | (Excludes the 66 §2b AUTHORISED-bill matches — those are judgement.) |

### 3b. GE recode — mechanical bands (after pulling TFN $144,558 + MOL $30,691) (T01, CSV)
| Band | Lines | Amount | Action |
|---|---|---|---|
| **High confidence** | 48 | $81,306 | Clear vendor-rule category → mapped account. Apply directly via CSV `SL_confirm_*`. |
| **Medium confidence** | 58 | $181,761 | Vendor-name heuristic → quick sanity check, then apply. |
| **Mechanical recode subtotal** | **106** | **$263,067** | |
| (REVIEW remainder → §2; proposals in T01) | 76 | $223,133 | Not mechanical — T01 gives a proposed account+project for every REVIEW vendor >$1,000. |

> **Confident T01 proposals SL can apply with a sanity check** (move project where noted): The Plasticians $29,800 → 446 + **ACT-IN→ACT-GD** (R&D); Allclass $8,660 → 446/447 + **ACT-IN→ACT-FM**; Joseph Kirmos $7,238 + Sophie Hickey $6,090 → 486; Smartwood $5,375 → 446; Total Tools $4,547 → 447; The Sand Yard $3,078 → 446; Sunshine Coast Council $1,828 → 467; AGL $1,317 → 445; Loadshift $1,244 → 425. Hatch Electrical $24,397 → 473 (check $19,947 line for capital). Bulk-execute in Xero via Find & Recode by contact.

### 3c. Duplicate / draft cleanup (T03)
| Item | Amount | Status |
|---|---|---|
| Duplicate bills — 14 vendors, excess copy | **$60,047** | Mostly mechanical once verdict in; a few (Centre Canvas, Sophie/Joey, Carla) need a §2 call |
| 137 DRAFT ACCPAY bills — approve or delete | **$15,993** | Mechanical bulk decision (incl. Easel $216 both-DRAFT → delete one) |
| Telford duplicate bank SPEND (literal double-pay) | $19,800 | §2 — recover/credit one payment once verdict in |
| Qantas same-day "duplicates" | ~$20,000 | **Do NOT dedup** — legitimate multi-leg/add-on charges |
| Minor SaaS pairs (HighLevel/Supabase/Webflow, Cognition AI) | immaterial | Verify against statement; low priority |

**Mechanical-work grand total ready to clear without a Ben decision: ~$1,009,665** = bank recon $730,605 + GE High/Medium $263,067 + draft bills $15,993. (Excludes the $164,281 §2b judgement bucket, the $144,558 TFN reversal, and the $60,047 duplicate-bill cleanup that has §2 components.)

---

## 4. The two big P&L corrections, side by side

These are the moves that actually change the reported numbers (everything else is plumbing or recoding *within* expenses):

1. **TFN reversal (T02):** removes **$144,558 of phantom expense + $144,558 of phantom payable + $13,141.64 of falsely-claimed input GST**, and adds **$144,558 of GST-free income**. Net P&L swing ≈ **+$289K** (expense down + income up). Direct BAS impact.
2. **Bill-vs-payment de-dup (T03):** removes up to **~$272,797 of double-booked expense** by reconciling each matched bank SPEND against its open bill instead of expensing it twice. No income side — pure expense correction.

Together these are the difference between a P&L that's overstated on both sides and one SL can sign.

---

## 5. Operational watch-outs (carry into every step)

1. **Bill-vs-payment double-count (Harvest pattern), now quantified.** 90 expense-coded bill↔SPEND pairs = ~$272,797; the matching bank SPENDs were coded straight to P&L expense accounts (446/486/493/432/433/448/412) instead of being reconciled against the open bill. Telford Smith is the confirmed quadruple-count. The Defy cluster hits acct 400 (likely settlements, not duplicates — verify). (T03)
2. **Everyday bank statement was never imported.** The receipt pipeline imported 1,618 statement lines for exactly Oct1–Mar31 — but **all are NAB Visa**. Card is ~70% reconciled; the operating bank only ~26%. If SL wants the Everyday statement in the pipeline for matching, it needs loading. (HR §3, PP §B)
3. **Receipts are in better shape than the raw "no attachment" count suggests.** All 182 no-bill spends already carry a receipt; the founder $21,159 needs no receipt (equity drawings); only **$11,000 (Mounty) is genuinely missing** — and that may be a void candidate. The pipeline mislabels the founder drawings as `missing`. (T04, T05)
4. **No lost revenue in the void list.** All 23 voided/deleted ACCREC are $0 paid / $0 due — re-issues, re-scopes, or repeating-template churn. The only open *revenue* question is the Centrecorp production-plant deal. (T06)

---

## 6. Source files (read these for full tables — this MASTER does not restate them)

### Deep-dive track files (this run — query the live data directly)
| Track | File | What it holds |
|---|---|---|
| **T01** | `thoughts/shared/recon-pack/01-recode-review-band.md` | REVIEW-band recode proposals — a proposed account+project+confidence+rationale for every 429 REVIEW vendor >$1,000 (25 vendors + Hydraulink), plus the 5 genuinely-unknown (TFN, MOL, A Curious Tractor, Nicholas bills, PayPal) and the capital-vs-expense flags. |
| **T02** | `thoughts/shared/recon-pack/02-funding-network.md` | The Funding Network $144,558 — **verdict: grant income entered backwards as bills**, with the Gmail grant-letter evidence, TFN DGR flow-through model, $13,141.64 GST reversal, and the open bank-deposit/BAS questions. |
| **T03** | `thoughts/shared/recon-pack/03-double-counts.md` | Bill-vs-payment double-counts — 90 expense-coded pairs ($272,797), the Telford Smith quadruple-count worked example, duplicate bills ($60,047 excess), duplicate bank spends. |
| **T04** | `thoughts/shared/recon-pack/04-recon-matches.md` | The 418 unreconciled lines ($894,887) in 4 buckets — transfers ($483,517), SPEND→PAID-bill ($145,581), SPEND→AUTHORISED-bill ⚠️ ($164,281 double-count risk), SPEND no-bill ($101,507, receipts attached). Proposed matches per line. |
| **T05** | `thoughts/shared/recon-pack/05-receipt-chase.md` | The 5 material missing-receipt items resolved — 2 found ($13,505), 2 founder drawings (no receipt expected, $21,159), 1 genuinely missing (Mounty $11,000). |
| **T06** | `thoughts/shared/recon-pack/06-voided-accrec.md` | All 23 voided/deleted sales invoices ($455,100) documented with a one-line reason each — $0 lost revenue; only the Centrecorp production-plant deal stays open. |

### Earlier reviews + worklist
| File | What it holds |
|---|---|
| `thoughts/shared/reviews/2026-05-29-standard-ledger-recon-recode-prep-pack.md` | The original bookkeeper-facing prep pack — GE recode (§A), bank recon worklist (§B), duplicates (§C), missing receipts (§D), housekeeping (§E), action checklist (§F). |
| `thoughts/shared/reviews/2026-05-29-xero-health-q2-q3-reconciliation.md` | Underlying health review — scorecard, integration status, cash/P&L reality, reconciliation status, $438K GE detail, Pty-cutover framework. |
| `thoughts/shared/reviews/2026-05-29-xero-health-q2-q3-reconciliation.provenance.md` | Provenance for every figure (verified vs inferred, queries, gaps). |
| `scripts/output/ge-recode-worklist.csv` | **The line-by-line GE recode worklist** — 182 lines, each with suggested account, suggested project, R&D flag, confidence, basis, judgement flags, and empty `SL_confirm_acct` / `SL_confirm_project` columns to tick. Regenerate: `node scripts/generate-ge-recode-worklist.mjs`. |

**Reproduce / refresh (all read-only):** `node scripts/refresh-xero-token.mjs` (verify access) · `node scripts/generate-ge-recode-worklist.mjs` (recode CSV) · `node scripts/generate-reconciliation-checklist.mjs --month N` (per-month checklist). All six track files queried Supabase `tednluwflfhxyucgwigh` SELECT-only on 2026-05-29; T02/T05 additionally read Gmail read-only; T01/T02 additionally web-verified vendors.

---

## 7. The one-page summary for SL

- **Sign Ignition + get Xero access** — gates everything.
- **The Funding Network $144,558 is income, not expense** — void the two bills, recognise GST-free income, reverse $13,142 of GST. Confirm which account the cash landed in. *(T02)*
- **Stop double-counting ~$272,797** — reconcile each bank spend against its open bill, don't expense it twice. Telford Smith is booked 4×. *(T03)*
- **Recode $263,067 of General Expenses mechanically** (High+Medium), with confident proposals for the $223,133 REVIEW band in T01. Pull MOL Nyrt $30,691 and the A Curious Tractor self-bill $6,226 out as unknowns. *(T01)*
- **Reconcile $483,517 of internal transfers** (pure plumbing) + **$145,581 of paid-bill spend** + **categorise $101,507 of receipted no-bill spend.** *(T04)*
- **The 66 AUTHORISED-bill matches ($164,281) need line-by-line judgement** — reconcile-vs-duplicate.
- **Founder $21,159 = equity drawings, structural fix** (Pty salary + Director's Loan), not a receipt. Only **$11,000 (Mounty) is genuinely missing** and may be a void. *(T05)*
- **All $455,100 of voided sales invoices are explained — $0 lost revenue.** Only the Centrecorp production-plant deal stays open. *(T06)*

---

## 8. Why reconciliation has felt impossible (operating model)

Full doc: `thoughts/shared/reviews/2026-05-29-reconciliation-receipts-operating-model.md`.

Root cause: **two receipt-capture systems (Dext + a homegrown Gmail pipeline) and four disagreeing "status" fields**, none wired together, with the homegrown automations switched off. The same question gets a different answer from each source:

| Question | Source of truth to use | Ignore |
|---|---|---|
| Is it reconciled? | Xero `is_reconciled` (card 70% / bank 26%) | `bank_statement_lines.status` (stale homegrown flag) |
| Is the receipt in Xero? | Xero `has_attachments` | `receipt_match_status` (homegrown, card-only) |

**Corrected receipt picture (verified):** the scary "7,172 captured / 0 pushed to Xero" is **mostly redundant** — the homegrown pipeline re-captured supplier bills Dext already handles. All 981 Q2/Q3 bills with a "ready" homegrown receipt **already have a Dext attachment**, so bulk-pushing would create duplicates. Genuine gap = ~16 bank txns + 66 truly missing ($31,585). **Don't bulk-push; consolidate the two systems.**

## 9. Automation & tooling — make it stay reconciled (expert layer)

**Xero bank rules** (copy-list: `recon-pack/07-bank-rules-proposal.md`) — set these and reconciliation becomes near one-click. Tier 1: Qantas $83K/123 lines → 493 Travel; Uber → 452; NAB fees → 407; SaaS cluster → 485; Telstra → 489. *Bank rules can be run over the existing open lines to clear backlog immediately.*

**Xero's current AI** (2025–26): "Just Ask Xero" (JAX) **automatic bank reconciliation** went to beta Nov 2025, available on **Grow plan and above** in AU (~97% vendor-claimed accuracy on known/repeat payees). It learns from your bank rules + attached documents + reconciliation history. **Action: confirm ACT's Xero plan tier** — JAX auto-recon + bulk cash-coding need Grow+, the entry "Ignite" plan doesn't include them.

**Dext vs Hubdoc (cost decision for the Pty):** Hubdoc is **free with Xero** (~90% OCR); Dext is paid (~$35–50/mo, ~99% OCR, line-item supplier rules, paperwork-to-bank matching). For ACT's likely volume, **Hubdoc is probably sufficient → consolidating to it saves the Dext fee**, *unless* receipt volume/complexity justifies Dext. Either way: **run ONE receipt tool, set to auto-publish with the PDF attached** — running both is half the confusion. Fixing **Dext/Hubdoc supplier rules so bills land on the right account (not 429)** is the upstream cure for the whole General-Expenses problem.

**Setup order:** bank feeds → bank rules for top ~20 payees → one receipt tool auto-publishing → JAX/AI for the long tail → reconcile (most lines one-click).

## 10. Australian GST / BAS notes (confirm with SL — ATO-sourced)

- **TFN $144,558 is grant income → GST-free** (a grant isn't a taxable supply unless something is supplied in return; meeting eligibility criteria ≠ a supply). So the $13,141.64 input credit claimed on the two bills is **not allowable**.
- ⚠️ **The $13,142 over-claim likely needs a REVISED BAS, not a later-BAS correction.** The ATO "correct on a later BAS" path for a debit error is only allowed if the net debit errors are **≤ $12,500** (turnover <$20M). $13,142 **exceeds** that limit → revise the original quarter's activity statement. *Also:* no corrections once the ATO notifies an audit on that period; 4-year limits apply. **SL to confirm whether Q2 BAS was lodged with this credit and choose the correction path.**
- **Donations** (genuine gift, no supply back) = no GST either way. The Sept TFN bills ($6,000+$500) correctly used GST-free — the Nov/Dec ones never should have carried INPUT GST.

## 11. Pty cutover prep (start the new Xero clean)

- A Pty = a **new legal entity → a brand-new Xero org** (new ABN; don't rename the sole-trader org). Start it at the incorporation date; mid-year cutover = a stub period for the sole trader — coordinate the changeover date with SL so BAS periods don't overlap/gap.
- **Bank rules do NOT transfer between Xero orgs** (no export/import) — they must be rebuilt. **So `recon-pack/07` is reusable: build these rules in the Pty org from day one.**
- Tracking categories (projects) must be recreated; the Dext/Hubdoc connection must be disconnected and reconnected to the new org.
- **Decide the target operating model now:** one receipt tool, bank rules seeded day one, Xero as the single source of truth, automations actually running.

## 12. Consolidated questions for Standard Ledger

1. **Ignition + Xero access** — sign the BAS proposal, get access on this org, coordinate the Pty ATO Client-to-Agent linking with Nic. *(gates everything)*
2. **TFN reversal + BAS:** confirm the two bills are grant income (void + recognise GST-free); **which account did the $89,361 + $55,197 land in?**; **was Q2 BAS lodged with the $13,142 credit — and given it exceeds $12,500, do we revise the original BAS?**
3. **Telford Smith** — one $19,800 job or two stages? (drives a $19.8K vs ~$59.4K correction).
4. **Founder $21,159** — equity drawings now; confirm the Pty structure (salary + Director's Loan) and the R&D basis.
5. **MOL Nyrt $30,691** (USD vendor?) + **A Curious Tractor $6,226 self-bill** — recode or void?
6. **Centrecorp production-plant deal** — still live, at what figure?
7. **Bank rules** — do you maintain them, or shall we set up `recon-pack/07`? **Plan tier** — are we on Grow+ (for JAX auto-recon)?
8. **Everyday bank statement** — pull/confirm Oct–Mar so the bank side reconciles, not just the card.
9. **Dext vs Hubdoc** — keep paying for Dext or consolidate to free Hubdoc for the Pty?
10. **Homegrown `bank_statement_lines.status`** disagrees with Xero — confirm we treat Xero `is_reconciled` as truth and retire it.

---

*Nothing in this pack was written to Xero, GHL, Notion, or any external system. Reconciliation can only be **finished** in Xero (the final match/approve/void click) by SL or a human — the API/scripts only **prepare** (propose matches, recode, flag dupes). The single biggest unblocker remains signing the Ignition BAS proposal + granting SL Xero access (item 0). The single biggest correction is The Funding Network reversal (item 1) — it moves the P&L by ~$289K and the BAS by $13,142 (which, exceeding the $12,500 limit, likely means a revised Q2 BAS).*
