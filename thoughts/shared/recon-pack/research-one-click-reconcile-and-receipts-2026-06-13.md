# One-click reconciliation & complete receipts — what's actually possible in Xero (2026)

**Research date:** 2026-06-13 · **For:** Ben (and the Standard Ledger / Pty-migration decisions) · **Entity:** Nicholas Marchesi T/as A Curious Tractor → ACT Pty. **Read-only research** — blends ACT's internal recon-pack with verified current Xero/ATO facts. Provenance sidecar alongside.

## The honest headline

"Will it just be one click for all reconciliations?" — **partly real, partly myth, and the split is the whole answer:**

- **The reconcile click has no API.** ACT verified this directly — Xero declined the API path on 6 May 2026; you cannot set a line `IsReconciled` programmatically. So no headless, fully-automated reconcile. That ceiling is real and unchanged.
- **But Xero now auto-reconciles for you with AI.** "Automatic bank reconciliation," powered by **JAX (Just Ask Xero)**, went to global beta in Nov 2025 and is rolling out live through 2026. It auto-clears bank lines **where confidence is high**, targeting **80%+ of statement lines in real time**, with a new "Reconciled" page and full review/override. That *is* "just done" for the routine majority.
- **The lines that will never be one-click are exactly ACT's risky ones** — matching a card payment to an AUTHORISED *unpaid* bill (the double-count trap) and equal-amount-different-date matches. Those are low-confidence **by design** and stay human-reviewed. That's the safety net working, not a gap.

So there are two different jobs, and they need different answers:

| Horizon | The lever | "One click for all"? |
|---|---|---|
| **The Q2/Q3 backlog you're clearing now** | Bank rules + cash coding + your `/finance/reconcile` co-pilot | No — but rules + cash coding collapse the recurring bulk; the danger cluster stays manual (correctly) |
| **Steady-state (Pty, FY27 onward)** | JAX auto-reconcile + Dext fetch + bank rules | Close — ~80% auto-reconciled on import, receipts arrive attached, you review the ~20% |

JAX is what stops you ever being in a 249-line backlog again. It won't safely one-click *this* backlog's danger cluster — so don't wait for it; clear the backlog with the levers below.

> **Update (Ben, 13 Jun): ACT already has JAX switched on and in use.** That confirms you're on **Grow+** (JAX is gated there, so cash coding is available too), and the routine majority is *already* auto-reconciling. It reframes the rest of this doc: the 249-line Q2/Q3 residual is **the low-confidence remainder JAX correctly left for you** — transfers, unpaid-bill matches, amount-not-date pairs — not a sign automation is failing. Two levers still move the needle: **feed JAX your bank rules**, and **review what it has already auto-reconciled.** See Part 4.

---

## Part 1 — Near-one-click reconciliation: three levers, and what each can't do

**1. Bank rules** *(you've already designed ~28, covering ~$100K of recurring spend)*
Match on payee text → set account + tax + default project; applies to new feed lines **and can be run over the existing unreconciled backlog**. This is what turns your ~135 recurring no-bill lines into one-click "OK." Set up in the Xero UI (no API). The one hazard: rules fire **silently**, so a wrong default bakes in on a fast click — review the tax rate before saving each (overseas SaaS like Anthropic/Vercel = GST-free; Google AU / Apple Pty = GST on Expenses). You've already flagged this in `07-bank-rules-proposal.md`.

**2. Cash coding** *(Xero Grow plan and above)*
A spreadsheet-style grid that codes and reconciles **up to ~200 lines in one action** — sort by description, apply a bank rule to a multi-select, reconcile the lot. Perfect for the recurring no-bill spend. **Its hard limit: cash coding only *creates* new transactions — it does not match against existing bills.** So it clears the no-bill bulk, but **not** your ~108 bill-matches and **not** the unpaid-bill danger cluster. It also has no real pattern-recognition, so it can mis-code a backlog if you don't sort first.

**3. JAX automatic bank reconciliation** *(Xero Grow+; live through 2026)*
The AI layer. On each imported line JAX tries, in order: **Rule** (your bank rules) → **Match** (an existing bill/invoice, same payee + amount) → **Memory** (how *you've* coded similar lines) → **Prediction** (how other, anonymised Xero orgs coded similar lines). High-confidence lines auto-reconcile; everything else lands on the Reconciled page for you to review or take over, and you switch it **on/off per bank account**. Target 80%+ auto. This is the genuine "just done" — but **high-confidence only**, and framed as **real-time on import** (forward-looking), so treat it as the FY27 engine, not a retro-fix for the overdue backlog.

**What stays manual forever — and should:**
- **Transfers** (your biggest $ block — ~$372K of Everyday→Visa repayments) go through the **Transfer tab**. Bank rules and cash coding don't handle inter-account transfers (it's an open Xero feature request, not shipped). JAX may match the paired payment, but verify.
- **Bill-matches + the DANGER cluster** (AUTHORISED unpaid bills) need per-line judgement — Match, never Create (double-count) and never delete (un-pays a real bill). This is the irreducible core, and it's exactly where ACT's money has gone wrong before (the $272K double-count, Telford Smith). Keep humans on it.

---

## Part 2 — "Flag easily if receipts are missing"

**Xero itself can't do this.** There is **no native Xero report for transactions missing an attachment/receipt** — it's one of the most-requested features and is *not* on Xero's roadmap (confirmed across Xero Central + Product Ideas). In Xero's UI you'd have to open each transaction to see if a document is attached. So "flag missing receipts easily" is **not** a Xero-UI capability.

**You already have something better.** ACT's mirror tracks `has_attachments` on every transaction, plus the `receipt_emails` / `finance_receipt_documents` pipeline, and `recon-status-latest.md §3` already prints **SPEND by has_attachments per quarter**. The reconcile co-pilot shows receipt evidence per line. That *is* your missing-receipt flag — and it's more capable than anything in Xero. The cleanest single artifact would be a one-line mirror view: *"AUTHORISED SPEND ≥ $82.50, has_attachments = false, by quarter"* — that's your definitive "what's actually missing" list (you have all the data; it's a query, not a new system).

**If you move capture to Dext** (see Part 3), Dext's own "costs without receipts" view becomes a second flag.

---

## Part 3 — "All receipts, even under threshold"

**The ATO rule first, because it shrinks the job:** to claim a GST credit you need a valid **tax invoice only for purchases over $82.50** (GST-inclusive). **At or under $82.50, you don't need a tax invoice at all** — a receipt showing the GST (or even the bank-statement line) is sufficient, kept for 5 years. So chasing sub-$82.50 receipts **does not change your BAS** and isn't an ATO requirement. The reasons to still capture them are completeness and **R&D substantiation** — worth it for R&D-tagged lines, optional otherwise.

**The automation that gets you "all receipts automatically" = Dext.** Dext auto-fetches invoices from **supplier portals + a dedicated email-in inbox**, pulls them near-real-time into Xero, and applies **supplier coding rules** — so the small recurring receipts (Supabase, Anthropic, Descript, SaaS) arrive **coded and attached** without you logging into each portal.

**Critical update that answers your SL-email question directly:** **Hubdoc — the free, Xero-owned auto-fetch tool — was shut down on 8 May 2026.** Its replacement, **Xero Files, is storage only: no OCR, no data extraction, no supplier-portal fetch.** So "do we keep Dext or consolidate to free Hubdoc?" is now moot — **Hubdoc no longer exists.** The free auto-fetch path is gone; automated receipt capture now means **keeping (and expanding) Dext**, or a paid alternative (Receiptor AI, AutoEntry). For ACT, the move is: connect the recurring vendors to Dext fetch + route receipt emails to the Dext inbox + set supplier rules → receipts land attached and pre-coded.

---

## Part 4 — The ACT blueprint

**Now — clear the Q2/Q3 backlog (don't wait for AI):**
Bank rules → run them over the open backlog → cash-code the no-bill bulk (Grow+ needed) → co-pilot for the matches and danger cluster → reconcile to zero. JAX won't safely one-click the danger lines; that's correct.

**Steady-state — so you're never here again (Pty / FY27):**
1. **Plan + JAX are already done** (Ben, 13 Jun) — ACT runs JAX, which means you're on **Grow+** and cash coding is available to you too. Nothing to buy; the gate's cleared.
2. **Feed JAX your bank rules.** JAX reconciles by trying **Rule → Match → Memory → Prediction**, in that order — so your ~28 designed rules are the highest-confidence input it has. If they're *designed but not yet created in Xero* (designed ≠ live), that's the single biggest lever to make JAX auto-clear more on the next import — and you can run them over the open backlog now. Confirm JAX is enabled on **both** accounts (#8815 **and** Everyday), not just the card.
3. **Run Dext fetch + supplier rules** for the recurring vendors → receipts arrive attached and coded.
4. **Keep your mirror as the missing-receipt flag** (the `has_attachments = false, ≥ $82.50` view).
5. **Keep humans on transfers + the unpaid-bill danger cluster** — JAX leaves these for you, by design.
6. **Review the Reconciled page.** Since JAX auto-matches on payee + amount, spot-check what it has *already* cleared — especially the danger vendors (Telford Smith, the TFN grant distributions, founder draws) and any equal-amount / different-date pairs. The amount-not-date trap is exactly what an auto-match can get wrong, and ACT's track record is double-counting. Trust, but verify the auto-reconciled set.

Net result going forward: reconciliation becomes a **review, not data entry** — you confirm the ~20% JAX flags, receipts are already on the lines, and the BAS falls out of clean books. That's the real version of "one click," and it's honest about the ~20% that should always have your eyes.

## Caveats / what I could not verify here

- **Does JAX auto-reconcile back-apply to an existing backlog, or only new feed lines?** The Xero blog frames it as real-time-on-import. Confirm in-product or with SL before assuming it'll clear Q2/Q3.
- **ACT's plan is resolved (Ben, 13 Jun): on Grow+** (it's running JAX, which gates there) — so cash coding and auto-reconcile are both available. The plan-upgrade question is closed.
- **JAX "Prediction" uses anonymised cross-Xero data** — weakest exactly on ACT-specific oddities (miscoded grants, founder draws). Keep those human.
- **Dext pricing/seats for ACT** not priced here — a real (small) cost line now that the free Hubdoc path is gone.

## Sources

- Xero Blog — automatic bank reconciliation (JAX) beta: https://blog.xero.com/product-updates/automatic-bank-reconciliation-jax-beta/
- Xero Central — About automatic bank reconciliation powered by JAX: https://central.xero.com/s/article/About-auto-bank-reconciliation-powered-by-JAX
- Insightful Accountant — Xero rolling out JAX automatic bank reconciliation: https://blog.insightfulaccountant.com/xero-rolling-out-jax-powered-automatic-bank-reconciliation
- Xero Central — Reconcile statement lines in bulk (cash coding): https://central.xero.com/s/article/Reconcile-using-cash-coding-US
- Xero Central — About bank rules: https://central.xero.com/s/article/About-bank-rules
- Xero Product Ideas — report for transactions without receipts attached (status: not on roadmap): https://productideas.xero.com/forums/967133-reports-tax/suggestions/47174305-reports-generate-a-report-for-transactions-witho
- Datamolino — AutoEntry vs Hubdoc vs Dext 2026 (Hubdoc shutdown + Dext fetch): https://www.datamolino.com/blog/pricing-and-features-autoentry-vs-hubdoc-vs-dext-vs-datamolino-in-2026/
- Receiptor AI — Best Hubdoc alternatives for Xero (Hubdoc retired 8 May 2026, Xero Files = storage only): https://receiptor.ai/blog/best-hubdoc-alternatives-for-xero-users
- ATO — Tax invoices ($82.50 threshold): https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices
- ATO — When you can claim a GST credit: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/claiming-gst-credits/when-you-can-claim-a-gst-credit
- ACT internal: `07-bank-rules-proposal.md`, `BANK-RULES-AND-RECONCILE-WALKTHROUGH.md`, `recon-status-latest.md` (6 May 2026 Xero API-reconcile decline; reconcile co-pilot at `/finance/reconcile`).
