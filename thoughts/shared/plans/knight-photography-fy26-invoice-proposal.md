---
title: Knight Photography → ACT FY26 Invoice Proposal
status: Option A confirmed by Ben 2026-05-05 — invoice sole trader now, journal to Pty at cutover
date: 2026-05-05
parent: act-entity-migration-checklist-2026-06-30
canonical_entity: knight-photography
purpose: Bring the off-Xero $100K Knight Photography → ACT money flow back into the books before cutover, so it's properly characterised and R&D-eligible under Path C.
---

## DECISION 2026-05-05 (Ben)

**Option A confirmed:** Knight Photography invoices ACT for FY26 work. Three-phase plan agreed:

1. **Phase 1 — backfill $100K (Inv 15078).** Date 2025-09-30, covers Q1 FY26 work, matches the 6 Oct 2025 bank transfers ($32K + $40K + $28K).
2. **Phase 2 — quarterly $50K invoices (Inv 15079-15081)** through to cutover. Brings FY26 Knight Photography total to ~$250K. **Vehicle: Knight Photography sole trader (NOT trust, NOT payroll — see below).**
3. **Phase 3 — mixed model from 1 July 2026** (Inv 15082+): Pty payroll $10K/mo base + Knight Photography invoicing for lumpy top-ups + Knight Family Trust receives dividends only.

**Counterparty:**
- Phase 1 + 2: invoice the sole trader (Nicholas Marchesi T/as A Curious Tractor, ABN 21 591 780 066). Pty didn't exist at time of work; can't backdate to a non-existent entity.
- Phase 3: invoice A Curious Tractor Pty Ltd (ACN 697 347 676) directly for any non-payroll work.
- Path C R&D: the FY26 sole-trader Knight Photography costs flow into the Pty's R&D claim via Standard Ledger's cross-entity cutover journal (same mechanism as all other FY26 sole-trader P&L).

**Status:** Ben confirmed invoices have NOT yet been sent. Phase 1 invoice 15078 is the immediate action.

## Why NOT Knight Family Trust for active billing (decided 2026-05-05)

Knight Family Trust is a **passive 50% shareholder of the Pty**, not a trading vehicle. Routing Phase 2 or Phase 3 service invoices through the trust is rejected because:

1. **PSI (Personal Services Income) attribution risk.** ATO can deem trust-billed personal-services income as the worker's personal income anyway, defeating the tax-flexibility benefit.
2. **Setup overhead.** Active trust trading requires ABN + GST + bank account + trust-level bookkeeping + trustee resolutions.
3. **Standard structure is cleaner:** Pty earns income → declares profit → pays dividend to Knight Family Trust → trust distributes to beneficiaries. The trust receives money, but as dividends from owned-Pty profit, not as service-fee invoices.

## Phase 3 mix (from 1 July 2026 — matches §D11.2 founder-pay decision)

| Component | Vehicle | Cadence | R&D-eligibility |
|---|---|---|---|
| **Base salary $10K/mo** | Pty payroll | Monthly | Yes — ~95% R&D personnel cost on Pty books |
| **Lumpy / project work** | Knight Photography invoicing | Per project / quarterly | Yes — contractor cost on Pty books |
| **Year-end top-up settlements** | Director's loan → bonus/dividend/invoice | Annual | Bonus = R&D-eligible; dividend = no R&D but tax-efficient distribution |
| **Long-term wealth distribution** | Pty → Knight Family Trust dividends | When Pty has profit | No R&D — but trust then distributes to beneficiaries (Ben, future family) at flexible rates |

**Standard Ledger to confirm:**
- PSI attribution treatment for the trust pathway.
- GST registration timing on Knight Photography (FY26 revenue >$75K threshold).
- Division 7A compliance on the Pty director's loan account.

---

# Knight Photography → ACT FY26 Invoice Proposal

> **One-line problem.** On 6 October 2025, Nic transferred $100,000 from a Nicholas Marchesi-owned bank account (likely Up Bank) to Knight Photography (Ben), in three tranches: $32,000 + $40,000 + $28,000. The bank reference was "15069" (Knight Photography's first-ever invoice number, $27,500 from Oct 2023 — already paid). **None of this $100K appears in ACT's Xero file.** No matching Knight Photography invoices exist for FY26. No matching SPEND transactions exist on Nic's side in Xero. The money moved entirely off-books from ACT's perspective.
>
> **One-line fix.** Decide the characterisation, then either (A) raise Knight Photography FY26 invoices retrospectively totalling $100K and journal-match the bank transfers, or (B) book it as a Nic-personal-loan-to-Ben, or (C) flag it as personal-only and exclude it from ACT.
>
> **One-line urgency.** Path C R&D claim depends on FY26 personnel costs being on the Pty's books at cutover (1 July 2026). $100K of founder personnel cost would generate ~$43.5K of refundable R&D offset if properly characterised. Doing nothing leaves it ambiguous.

---

## What we know (verified)

### Bank evidence (Ben's side)

Three transfers in on 6 October 2025, sender description "NICHOLAS JAMES MARCH15069":

| Date | Amount | Bank reference |
|---|---:|---|
| 2025-10-06 | $32,000.00 | NICHOLAS JAMES MARCH15069 |
| 2025-10-06 | $40,000.00 | NICHOLAS JAMES MARCH15069 |
| 2025-10-06 | $28,000.00 | NICHOLAS JAMES MARCH15069 |
| | **$100,000.00** | |

Reference "15069" matches Knight Photography's first invoice number from 2023-10-01 ($27,500), already paid in 2023. Reference is reused (same number, different cash).

### What's NOT in ACT's Xero (verified via live Xero API on 2026-05-05)

- Knight Photography contact: **6 invoices ever, last one 2025-06-20.** Zero in FY26. Zero in any state (DRAFT/SUBMITTED/AUTHORISED/PAID/VOIDED/DELETED).
- Benjamin Knight contact: **0 invoices ever.**
- All FY26 bank transactions (1,704 scanned): **0 mention Knight / Photography / Benjamin / B Knight / BJK** in contact, reference, or line description.
- 6 October 2025 specifically: zero outgoing $32K, $28K, or $40K transactions on any tracked account. Largest SPEND on that day was a $9,883.63 credit-card-rebalance transfer.

### What's outside Xero (inferred from bank statement evidence)

- Nic uses at least one bank account that isn't connected to ACT's Xero feed (clue: a $10K RECEIVE on 6 Oct 2025 has line description "N J MARCHESIUp" → an Up Bank account).
- The $100K transfers came from a Nicholas Marchesi-owned account that's outside ACT's tracked bank accounts (NAB Visa, NM Personal, NJ Marchesi T/as ACT Everyday, NJ Marchesi T/as ACT Maximiser).

---

## Three characterisations to choose between

### Option A — Knight Photography FY26 invoicing for ACT work (recommended)

**Story.** Ben performed substantial ACT work in FY26 (calendar evidence: ~2,151 commits, agent system buildout, Goods on Country, ALMA, Empathy Ledger, JusticeHub). Knight Photography invoices ACT retrospectively for that work. The $100K October 2025 transfers were Nic paying Ben on account, not yet matched to invoices. We now match them.

**Mechanics.**
1. Ben raises Knight Photography invoices to ACT for FY26 work, total $100K (or higher if there's been more invoicing intent).
2. Nic enters them as ACCPAY bills in ACT's Xero against contact "Knight Photography".
3. The 3 October 6 transfers get matched to those bills as bill payments. **But because the source account isn't in Xero**, this needs a journal entry: debit Nic's director's loan account, credit Knight Photography. Effectively Nic personally loaned ACT $100K, ACT then paid Ben $100K.
4. R&D Path C claim picks up the FY26 personnel cost.

**Tax/R&D consequences.**
- Knight Photography (Ben's sole-trader ABN) recognises $100K income in FY26 — taxed at his marginal rate. If Ben has minimal other income, marginal rate may be moderate; if Ben has other income, this stacks.
- ACT (sole trader → Pty under Path C) gets a $100K personnel cost, ~95% R&D-eligible = $95K eligible × 43.5% = **~$41,325 refundable offset**.
- Net to founder pair: $100K through Ben at marginal rate, generating $41K back to Pty (which Ben + Nic own 50/50 via trusts).

**Project allocation suggestion** (for line-item splits, based on FY25 pattern):

| Project | Suggested allocation | Rationale |
|---|---:|---|
| ACT-IN (Infrastructure / R&D core) | 60% — $60,000 | ALMA, agent system, platform infra, governed proof system |
| ACT-EL (Empathy Ledger) | 10% — $10,000 | EL platform work |
| ACT-JH (JusticeHub) | 10% — $10,000 | JusticeHub site + community work |
| ACT-GD (Goods on Country) | 10% — $10,000 | Pipeline + buyer dashboards |
| ACT-DO (Designing for Obsolescence) | 5% — $5,000 | Strategic / methodology work |
| ACT-EL or other | 5% — $5,000 | Cross-project / overhead |

(Adjust based on Ben's actual time split. End-of-year allocation can be done by journal even if invoices are entered as a single line.)

### Option B — Nic personally loaned Ben $100K (or gifted)

**Story.** The $100K was a personal Nic→Ben transfer, unrelated to ACT business, settled outside ACT's books. Maybe Ben needed cash; Nic provided it from his personal funds.

**Mechanics.**
- Don't enter anything into ACT's Xero.
- Nic personally tracks it as a loan to Ben (or a gift, with gift-tax implications above $14K? — check ATO rules).
- ACT's books stay as they are.

**Tax/R&D consequences.**
- No R&D benefit — the $100K isn't connected to ACT business.
- Nic has potentially used personal funds for personal generosity. No business deduction.
- Ben has $100K personal capital, no tax event if it's a loan, taxable income if it's structured as wages/income.

### Option C — Personal/business mix that the founders discuss with Standard Ledger

**Story.** Some of the $100K was Knight Photography invoicing for ACT work (Option A); some was Nic helping Ben personally (Option B). Need to split.

**Mechanics.** Knight Photography invoices ACT for the business portion (say $X), the rest is personal. ACT's books only see the business portion.

---

## Decision matrix

| Factor | Option A (KP invoices) | Option B (personal loan) | Option C (mix) |
|---|---|---|---|
| ACT books complete | ✅ Yes | ❌ No (invisible to ACT) | ⚠️ Partial |
| R&D Path C eligible | ✅ ~$41K refund | ❌ Zero | ⚠️ Pro-rata |
| Ben tax exposure | $100K income at marginal rate | $0 (loan) or $100K (gift over $14K?) | Variable |
| Nic complexity | Moderate (journal entry needed) | Simple | Moderate |
| Standard Ledger work | ~2 hours | ~30 minutes | ~3 hours |
| Audit defensibility | High if invoices match calendar/commit evidence | High (clean personal) | High if split is reasoned |

**Recommendation:** Option A, unless the $100K was genuinely unrelated to ACT work. Path C R&D refund of ~$41K materially exceeds Ben's incremental tax cost at most marginal rates, and it makes ACT's books complete.

---

## Proposed FY26 Knight Photography invoice structure (Option A)

Two ways to structure the invoices:

### Structure 1 — Single $100K invoice, multi-line by project

| Knight Photography Invoice 15078 | | |
|---|---|---:|
| Date | 2025-10-01 (matches when work was billable through to that point) | |
| To | A Curious Tractor (Nic Marchesi sole trader) | |
| Line 1: ACT-IN | Infrastructure / R&D — agent system, ALMA, platform | $60,000 |
| Line 2: ACT-EL | Empathy Ledger platform development | $10,000 |
| Line 3: ACT-JH | JusticeHub site + community work | $10,000 |
| Line 4: ACT-GD | Goods on Country dashboards + pipeline | $10,000 |
| Line 5: ACT-DO | Designing for Obsolescence methodology work | $5,000 |
| Line 6: ACT-CORE | Strategy + cross-project | $5,000 |
| **Total** | | **$100,000** |
| GST | (depends on Ben's GST registration on Knight Photography) | |
| Reference | "FY26 Q1 ACT Projects" | |

### Structure 2 — Three invoices matching the three bank transfers

| Inv | Amount | Reference / project |
|---|---:|---|
| 15078 | $32,000.00 | ACT Projects FY26 Tranche 1 (split per project as above, scaled) |
| 15079 | $40,000.00 | ACT Projects FY26 Tranche 2 |
| 15080 | $28,000.00 | ACT Projects FY26 Tranche 3 |

Structure 2 cleanly matches each bank transfer to one bill. Structure 1 is simpler if Ben prefers fewer documents. Either works for R&D as long as the line items show project allocations.

---

## Strategic alignment with the new Pty (decided)

```
Now (May 2026)         30 Jun 2026          1 Jul 2026 →
  ↓                       ↓                       ↓
Knight Photography  →  CUTOVER  →  Knight Photography
invoices SOLE TRADER   journals    invoices PTY directly
                       FY26 P&L
                       to Pty
```

- **Pre-cutover (now → 30 June 2026):** all Knight Photography FY26 invoices go to NJ Marchesi T/as A Curious Tractor sole trader (ABN 21 591 780 066). Pty didn't exist for most of FY26.
- **At cutover (30 June 2026):** Standard Ledger journal-entries the entire FY26 sole-trader P&L (including Knight Photography ~$250K) across to A Curious Tractor Pty Ltd's opening books, per Path C principle.
- **Post-cutover (1 July 2026 →):** Knight Photography invoices the Pty directly. Clean, straight-through ACCPAY in Pty's new Xero file, paid from Pty's NAB business account.

## Action items by owner

### Ben (this week)

- [ ] **Raise invoice 15078** in Knight Photography's books: $100K, dated 2025-09-30, addressed to "Nicholas Marchesi T/as A Curious Tractor" (ABN 21 591 780 066).
- [ ] **Multi-line by project** (suggested): ACT-IN $60K / ACT-EL $10K / ACT-JH $10K / ACT-GD $10K / ACT-DO $5K / ACT-CORE $5K. Adjust to your actual time split.
- [ ] **Decide GST treatment.** If Knight Photography is GST-registered, $100K + GST = $110K invoice. If not registered, FY26 Knight Photography revenue will exceed $75K threshold once Phase 2 lands → GST registration becomes mandatory; consider backdating to 1 Jul 2025 (Standard Ledger to advise).
- [ ] **Send the invoice to Nic.** PDF/email — needs to actually be sent for tax/audit defensibility.
- [ ] **Plan Phase 2 invoicing schedule** with Nic: $50K/quarter through to cutover (Inv 15079 dated 2025-12-31, 15080 dated 2026-03-31, 15081 dated 2026-06-30).

### Nic (when invoice 15078 lands)

- [ ] **Enter invoice 15078 as ACCPAY** in ACT sole trader's Xero, contact "Knight Photography" (existing contact: 16fe28dd-52e7-4d62-9f1c-d6c9a918cb5b).
- [ ] **Apply the 6-line project split** in Xero so each line carries the correct project_code tracking.
- [ ] **Match the three 6 Oct 2025 bank transfers** ($32K + $40K + $28K) as bill payments against invoice 15078.
- [ ] **Director's-loan journal** (or ask Standard Ledger to book): because the source account isn't in Xero, the matching journal is `Cr Director's Loan (Nic) $100,000 / Dr Bank or Knight Photography ACCPAY $100,000`. Effectively: Nic personally lent ACT $100K, ACT then paid Knight Photography $100K.
- [ ] **Re-tag existing invoices 15076 + 15077** (FY25, $79K) from ACT-PS to the correct project mix per their line-item descriptions ("ACT Projects June 1 / 2" — likely ACT-IN/EL/JH).

### Standard Ledger (next conversation)

- [ ] **Confirm Path C journal mechanism** for Knight Photography FY26 personnel cost flowing from sole trader → Pty at cutover.
- [ ] **GST registration backdating** for Knight Photography if FY26 revenue >$75K threshold.
- [ ] **Director's loan account treatment** for the $100K off-Xero settlement.
- [ ] **Cross-check Phase 2 invoicing scope** — is $250K full-year FY26 reasonable for ~95% R&D allocation across 12 months? Audit-defensible with 2,151+ commits, calendar evidence, project deliverables.
- [ ] **Backdating risk** — invoicing in May 2026 for work through Sept 2025 (Phase 1) and through Mar 2026 (Phase 2). Standard practice for retrospective contractor invoicing or audit flag?

---

## Open questions for Ben + Nic

- [ ] **Was the $100K for ACT work, personal, or mixed?** (Option A / B / C)
- [ ] **Is there more Knight Photography money I haven't found?** Check Ben's full bank statements FY26 for other "NICHOLAS JAMES MARCH" transfers. The 6 Oct 2025 batch may not be the only one.
- [ ] **Did Nic transfer from his Up Bank or another non-Xero account?** Need to confirm the source account.
- [ ] **Is Knight Photography GST-registered?** Affects whether invoices include GST and ACT can claim GST credit.
- [ ] **What are Ben's actual project hours for FY26?** Drives the line-item split if Option A.
- [ ] **Should we also invoice for FY26 work-to-date through to today (5 May 2026)?** $100K covers ~3 months at end-Sept; may be more work since.

## Open questions for Standard Ledger

- [ ] **Confirm Path C journal-entry mechanism** for Knight Photography invoicing → R&D-eligible spend.
- [ ] **Director's loan account treatment** — when Nic's personal funds (off-Xero) settle ACT bills, is the right journal "ACT debt to Nic" rather than "ACT bank decreased"?
- [ ] **GST treatment** if Knight Photography is GST-registered.
- [ ] **Backdating risk** — invoicing in May 2026 for work done through Oct 2025. Standard practice or audit flag?
- [ ] **Other off-Xero founder transfers** — should we do a full bank-statement audit of both founders' personal accounts before cutover?

## Open questions for me (Claude/Ben to clarify)

- [ ] **Is the user expecting more than $100K Knight Photography flow?** Earlier message said "about $100,000". Bank statement showed exactly $100K. Are there other transfers on other dates I should look for?
- [ ] **Should I write a script to scan Ben's full bank statements for other Knight-Photography-related deposits?** Would need access to the statement data (CSV / OFX / API).

---

## Cross-reference

- [Live Xero search script](../../scripts/search-xero-knight-photography.mjs)
- [FY26 bank-description scan script](../../scripts/search-xero-knight-bank-descriptions.mjs)
- [Sole Trader → Pty Cutover Strategy](../../wiki/finance/sole-trader-pty-cutover-strategy.md) — Knight Photography section
- [Migration checklist §11.4 — mapping spreadsheet](act-entity-migration-checklist-2026-06-30.md#d114--sole-trader--pty-incomeexpense-mapping-spreadsheet)
- [Finance cutover review workflow](finance-cutover-review-workflow.md) — gate-3 project tagging
- [R&DTI Claim Strategy FY26](../../wiki/finance/rdti-claim-strategy.md) — founder-invoicing R&D maths
