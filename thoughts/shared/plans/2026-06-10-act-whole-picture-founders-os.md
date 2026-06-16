# Plan: ACT Whole-Picture Founders' Operating System

> Slug: `2026-06-10-act-whole-picture-founders-os`
> Created: 2026-06-10
> Status: draft (seeded for tonight's Ben + Nic workshop; ratified at the first monthly founders' session, Tue 7 Jul 2026)
> Owner: Ben + Nic (Ben drafts, both ratify)

> **Promotion note.** Sections marked **[CANON-READY]** get promoted once Ben and Nic agree: the theory of work to `wiki/concepts/act-theory-of-work.md`, the horizon arc to `wiki/decisions/2026-horizon-arc.md`, the role map as an update to `wiki/decisions/2026-04-founder-lanes-and-top-two-bets.md`. Everything else stays scaffolding and gets archived once shipped.

> **One artifact, not three.** The design process produced three overlapping page architectures. This plan closes that: the Notion-ready draft at `thoughts/shared/drafts/act-whole-picture-notion-2026-06-10.md` IS the single standing page ("A Curious Tractor — The Whole Picture"), a free-form Notion page (safe per `wiki/decisions/notion-page-policy.md`, not an outbound sync target), edited by Ben + Nic only, sitting above The Harvest Operating Hub and the 10-week staffing plan. This file is the full working detail behind it. No third surface gets published.

## Objective

Bring ACT's core things into one place so Ben and Nic can see their roles in the bigger system and build better ways of working: the resolved founder money engine, the system map, the theory of work, the horizon arc at 5/10/20/30 years, the weekly drumbeat, and the Witta life layer. Every verification correction from the 2026-06-10 fact-check pass is applied inline. Refuted claims are not reproduced; where a number changed, the corrected number stands and the correction is named.

---

## 1. The resolved money engine

### 1.1 The wage: $120,000 each, from the first July 2026 pay run [Verified]

**The ambiguity in Ben's memo is resolved: it is $120,000 each, not combined.** D11.2 of the 5 May 2026 Standard Ledger decisions (`thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` §11, lines 226-238, read directly) says verbatim: "Base: $10,000/month each = $120,000/year + super... + PAYG withholding", with the payroll setup task specifying "Two employees (Ben + Nic), $10K/mo + super". The founder-pay thesis (`wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md` §4) independently corroborates: Channel 1 is "$10K/mo each = $120K/yr each", with an FY27 per-founder schedule of base $120,000 + super $14,400 + draws up to $80,000, landing at ~$200-215K total economic value each, ~$400-430K combined. The ~$200-215K figures live in the thesis, not in D11.2 itself; D11.2's own phrasing is "both founders target $200K/year", meaning each.

**Top-up shape (D11.2):** cash above base is drawn during the year against the director's loan account and settled by 30 June into one of: salary bonus (with super, R&D-eligible), franked dividend through the Knight or Marchesi family trust (not R&D-eligible), or an invoice from each director's ABN.

**No founder pay through the Pty before 1 July 2026.** The Pty cannot run founder payroll in FY26 (founder-pay thesis §2). FY26 channels: Ben invoices through Knight Photography (planned, see §1.4 for the honest status), Nic's drawings get recharacterised at the cutover journal (planned, not booked). But note the correction: **ACT Pty already trades before 1 July.** The Harvest hub names ACT Pty as "the employer, the insured entity, the contract signer and the till owner" from the 20 June open day, and Denis's contract is signed by ACT Pty effective 27 June (first pay in arrears in July). "Pty dormant until cutover" is false; only founder pay waits for 1 July.

**Monthly mechanics per founder** (D11.2 + `wiki/finance/fy26-27-money-philosophy-and-plan.md` Part 3):

| Line | Amount | Note |
|---|---|---|
| Gross salary | $10,000/mo | Base runs regardless of grant timing (money rule #1) |
| PAYG withholding | ~$2,333/mo (~$28K/yr) | Remitted via activity statements |
| Net to founder | ~$7,667/mo (~$92K/yr) | |
| Super (SG 12%) | $1,200/mo ($14,400/yr) | SG is 12% from 1 Jul 2025 (ATO rate table verified 2026-06-10 in the staffing plan; the checklist's "11.5% FY26" row is stale). Payday super from 1 Jul 2026: super lands within 7 business days of each pay run, no quarterly deferral. Concessional cap $30K each leaves bonus headroom |

**Combined wage line: $268,800/yr = $22,400/mo** ($240,000 wages + $28,800 super at 12%). Uncosted on top: payroll tax exposure, workers comp premium, leave accruals; the live-baseline review estimates +5-10% on the wage line. Quantify with Standard Ledger before the first run.

**Payroll stack deadline is 26 June, not 1 July.** The same stack (ATO employer registration, STP from run 1, payday-super-ready auto-super, WorkCover Queensland, Xero Payroll) must be live for Denis's 27 June start per the staffing plan (`thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md`, task 8: "needed for founder pay regardless"). One stack serves founders and staff; there is no second payroll system to build. Payroll is processed as a single line then journal-allocated across project codes monthly by the bookkeeper from each founder's time split (D11.2).

### 1.2 Affordability: cash-neutral only if substitution actually happens, and only with top-up restraint

**Baseline cash (and ignore the scary headline).** The 2026-06-09 snapshot's "cash: −$152,230.52" is NOT ACT's position; verified live, it sums all bank accounts including the excluded NM Personal (−$375,991.57). Under the two-account rule:

- **$223,761.05 mirror cash** = NJ Marchesi T/as ACT Everyday +$288,981.73 + NAB Visa #8815 −$65,220.68 (Supabase `xero_bank_accounts`, balances synced 2026-06-05, queried live 2026-06-10).
- **~$282,189.53 statement-adjusted** [Inferred]: the card's Xero balance is known-distorted; the actual statement was $6,792.20 owing on 2026-06-02 and has not been re-verified since (8 days stale at the verification pass). The gap is ~373 statement lines still awaiting Ben's manual UI matching in Xero. The $58.4K swing decides whether the top-up gate (below) is near or far. Refresh before relying on it.

**FY26 run-rate** (alignment reports to 2026-06-07): cash in $1,591,637 vs cash out $1,451,298, net **+$140K ≈ +$12.5K/month**, and that already contains ~$242K of founder drawings.

**The drawings pattern, corrected.** The flagged drawings to Nic were **13 payments totalling $241,982, all July-November 2025** (money-state-of-play 2026-06-01, lines 83/99), roughly $48K/mo for five months and then the flagged pattern ends. "$20.2K/mo" is only the FY26 annualised average; the separate 2026-05-05 audit found ~$238K net drawn ($539K spends − $301K receives), lumpy with large reflows, not a steady monthly draw. So "wages replace a steady $20.2K/mo" is scenario arithmetic on an average, not a description of a live monthly habit.

**And "drawings go to zero" is not what D11.2 says.** The sole-trader account-880 drawings *category* ends at cutover. Founder cash extraction beyond wages explicitly continues under the director-loan label: the $200K/yr-each target ≈ $33.3K/mo combined total economic value vs the $22.4K/mo wage line. Substitution is only cash-neutral if loan-account draws are restrained, and no document commits to that restraint. The top-up gate (below) is the enforcement mechanism; tonight's decision #2 makes the restraint explicit.

**Scenario table** (straight-line scenario arithmetic on FY26 averages, not forecasts; the −$9.9K/22-month derivation appears in no canon file, it is this workstream's own arithmetic):

| Scenario | Net cash effect | Read |
|---|---|---|
| Wages replace the drawings pattern (the D11.2 design) | Incremental ≈ +$2.4K/mo super (12%) + uncosted on-costs, net ≈ +$10K/mo | The only honest case. Requires account-880 drawings to end at 30 June AND director-loan draws held to the gate |
| Wages additive (extraction continues at the old pattern on top) | +$12.5K/mo flips to ≈ −$9.9K/mo | ≈22 months on $223.8K mirror cash. The failure mode to guard, not a plan |
| $120K-combined variant | Additive ≈ +$1.3K/mo | Listed only because the memo wording was ambiguous. NOT what D11.2 settled |

**Concurrent commitments the earlier analysis missed:** the 10-week Harvest/Goods staffing plan decided today adds ~$45-50K including on-costs across the window (Denis ~$20K + ~$2.4K SG + FBT exposure, Oonchiumpa program invoice $18.5-19.3K ex-GST, Suzie $850/wk, Joey back-SG $2.5-3K; staffing plan lines 56-58, 71, 94). Carry this into any runway read.

**What carries the wage line.** FY26 cash-in averaged ≈$142K/mo; the wage line is ≈17% of FY26 cash-in (scenario arithmetic). Secured-but-unpaid over the next 12 months:

- Grants in flight **$230,000** (v_project_money_state, 2026-06-09 snapshot).
- AR **$81,750 or $164,250**: two unreconciled definitions (money-in-alignment 2026-06-07 vs snapshot amount_due). Reconcile before planning on either.
- FY26 R&D refund **$180-220K expected Sep-Dec 2026, contingent**: the range holds only if the founder personnel basis lands on paper before 30 June (§1.4). If it does not, roughly $104K of refund component evaporates with it.
- Already inside the bank numbers: $592,211.79 paid across 11 tranches / 4 funders (Grant Tranches ledger: Snow, Centrecorp, VFFF, Red Dust).

**Not bankable, with one refuted claim corrected:** QBE $400K is an application only (Sept 2026). The $2.94M weighted pipeline is weighted, not secured. **There is NO ~$709K Centrecorp remainder.** The earlier "$832K contracted vs $123,332 paid" framing was a query artifact: the amount_due=0 trap counted VOIDED and DELETED invoices as paid. Verified Centrecorp reality (`thoughts/shared/drafts/centrecorp-feb-2026-invoice-forensics.md`, `wiki/synthesis/funder-alignment-2026-05-14.md`, `wiki/narrative/funders.json`): **paid $123,332** (2 tranches, anchored by INV-0291 $85,712); **in-flight $84,700** (INV-0314 Production Plant, DRAFT 90+ days, a pending send/void/reissue-from-Pty decision, not a billed receivable); total relationship book **$208,032**. The 4 × $68,200 hundred-bed orders were the board-approval-pending application, all voided 2026-02-13, unconverted pipeline at best. The wage posture rides on the ~$230K grants-in-flight scenario, not $900K+.

**Fragility:** Voice income $501K is 95% one PICC contract; non-renewal drops Voice to ~$23K (fy26-voice-flow-gap-analysis).

**Trigger conditions (positions to confirm, arithmetic labelled):**

- **Base wage is safe when:** the substitution holds (account-880 drawings end 30 June, director-loan draws gated) AND monthly cash-in holds ≥ ~$132K/mo (FY26 cash-out ex-drawings ~$109K + wage line $22.4K; scenario arithmetic). FY26 averaged $142K/mo, clearing it with ~$10K/mo margin. Thin: one lost anchor eats the margin.
- **The base is not the staging valve; the top-ups are.** Money rule #1: no founder unpaid, $10K/mo runs first regardless of grant timing. If cash tightens, defer director-loan top-ups, never the base.
- **Top-up gate** (act-money-framework §D): Pty cash-positive after 25% tax reserve + 3-month float + green 13-week forecast. Scenario arithmetic: 3-month float at the wage-loaded run rate ≈ $395K vs $223.8K mirror cash today. **The gate is not currently met.** The R&D refund landing is what opens it; a verified new Centrecorp commitment would help but none exists today.
- **Bridge if Q1 FY27 is tight:** R&D loan finance (Radium ~80% advance at 12-15% effective, Fundsquire, NAB overdraft), triggered by red weeks on the 13-week forecast (framework §E4). Last computed 13-week projected cash: $197K (2026-06-03 ledger).
- A below-$10K staged ramp is NOT a documented option; it would be a new question for Standard Ledger, not a canon fallback.

**Gap worth closing before the SL meeting:** no document computes runway-in-months. Extend the 13-week model (`apps/command-center/src/lib/finance/ledger.ts`) to a 12-month founder-pay scenario with replace-vs-additive modes and the staffing commitments included.

### 1.3 Dividends: profit-first, franked, gated

The doctrine in plain words (act-money-framework §C4/§D, founder-pay thesis §8/§11):

- **Profits first.** Dividends are declared only after EOY when retained profits actually exist. First Pty dividend is FY27 or later. Founder salary is a cost deducted before profit (and before the five-year model's 40% community share).
- **Franking.** The Pty pays 25% company tax, building franking credits. Dividends go franked, 50/50, to the Knight Family Trust and Marchesi Family Trust (the only shareholders), which pass income + franking credits to beneficiaries at marginal rates. Unfranked dividends avoided unless the franking account is empty.
- **Trusts are passive shareholders only.** A family trust never invoices the Pty for services (trap #6: ATO re-attribution plus the company loses the deduction).
- **Div 7A.** Any director loan not settled by 30 June (bonus / dividend / repayment) and not under a written complying loan becomes a deemed unfranked dividend at marginal rates; quantified downside "up to $50K tax". Benchmark rate: framework §A2 says 8.77% for 2025-26 (canonical over the rebuttal's ~8.27%; confirm with SL). Cleaner pattern: settle everything at year-end.
- **Timing.** Annual, after accounts. Trust distribution resolutions signed before 30 June every year or the trust pays 47% (money rule #3, hard calendar item). Interim dividends are not in the canon; wanting one is a new Standard Ledger question.
- **The R&D trade.** Bonus settlement is R&D-eligible (at the founder's allocation rate, with super); dividend settlement is not. The May/June settlement choice trades franking efficiency against refund size, decided on actual numbers each year.
- **Bucket company.** Trust income above the ~$135K personal sweet spot can flow to a corporate beneficiary capped at 25%, subject to the trust deed permitting it. The deed is currently uninspected [Unverified].

**What must be TRUE before the first dividend (the standing gate):**

1. FY27 (or later) accounts show real after-tax retained profit, booked not projected.
2. The 25% tax reserve is funded and the 3-month float is in the bank.
3. The franking account has credits: company tax actually paid, not merely provisioned.
4. All director loans settled (Div 7A clean) as at 30 June.
5. Both trust deeds inspected and confirmed to permit franked-dividend streaming [Unverified today].
6. Trust distribution resolutions signed and dated before 30 June.
7. The Budget 2026-27 discretionary-trust minimum tax (from 1 July 2028) reviewed before relying on low-rate beneficiary distributions (knight-family doc guardrail).

### 1.4 The R&D interplay, with the honest status [Corrected]

Drawings are invisible to the R&DTI; salary on payroll with time-split records is what makes the wage basis claimable.

**FY26, the planned basis:** $317,500 founder personnel = Ben $237,500 (95% × $250K Knight Photography invoicing) + Nic $80,000 (40% × $200K recharacterised director salary), refund component **$138,113** at 43.5% (`wiki/finance/money-framework-decision-log-2026-04-15.md`). The realistic **total** FY26 refund (founder personnel + ~$400K directly-tagged project R&D spend) is **$180-220K** per the rebuttal (§2.9, §5.6), with $272K the optimistic ceiling. Do not conflate the component with the total: 43.5% of $317.5K is $138K, not $180-220K.

**Nothing has landed on paper yet.** Verified 2026-06-10:

- Invoices 15078-15081 **do not exist**. A direct query of the sole-trader Xero mirror returns only FY25 invoices 15076/15077; the proposal doc records "Ben confirmed invoices have NOT yet been sent." They are planned instruments (15078 $100K dated 2025-09-30; 15079/15080/15081 $50K each dated 2025-12-31 / 2026-03-31 / 2026-06-30).
- The $200K recharacterisation journal is a planned Standard Ledger journal at cutover, not booked. All D11.5 checklist boxes and the D11.4 "Book the journal entries" box are unchecked.
- The R&D decision log is still **DRAFT** (frontmatter status Draft, "pending Standard Ledger sign-off", last updated 2026-05-07).

**The collapse risk is live and double-grounded.** The 2026-06-01 command-center finding: the live rd_eligible flag was counting the raw drawings as eligible; $238,654 of $294,186 flagged spend (81%) was founder drawings, re-baselining the as-recorded founder basis to **~$55,532**, meaning ~$104K of refund was resting on drawings. The drawings were flagged excludable on TWO grounds: (a) drawings characterisation, which the journal cures; and (b) **pre-incorporation** (all 13 payments Jul-Nov 2025 pre-date the Pty's 2026-04-24 registration), which the journal does NOT cure. The pre-incorporation ground depends on the separate Path C "sole trader acting on behalf of the Pty" mapping, which itself awaits SL review; the 2026-06-01 clean-context review flagged the Knight Photography pack HOLD ("sole-trader to sole-trader, not a valid Pty R&D lever" as currently papered). Even with invoices + journal on paper by 30 June, the $317,500 basis rests on Standard Ledger signing off the cross-entity mechanics.

**Canon docs that need correcting in the same pass:** `wiki/finance/rdti-claim-strategy.md` line 20 labels the $238,654 as "Nicholas Marchesi salary" (it was drawings); no wiki/finance canon doc carries the ~$55,532 re-baseline (the thesis, rebuttal and claim-strategy all pre-date the 2026-06-01 finding).

**FY27, structural:** $120K each at 95% (Ben) / 40% (Nic) allocations ≈ $162K combined eligible personnel ≈ **~$70K refundable/yr**, rising toward ~$140K if year-end settlements lean bonus rather than dividend. Payroll makes the basis boring, which is the point.

---

## 2. The system map (current and honest, 2026-06-10)

"Held by" uses the 2026-04-10 founder-lanes decision plus today's staffing plan. Money states cite their source; where two sources disagree, both are shown.

### Entity layer

| Node | Held by | Money state (honest) | Next milestone |
|---|---|---|---|
| **A Curious Tractor Pty Ltd** (ACN 697 347 676, ABN 36 697 347 676) | Ben + Nic, 50/50 via Knight + Marchesi family trusts | Legally ready, operationally mid-stride: FY26 books are still sole-trader, but the Pty signs Denis's contract, holds the Harvest insurance and owns the till from 20 June. Payroll stack unactioned at last check. Sole R&D claimant | Payroll stack live by **26 Jun** (Denis) · 30 Jun cutover · first founder pay run wk 1 Jul |
| **Sole trader** (Nic, ABN 21 591 780 066) | Nic | Carries FY26 money; dying | Ceases trading 30 Jun · Subdiv 328-G rollover election signed before 30 Jun (rebuttal correction over 122-A) · trust resolutions by 30 Jun |
| **The Butterfly Movement Ltd** (Goods charity, DGR+PBI since 2012) | Indigenous-led board: Kristy Bloomfield, Audrey Deemal; Sonia transition | No ACT money in its books yet; becomes the Goods grants/DGR home post-handover | Stewardship handover **26 Jun 2026**; governance roster canonical (committed 2026-06-09) |
| **The Harvest Pty Ltd (forming)** | Nobody yet; landlord minority terms undrafted (D11.1) | Does not exist; ACT-HV tracking inside ACT Pty carries the allocation | Lease-name question to Standard Ledger before 1 Jul; incorporation decision at the wk-9 staffing review, Fri 28 Aug |
| **Partnerships** (PICC, Oonchiumpa, CFE, Mount Isa) | Communities. ACT is supporter, never owner | PICC +$323K to ACT FY26; Oonchiumpa +$26K; new Oonchiumpa B2B program fee $18.5-19.3K ex-GST | Oonchiumpa agreement signed before 27 Jun (deliverables framing; check labour-hire register first) |
| **CivicGraph IP** | ACT Pty (deferred spinout, trajectory 5) | $0 in ACT books, no project code | None scheduled; see horizon arc for the exit-vs-cerebellum resolution |

### The four big projects

| Node | Held by | Money state (honest) | Next milestone |
|---|---|---|---|
| **The Harvest** | Nic: the room, design, landlord/Jinibara, on-ground anchor · Ben: systems, money ops, comms sends, events · Denis incoming ops lead (27 Jun) | FY26 $171K rev / $57K exp (project rollup). The "$12.6M pipeline" is a grant watchlist at Identified stage, 0 won. Sendable list 62 (healthiest of the four) | **20 Jun open day** · 27 Jun crew start · 1 Jul lease commences |
| **JusticeHub / CONTAINED** | Ben | FY26 $118K rev / $1.1K *attributed* exp (known cost-attribution gap; true costs pool in ACT-IN). 1 won opp $28K. Sendable = 0 (consent gate working as intended) | CONTAINED network launch 10 Jun · Reintegration Conference launch wk of 22 Jun · Phase D GHL go-live |
| **Empathy Ledger** | Ben: product · Nic: storyteller relationships | Pre-revenue: 22 open opps all $0. First commercial licence prospect SMART Recovery (post-call 9 Jun). Gap-closing build (#307-309) landed in the last 48h | SMART prototype in the 90-day push · world tour 27 Jun - 7 Aug overlaps it |
| **Goods on Country** | Nic: field · Ben: systems · passing to the Butterfly board | Strongest earner: FY26 $484K rev / $280K exp = +$203K (rollup basis; the canon committed view reads $484K/$469K, see the one-money-truth item). Secured match **$758,670** (Snow $402,930 + TFN $144,558 + Centrecorp $123,332 + VFFF $50,000 + AMP $21,900 + Red Dust $15,950); tranche ledger $592,211.79 (TFN rebook + AMP sourcing still open). Largest real pipeline: 16 won $764K | **26 Jun Butterfly handover** · QBE $400K application Sept (gated on the match position) · Minderoo $900K pitch status **stale/unknown, Nic to resolve tonight** |

### Supporting systems

| Node | Held by | Money state (honest) | Next milestone |
|---|---|---|---|
| **CivicGraph (product)** | Ben | $0 revenue. Doc conflict resolved in this plan: the 2026-05-25 cerebellum ADR governs (not for sale); the rebuttal's §2.4 exit framing is unswept stale doctrine needing a retirement annotation | Quiet/background; feeds THE FIELD read-only |
| **GrantScope** | Ben | Internal tooling; PM2 orchestrator standing (172 agents); Goods funnel dashboard live | Grant triage feeding the Sept QBE window |
| **Command-center + scripts + wiki** | Ben | The operating layer; cost pools in ACT-CORE (−$266K) / ACT-IN (−$271K), which is why platforms look cheaper than they are | Operating-picture blueprint phases continue |
| **THE FIELD / GHL CRM** | Both read daily; Ben maintains | Clean substrate post Phase B (0 errors). Sendable: ACT 55 · Goods 46 · Harvest 62 · JH 0 · funders 94 never automated | Phases C-F (smart lists, comms streams, workflows) open |
| **Org frame (FY26)** | Both | ⚠ **At least four org-level FY26 nets are in circulation**: +$719K (cash rollup through May, project_monthly_financials) · +$815K (folded rollup post-cleanup) · −$222K (committed view, /finance/project-money) · −$178K (business-architecture canon table, which mislabels its committed basis as "cash basis"). One money truth must be declared and the others labelled before the page ships numbers | 30 Jun Pty cutover · payday super law 1 Jul |

---

## 3. Roles: Ben + Nic (crew-map grammar)

Derived from the documented 2026-04-10 founder-lanes decision, soul.md's verb textures ("Ben's build moves evidence. Nic's build makes rooms"), and today's Harvest hub split. Items not in a documented decision are marked **(proposed)**. Same grammar as the Harvest crew map, so one language runs the whole org.

### Ben, the system founder
*Builds the tractor: infrastructure, money engine, digital, evidence.*

| | |
|---|---|
| **Owns** | Product definition + technical architecture across all four platforms · the money engine (ledger, reconciliation, R&D evidence, payroll mechanics once live) · digital surfaces (command-center, GHL substrate, Notion pipelines, websites) · all consent-gated comms sends · packaging, positioning, paid pilots · the evidence-to-story-to-revenue bridge · event ops |
| **Decides alone** | What gets built, automated, or retired in the infrastructure · tagging/recode mechanics · list hygiene · pilot pricing drafts below the major-partnership threshold |
| **Brings to the founders' session** | The five joint items · any dollar figure going public · lane drift signals (To Us behind, Art <10%, Listen <20%) · anything touching the R&D claim narrative |
| **Never his** | The room: community relationships, Jinibara protocols, the on-ground anchor at Witta / Palm / Mparntwe · founder-rescue ops for Harvest/Farm/Goods day-to-day (documented: Ben explicitly moved OUT of this) · the landlord seat (Nic's side) · art direction of place |

### Nic, the place-and-people founder
*Drives the tractor onto Country: the room, the relationships, the art.*

| | |
|---|---|
| **Owns** | Field relationships + community pull (Kristy, Tanya, Rachel, Brodie, PICC) · place-based activation (Witta, the Harvest room, Black Cockatoo Valley, on-country) · art + experiential expression (Gold.Phone, The Confessional, dinners, the open day as experience) · the landlord/Jinibara seat: lease, land care, Country-sets-the-pace · founder-level relationship stewardship |
| **Decides alone** | How a room runs · community engagement pace (never automated, by design) · the aesthetic of place and experience · which relationships get tended this week |
| **Brings to the founders' session** | The five joint items · any commitment creating a money or legal obligation (lease, program agreement, hire) before signature **(proposed)** · community signals that should re-weight the portfolio |
| **Never his (proposed)** | Direct writes to money systems (Xero/GHL/Supabase) · comms sends · R&D evidence authorship · production deploys. These run through Ben's systems so the records hold |

### Joint only (documented, 2026-04-10)

Portfolio cuts · capital allocation · new major partnerships · handover decisions · public claims that reshape ACT's center of gravity.

**Hierarchy with the Harvest hub's gates:** the five org-level joint-only decisions are the superset; the Harvest hub's eight decision gates (spend beyond boxes, contracts/insurance, new tools, community-lane, printing prices, consent features, Harvest Pty/lease) are their 10-week-window instantiation. When in doubt on the floor, the hub's list governs. Cross-link both ways.

**(proposed) Two conflict-of-interest rules:** any lease or related-party term where Nic is landlord = joint + Standard Ledger paper at arm's-length rates; any Knight Photography invoice to ACT Pty = joint + results-based deliverable (PSI discipline). Neither founder signs alone where they sit on both sides.

---

## 4. The theory of work [CANON-READY]

> Assembled from existing canon. New material is marked **(proposed)**. When in doubt, return to `wiki/concepts/soul.md` first: "If the answer doesn't sit on top of what is in this file, the answer is wrong."

### The method
We work in a loop: **Listen → Curiosity → Action → Art**, and Art returns to Listen. It is not a framework we adopted. It is what already happens when Ben builds, Nic connects, and both make art at the end because they cannot help it. (`wiki/concepts/lcaa-method.md`)

Every dollar gets two tags: project and LCAA phase. The ratios are drift signals, not rules. Listen under 20%: we have stopped sitting in rooms before we build. Art under 10%: the work has gone quiet. Action over 50%: we are scaling rather than seeding. (`wiki/concepts/four-lanes.md`)

### The lanes
Every dollar that moves through ACT lands in one of four lanes. **To Us**: founder pay and trust distributions. **To Down**: debts, ATO, receivables. **To Grow**: reinvestment, where growth is depth not scale. **To Others**: fellowships, donations, money landing in someone else's pocket. To Us is method, not tax: custodianship over ownership only works if the custodians can keep showing up. A dollar paid to Ben to be present with his family is the same kind of dollar as a fellowship paid to a community partner. (`wiki/concepts/four-lanes.md`)

**The distinction the canon keeps:** the four lanes are where the *money* lands. Where the founders' *time* lands is the 2026-04 founder-lanes decision (§3 above). Lanes answer "where did the dollar go"; the founder-lanes decision answers "who shows up where". Collapsing them would be the page's first act of drift.

### The money doctrine: two engines, one dial
ACT earns two ways and refuses to pretend it is one. **Engine one: philanthropic partnership.** Grants and partnership work (PICC, Goods tranches, JusticeHub grants) fund the build. **Engine two: our own commercial revenue.** Voice (Empathy Ledger bespoke), Flow (CivicGraph intelligence, JusticeHub commissioned work, Goods trading), Ground (Harvest, Farm, eco-tourism). The pile mix is the dial: today grants and earners pay for platforms that do not yet pay for themselves; the work of the next five years is moving the mix until the platforms earn. Current vs target (2026-05-06 analysis): Voice $501K/24.5% (target 8%) · Flow $410K/20% (target 56%) · Ground $163K/8% (target 6%) · Grants $969K/47.3% (target 39%); the rebuttal's corrected glide is 55/35/8/2 in FY27 toward 60/25/10/5 by FY29 (see `wiki/finance/act-money-thesis-rebuttal.md` for the lane mapping). The filter on engine two: every civic-OS layer publishes ungated public-good outputs, and commissioned customers accept that before engagement. We sell the Practice layer, never the Atlas. (`wiki/concepts/act-business-architecture.md`, `wiki/finance/five-year-cashflow-model.md`, `wiki/concepts/civic-operating-system.md`)

### The founders' money engine (resolved)
$120,000 each on real payroll from 1 July 2026, top-ups by director loan settled each 30 June, dividends franked to the two family trusts only after real retained profit. Full detail in §1. This is the To Us lane made boring, which is the goal.

### The Witta life plank (documented + proposed)
The family stack is documented in `wiki/finance/knight-family-act-pay-and-entity-setup.md`; the fuller Ben + Carla income picture is design-space (§7). Proposed plank: the Witta life layer is designed inside the documented stack (separate operating entity, council-cleared, market-rate family employment), never bolted onto ACT Pty.

### The community doctrine: the field, two lanes
The community is not an audience. The Field has two lanes that never merge into one funnel. The **orbit** is the supporter lane: warmth rings, a hand-picked core, a ladder earned only through realised gives. The **constellation** is the community lane: sovereign contributors measured by what ACT owes back, never by their use to ACT. Never laddered, never scored, never dripped, worked by hand. The grammar is OCAP-holds / CARE-owes. Elder authority is a veto, not a preference. Two motions: tend the field, and leave the field to be replenished. You cannot tend from an empty well. (`wiki/concepts/the-field.md`, `wiki/concepts/ecosystem-value-exchange.md`)

### The exit doctrine: beautiful obsolescence
We build with community, transfer capability, and get unhitched. The handover test, all five before a project is complete: Can they run it without us? Modify it? Export their data anytime? Own the decisions? Is there a handover plan? If we cannot hand it over, we are still in Curiosity. Success sounds like: "ACT? We don't need them anymore." Applied to money too: standalone P&Ls, books readable by others, founders never the bottleneck. We are not building this to be inherited by family. We are building it to be handed back to the work itself. (`wiki/concepts/beautiful-obsolescence.md`)

### What's our SOP? (the literal answer)
The doctrine above is the theory; procedures accrete where the work happens. SOPs are drafted at the Harvest hub (Denis owns SOP drafting, with "SOP drafts ready to harvest" a standing weekly 1:1 item; Katrina's SOPs are co-owned with Oonchiumpa and forkable forever) and graduate to wiki runbooks when stable. The ONE PLACE links the doctrine to the place procedures actually get written.

---

## 5. The horizon arc: 5 / 10 / 20 / 30 years

> The 5-year horizon is mostly documented; the 10-year half documented; 20 and 30 are **(proposed)** extrapolations written so the founders can correct them out loud. Lock policy (decision #5): lock the 5-year and the 30-year sentence now, hold 10/20 as proposed and corrected quarterly. Ben's two named end states are carried explicitly: **JusticeHub supporting nodes across Australia on their own revenue**, and **Empathy Ledger as a preeminent storytelling tool in Australia and the world.**

### ~5 years (2031): the engines pay for themselves [mostly documented]
ACT Pty is self-sustaining on its own mix: the five-year model runs FY27 $2.6M toward FY31 $5.5M+, Voice at ~$1.05M with Empathy Ledger licensing seeded by the SMART Recovery path (~15 customers in the model), Ground at ~$1.15M with Farm and Harvest one operational unit, Flow carrying CivicGraph intelligence and JusticeHub commissioned work (`wiki/finance/five-year-cashflow-model.md`). **(proposed)** The first JusticeHub node is self-funding: grant-seeded, earning commissioned Practice revenue, passing the handover test. The Harvest holds itself inside its own Pty with the landlord profit-share waterfall. Goods is fully The Butterfly Movement's. Founder pay is boring: $120K each base + EOY settle decided on actuals each May/June. FY26 and FY27 R&D claimed through ACT Pty. **CivicGraph: the 2026-05-25 civic-cerebellum ADR governs** (later, signed by both founders; its sweep amended the five-year plan but missed the rebuttal): not for sale, not a strategic exit asset, commercially active via commissioned intelligence and advisory. The rebuttal's §2.4 Y5 exit framing ($4-10M, Division 152, ~$115K vs ~$1.2M tax) is unswept stale doctrine needing the same retirement annotation the five-year plan got; Standard Ledger quietly preserves Division 152 active-asset eligibility anyway, because the tests look back over years and the optionality is cheap. MEMORY.md still advertises the exit framing and needs the same correction.
**Ben + Nic stop doing:** founder-rescue ops on Harvest/Farm/Goods day-to-day (already decided April 2026), unpaid bespoke support, funder reports they do not believe.
**Obsolescence test:** the first platform passes all five handover questions.

### ~10 years (2036): the network runs on its own revenue [half documented, half proposed]
JusticeHub supports nodes across Australia and earns its own keep: the documented seed is the Practice layer as what commissioned work sells while the Atlas stays public and never sold. The node network shape is **(proposed)** and structurally open: federated community-owned entities modelled on Goods' documented 10-year network (Jinibara → Alice Springs → Top End / Torres Strait), or one platform with local partners. That choice is a portfolio-level joint decision, not a default. Empathy Ledger is the default storytelling-consent infrastructure in Australia: SMART the first licence, open source, designed to be forked, consent vocabulary configurable per community. Goods is a community-owned facility network run by Butterfly with production leads like Katrina. **What must be true:** every node and licensee passes the handover test; ACT's role has shifted from operator to steward and peer.
**Ben + Nic stop doing:** running platform delivery. The books are structured so the founders are not the bottleneck.
**Obsolescence test:** ACT no longer operates anything a community can run.

### ~20 years (2046): the model is no longer ours [(proposed), one documented proof]
Empathy Ledger operates at world scale through forks and licences ACT does not control; the 2026 world tour was the first deliberate planting (leaving the field to gather energy, then returning to plant it). The ACT model is replicated by people who never asked permission, which is the point. PICC is the precedent already in the books: 100% community-controlled since 2021, ACT now supplier and supporter. ACT is small again: a studio, not a holding company. (An earlier draft floated a CivicGraph-era endowment funding art/activism; that idea is **[Unverified draft]** and sits behind the cerebellum ADR, not in front of it.)
**Ben + Nic stop doing:** holding decision rights. Stewardship, story, and the occasional unhitching are the job.
**Obsolescence test:** most of today's system map has been handed over or sunset.

### ~30 years (2056): beautiful obsolescence realised [(proposed), built from canon]
Someone in a community ACT once worked with says "ACT? We don't need them anymore" and it is simply true everywhere, JusticeHub's nodes included: national, community-run, no ACT in the loop. What has been handed over: the platforms, the facilities, the nodes, the data, the decisions. What remains: the records, the stories with their consent trails intact, and two founders whose drives predate the org and survive it ("If ACT disappeared tomorrow, the drives in this file would still exist", soul.md). Ben and Nic work through art and storytelling because that is what was underneath the whole time: the picture came before the platform, the gesture came before the van. Nothing was inherited by family. It was handed back to the work itself.
**Ben + Nic stop doing:** everything except the four verbs they never could stop: listen, stay curious, make, hand it over.

### The art end state, with the honest present-day signal
Art is LCAA's highest phase ("art as the first form of revolution") and an honesty check. The drift light is blinking today: at the 2026-04 backfill, Art was 5 of 1,541 tagged rows (~$227 of spend) against the 10% threshold, with known mis-tagging (Gold.Phone, Confessional, journal print runs sitting in Action). The end state is not credible while the present-day Art line is a rounding error. The standing test, checked quarterly: **Art holds at or above 10% of spend without anyone forcing it, and at least one piece a year exists that ACT could not invoice anyone for.** An Art-lane move counts in the weekly one-move-per-lane drumbeat.

---

## 6. The weekly drumbeat

> Small enough to survive a real week. Two pieces already run on crons; the rest is packaging of documented rhythms, not new ceremony. The connective tissue (moves tagged to horizons) is the upgrade that makes the arc weekly-workable.

**Daily (already running):** the Field morning read. Where is energy flowing, where is it stuck, what do I give today, what is being given to me, an honest read of our own tanks. ≤7 actions. (`the-field-morning.html`)

**Weekly (Monday, one card, not three rituals):** the Monday money pulse already lands at 8am (`scripts/weekly-reconciliation.mjs`: four-lane snapshot, LCAA-by-spend ratio, the soul check). Fold the cross-codebase feed, the pipelines report, and the Harvest hub's Monday sweep (the third Monday ritual created this week) into a single Monday card ordered by the system map's rows, Notion read + Telegram push. One script change to an existing cron, no new data source. First occurrence: **Mon 15 Jun 2026**.

**One move per lane, each tagged to a named horizon outcome:** To Us, one founder-pay/cutover action until boring. To Down, one chase on the receivables pile. To Grow, one deepening move on a top-two bet. To Others, one give into the field with nothing attached. The tag is literal: each move names the horizon line it serves (e.g. "EL: SMART prototype demo → 5yr EL licensing"). Each founder works their own lane; anything joint waits for the session. Close with the Social Soil Canvas: one decision, one pattern, one proof line.

**Monthly (founders' session, owns the page):** first Tuesday, starting **Tue 7 Jul 2026** (payroll run 1 and the crew's week 2 as live agenda items; tonight seeds the page, it does not replace this). Fixed agenda: the operating-picture blueprint's six founder questions read off the page → lane drift signals (To Us behind? Art <10%? Listen <20%?) → one leading indicator per horizon line → joint-only decisions queued by either founder → one entity/structure item moved or consciously parked → promote-or-keep on each prose block. 90 minutes.

**Quarterly (one sitting, three checks):** the R&D quarterly grade already runs on cron. Add: re-read the horizon arc and correct one paragraph; run the five-question handover test on exactly one project; check the pile-mix dial against the five-year line. If the quarter forced more than that, the drumbeat was too big.

**Who updates what:** scripts own every number on their existing cadences; the monthly session owns the prose; weekly the page is read-only. **Promotion rule:** a prose block that survives two consecutive monthly sessions unchanged is evidence, not scaffolding; promote it to the wiki targets named in the promotion note and keep only a link on the page.

---

## 7. The Witta life layer

Anchor doc: `wiki/finance/knight-family-act-pay-and-entity-setup.md` (2026-05-31, status working-synthesis, explicitly not advice; Standard Ledger review required before implementing anything).

**Household facts as documented:** **Carla is Ben's wife** (documented spelling Carla; "Carla Knight" in energy-orbit.md), a part-time nurse on ~$60K/yr, kept primarily on her separate PAYG nurse income unless ACT/Harvest/Farm/Knight Photography genuinely needs her work. Two daughters, 13 and 14. The finance doc deliberately leaves the daughters' names open pending trust-deed confirmation; soul.md and four-lanes.md say Pollyanna and Jolie; `wiki/finance/fy26-27-money-philosophy-and-plan.md` wrongly calls Cameron "Ben's partner", a direct contradiction of the family doc. **This plan asserts no daughter names.** Ben confirms the names once and four-lanes.md, soul.md and fy26-27-money-philosophy-and-plan.md get corrected in one pass (the Oonchiumpa/"Ntumba" lesson applies). ⚠ Carla is Ben's partner. Katrina (Trina) is a Goods trainee. Never conflate them.

**The streams, one row each, with routing and a dated decide-or-defer:**

| Stream | Legal home | Status | Gate / flags | Decide-or-defer |
|---|---|---|---|---|
| Ben's ACT work (incl. Harvest work as founder) | ACT Pty salary from 1 Jul 2026 | **Documented** (D11.2; salary is "the cleanest answer to PSI risk") | None | Settled |
| Ben's photography / media / storytelling | Knight Photography | **Documented with conditions** | Real media work only, arm's-length, market-priced. PSI: KP invoicing only ACT likely fails the unrelated-clients test (rebuttal §2.8), so income lands on Ben at marginal rates either way. KP can never hold an R&DTI claim (only a body corporate can; photography is arts-excluded besides). **Legal form unresolved:** partnership (Ben + Carla, user-stated) vs sole trader (older docs); both versions unverified, no KP ABN in the repo. (Housekeeping: rebuttal §2.8's PSB terminology is inverted; fix the line before SL reads it) | SL item, pre-30-Jun (blocks Inv 15078 + GST registration) |
| Conservation work at Black Cockatoo Valley | None exists for Ben + Carla | **Design-space** | BCV is ACT Farm's 150-acre site on Jinibara Country, on Nic-side land (lessor open: Nic personally vs a to-be-established Marchesi land trust). No document ties conservation work to Ben + Carla as an income stream | Candidate home = future Farm/Harvest operating entity; design question on the pre-1-Jul SL agenda, shape decided at the 7 Jul session |
| Accommodation (stays) | Receiving entity **undocumented** | **Live revenue, no documented home** (Pink Cabin $210/night, Train Carriage $190/night, $45 clean, 2-night min; `wiki/projects/act-farm/experiences/stays.md`) | Designed home per the family doc = a separate Harvest/Farm operating entity, standalone P&L, arm's-length with ACT. Hard gate: **no accommodation expansion before Sunshine Coast Council planning is resolved** | Interim ruling NOW on which entity banks the live stays revenue (SL agenda, pre-1-Jul); entity formation deferred until council + lessor + lease resolved |
| Experiences / workshops / retreats | Future Farm/Harvest entity | **Design-space** | Catalog exists (residencies, retreats, June's Patch). Carla facilitation is a listed potential role only, gated on the full evidence pack: contract, role description, timesheets, payslips, market-rate basis, work product | Defer; revisit when a genuine program need exists |
| Carla at The Harvest / Witta operations | Entity that receives the benefit | **Design-space** | Same evidence-pack gate, market-equivalent hours/pay. The Harvest site is leased from owner Grant (16 Feb 2026), not owned | Status quo (PAYG nurse income) for FY27 unless a real rostered need appears; template question to SL |
| Charity money (Goods = Butterfly; A Kind Tractor) | Walled off | **Hard exclusion** | DGR funds never subsidise family land, accommodation assets, private living costs, or Harvest trading losses | Standing rule, no decision needed |
| The Witta property itself | Personal/joint likely better for the principal-residence component | **Aspiration** ("near-term Witta deposit") | Duty / land tax / CGT / lending tradeoffs unconfirmed; the five-year model's $770K-$1M deposit path is a 2026-04-12 draft superseded on pay numbers by D11.2 | SL analysis item, no deadline; before any contract |

**Honest gap list (nothing here is designed yet):** KP legal form; both trust deeds uninspected (beneficiary class, streaming powers, bucket-company permission); whether Carla or either daughter will actually work, for which entity, at what rate; Witta ownership structure; the council planning gate; the Farm lessor identity; which entity banks the live BCV stays revenue today. PSI/PSB caution throughout (ATO PCG 2025/5): qualifying as a personal services business does not make income-splitting low-risk; never use dividends or trust distributions to disguise underpaid personal-exertion income.

---

## 8. Ways-of-working upgrades (grounded, dated)

Each reuses a pipeline that already exists; none builds new infrastructure.

1. **The monthly founders' session with THE ONE PLACE as its standing agenda.** Replaces ad-hoc workshop nights and decision-by-accumulation. Agenda fixed in §6. Effort: 90 min/month + a half-day page build, mostly linking existing surfaces. First occurrence: **Tue 7 Jul 2026**. Tonight seeds the page.
2. **One weekly read across all projects, folded from existing feeds.** Cross-codebase feed + pipelines report + Monday four-lanes digest + Harvest Monday sweep into one Monday card. Effort: one script change to an existing cron. First occurrence: **Mon 15 Jun 2026**.
3. **The delegation grammar rolled out to every lead.** Every person or partner holding a node gets the founders' four-line card: owns / decides alone / brings to the session / never theirs. Immediate instances from the 10-week plan: Denis (contract pack, w/c 22 Jun, before the 27 Jun start), Oonchiumpa (the card IS the deliverables framing the B2B agreement needs, before 27 Jun), Butterfly board (handover pack, 26 Jun), Joey and Suzie (regularisation paper, same sweep). First occurrence: **w/c 22 Jun 2026**.
4. **A single decision log.** Any joint-only decision lands in `wiki/decisions/` within 24h (the decision skill drafts these); THE ONE PLACE links the latest ten; the monthly session reviews the log instead of reconstructing history. First occurrence: **tonight, 10 Jun 2026**; whatever Ben and Nic settle is entry one.
5. **SOPs accrete where the work happens.** Denis drafts at the Harvest hub, the weekly 1:1 harvests them, stable ones graduate to wiki runbooks. One line on the page links doctrine to procedure.
6. **The pile-mix dial gets live sources, links only:** Grants → Grant Tranches DB + GHL opportunities; philanthropy in flight → Minderoo / QBE one-liners with dates; corporate revenue → the Harvest Monday sweep takings line. No synced figures to go stale.

---

## 9. The Standard Ledger question list

**Wage + payroll (confirm before the first run; stack live by 26 Jun for Denis):**
1. Confirm D11.2 implementation: $10,000/mo gross each from the first July 2026 pay run; fortnightly vs monthly cycle recommendation; stapled vs default super fund; payday-super 7-business-day cash-timing setup; WorkCover Queensland registration; STP from run 1.
2. Settle the open Week-5 checkbox: FY26 founder pay catch-up, pay through the Pty post-cutover only vs backdate via invoice from each founder's ABN.
3. Nic's fair-market salary for the recharacterisation journal: $200K (conservative; R&D-eligible $80,000) vs $238K (full net drawings; R&D-eligible $95,200).
4. Counter-sign the R&D decision log (Ben 95% / Nic 40%, per-project split), due by 30 June, still DRAFT at 2026-06-10. Reconcile the $317,500 founder personnel basis against the ~$55,532 drawings-excluded re-baseline so one number goes to lodgement, **including the pre-incorporation ground** (the journal cures the drawings characterisation only; the Path C "acting on behalf of the Pty" mapping must carry the rest).
5. Confirm the Path C AusIndustry registration mechanic (the Pty registering FY26 activities pre-dating its 24 Apr 2026 incorporation). Currently [Unverified]; blocks the claim.
6. Quantify payroll on-costs on the $268,800 line: payroll tax exposure, workers comp premium, leave accruals (live-baseline estimate +5-10%), plus the 10-week staffing on-costs already committed.

**Cutover + dividends:**
7. Subdiv 328-G election (not 122-A; rebuttal correction) signed by both parties before 30 June 2026; confirm whether 328-G preserves the active-asset clock for future Division 152 concessions.
8. Dividend timing: confirm annual-after-accounts as the operating doctrine; whether an interim dividend is ever appropriate here; year-1 franking-account mechanics.
9. Div 7A: confirm the benchmark rate (framework 8.77% vs rebuttal ~8.27% for 2025-26); standing instruction that all director loans settle by 30 June.
10. Inspect both trust deeds: franked-dividend streaming powers, corporate-beneficiary permission, beneficiary class; confirm the daughters' names against the deed before any paperwork.

**Witta layer:**
11. Knight Photography legal form on paper (partnership Ben + Carla vs sole-trader ABN), via ABR; draft post-cutover KP contracts as results-based deliverables; GST registration backdated to 1 Jul 2025 if advised (credit on planned Inv 15078 alone = $9,090.91).
12. Which entity should bank the live BCV stays revenue today; design of the Harvest/Farm operating entity (standalone P&L, arm's-length with ACT); Farm lessor identity (Nic personally vs Marchesi land trust) and lease terms.
13. Witta property ownership for the principal-residence component (personal/joint vs other) with duty / land tax / CGT / lending analysis.
14. Carla + children employment template: evidence pack and market-rate basis if/when a role becomes real; QLD child-employment compliance; no trust distributions to minors unless the deed confirms.

**Harvest:**
15. Lease name before 1 Jul: ACT Pty with an assignment right to the future Harvest Pty (recommended) vs shell Pty vs delay.

**World tour (27 Jun - 7 Aug 2026):**
16. Apportionment review across CT-RD / CT-BIZ / KP-BIZ / PRIVATE / MIXED with the trip straddling the FY line (27-30 Jun = FY25-26); the AusIndustry Overseas Finding path (due 30 Jun 2027); confirm KP stays minimal/mostly-private on the trip.

**Bookkeeper-adjacent, before the meeting:** reconcile the two AR definitions ($81,750 vs $164,250); confirm the Centrecorp position as verified (paid $123,332; INV-0314 $84,700 DRAFT pending a send/void/reissue decision; **no further contracted amount exists**, the $832K figure was a voided-invoice query artifact); re-verify the NAB Visa #8815 statement balance (last sighted $6,792.20 owing, 2026-06-02).

---

## 10. Full decision list

### Decide with Nic (tonight seeds; the 7 Jul session ratifies)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| N1 | Ratify the wage as designed: $10K/mo gross EACH from the first July pay run | As designed (D11.2) · staged ramp (undocumented deviation) · defer | As designed. It is the settled 5 May structure, near-cash-neutral under substitution, and money rule #1 makes the base the floor |
| N2 | Drawings end + top-up restraint | Hard stop on account-880 drawings at 30 June with an agreed annual director-loan ceiling · taper | Hard stop, AND say the ceiling out loud: D11.2's $200K-each target means draws continue by design (~$33K/mo combined if fully used vs the $22.4K/mo wage line), so cash-neutrality is a restraint commitment, not an automatic outcome. The top-up gate (25% reserve + 3-month float + green 13-week) is the test |
| N3 | One money truth | Declare the cash-basis rollup canonical for the page and label the committed view · vice versa | Pick one basis at the session with the four nets on the table (+$719K, +$815K, −$222K, −$178K), then fix the business-architecture table's "cash basis" mislabel in the same pass |
| N4 | CivicGraph story in the arc | Cerebellum ADR governs · rebuttal exit governs · hold both | Hold both, ADR on top: the ADR (later, signed) writes the narrative; Standard Ledger quietly preserves Division 152 active-asset positioning as cheap optionality. Add the retirement annotation to the rebuttal and correct MEMORY.md |
| N5 | How much arc is doctrine | Lock all four horizons · lock 5yr + the 30yr sentence, hold 10/20 as proposed, corrected quarterly | The latter. Doctrine that pretends to know 2046 will be ignored by 2027. The JusticeHub node-network structural choice (federated entities vs one platform with partners) stays explicitly open |
| N6 | Where THE ONE PLACE lives + who edits | Notion free-form page, Ben + Nic edit, numbers by link only · wiki-only · command-center page | Notion free-form, per the 4-surface model and notion-page-policy; the promotion rule moves settled doctrine to wiki canon |
| N7 | Founders' session cadence | Monthly first Tuesday from 7 Jul 2026 · weekly fold-in · quarterly | Monthly. Weekly is for reading, quarterly is too slow across a cutover, a handover, a launch and a world tour inside 30 days |
| N8 | Family names | Confirm Carla + the daughters' names once; correct four-lanes.md, soul.md, fy26-27-money-philosophy-and-plan.md in one pass | Do it this week; a standing founders' page must not propagate name drift (the Oonchiumpa lesson) |
| N9 | Minderoo $900K pitch status | Nic states it tonight · leave stale | Nic states it tonight; the map does not ship with a guessed status |
| N10 | Witta interim ruling | Decide now where the live BCV stays revenue banks (then defer entity formation) · defer everything | Make the banking ruling now via SL item 12; live revenue with no documented home bites at BAS and R&D audit time. Carla stays status quo (PAYG) until a genuine evidence-packed role exists |
| N11 | Time-split anchor on the page | Four lanes as the founder time split · keep the canon separation | Keep the separation: lanes = where money lands; the 2026-04 founder-lanes decision = who shows up where. One linking line, never collapsed |
| N12 | Decision log convention | wiki/decisions/ within 24h of any joint decision, page links latest ten · status quo | Adopt tonight; tonight's outcomes are entry one |
| N13 | Year-end settlement default posture | Bonus (R&D-eligible) · franked dividend (gated, not R&D-eligible) · ABN invoice (entangled with KP form) | Lean bonus while R&D intensity is high and the dividend gates are unmet; revisit annually with SL on actuals |
| N14 | Build the 12-month founder-pay scenario model before the SL meeting | Extend ledger.ts with replace-vs-additive modes + staffing commitments · rely on straight-line arithmetic | Build it. No doc computes runway-in-months; walking in with a real forecast turns assertion into evidence |

### Ask Standard Ledger (the §9 list, headline items)

| # | Decision | Recommendation |
|---|---|---|
| S1 | Payroll implementation pack, stack live by 26 Jun | Confirm cycle, fund, payday-super setup, WorkCover, STP; quantify on-costs |
| S2 | Nic's recharacterisation figure ($200K vs $238K) + R&D decision-log counter-signature + one reconciled basis number (incl. the pre-incorporation ground) | Present both figures with the audit trail; default $200K unless SL will defend $238K as fair-market |
| S3 | Path C registration mechanic for pre-incorporation FY26 activities | Must be confirmed before lodgement reliance; currently the biggest single [Unverified] on the claim |
| S4 | Subdiv 328-G election before 30 Jun; Div 152 clock | Sign before cutover |
| S5 | Dividend doctrine + Div 7A rate (8.77% vs 8.27%) | Annual after accounts; loans settle by 30 June, standing |
| S6 | Trust deeds inspection (streaming, bucket company, beneficiaries, names) | Before any dividend paperwork |
| S7 | KP legal form via ABR + GST backdating + results-based contracts | Blocks Inv 15078; resolve before raising it |
| S8 | Witta routing: BCV stays banking entity now; operating-entity design, Farm lessor, property ownership later | Interim ruling now, formation deferred |
| S9 | Harvest lease name | ACT Pty with assignment right to the future Harvest Pty |
| S10 | World-tour apportionment + Overseas Finding (due 30 Jun 2027) | Review with the FY-line straddle in view |

---

## 11. Unverified / open (honest)

- **[Unverified] NAB Visa #8815 statement balance.** Last sighted $6,792.20 owing (2026-06-02); mirror reads −$65,220.68 (synced 2026-06-05). ~373 statement lines await manual UI matching. Swings stated cash $223.8K ↔ ~$282K.
- **[Open] AR definition.** $81,750 vs $164,250; two definitions, unreconciled.
- **[Stale/Unknown] Minderoo $900K/3yr pitch status.** No record newer than ~47 days. Nic resolves verbally tonight.
- **[Unverified] Knight Photography legal form.** Partnership (Ben + Carla, user-stated) vs sole trader (older docs); no KP ABN in the repo to check. Both versions unverified.
- **[Unverified] Both trust deeds.** Never inspected: streaming powers, bucket-company permission, beneficiary class, the daughters' names.
- **[Open] Farm lessor identity.** Nic personally vs a to-be-established Marchesi land trust.
- **[Open] BCV stays revenue banking entity.** Live revenue, no documented home.
- **[Open] Family names drift.** fy26-27-money-philosophy-and-plan.md calls Cameron "Ben's partner" (wrong per the family doc); four-lanes.md/soul.md name Pollyanna and Jolie; the family doc deliberately leaves names open. One confirmation pass needed.
- **[Open] One money truth.** Four FY26 org nets in circulation; the business-architecture table mislabels its basis.
- **[Open] Canon corrections queue.** Rebuttal §2.4/§3.1/§5.2 need the cerebellum retirement annotation; rebuttal §2.8 PSB terminology inverted; rdti-claim-strategy.md line 20 mislabels drawings as salary; no canon doc carries the ~$55,532 re-baseline; MEMORY.md still advertises the Div 152 exit framing.
- **[Unverified] Path C registration mechanic** for pre-incorporation activities.
- **[Scenario arithmetic, not canon]** the −$9.9K/mo additive case, the ≈22-month read, the ~$395K 3-month float, the ≥$132K/mo cash-in trigger: all this workstream's own derivations on FY26 straight-line averages, labelled as such wherever they appear.
- **[Inferred] R&D refund range $180-220K** is conditional on the basis landing on paper and SL sign-off; the as-recorded basis today supports roughly $104K less on the founder component.

---

## Task Ledger

- [x] Resolve $120K each-vs-combined from canon (each; D11.2 verbatim)
- [x] Apply all 10 verification verdicts inline; remove the refuted Centrecorp $709K claim
- [x] Merge three page architectures into one artifact (the Notion draft)
- [x] Fold all 10 gap fixes (JH/EL horizon end states, drumbeat-arc tissue, Witta streams table, 12% SG, staffing commitments, 26 Jun payroll deadline, Pty-already-trading rewording, art block, SOP line, joint-gates hierarchy, pile-mix links)
- [ ] Tonight: Ben + Nic workshop seeds the page; decisions N1-N13 opened
- [ ] This week: family-names confirmation pass (N8); 12-month scenario model (N14)
- [ ] Pre-26 Jun: payroll stack live; SL questions S1-S10 booked
- [ ] 7 Jul: first monthly founders' session ratifies; promotion clock starts

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-06-10 | The Notion draft is the single artifact; no third surface | Theme (b) "one place" defeated by three competing designs otherwise | Yes |
| 2026-06-10 | Cerebellum ADR governs CivicGraph narrative; Div 152 positioning preserved quietly | Later, signed ADR beats earlier projection; optionality is cheap | Yes |
| 2026-06-10 | No daughter names asserted anywhere in either file | Names conflict across three docs; verify-names rule | Yes |
| 2026-06-10 | Centrecorp stated as $123,332 paid + $84,700 DRAFT decision; $709K remainder never reproduced | Refuted: query artifact counting voided/deleted invoices | n/a |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| $120K EACH (D11.2) | Confirmed | Checklist §11 lines 226-238 + thesis §4, read directly | 2026-06-10 |
| FY26 R&D basis "landed" | Corrected: nothing on paper | Xero mirror query (15078-81 absent); unchecked checklist boxes; DRAFT decision log; pre-incorporation ground uncured by journal | 2026-06-10 |
| Drawings "stop at 30 June, go to zero" | Corrected: planned not actual; 13 payments were Jul-Nov 2025; director-loan draws continue by design; super +$2.4K/mo at 12% | money-state-of-play lines 83/99; D11.2 lines 226-238 | 2026-06-10 |
| NAB Visa mirror −$65,220.68 vs statement $6,792.20 (2026-06-02, not re-verified) | Confirmed | Live xero_bank_accounts query + handoff PM-4 entry | 2026-06-10 |
| Centrecorp ~$709K remainder | REFUTED | Invoice forensics + funder-alignment + funders.json: voided-invoice artifact; book $208,032 | 2026-06-10 |
| KP legal-form conflict real and unresolved | Confirmed | Family doc line 36 + provenance sidecars + thesis docs | 2026-06-10 |
| CivicGraph canon contradiction; ADR later + signed, rebuttal unswept | Confirmed | ADR lines 12/44; rebuttal git log (single commit 17a74e7) | 2026-06-10 |
| Carla/family facts user-provided + name drift | Confirmed (worse: fy26-27 doc contradicts) | Family doc lines 31-39; four-lanes.md:110; soul.md:47; philosophy doc | 2026-06-10 |
| FY26 rollup contradiction | Confirmed (four nets, not two; canon basis mislabelled) | Handoff lines 45/51/123/195; canon table + git log | 2026-06-10 |
| $317,500 → $180-220K pairing | Corrected: component vs total conflation; $138,113 is the component figure | Decision log lines 32-33; rebuttal 228/387-388; framework line 73 | 2026-06-10 |

## Changelog

### 2026-06-10 — Synthesis round

**Objective:** One founders' operating document from three designs + 10 verdicts + 10 gaps.
**Changed:** This plan + the Notion-ready draft written; merge directive issued; all corrections applied inline.
**Verified:** See Verification Log; all dollar figures carry sources.
**Failed/Learned:** The earlier designs each restated canon numbers without the 2026-06-01 R&D re-baseline; conflation of refund component with total was the subtlest error.
**Blockers:** None for the documents. The money engine itself is blocked on SL items S1-S4 and the family-names pass.
**Next:** Tonight's workshop seeds the page; Ben books Standard Ledger with §9.

---

## Provenance

- **Data sources queried (by the verification pass, 2026-06-10):** Supabase mirror `xero_bank_accounts` + `xero_invoices` (project tednluwflfhxyucgwigh, live); `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`; `wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md`; `wiki/finance/act-money-thesis-rebuttal.md`; `wiki/finance/act-money-framework.md`; `wiki/finance/money-framework-decision-log-2026-04-15.md`; `wiki/finance/knight-family-act-pay-and-entity-setup.md` (+ provenance sidecar); `wiki/finance/fy26-27-money-philosophy-and-plan.md`; `wiki/finance/rdti-claim-strategy.md`; `thoughts/shared/handoffs/money-state-of-play/current.md`; `thoughts/shared/drafts/centrecorp-feb-2026-invoice-forensics.md`; `wiki/synthesis/funder-alignment-2026-05-14.md`; `wiki/narrative/funders.json`; `wiki/decisions/2026-05-25-civic-cerebellum-reframe.md`; `wiki/concepts/` (soul, lcaa-method, four-lanes, beautiful-obsolescence, the-field, civic-operating-system, act-business-architecture, ecosystem-value-exchange); `thoughts/shared/plans/2026-06-10-harvest-goods-10-week-staffing-alignment.md`; `thoughts/shared/drafts/harvest-operating-hub-notion-2026-06-10.md`; alignment reports to 2026-06-07; 2026-06-09 money snapshot.
- **Date range:** FY26 (Jul 2025 - Jun 2026) actuals to 2026-06-09; balances synced 2026-06-05; statement sighted 2026-06-02.
- **Unverified assumptions:** listed exhaustively in §11.
- **Generated by:** hybrid (subagent synthesis over three design passes + an adversarial verification pass; Ben + Nic to ratify).
