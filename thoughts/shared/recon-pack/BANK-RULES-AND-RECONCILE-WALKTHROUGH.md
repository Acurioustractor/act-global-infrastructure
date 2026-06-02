# NAB Visa #8815 — Bank Rules + Reconcile, Step by Step

> **What this is:** the click-by-click for clearing #8815 using the reconcile co-pilot at `/finance/reconcile`. The logic: **bank rules kill the bulk, then you click straight down the screen.** The co-pilot tells you what each line is; Xero is where you click (the reconcile click is UI-only — no API, verified, Xero policy declined 6 May 2026).
>
> **Companion docs:** `RECONCILE-PLAYBOOK.md` (the full automation-ceiling assessment + per-phase clicks), `07-bank-rules-proposal.md` (the original hand-curated rule list), `MORNING-RECONCILE-RUNBOOK.md` (the daily prep loop).
>
> **Numbers below verified live against #8815 on 2026-06-02** — they drift as you reconcile. The co-pilot's live counts are authoritative over the snapshot here.

## The shape (what you're clearing)
~518 unreconciled lines / ~$649K. Mix:
- **33 transfers** (~$380K) — card repayments, biggest balance-mover.
- **~135 rule-coverable creates** — recurring no-bill spend that bank rules turn into one-click OKs.
- **108 matches** (~$68K) — bills/txns Xero already has; confirm and click.
- **The residue** — the DANGER cluster (AUTHORISED unpaid bills), refunds, and leftover one-off creates. This is the only part that needs real judgement.

---

## STEP 1 — Open the co-pilot
- Go to **`localhost:3002/finance/reconcile`** (start the dev server if it's down: `pnpm --filter @act/command-center dev`).
- Top of the page: the **bank-rules panel** ("Set N high-leverage rules → ~135 lines one-click").
- Below: one card per line — **left** = the bank line as Xero shows it, **right** = *what to do in Xero*.
- It's **read-only**. Nothing here writes to Xero. Keep it open on one side, Xero on the other.

---

## STEP 2 — Set the bank rules (one-time, ~30 min) — *the matching-killer*

In the rules panel, hit **"Copy all rules"** (or "Copy" per rule). Then in Xero:

**Accounting → Advanced → Bank rules → New Rule ▾ → Spend Money Rule**

Fill the form. Worked example — the real **WOOLWORTHS** rule from the data:

| Field in Xero | Enter |
|---|---|
| Conditions | **Payee** · **contains** · `WOOLWORTHS` |
| Set contact to | `Woolworths` |
| Allocate **100%** to | account **`421 - Light meals`** · tax **GST on Expenses** |
| Tracking (if shown) | project **`ACT-JP`** |
| Apply rule to | **NAB Visa ACT #8815** |
| Title → Save | `Woolworths` |

**Repeat for the ~28 high-leverage rules** (the 3+ line ones the panel shows first). **Skip the "2-line tail"** — those are break-even vs just hand-coding them later.

**Before you Save each rule, eyeball two things** (rules fire *silently* — a wrong default bakes in on a fast OK):
- **SaaS / subscriptions tax** — overseas (OpenAI, Anthropic, Vercel) is usually **GST Free Expenses**; AU-registered (Google AU, Apple Pty) is **GST on Expenses**. The panel flags these ⚠.
- **"set once" accounts** — where the panel shows `· set once` (e.g. Hatch, Kennards), pick the account once; it then sticks for all that vendor's lines.
- **Skip or tighten "ALICE"** — that key is a place name (Alice Springs), not a vendor. Don't make it, or narrow the condition to the actual merchant.

> Once saved, a rule immediately pre-fills any open #8815 line it matches on the Reconcile screen (shown as a green **Create** with the rule name) — you just click OK.

---

## STEP 3 — Work the Reconcile screen, one tab-type at a time

Open Xero: **Accounting → Bank accounts → NAB Visa ACT #8815 → Reconcile (N items)**. Set the co-pilot to **"Xero order"** (date) so both read down in lockstep. Do all of one type before the next — context-switching is what slows you, not the clicks.

### 3a — Transfers first (33 lines, ~$380K — biggest balance mover)
Card repayments, **not** expenses. Co-pilot tags them **TRANSFER**.
- On the line → **Transfer** tab → from-account = **NJ Marchesi T/as ACT Everyday** → **OK**.
- ⚠️ Never NM Personal or ACT Maximiser — only **#8815 + ACT Everyday** are ACT (two-account rule).

### 3b — Rule-prefilled creates → just OK (~135 lines)
Lines with the **"bank rule → one-click"** chip now show a green **Create** pre-filled by your rule. Glance it's right → **OK**. No matching, no typing.

### 3c — Matches → verify, then OK (108 lines)
Co-pilot says **Match bill / Match txn** and shows a copyable **BankTransactionID**.
- Xero suggests a match **by amount** → **verify vendor AND date both align** before OK.
- ⚠️ **The amount-not-date trap:** two equal amounts weeks apart get offered as a match. If the suggestion is wrong, click **Find & Match**, paste the co-pilot's ID / reference, tick the true line → **OK**.

### 3d — The residue (slow down here)
- 🔴 **DANGER badge** = matches an AUTHORISED *unpaid* bill. **Match it** (it's the real payment of a real bill). Do **NOT** Create (double-counts), do **NOT** delete (un-pays a real bill, understates spend). One at a time.
- **Refunds** — co-pilot shows the original charge it offsets. **Match/offset against that charge**; don't book as income.
- **Leftover creates** (no rule) — code by hand from the co-pilot's suggested account + project.

---

## Speed + safety
- **Cmd-F** to jump to a vendor down the list. **Tab** between fields; the green **OK** is what commits (Enter does not).
- Co-pilot filters: click a stat card to isolate an action; **"Danger only"** to work the cluster.
- **Never** accept a match on amount alone — vendor **and** date. **Review every rule before saving.** Unsure on a line → **Discuss** tab (park for SL), don't guess.
- The co-pilot is read-only; the reconcile click is always yours.

## Done =
Reconcile shows **(0 items)**. Then re-sync the mirror so the co-pilot's numbers refresh:
```bash
node scripts/sync-xero-to-supabase.mjs
```

## Known data caveats to clear (separate from the reconcile pass)
- **"INTERNET PAYMENT" create cluster** (~11 lines, ~$12K) — these smell like card repayments that weren't tagged as credits, so they're sitting in Creates instead of the Transfer block. Worth a look; if so they belong in 3a, not coded as spend.
- The rule pack is generated from live coding heuristics — it's a **draft to review**, not auto-applied. The human-in-loop review at Save time is the safety net.
