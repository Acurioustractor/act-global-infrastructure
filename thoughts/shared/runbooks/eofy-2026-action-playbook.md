# EOFY 2026 — Action Playbook (play-by-play)

> **The dated master action list for the sole-trader → ACT Pty cutover.** Built 2026-06-19 from `thoughts/shared/plans/2026-06-19-eofy-money-movement-plan.md`. Today = **Fri 19 Jun 2026**; EOFY = **Tue 30 Jun 2026** (11 days). This is the human-readable source of truth; `/eofy` (command centre) and the Notion EOFY tracker mirror it.
>
> **Tier key:** `gov` = internal decision · `T3` = external write (money/registration/sent) — day-shift, human-in-loop, executed with Standard Ledger (SL). **Nothing here is self-executing.**
>
> **The master gate:** almost every money move below is *conditional on the SL call this week*. Send the email → get the call → lock the rulings → then the deadline actions can fire. Don't pay anything before SL rules.

---

## How to read the conditional gates

Items tagged **🔒SL** cannot happen until Standard Ledger has ruled on them in the call. The whole plan funnels through that call. The hard external deadlines (super ~24 Jun, R&D payment 30 Jun) are *only actionable after* the gate clears — which is exactly why the call is this week, not next.

---

## PHASE 0 — THIS WEEK (Fri 19 – Sun 21 Jun): unblock everything

| # | Action | By | Owner | Blocked by | Tier | Status |
|---|---|---|---|---|---|---|
| 0.1 | **Send the Standard Ledger email** (fill `[name]` first) — `thoughts/shared/drafts/2026-06-19-standard-ledger-eofy-questions.md` | Fri 19 Jun | Ben | — | T3 (send) | ☐ |
| 0.2 | **Book the SL call** for early next week (before Mon 22 go/no-go ideally) | Fri 19 Jun | Ben | 0.1 | — | ☐ |
| 0.3 | **Lock Decision 1 in writing** — operating entity = A Curious Tractor Pty Ltd (Option A: trade from the Pty; holdco-later via Div 615; subsidiary hive-down rejected). Record in `wiki/decisions/`. *Gates all novation letters.* | Fri 19 Jun | Ben + Nic (+ SL nod) | — | gov | ☐ |
| 0.4 | **NAB Pty account live** — gates seed loan + R&D window payments + Xero + 1 Jul trading | Fri 19–Mon 22 Jun | Nic | — | T3 | ☐ |
| 0.5 | **Both founders pull myGov screens** — "carry-forward concessional contributions" + total super balance (<$500K at 30 Jun 2025?) — needed to size the super decision | before 23 Jun | Ben + Nic | — | — | ☐ |

## PHASE 1 — THE SL CALL: rulings to lock (early next week, by Mon 22 Jun)

These are decisions SL makes on the call. Each one unblocks a money move below.

| # | Ruling to lock | Unblocks | Owner | Tier | Status |
|---|---|---|---|---|---|
| 1.1 | **Transfer mechanism** (the #1 question) — which path for the 50/50 two-trust structure: (a) preserve each UEO, (b) interpose Nic's trust, or (c) market-value sale + Div 152? | the cutover + the director loan | SL | 🔒SL | ☐ |
| 1.2 | **R&D-eligible $ to pay + apportionment %** (Ben ~95%→~85%? / Nic ~40%→~30%?) | the 30 Jun R&D payment | SL | 🔒SL | ☐ |
| 1.3 | **Nic super** — confirm cap headroom + model the **Div 293** stack (>$250K?) → go/no-go on the $30K | the ~24 Jun super contribution | SL | 🔒SL | ☐ |
| 1.4 | **Knight Photography** — legal form (sole trader vs partnership), GST backdating to 1 Jul 2025, PSI posture | Ben's invoices | SL | 🔒SL | ☐ |
| 1.5 | **Nic's arm's-length window/director fee** for the drawings→salary recharacterisation | Nic's R&D window amount | SL | 🔒SL | ☐ |
| 1.6 | **Path C mapping** — accept "sole trader operating on behalf of the Pty" for AusIndustry | the FY26 R&D registration | SL | 🔒SL | ☐ |
| 1.7 | **Pre-30-June deductions** — confirm instant-asset-write-off + prepaid (12-month rule) treatment | the discretionary spend | SL | 🔒SL | ☐ |

## PHASE 2 — MONEY MOVES (Mon 22 – Tue 30 Jun): hard deadlines

| # | Action | By | Owner | Blocked by | Tier | Status |
|---|---|---|---|---|---|---|
| 2.1 | **Mon go/no-go talk-through** — no money moves; confirm SL answers + bank balances + after-tax targets | Mon 22 Jun | Ben + Nic + SL | 1.1–1.7 | — | ☐ |
| 2.2 | **Nic personal super contribution SENT** (so fund *receives* by 30 Jun) + lodge NAT 71121 Notice of Intent | **~Wed 24 Jun** | Nic | 1.3 | T3 | ☐ |
| 2.3 | **Ben super top-up** (if KP structurable) | ~Wed 24 Jun | Ben | 1.4 | T3 | ☐ |
| 2.4 | **Tue actualise — issue invoices** (KP Phase 2 + Q4 split at 24 Apr + Pty window invoice) | Tue 23 Jun | Ben | 2.1 | T3 | ☐ |
| 2.5 | **Tue actualise — sole trader pays Ben + Nic drawings** (sized to *collected* cash, not receivables) | Tue 23 Jun | Nic + Ben | 2.1, 2.4 | T3 | ☐ |
| 2.6 | **Tue actualise — seed the Pty by director loan** ($75–100K) + signed loan note + separate loan accounts | Tue 23 Jun | Nic + Ben | 0.4 | T3 | ☐ |
| 2.7 | **Butterfly / Goods handover** — DGR-lawyer items; confirm Butterfly sits *beside* the group (arm's-length), already DGR+PBI since 2012 | **Fri 26 Jun** | Ben + DGR lawyer | — | T3 | ☐ |
| 2.8 | **⭐ R&D window wages PHYSICALLY PAID from the Pty** (PAYG + super, cash out the door — NOT journal/loan-credit/round-robin) — *the one irreversible lever* | **Tue 30 Jun (hard)** | Ben + Nic | 1.1, 1.2, 2.6 | T3 | ☐ |
| 2.9 | **Pre-30-June discretionary spend** (instant asset write-off, prepaid SaaS; ~$50K combined at sole-trader marginal rate) | by 30 Jun | Ben + Nic | 1.7 | T3 | ☐ |
| 2.10 | **Pty GST + PAYG-withholding registration live** (before any transfer/settlement — going-concern exemption needs it) | by 30 Jun | SL + Ben | — | T3 | ☐ |
| 2.11 | **Trustee distribution resolutions signed** (if either trust has FY26 income) | **30 Jun (statutory)** | Ben + Nic + SL | — | T3 | ☐ |
| 2.12 | **Capture evidence immediately** — every transfer gets a matching invoice/note/signed paper in the Notion tracker | rolling, by 30 Jun | Ben + Nic | each move | — | ☐ |

## PHASE 3 — CUTOVER (Tue 30 Jun / Wed 1 Jul)

| # | Action | By | Owner | Blocked by | Tier | Status |
|---|---|---|---|---|---|---|
| 3.1 | **CUTOVER** — sole trader stops, Pty starts. *If banking/Xero not invoice-ready → invoke Cutover Rule 2 (honest delay), keep the sole trader trading. Don't fudge dates.* | 30 Jun (target) | Ben + Nic + SL | 1.1, 2.10 | T3 | ☐ |
| 3.2 | **First Pty payrun setup** — $120K/yr each + 12% SG, payday-super cadence | first week Jul | Pty + SL | 3.1 | T3 | ☐ |
| 3.3 | **QLD payroll-tax grouping check** before first payrun (~$1.3M threshold, ACT Pty + future Harvest) | before first payrun | SL | 3.2 | T3 | ☐ |
| 3.4 | **Div 7A complying loan agreements** drafted (8.37% FY26 benchmark, ≤7yr, MYR by 30 Jun) — in place before FY26 return lodgement day | from 1 Jul | Pty + SL | 1.1 | T3 | ☐ |

## PHASE 4 — POST-EOFY (Jul → 30 Apr 2027)

| # | Action | By | Owner | Blocked by | Tier | Status |
|---|---|---|---|---|---|---|
| 4.1 | **Goodwill + plant valuation** obtained | Jul | SL + valuer | 1.1 | T3 | ☐ |
| 4.2 | **Business/goodwill transfer journals + cross-entity P&L journals** booked | Aug | SL | 4.1 | T3 | ☐ |
| 4.3 | **IP assignment deed** executed (codebases, LCAA, EL, ALMA, JusticeHub, Goods) — after IP-clause audit of grant/partnership contracts | Jul–Aug | Ben + lawyer | 0.3 | T3 | ☐ |
| 4.4 | **Contract novations** (QBE $400K, Minderoo, Goods, EL licensing) re-papered to the Pty | Jul–Aug | Ben | 0.3 | T3 | ☐ |
| 4.5 | **Final sole-trader BAS** lodged (date TBC with SL: 28 Jul self-lodge / ~25 Aug agent / 28 Oct cessation-qtr) | TBC | Nic + SL | 3.1 | T3 | ☐ |
| 4.6 | **Cancel sole-trader ABN/GST/PAYGW** — only *after* final BAS + all obligations met | after 4.5 | Nic + SL | 4.5 | T3 | ☐ |
| 4.7 | **AusIndustry FY26 R&D registration** — *hard deadline; miss = forfeit FY26 entirely* | **30 Apr 2027** | SL + R&D consultant | 1.6, 2.8 | T3 | ☐ |
| 4.8 | **World Tour Overseas Finding** (if claiming overseas R&D) | before 30 Jun 2027 | SL + R&D consultant | — | T3 | ☐ |

---

## The 5 deadlines that actually bite (in order)

1. **Fri 19 Jun** — send SL email + lock Decision 1 (unblocks the call + novations).
2. **~Wed 24 Jun** — Nic's super *sent* (fund must receive by 30 Jun). Earliest money deadline.
3. **Fri 26 Jun** — Butterfly/Goods handover.
4. **Tue 30 Jun** — R&D wages PAID (the irreversible one) + discretionary spend + GST reg + trustee resolutions + cutover.
5. **30 Apr 2027** — AusIndustry R&D registration (forfeit-the-whole-claim deadline).

## Who owns what (quick view)

- **Ben:** send SL email, lock Decision 1, KP invoices, IP deed, novations.
- **Nic:** NAB account, super contribution, drawings, seed loan, final BAS, cancel registrations.
- **Standard Ledger:** every 🔒SL ruling, valuation, journals, payroll/Div 7A/payroll-tax setup, R&D registration.
- **Lawyers:** DGR lawyer (Butterfly, by 26 Jun), IP/commercial lawyer (assignment deed + novations).

---

*Source plan: `thoughts/shared/plans/2026-06-19-eofy-money-movement-plan.md` (+ provenance). SL question email: `thoughts/shared/drafts/2026-06-19-standard-ledger-eofy-questions.md`. Command-centre items: `config/eofy-command.json` → `/eofy`. Cockpit improvement issues: #190–194.*
