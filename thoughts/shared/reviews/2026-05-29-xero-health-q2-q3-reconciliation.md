# Xero Health + Q2/Q3 Reconciliation Review — ACT

**Date:** 2026-05-29
**Org reviewed:** "Nicholas Marchesi" (sole-trader, NJ Marchesi T/as ACT) — Xero org `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`
**Period:** Australian FY Q2 (Oct–Dec 2025) + Q3 (Jan–Mar 2026)
**Author:** Claude (for Ben). Sources in `.provenance.md` sidecar. Figures are **Verified** (queried) unless tagged *Inferred*.
**Two-account rule applied:** ACT spend = NAB Visa ACT #8815 (card) + NJ Marchesi T/as ACT Everyday (bank). NM Personal and Maximiser excluded.

---

## 0. Health scorecard (at a glance)

| Dimension | State | Grade |
|---|---|---|
| Integration / data access | Full read+write OAuth app healthy; convenience MCP broken (fixable, low value) | 🟢 |
| Bank reconciliation — card | 761/1,093 lines reconciled (70%) | 🟡 |
| Bank reconciliation — operating bank | 31/117 lines reconciled (26%) | 🔴 |
| Expense coding | **$438K in "General Expenses" catch-all** | 🔴 |
| Receipt coverage — card | ~$5.8K uncovered, all sub-threshold | 🟢 |
| Receipt coverage — material items | ~$48K incl. $21K undocumented founder R&D | 🟡 |
| Duplicates | 1 real flag ($19.8K Telford Smith); rest false positives | 🟡 |
| Voided revenue | $401K ACCREC voided — needs narrative | 🟡 |
| Entity hygiene | Personal + business commingled → −$1.3M working capital | 🔴 (fixed by Pty migration) |

**One-line verdict:** The *data plumbing* is excellent and the card is mostly clean. The *accounting* has three real problems — a $438K uncoded expense lump, an under-reconciled operating bank account, and personal/business commingling — all of which should be resolved as part of, or before, the Pty cutover. None are emergencies; all are very fixable.

---

## 1. Integration status & the fix (answered)

**What's broken:** the `mcp__xero__*` MCP server in `.mcp.json` is given only `XERO_CLIENT_ID`+`XERO_CLIENT_SECRET`, so it falls back to the **client-credentials grant**. But that client ID (`…118776`) is your standard **Auth-Code** OAuth app (same app the codebase sync uses). Client-credentials filters out every accounting scope → `invalid_scope: No valid scopes remaining after filtering for grant type`.

**What works — and is strictly better:** your codebase OAuth2 app (refresh-token rotation, `xero_tokens` table + `.env.local`). Verified 2026-05-29: token refreshes cleanly and **all 13 endpoints return ✓** with full **read+write** scopes — `accounting.transactions`, `.banktransactions`, `.invoices`, `.payments`, `.contacts`, `.attachments`, `.manualjournals`, `files`, plus all report scopes. This can do *everything* the Xero API allows and is multi-org ready (swap `XERO_TENANT_ID` for the Pty later).

**Recommendation:**
- **Use the scripted integration as the workhorse** (it already powers 20+ read/write scripts: `sync-xero-*`, `push-ai-tracking-to-xero`, `match-receipts-to-xero`, `upload-evidence-receipts-to-xero`, `import-xero-files-receipts`). No new cost, works today, multi-org.
- **Do NOT invest in fixing the MCP for the sole-trader org.** The only self-sustaining MCP mode is a paid per-org **Custom Connection**, and you migrate to the Pty in ~1 month — you'd throw it away. If you want an interactive Xero MCP later, set up the Custom Connection against the **Pty** org once it exists.
- Bearer-token bridge (`XERO_CLIENT_BEARER_TOKEN` in `.mcp.json`) is available as a 30-min stopgap if interactive MCP is ever needed this session — not recommended as a standing solution.

---

## 2. Cash & P&L reality (live, 2026-05-28)

| Metric | Value |
|---|---|
| Cash (Everyday) | **+$303,981.73** |
| NAB Visa owing | **−$173,925.49** |
| **Net ACT position** | **~+$130,056** |
| Receivables owed to us (all-time) | $165,417.88 |
| Payables we owe (all-time) | $732,187.88 |
| Working capital | **−$1,299,777.51** |

**P&L Oct 2025–Mar 2026:** income $487,210.71 · expenses $1,356,826.69 · **net −$869,615.98** (prior half Apr–Sep was +$393,279). The swing is driven by the expense side, not income.

> ⚠️ **Do not read these as ACT's true economics.** This org commingles Nic's personal accounts (NM Personal −$375,991) with ACT. The −$1.3M working capital and −$870K "loss" are distorted by commingling, the $438K uncoded lump (§4), and probable bill-vs-payment double-counting (§3). The Pty migration is what produces clean, defensible numbers.

---

## 3. Reconciliation status — Q2 + Q3 (the honest picture)

True Xero `is_reconciled` flag, AUTHORISED lines, ACT accounts:

| Account | Lines | Reconciled | Unreconciled | Unrec. $ |
|---|---|---|---|---|
| NAB Visa ACT #8815 | 1,093 | 761 (70%) | 332 | $279,144 |
| NJ Marchesi ACT Everyday | 117 | 31 (26%) | 86 | $615,743 |
| **Total** | **1,210** | **792** | **~418** | **~$894,887** |

- The **operating bank account is the gap** — only 26% reconciled. Most of its unreconciled $ is large items: the ~$471K of internal transfers (Everyday→card to pay it down) and grant receipts. These are easy reconciliations but nobody has done them.
- **Bank-statement import is half-loaded:** the receipt pipeline imported 1,618 statement lines for exactly Oct1–Mar31 — but **all of them are NAB Visa; the Everyday bank statement was never imported.** Only 4+11 of those lines are linked to a Xero transaction (Supabase-side linkage, separate from Xero reconciliation).
- **Bill-vs-payment double-count risk:** $1.03M of real ACCPAY bills entered in the period vs $584K of bank outflow, with near-zero bank↔bill matching → some bills are almost certainly also entered as separate card/bank spends. This is the documented Harvest pattern. Must be de-duped during reconciliation or the P&L overstates expenses.

**Reconciliation can only be *finished* in Xero (the final match/approve click) by a human or by Standard Ledger.** The API can *prepare* everything — propose matches, push receipts as attachments, recode, flag dupes.

---

## 4. 🔴 #1 issue: $438,281 in "General Expenses"

Xero P&L, Oct–Mar: **General Expenses = $438,281.22** (prior half: $48.17). This is an uncoded catch-all and is the single largest data-quality problem.

**Why it matters:**
- **R&D:** uncoded expenses can't be allocated to ACT-EL / ACT-IN / ACT-JH / ACT-GD → lost 43.5% offset on anything genuinely R&D.
- **BAS:** GST treatment is unverifiable in bulk → BAS risk.
- **Project P&L / board reporting:** every per-project number is wrong while $438K sits unallocated.

**Fix:** bulk reclassify from General Expenses into proper expense accounts + project tracking. Feasible via API (`accounting.transactions` write) using the existing vendor→project rules + AI router, with a human/SL review gate. **Decision needed:** do this in the sole-trader org now (helps Q3 BAS) or do it clean during the Pty cutover (§7).

---

## 5. Duplicates

Same-day / same-amount / same-contact clusters in Q2+Q3 (ACT accounts): **41 groups, $40,068 nominal "excess."** But this is mostly false positives:
- **~$20K is Qantas** — same-day flight charges are normally legitimate (multi-leg bookings, seat/baggage add-ons), not duplicates. Do **not** auto-dedup.
- Minor SaaS pairs (HighLevel, Supabase, Webflow) — verify but low value.

**The one real flag — verify manually:**
- **Telford Smith Engineering — 2 × $19,800 on 2025-12-23 (Everyday, ACT-GD), = $39,600.** Both have attachments but **different tax codes** (one `INPUT`, one `EXEMPTEXPENSES`), both unreconciled. Either two genuine payments or a double-entry with mismatched GST. **Action:** pull the Telford Smith invoice(s); if one $19,800 job → one entry is a duplicate (~$19.8K + GST recovery / correction).

---

## 6. Missing receipts — material items only (GST/R&D exposure)

Card-level "missing receipts" (328 items) total only ~$5,820 — sub-$82.50 swipes, negligible. The items that actually matter:

| Source | Date | Vendor | Amount | Project | Flag |
|---|---|---|---|---|---|
| Bank (Everyday) | 2025-11-17 | **Nicholas** | $15,000 | ACT-CORE | **R&D-eligible, no receipt** |
| Bank (Everyday) | 2025-11-21 | **Nicholas** | $6,159 | ACT-CORE | **R&D-eligible, no receipt** |
| Bill (ACCPAY) | 2025-11-16 | Carla Furnishers | $11,180 | ACT-GD | no attachment |
| Bill (ACCPAY) | 2025-11-04 | Mounty Container Supplier | $11,000 | ACT-CORE | no attachment |
| Bill (ACCPAY) | 2025-11-25 | Airbnb | $2,324.80 | ACT-IN | no attachment |
| Bill (ACCPAY) | 2025-11-24 | Nicholas Marchesi | $1,974.50 | ACT-IN | no attachment |
| Bank (Everyday) | 2025-10-20 | Chris Witta | $591 | ACT-HV | no receipt |

**The $21,159 of "Nicholas" R&D-coded payments are the priority.** Bank transfers to the founder labelled R&D-eligible, with no receipt and no contract, are weak R&D substantiation and a related-party audit flag. Resolution is structural, not a receipt hunt: under the Pty, founder time becomes **$120K base salary + Director's Loan** (Remco 5 May) with contemporaneous R&D time records — *that's* what supports the offset, not a $15K transfer tagged ACT-CORE.

**Note on the receipt pipeline:** `has_attachments` reflects Xero only. The pipeline (`receipt_status` 592 rows, `dext_receipts` 383, 833 receipt-matched statement lines) has already *found* many receipts that were never pushed into Xero as attachments. So the true documentation gap is smaller than the raw "no attachment" count — but the **receipt→Xero attachment push is a missing pipeline step** worth wiring (`upload-evidence-receipts-to-xero.mjs` exists).

---

## 7. "Move all assets to the Pty" — framework (not yet a plan)

**Context (from prior sessions/memory — treat as Inferred, confirm with SL):** Pty created 22 Apr (ACN 697 347 676); SL processing ABN/TFN/GST/PAYGW. Remco 5 May actions: migrate sole-trader→Pty by **1 Jul**, reclassify past txns as "**on behalf of**" the Pty (retrospective R&D), $120K base + Director's Loan policy, **subsidiary Pty for Harvest**, Dext project-specific email tagging.

This is an **accountant-led** task (SL + Remco), not something to execute unilaterally in Xero. What this review contributes:

1. **Cutover date & method** — clean break at 30 Jun. New Pty Xero org; do **not** migrate the commingled sole-trader ledger. Bring across **opening balances only** (assets the Pty actually owns) + open AR/AP, established by SL via journals.
2. **What "assets" actually transfer** — physical/IP assets ACT owns (Goods kit, equipment, IP, domains), the operating bank balance, and open receivables/payables. Personal accounts (NM Personal, Maximiser) do **not** go to the Pty.
3. **"On behalf of" reclassification** — the sole-trader expenses that were really ACT/Pty R&D get reclassified so the retrospective R&D claim sits with the right entity. Requires SL + a clean expense-coding base → **which is why §4 (the $438K) must be coded first.**
4. **Founder payments** — convert ad-hoc "Nicholas" transfers (§6) into the salary + Director's Loan structure in the Pty.
5. **Pre-cutover cleanup checklist** (do in sole-trader org before 30 Jun): code the $438K, finish reconciliation, clear 137 DRAFT bills, resolve Telford Smith, document the $401K voided invoices, attach the material receipts.

**Open dependency:** the single biggest unblocker is still **signing the Ignition BAS proposal with Standard Ledger** (6 reminders outstanding) + granting SL Xero access — without SL engaged, the migration journals and BAS can't be done properly.

---

## 8. Voided / deleted invoices to document

- **ACCREC VOIDED: 22 invoices, $401,200** + 1 DELETED $53,900. A large amount of cancelled revenue — needs a one-line narrative each (re-issued? grant booked as receipt instead? cancelled deal?) so the income story is defensible at BAS/audit.
- **ACCPAY: 24 VOIDED ($19,118) + 6 DELETED ($30,283) + 137 DRAFT ($15,993).** Clear the drafts (approve or delete) before cutover.

---

## 9. Prioritized action plan

**What I can do via the API now (prep; Tier 1–2):**
1. Build a **reconciliation prep pack**: propose bank↔bill matches, list the 418 unreconciled lines by ease, flag probable bill/payment double-counts.
2. Produce a **General Expenses recode proposal** ($438K → accounts + projects) using vendor rules + AI router, with confidence scores, for review.
3. Verify **Telford Smith** against source invoices; produce a duplicate/correction recommendation.
4. Run the **material receipt chase** (Gmail + dext + pipeline) for the §6 items and push found receipts to Xero attachments.
5. Document the **$401K voided ACCREC** with a reason per invoice.

**What only a human / Standard Ledger can do (Tier 3):**
- Final reconcile/approve in Xero · sign Ignition BAS proposal · migration journals & opening balances · founder salary/Director's Loan setup · lodge BAS.

**What's a Ben decision (§10).**

---

## 10. Decisions for Ben

1. **Sequence:** reconciliation prep pack first, or Pty migration runbook first, or receipt/duplicate chase first?
2. **$438K recode timing:** clean it in the sole-trader org now (helps Q3 BAS) or only at the Pty cutover?
3. **Ownership:** do I prep everything for Standard Ledger to execute, or do you want me to push approved changes into Xero directly via the API (Tier 3 — needs your explicit go each batch)?
4. **Custom Connection:** confirm we defer the interactive Xero MCP until the Pty org exists (recommended), or set one up now anyway?

---

*Nothing in this review was written to Xero, GHL, Notion, or any external system. All actions read-only. The Xero token was refreshed (rotation saved back safely).*
