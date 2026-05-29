# Pty Ltd Xero Cutover Runbook — 30 June 2026

**Date:** 2026-05-29 (T-32 days to cutover) · **Cutover date:** 30 Jun 2026 close / 1 Jul 2026 open (FY26→FY27 boundary)
**From:** sole-trader "Nicholas Marchesi" (NJ Marchesi T/as ACT), Xero `786af1ed-…`
**To:** new Pty Ltd — **ACN 697 347 676** (incorporated 22 Apr 2026; SL processing ABN/TFN/GST/PAYGW)
**Owners:** Ben (coordination/data) · Standard Ledger (books/BAS/journals) · Nic (director/banking/ATO) · Remco (structure/tax strategy) · R&D advisor
**Companion:** the recon/recode pack (`2026-05-29-standard-ledger-pack-MASTER.md`) + operating model + `recon-pack/07` bank rules.

> ⚠️ **Confirm-with-Remco/SL flags:** items marked **[CONFIRM]** come from the 5-May Remco notes / memory and must be validated by Remco + SL before acting — entity architecture, asset-transfer mechanism, R&D claimant, and Harvest structure are tax-sensitive decisions, not mine to settle.

---

## 0. Guiding principles

1. **Clean break, not a ledger copy.** Do **not** migrate the commingled sole-trader ledger (it carries Nic's personal accounts, −$1.3M working capital). The Pty starts with **opening balances only** — what the Pty actually owns + open AR/AP.
2. **Clean the FY26 books first, then reclassify.** The retrospective "on behalf of" R&D reclass needs a clean expense base — so the recon/recode pack (Phase A) must finish before the cutover reclass (Phase C).
3. **One source of truth (Xero), one receipt tool, automations seeded day one** — don't carry the two-systems/four-status-fields mess into the Pty.
4. **SL/Remco-led on anything tax-sensitive.** Asset transfer, opening balances, R&D claimant, GST registration timing = accountant decisions.

---

## 1. Critical path (what gates the 30 Jun cutover)

```
Ignition signed + SL Xero access  ──►  Phase A cleanup (recode/recon/TFN)  ──►  clean FY26 books
        │                                                                            │
        └──►  Phase B: stand up Pty Xero org (parallel, can start now) ──────────────┤
                                                                                     ▼
                                                              Phase C: 30 Jun cutover (opening balances,
                                                              asset transfer, R&D reclass, founder pay)
                                                                                     │
                                                              Phase D: repoint systems + turn on automations
```

**The one blocker that stops everything: sign the Ignition BAS proposal + grant SL Xero access** (6 reminders outstanding). Until that's done, Phase A can't be finalised and the cutover slips.

---

## 2. Phase A — pre-cutover cleanup (sole-trader org) · **now → ~20 Jun** · SL + Ben

Execute the recon/recode pack so FY26 closes clean:
- [ ] **Sign Ignition + SL Xero access** (Nic/Ben → SL). *Gates everything.*
- [ ] **Recode the $486K General Expenses** (worklist CSV) — High/Medium first, REVIEW band per `recon-pack/01`.
- [ ] **Reverse The Funding Network $144,558** — void the 2 bills, recognise GST-free income; **decide the $13,142 GST path** (>$12,500 limit → likely a revised Q2 BAS). *(recon-pack/02)*
- [ ] **Fix the ~$272K bill-vs-payment double-counts** — reconcile, don't re-expense (Telford Smith 4×). *(recon-pack/03)*
- [ ] **Reconcile** the $483K transfers + bill matches; import the **Everyday bank statement**. *(recon-pack/04)*
- [ ] **Clear 137 draft bills**, document the $401K voided invoices, resolve duplicate bills. 
- [ ] **Finalise Q3 BAS** (and lodge any revised Q2 BAS).
- [ ] **R&D evidence base** — confirm which FY26 expenditure is R&D-eligible per project (needs the clean coding above). R&D advisor.

**Exit criteria:** FY26 P&L is honest (no 429 lump, no double-counts, TFN reversed), reconciliation done, BAS lodged.

---

## 3. Phase B — stand up the Pty Xero org · **now → ~25 Jun** · SL + Ben (can run in parallel)

- [ ] **[CONFIRM]** Pty ABN + **GST registration effective date** (1 Jul vs incorporation 22 Apr) + PAYGW registration — SL.
- [ ] **Create the new Xero organisation** for the Pty (new org — do **not** rename the sole-trader org). Subscribe to a plan: **[CONFIRM] Grow or above** if you want JAX auto-reconciliation + bulk cash-coding (entry "Ignite" plan excludes them).
- [ ] **Seed the chart of accounts** — import `config/xero-chart.json` (Xero → Settings → Import → Chart of accounts CSV). Prune the sole-trader-only / personal accounts; keep the project-relevant expense accounts.
- [ ] **Recreate tracking categories** — Business Divisions + the ACT-xx project codes (manual; no bulk API). Keep them identical so reporting/scripts line up.
- [ ] **Connect Pty bank accounts + feeds** — NAB Business Everyday + Cash Maximiser + Low-Rate Visa (per the NAB walkthrough) **[CONFIRM]**; **Wise Business multi-currency** for international SaaS (virtual card per vendor kills the mistag pattern).
- [ ] **Build bank rules** from `recon-pack/07` — ⚠️ **bank rules do NOT transfer between Xero orgs**, so rebuild them here from day one (Qantas→493, Uber→452, fees→407, SaaS→485, etc.).
- [ ] **Connect ONE receipt tool** — **[CONFIRM] Dext vs free Hubdoc** decision; set to **auto-publish with the PDF attached**; configure supplier rules so bills land on the right account (not 429). Reconnect must be to the new org.
- [ ] Set financial-year-end (30 Jun), GST basis (cash/accruals), BAS frequency.

**Exit criteria:** empty Pty org configured, chart + tracking + feeds + rules + receipt tool live, ready to receive opening balances.

---

## 4. Phase C — the cutover · **30 Jun close / 1 Jul open** · SL + Remco

- [ ] **[CONFIRM] Opening balances** — SL posts an opening-balance journal in the Pty for what the Pty owns at 1 Jul: cash float, plant/equipment (Goods kit), IP/intangibles, open AR/AP. **Not** the personal accounts.
- [ ] **[CONFIRM] Asset transfer (sole trader → Pty)** — transfer Goods/Harvest equipment, IP, domains at an agreed/market value. ⚠️ This can trigger **CGT / balancing-adjustment / GST-on-transfer** consequences — Remco/SL to structure (often a written asset-sale agreement + a Division 122 rollover or similar). Don't move assets without that advice.
- [ ] **[CONFIRM] "On behalf of" R&D reclassification** — document the FY26 sole-trader expenditure incurred for the Pty's R&D projects so the retrospective claim sits with the right entity. Needs Phase A's clean base + R&D advisor sign-off.
- [ ] **[CONFIRM] Founder remuneration** — set up Nic's **$120K base salary** in Pty payroll (PAYGW + super) + a **Director's Loan** policy for drawings; convert the ad-hoc "Nicholas" transfers ($21,159 equity drawings) into this structure.
- [ ] **Close the sole-trader books** — final FY26 position; **[CONFIRM]** whether to cancel the sole-trader GST registration (or keep for the stub) — SL.

**Exit criteria:** Pty has correct opening balances, assets transferred with advice, founder on payroll, sole trader closed for FY26.

---

## 5. Phase D — Harvest subsidiary + systems repoint · **early Jul** · Ben + SL

- [ ] **[CONFIRM] Harvest subsidiary Pty** — Remco flagged a separate Pty for Harvest. Decide: own Xero org, or a tracking dimension within the main Pty? (Affects R&D, liability, reporting.)
- [ ] **Repoint Supabase/scripts** — re-auth Xero OAuth for the new tenant (`node scripts/xero-auth.mjs`), set `XERO_TENANT_ID` to the Pty, re-run `export-xero-chart.mjs`. Update the **two-account rule** to the new Pty accounts.
- [ ] **command-center `/finance` + GHL unit-ledger** — point at the Pty tenant.
- [ ] **Turn ON the consolidated automation suite IN the Pty** (this is the right time, not now): bank rules (done in B), one receipt tool auto-publishing, the guarded `vendor_project_rules` tagger, `reconciliation-checklist` for visibility. Cron + `pm2 save`.
- [ ] **Retire the redundant homegrown receipt pipeline** (or repurpose it to *only* the card-line receipts Dext/Hubdoc misses, with the push-to-Xero step actually wired).

---

## 6. Tax / GST / R&D timeline

| Item | Date | Owner |
|---|---|---|
| Revised Q2 BAS (TFN $13,142 GST) | ASAP, before lodging FY26 | SL |
| Q3/Q4 BAS (sole trader) | per quarter | SL |
| Sole-trader final FY26 return | post-30-Jun | SL |
| Pty first BAS (Q1 FY27) | Oct 2026 | SL |
| **FY26 R&D registration (AusIndustry)** | **due 30 Apr 2027** | R&D advisor |
| R&D claimant decision (sole trader vs Pty, "on behalf of") | before R&D registration | Remco + R&D advisor |

---

## 7. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Ignition not signed → cutover slips | High | Sign this week — it gates Phase A |
| Asset transfer triggers CGT/GST | $ + compliance | Remco structures (rollover); don't move assets without advice |
| R&D claimant ambiguity (sole trader vs Pty) | Loses/delays 43.5% offset | Resolve "on behalf of" reclass with R&D advisor before 30 Apr 2027 |
| Bank rules / Dext not rebuilt in Pty | Reconciliation chaos resumes | Phase B checklist; `recon-pack/07` reusable |
| Commingled balances carried over | Re-pollutes the clean Pty | Opening balances only; SL journal |
| Data/scripts still point at old tenant | Broken reports, stale dashboards | Phase D repoint checklist |
| Two receipt systems carried into Pty | The confusion returns | Pick ONE tool in Phase B |

---

## 8. Decisions to lock with Remco + SL (before cutover)

1. **Entity architecture** — Pty + charity (CLG/DGR) + Harvest subsidiary: confirm the final structure and which entity trades/holds what. **[CONFIRM]**
2. **Asset-transfer mechanism + valuation** (and the rollover to avoid tax). **[CONFIRM]**
3. **R&D claimant** for FY26 + the "on behalf of" treatment. **[CONFIRM]**
4. **GST registration date** for the Pty + whether to cancel the sole-trader's. **[CONFIRM]**
5. **Harvest** — own Pty/Xero org or tracking dimension. **[CONFIRM]**
6. **Xero plan tier** (Grow+ for JAX) + **Dext vs Hubdoc** for the Pty.
7. **Banking** — confirm NAB Business Everyday + Cash Maximiser + Visa + Wise Business set.

---

*Built 2026-05-29 from: the recon/recode pack, the reconciliation operating model, current Xero/Dext/AU-GST research, and the 5-May Remco notes (memory — flagged [CONFIRM]). No external actions taken. This runbook is a coordination tool for Ben/SL/Remco; the tax-sensitive steps are accountant-led.*
