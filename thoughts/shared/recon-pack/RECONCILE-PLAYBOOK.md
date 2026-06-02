This is a documentation-writing task grounded in verified research that's already been done. No code, no DB, no external writes — I have everything I need in the input JSON. The Xero API ceiling is well-established across multiple verified sources. Let me write the playbook directly.

I'll produce the four-section markdown as my return value.

---

# NAB Visa ACT #8815 — The Definitive Reconcile Playbook + Automation Ceiling Assessment

> **Scope:** Clear the #8815 reconcile screen in Xero as fast as humanly possible, and define exactly how close software can get to "see-match-and-click" given the **verified, permanent** Xero API ceiling.
>
> **The wall (verified, twice, primary source):** Xero's "Reconcile via the API" request is **officially DECLINED** (admin "Kelly", 6 May 2026): *"we will not be adding the ability to reconcile bank statement lines via the API or to expose unreconciled bank statement data via the public API."* The reconcile **click is UI-only, forever**. There is also **no Bank Rules API** (zero `rule` occurrences in the 913KB OpenAPI spec; uservoice open since 2018). Everything below respects that ceiling — nothing here promises API-driven reconciliation.
>
> **What the API *can* do (verified):** create/recode/void/delete spend-money and bills, create transfers, create payments (with a narrow `Payment.IsReconciled` exception that is *not* a statement-line reconcile), attach receipts. So the whole game is: **prepare a clean 1:1 tab via API, then Ben clicks.**

---

## 1. The reconcile screen, explained

When you open **Accounting → Bank accounts → NAB Visa ACT #8815 → Reconcile (N items)**, Xero shows one **bank statement line** per row (the raw feed entry from the card). Each line is unmatched money that needs a home. For every line you choose **one** of four tabs:

| Tab | What it does | Use for #8815 |
|---|---|---|
| **Match** | Links the statement line to an *existing* transaction already in Xero (a spend-money, a bill payment, an invoice). Xero pre-suggests candidates. | The 90% case — Dext already published the bill/spend-money, you're just confirming the link. |
| **Create** | Makes a *new* spend/receive-money on the fly (contact + account + tax + tracking) and reconciles in one click. | Only when nothing exists in Xero to match (true no-bill lines). |
| **Transfer** | Records the line as a movement between two of your own bank accounts (no P&L impact). | **Card repayments** — money leaving the ACT Everyday bank to pay down #8815. |
| **Discuss** | Leaves a note, reconciles nothing. | Park genuinely unknown lines for Nic/Standard Ledger. Never your default. |

### The amount-not-date trap (the single most expensive mistake here)
**Xero's Match suggestions rank on *amount*, not date.** This is verified ACT behaviour and burned this workstream repeatedly. Two charges of `$42.96` weeks apart will be offered as a match to each other. The Uber/Snowdon/Railway "D-group" false matches proved coincidental-amount deletes would have destroyed real, separate charges. **Rule: never accept a suggested match unless vendor AND date both align.** The card's unique bank **Reference** is the only true identity of a charge — same amount+date+vendor with *different* references = two real charges, not a duplicate.

### Why bulk "OK" is dangerous
The reconcile screen offers a green **OK** on every pre-matched line and it's tempting to machine-gun down the list. Don't. Three specific traps make bulk-OK a money error:
1. **Auto-suggested matches are amount-ranked** (above) — a wrong-but-equal-amount match sails through as a confident green OK.
2. **The DANGER CLUSTER (8 lines, $8,100.56):** these lines match an **AUTHORISED *unpaid* bill**. Clicking OK reconciles the card line *as the payment of that bill* — which is often correct, BUT if the bill is a Dext phantom you've now "paid" a bill that shouldn't exist, and if it's real you must not instead delete it. This bucket needs eyes on every line.
3. **Bank rules fire silently** — a misfiring rule (e.g. the Garmin→Shipstation contact misfire in memory) pre-fills a wrong contact/account and a fast OK bakes in the error.

The discipline that made this safe across the whole 2026-06-02 run: **MATCH-THEN-DEDUPE, never dedupe-everything.** Match what's real first; only then delete what's provably duplicate.

---

## 2. Click-by-click, phase by phase

**Before you start (5 min):** the API prep has already run (`reconcile-prep.mjs` classified every line; `reconcile-void-bills.mjs` voided 48 phantom bills; `reconcile-delete-*` cleared phantoms/dups; 9 project recodes applied). What's left in the screen is the *human-only* residue. Open two windows side by side: **Xero reconcile screen** (left) and the **command-center reconcile cockpit** `/finance/reconcile` (right) showing the exact recommended action per line.

**Keyboard-fast baseline (memorise these):**
- `Tab` moves between fields within a line; `Enter` does **not** submit a reconcile — the green **OK** button does.
- In **Create**, type the **contact name** → Xero autocompletes; `Tab` → **Account** (type the code, e.g. `429`) → `Tab` → tax rate → `Tab` → tracking (type `ACT-HV` etc.).
- Use the browser's find (`Cmd-F`) to jump to a vendor name down a long list instead of scrolling.
- Do **one tab type at a time down the whole screen** (all Transfers, then all Matches, then all Creates) — context-switching between tab types is what slows a human down, not the clicks.

### Phase 0 — Void the archived-contact phantom bills (UI-only, do this FIRST)
**Why first:** these can't be done by API. The archived-contact void is the one verified API **dead-end** — Xero blocks the void on "contact archived", and un-archiving via API was rejected. The 3 Sand Yard / Edmonds `MOUNTY-` phantoms are on this manual list precisely because the batch script couldn't touch them.

Clicks, per bill:
1. **Accounting → Bills to pay** → search the contact (e.g. *The Sand Yard*). Note there's an **active duplicate** "The Sand Yard" contact — confirm you're on the phantom, not the real one (the phantom is AUTHORISED, zero payments).
2. If contact is archived and blocking: **Contacts → All contacts → search → the archived one → Restore** (un-archive).
3. Open the phantom bill → **Bill Options (▾) → Void**. Confirm.
4. **Re-archive** the contact if you restored it (Contacts → the contact → Archive).
5. Repeat for the other two. The matching card spend-money survives and drops into Phase 3.

*Fast path:* do all three restores in one pass, all three voids, then all three re-archives — don't ping-pong.

### Phase 1 — Card repayments → Transfer
These are the lines where the ACT Everyday bank paid down the #8815 balance. They are **not expenses**.

Per repayment line:
1. On the statement line, click the **Transfer** tab.
2. **Bank account** field → type/select **NJ Marchesi T/as ACT Everyday** (the paying account). *Never* select NM Personal or ACT Maximiser — the two-account rule means only #8815 + ACT Everyday are ACT.
3. Click **OK**.

*Fast path:* repayments are usually a handful of round-ish amounts. Filter the screen by the repayment amount, do them as a block. (The other side reconciles separately on the ACT Everyday account — `FromIsReconciled`/`ToIsReconciled` both default false, so you'll match it there too.)

### Phase 2 — Merchant refunds → match or offset
A refund is a **credit** on the card (money in). It must net against the original charge or a credit note, not be created as income.

Per refund line:
1. Click **Match**. Xero suggests candidates **by amount** — find the one whose **vendor + date** correspond to the original purchase or its credit note.
2. If a matching **credit note / bill credit** exists → tick it → **OK**.
3. If no credit exists but the original spend is there → use **Match → "Adjustments" / find & match the offsetting line** so the refund nets the expense account (same account the charge hit), not a generic income line.
4. If nothing exists → **Create** a receive-money coded to the *original expense account* (so it reduces that account), correct tax, correct `ACT-XX` tracking → **OK**.

*Trap:* do not let a refund land as `RECEIVE` income — it undercounts the expense reversal and (verified) settlements/transfers already cause `RECEIVE-TRANSFER` income-undercount confusion. Keep refunds on the expense side.

### Phase 3 — Debit spend, by vendor (the bulk: ~339 no-bill lines, $212,870.90)
This is the body of the work. Two sub-paths, decided per line by whether the line is **already coded in Xero** (Dext published a spend-money/bill) or genuinely **no-bill**.

**3a — Already-coded → Find & Match (the 90% case).**
Most debit spend was found **already coded** (Phase 3 of the earlier run) — the task is *confirm-and-reconcile*, not code-from-scratch.
1. On the statement line, click **Match**.
2. Xero suggests the existing spend-money/bill payment. **Verify vendor + date align** (not just amount).
3. If it's the right one → **OK**. Done in one click.
4. If the suggestion is wrong-but-equal-amount → click **Find & Match**, search by the correct **Reference** or contact, tick the true line → **OK**.

**3b — No matching transaction → Create.**
1. Click **Create**.
2. **Who** = contact (type the vendor; Xero autocompletes).
3. **What** = account code — type the number (e.g. `429` General Expenses, or the vendor's learned account from the Dext archive coding via `reconcile-line-lookup.mjs`).
4. **Tax** = check GST: overseas SaaS → **GST Free Expenses**; domestic → **GST on Expenses**.
5. **Tracking** = `ACT-XX` project (Harvest lines → `ACT-HV`; verify against the recodes already applied).
6. **OK**.

**Work it in vendor batches.** Sort/`Cmd-F` by vendor so all Kennards lines, all Maleny Hardware lines, etc. are done with the same coding muscle-memory. The cockpit on the right tells you the recommended account+tracking per line so you're transcribing, not deciding.

**Watch the DANGER CLUSTER (8 lines, $8,100.56):** if a line matches an **AUTHORISED unpaid bill**, the correct action is **Match** (it's the real payment of a real bill) — **do not Create** (double-counts) and **do not delete** (falsely un-pays a real bill, understating spend). These 8 are flagged in the cockpit; treat them one at a time.

---

## 3. How close can we get to one-click — the realistic automation ladder

**The hard ceiling (verified):** no API and no MCP tool can set a statement line reconciled (`mcp__xero__*` exposes ~50 tools, none reconcile; the official server's own docs confirm it). The only true headless reconcile is **RPA against the UI** (Booke AI proves it's possible, at ToS risk). So "one-click" realistically means **collapse all human judgement into a single confirming click per line** — and below, the one path to zero clicks with its risks.

Ranked by **effort ÷ payoff, weighted for safety**:

### (a) Pre-code via API so the UI match is one click — **DO THIS. Highest payoff, lowest risk, already proven.**
- **Effort:** low-medium (the scripts exist). **Payoff:** turns every Phase-3a line into a single green OK. **Safety:** high — every write is live-gated against a fresh single-GET `BankTransactions/{id}`, attempted-vs-actual reconciled, append-only audit log.
- **What it does:** void phantom bills, delete reference-confirmed dups, recode account/tax/`ACT-XX` *before* Ben opens the screen, attach receipts to keepers. Xero then pre-suggests a clean match and Ben confirms.
- **This is the ACT design and it works** — the 2026-06-02 run (106 deletes + 48 voids + 9 recodes) already shrank the human screen to its residue. Keep investing here.

### (b) Bank rules — manual setup once, then auto-suggest forever. **Medium payoff, zero ongoing effort, but no API.**
- **Effort:** medium one-time, **UI-only** (no Bank Rules API — verified). **Payoff:** for recurring vendors (Kennards, Maleny Hardware, Webflow, Vercel, Apple, Railway), a rule pre-fills contact + account + tax + tracking so the line arrives in the screen as a one-click Create. **Safety:** medium — rules **misfire** (Garmin→Shipstation in memory), and they fire *silently*, so a fast OK can bake in a wrong contact.
- **ACT move:** hand-build ~15-20 rules in the UI for the top recurring #8815 vendors, scoped tightly (contains-vendor-name + amount band), each writing the correct `ACT-XX`. Review-then-OK, never blind-OK. This is the only "auto-suggest" lever Xero gives you, and it's free.

### (c) Command-center "reconcile co-pilot" beside Xero — **highest leverage build. Medium effort, high payoff, zero added risk.**
- **Effort:** medium (extends the existing `/finance/reconcile` cockpit). **Payoff:** removes *all decision time* from Ben's pass — he's transcribing, not thinking. **Safety:** high — it's **read-only**, the reconcile click stays in Xero (verified-correct architecture, matches the reconcile-cycle skill design).
- **What it shows, per Xero line:** the exact recommended action (MATCH this txn / CREATE with this account+tax+`ACT-XX` / TRANSFER from ACT Everyday / VOID-then-skip), the matched Xero `BankTransactionID`, the live `IsReconciled` flag, the receipt link, and a **DANGER badge** on the 8-line unpaid-bill cluster. Ordered to mirror the Xero screen so Ben reads straight down both windows in lockstep.
- This is the closest you safely get to one-click: the human click remains, but every judgement behind it is precomputed and verified. **Build this week (see §4).**

### (d) Browser automation (Playwright/Puppeteer) — the ONLY true headless reconcile path. **High risk, defer.**
- **Effort:** high (and brittle — Xero's DOM changes break it). **Payoff:** genuine zero-click reconcile (drive the actual OK button), like Booke AI's RPA. **Safety:** **low** — this is a **Tier-3 external-system write** driven by a script, it logs into Xero as a human (**ToS / login-automation risk**, unquantified Xero enforcement), and a silent wrong reconcile is the expensive failure this whole workstream exists to prevent. The `mcp__playwright__*` tools are available, so it's *technically* reachable from here.
- **Verdict: do not build for money writes.** Per ACT's AFK boundary, Tier-3 reconciles are day-shift, human-in-loop, standard mode — exactly what RPA removes. Keep it on the shelf as the known upper bound, not the plan. If ever used, gate it behind the same live single-GET verification (a) uses, run it on a tiny tracer batch, and never unattended.

**Ranking summary:**

| Path | Effort | Payoff | Safety | Verdict |
|---|---|---|---|---|
| (a) API pre-code | Low-Med | High | High | **Keep doing — the spine** |
| (c) Co-pilot beside Xero | Med | High | High | **Build this week** |
| (b) Bank rules (UI) | Med once | Med | Med | **Worth a one-time afternoon** |
| (d) Playwright RPA | High | Highest | Low | **Shelf it — Tier-3 risk** |

---

## 4. The biggest time-savers to build THIS week

Ordered by payoff-per-build-hour. All respect the ceiling (no API reconcile, no RPA on money).

1. **Reconcile co-pilot screen, ordered to mirror Xero (§3c).** Extend `/finance/reconcile` so each row = one Xero statement line, showing recommended action + matched `BankTransactionID` + live `IsReconciled` + receipt link + DANGER badge. Sort identically to Xero's reconcile screen so Ben reads down both windows in lockstep. **Biggest single time-saver** — it deletes decision time from the entire Phase-3 pass.

2. **Phase-0 punch-list generator.** A read-only script that emits the exact archived-contact void worklist (the Sand Yard / Edmonds `MOUNTY-` type) with restore→void→re-archive steps and a duplicate-contact warning per line. These are the only true UI dead-ends; hand Ben a finished checklist so Phase 0 is mechanical.

3. **Repayment + refund pre-classifier.** Tag every #8815 line as REPAYMENT (→Transfer from ACT Everyday) / REFUND (→match-or-offset) / SPEND before Ben opens the screen, so Phases 1-2 are filtered blocks, not hunt-and-peck. Repayments and refunds are the lines most likely to be mis-coded as expense/income if done by feel.

4. **Top-vendor bank-rule pack (UI build, scripted prep).** Generate the list of the ~15-20 highest-frequency #8815 vendors with their learned account+tax+`ACT-XX` from the Dext archive, formatted as copy-paste rule definitions, so Ben builds the rules in the Xero UI in one afternoon. One-time cost, permanent auto-suggest. Scope each tightly to avoid the Garmin→Shipstation misfire class.

5. **Auto-log reconciler against live.** Two writes (Kennards $424 delete, Dialpad $56 void) succeeded live but the append-only log missed on a transient 429/verify error. Build a tiny end-of-run check that diffs `reconcile-write-log.md` against a fresh live pull of recently-modified #8815 transactions and flags any write that happened but wasn't logged. Cheap, closes the one audit-trail gap that bit twice.

---

**Assumptions stated explicitly (per fallback instruction):**
- The four-phase line split (Phase 0 archived-contact phantoms; Phase 1 repayments; Phase 2 refunds; Phase 3 the 339 no-bill + 8 danger + 22 safe-delete) is taken from the verified `reconcile-worklists.mjs` 3-bucket output plus the documented Phase-0 dead-end; exact *current* per-line counts will have shifted as the API prep ran — the cockpit's live numbers are authoritative over these.
- Keyboard shortcuts described are Xero's standard reconcile-screen behaviour (Tab between fields, green OK to commit, autocomplete on contact/account). Xero does not publish a documented hotkey to fire OK; if a per-line keyboard-confirm exists in the current UI it's an additional speed-up, but I did not verify a specific keybinding and have not asserted one.
- Bank-rule misfire risk and the amount-not-date suggestion ranking are from ACT's own verified memory (`reconcile-autocoding-traps`, `nab-visa-reconcile-prep`), not re-derived this session.