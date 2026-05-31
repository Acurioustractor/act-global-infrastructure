---
title: "Cutover critical path — 30 days to 30 June 2026"
status: live
date: 2026-06-01
parent: act-entity-migration-checklist-2026-06-30.md
supersedes_sequencing_in: act-entity-migration-checklist-2026-06-30.md §"Dependencies and sequence"
---

# Cutover critical path — 30 days to 30 June 2026

> Companion to the [canonical migration checklist](act-entity-migration-checklist-2026-06-30.md). That doc is the *what* (10 sections, every task). This is the *when* — a dependency-ordered runway after the **ABN unblock on 2026-06-01**. Live tracker: `/finance/pty-readiness` (command center) / `config/pty-readiness.json`.

## What changed on 1 June — the gate opened

**ABN 36 697 347 676 issued + GST registered** for A Curious Tractor Pty Ltd (ACN 697 347 676). This was the single blocking dependency. It unlocks, in order: **Pty Xero file → NAB account → payroll → $1 test invoice → live invoicing.** NAB onboarding and insurance are both now in progress.

Readiness as of 1 June: **3 done · 5 doing · 14 todo · 0 blocked.** Critical items: **3 of 14 done.**

## The 9 critical items still open (and what each waits on)

| # | Critical item | Waits on | Owner |
|---|---|---|---|
| 1 | SL Ignition proposal signed | nothing — sign now | Ben |
| 2 | Form 201 + resolutions + share certs + bank resolution | nothing — sign now | Ben |
| 3 | Shareholders Agreement signed (Knight + Marchesi trusts) | lawyer draft (SL referral) | Ben |
| 4 | Pty Xero file open (chart + tracking) | **ABN ✓ — openable now** | Ben |
| 5 | Fair-market salary determination | SL engaged (#1) | Standard Ledger |
| 6 | Cross-entity mapping spreadsheet final | untagged queue ≈0 (**now ~100% per money-state handoff**) | Ben → SL |
| 7 | Knight Photography Phase 1+2 invoices raised + journaled | nothing — do now | Ben |
| 8 | Pty payroll configured ($10K/mo ×2 + super + PAYG) | Pty Xero (#4) + fair-market salary (#5) | SL |
| 9 | $1 test invoice end-to-end | Pty Xero (#4) + NAB + Stripe | Ben |

## The runway (dependency-ordered)

### Week 1 — 1–7 June · "sign + open" (all parallel, no inter-dependencies)
- [ ] **Sign SL Ignition** (#1) — unblocks SL doing fair-market salary, payroll config, mapping review. Sign first.
- [ ] **Sign Form 201 + initial resolutions + bank-account resolution** (#2) — the bank resolution is needed by NAB.
- [ ] **Sign Shareholders Agreement** (#3) — Cutover Rule 4 elevated this to Week 1–2; closes the 50/50 deadlock risk while Minderoo may be due-diligencing the Pty.
- [ ] **Open the Pty Xero file** (#4) — ABN is in hand. Port chart + tracking via `config/xero-chart-import.csv` + `scripts/seed-xero-tracking.mjs`. This is the long pole for payroll + test invoice; do it this week.
- [ ] **Re-run the cross-entity mapping export** (#6) — untagged is ~0 now, so `node scripts/export-sole-trader-to-pty-mapping.mjs` is ready to produce the final `out/sole-trader-to-pty-mapping-FY26-YTD.csv` for SL.
- [ ] **Raise Knight Photography Phase 1+2 invoices** (#7) — Inv 15078 ($100K, 2025-09-30) + 15079/15080/15081 ($50K ×3). Independent of everything; clears a critical.
- [ ] Continue NAB onboarding (in progress; ~2 wk) and insurance (PL $20M + D&O, in progress).

### Week 2 — 8–14 June · "stand up the rails" (depends on Week 1)
- [ ] **NAB account live** with initial deposit (bank resolution from #2).
- [ ] **SL delivers fair-market salary determination** (#5) — push SL; it gates payroll + R&D personnel cost.
- [ ] **SL reviews the mapping spreadsheet** — confirm the reallocation principle (income flow-through / expense reimbursement / asset at market value) before any journals.
- [ ] **Insurance PL $20M + D&O bound.**
- [ ] **Stripe Pty account + customer re-auth notices** — ⚠️ needs **30+ days** notice; with 30 days to cutover this is the one rail that likely *won't* complete by 1 July (see Rule-2 flag below).

### Week 3 — 15–21 June · "configure + paper" (depends on Xero + salary)
- [ ] **Pty payroll configured** (#8) — two employees, $10K/mo + super + PAYG; first run July.
- [ ] **Director's loan accounts** opened with written **Division 7A** agreements (benchmark interest, ≤7-yr term).
- [ ] **Funder novation letters sent** — Snow, PRF, LMCF, Dusseldorp, Equity Trustees, any Commonwealth/state grant (SL template).
- [ ] **IP assignment deed** — after the IP-clause audit on grant + partnership contracts (verify clean title before drafting).
- [ ] **$1 test invoice run** (#9) end-to-end: Pty Xero → NAB → Stripe → BAS treatment → project_code tag.

### Week 4 — 22–30 June · "close + cut over"
- [ ] **Final sole-trader invoices raised** (22–29 Jun); sole-trader Xero closes to new entries.
- [ ] **Pre-30-June discretionary spend** at sole-trader marginal rate: $20K instant asset write-off, Nic super top-up to $30K cap, pre-pay annual SaaS. Cap ~$50K combined.
- [ ] **30 June — cutover.** Sole trader stops trading; Pty starts 1 July.

### Post-cutover — July–August
- [ ] First Pty payroll run (July).
- [ ] **Cross-entity journals booked** from the mapping spreadsheet (SL, August).
- [ ] Final sole-trader BAS (Q4 FY26, due 28 July) + cancel sole-trader ABN/GST after.
- [ ] FY26 R&D claim assembled + lodged via Pty (Sept 2026 – 30 Apr 2027).

## Risk flags

- **🟠 Stripe (30-day notice).** Customer re-authentication needs 30+ days and money rails don't transfer between ABNs. At 30 days out, Stripe-on-Pty by 1 July is tight. **Mitigation:** invoke **Cutover Rule 2** for the payment rail only — keep the sole-trader Stripe live for run-off while the Pty Stripe onboards; new Pty invoices can take PayID/EFT to the NAB account from day one (Stripe not required to invoice).
- **🟠 Tax method unverified.** The "operate on behalf of" journal reallocation + Subdiv 328-G + R&D continuity are currently *taken on faith from SL*. A background verification against primary ATO source is running (`thoughts/shared/research/2026-06-01-cutover-tax-verification.md`). Don't book journals until that + SL written confirmation land.
- **🟢 Rule 2 is the safety net.** If the Pty isn't genuinely invoice-ready by 1 July, the sole trader keeps trading until it is. The cutover *date* is a target; the cutover *integrity* (clean attribution, no retroactive invoices) is the hard constraint.

## Cross-reference
- [Canonical migration checklist](act-entity-migration-checklist-2026-06-30.md)
- [Cutover strategy (tax/legal)](../../../wiki/finance/sole-trader-pty-cutover-strategy.md)
- Live tracker: `/finance/pty-readiness` · `config/pty-readiness.json`
- Tax verification (running): `thoughts/shared/research/2026-06-01-cutover-tax-verification.md`
