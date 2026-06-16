# Plan: Harvest / Goods 10-Week Staffing Alignment (27 Jun to ~4 Sep 2026)

> Slug: `2026-06-10-harvest-goods-10-week-staffing-alignment`
> Created: 2026-06-10
> Status: draft (decision document for Ben + Nic; nothing in here has been actioned externally)
> Owner: Ben + Nic (day-shift decisions); Standard Ledger for the tax/employment rulings
> Provenance sidecar: `2026-06-10-harvest-goods-10-week-staffing-alignment.provenance.md`

Everything in this document is a recommendation. No Xero, GHL, Notion, email or other external write has been made. Every external action below is a day-shift human step.

---

## 1. Executive summary

Run the whole 10-week engagement through **A Curious Tractor Pty Ltd**. Never the dying sole trader, never The Butterfly Movement Ltd in this window, and no new Harvest Pty mid-engagement.

- **Denis** goes on ACT Pty payroll as a 10-week fixed-term employee. At $2,000/wk full-time directed work in ACT's own hospitality operation, the contractor route is not defensible: super is owed anyway under the SG Act's labour-contract deeming, and the payroll stack has to exist by 1 July for founder pay regardless.
- **Katrina (Trina)** routes through a genuine business-to-business program agreement with **Oonchiumpa**: Oonchiumpa employs its own person, ACT Pty pays milestone fees against the week 3/6/9/final reviews. Structured as Oonchiumpa delivering its own program, never as supply of a worker (QLD labour-hire licensing is the trap, with corporate fines to $500,700).
- **Accept Katrina's $1,500/wk minimum**, priced as full cost recovery in the Oonchiumpa fee. The written proposal was hourly-fair but weekly-unlivable, and she is the future Mparntwe production lead. Settle it before day 1.
- **Joey and Suzie get regularised** in the same sweep: 12% super starts on Joey's labour bills now (back-position to Standard Ledger), and Suzie's budgeted $850/wk arrangement gets paper.

**Three things to decide this week:** (1) Katrina at $1,500/wk, settled with Kristy Bloomfield and Tanya Turner before she travels. (2) Denis as employee, which means starting PAYG-W / STP / WorkCover / payroll setup immediately. (3) No Harvest Pty now and no Butterfly money or signatures in this window; the lease-name question goes to Standard Ledger before 1 July.

**Total 10-week cost, new hires, including on-costs and in-kind** (computed; wage figures from the brief, 12% SG from the ATO rate table, org loading is a design parameter):
at Trina $1,000/wk: cash ~$35,000 to $35,900, all-in with the ~$6,000 accommodation/car package ~$41,000 to $41,900.
At Trina $1,500/wk: cash ~$41,200 to $42,300, all-in ~$47,200 to $48,300.
Plus roughly $2,700 to $2,900 of FBT if Denis's housing is left unmitigated; the design below takes that to zero.

---

## 2. The people

| Person | Role | Hours | Cash | Benefits | Entity + form (recommended) | Project code | Key risk |
|---|---|---|---|---|---|---|---|
| **Katrina (Trina)** | Bed Production Trainee Supervisor; future Mparntwe production lead for Goods Stretch Beds | ~half-time (~19h assumed, unconfirmed) | $1,000/wk written, $1,500/wk her stated minimum (brief) | Room + shared car, ~$300/wk value (brief) | Oonchiumpa engages her; ACT Pty pays Oonchiumpa milestone program fees | ACT-GD | Pay gap unresolved at day 1; labour-hire licensing if the agreement reads as supply of a worker |
| **Denis** | Hospitality Supervisor / Harvest Operations Lead: shop opening, SOPs, venue ops, supplier coordination, revenue experiments | Full-time, Thu-Sun focus | $2,000/wk (brief); ABN status unknown | Room + shared car, ~$300/wk value (brief) | ACT Pty employee, fixed-term 10 weeks (the proposal said invoiced; see §3) | ACT-HV | Misclassification + SG owed regardless; housing FBT; payroll stack not yet live |
| **Joey (Joseph Kirmos)** | Bed production + general handyman, existing | Not formally documented | ~$4,500/mo via ACCPAY bills; six mirror bills total $25,237.50 incl. one voided $4,500 duplicate, so ~$20,737.50 live (xero_invoices mirror, computed) | Lives at farm, free rent, no written agreement | ACT Pty contractor today; SG Act s 12(3) deemed-employee super likely applies | 50/50 ACT-GD / ACT-HV (stamped precedent) | Unpaid back-SG roughly $2,490 to $3,029 (computed range, see §4); INV-004 $4,500 shows unpaid in the mirror |
| **Suzie** | Harvest garden support + shop supplier liaison, existing | ~40h/wk basis per budget (config/harvest-budget.json) | $850/wk fixed contractor, ~$21.25/hr equivalent, budgeted in config/harvest-budget.json; payments not yet evidenced in the Xero mirror as of 2026-05-26 | Lives at farm, free rent, no written agreement | Regularise: documented genuine volunteer arrangement or casual employee for rostered hours | ACT-HV | Rent-for-work pattern is the in-kind-wages / FBT trap; her rate sits well below both newcomers |

Note the spelling drift: "Suzie" in config, "Susie" in the SOPs and harvest-stage-budget plan. Same Witta steward, full name Suzanne "Suzie" Zemek — her own email handle is suz.zemek@, and the "Suzie Zemek" Dext expense lines (car parking, flights, Sunnymead Hotel) are her own costs, not a separate vendor. Distinct only from Suzie Ma (Alice Springs storyteller). (Corrected 2026-06-10: verification refuted the earlier "separate vendor" note.)

---

## 3. Entity routing and the timing collisions

Confidence labels follow the verification rules: **Verified** means a primary source or verdict backs it, **Inferred** means derived, **Unverified** means taken on faith.

### The recommendation

**ACT Pty Ltd engages everyone, from day 1.** Trina's lane is a B2B agreement between ACT Pty and Oonchiumpa.

**Why not the sole trader (27 to 30 Jun sliver).** Three days of new obligations on a dying ABN would mean PAYG-W/STP/WorkCover registrations on Nic's sole trader followed by an employee transfer on 1 July. Nothing forces it: Denis's contract is signed by ACT Pty effective 27 June with the first pay run in arrears in July, and Trina's first milestone invoice lands at the week-3 review in mid-July. No payment ever touches the sole trader. (Mechanics: Inferred from the cutover checklist rules; the legal capacity of ACT Pty is Verified: ACN 697 347 676 registered 24 Apr 2026, ABN 36 697 347 676 from 1 Jun 2026, per act-core-facts.)

**The catch: ACT Pty is legally ready but operationally not.** Section 7 of the entity-migration checklist (PAYG-W, STP, super clearing house, WorkCover, award, contracts, Xero Payroll) was entirely unactioned at last verification 2026-05-08, and the mirror has no payroll tables at all (**Verified**: checklist frontmatter + information_schema). Three further facts sharpen the runway:

- **Payday super is enacted law commencing 1 Jul 2026** (**Verified**: Treasury Laws Amendment (Payday Superannuation) Act 2025; ATO + FWO pages fetched 2026-06-10). Any first pay run in July must get SG into the employee's fund within 7 business days of payday. Quarterly is gone.
- **The ATO Small Business Super Clearing House retires 1 Jul 2026** (**Verified**, same sources). The checklist's "set up clearing house" item must mean Xero auto-super or a commercial clearing house.
- **SG is already 12%**, from 1 Jul 2025 (**Verified**: ATO super guarantee rate table fetched 2026-06-10). The checklist's "11.5% FY26" row is stale; fix it.

**Fallback:** if the payroll stack is not live by Friday 26 June, shift Denis's start to Wednesday 1 July. Do not bridge with unpaid days (that creates the volunteer-versus-worker problem) and do not bridge via the sole trader.

### Why Denis is an employee, stated precisely

The two tests are different and neither "deems" him at any pay rate (**Verified** correction, FWO + TR 2023/4 fetched 2026-06-10):

- Fair Work Act s 15AA (from 26 Aug 2024, applies to a Pty Ltd) looks at the real substance and practical reality of the whole relationship.
- TR 2023/4 applies the contract-rights test from Personnel Contracting: only the legal rights and obligations in the contract, so a tightly drafted contractor contract has more defensive room there than under Fair Work. Which is exactly why relying on a contract label is unsafe for Fair Work purposes.

Denis's fact pattern (full-time, directed, time-paid weekly, working inside ACT's hospitality operation, no delegation, accommodation and car provided) displays every classic employee indicium under both tests. It is an evaluative outcome, not automatic, and the likely characterisation is employee under both (**Inferred**, strongly). Even on a contractor label, SG Act s 12(3) almost certainly deems SG payable on a labour-only personal contract (**Verified**: ATO QC 33854), the sham-contracting provisions (FW Act ss 357-359) apply to a misclassification, and an unknown ABN means mandatory 47% withholding on payments if he has none (**Verified**, ATO). The high-income contractor opt-out exists (s 15AB) but ~$104K annualised sits well below the threshold (threshold figure itself **Unverified**).

The contractor route buys nothing. Marginal cost of doing it properly: $2,400 SG (computed: $20,000 x 12%, ATO rate), a small WorkCover premium (estimate $300 to $600, **Unverified**), and payroll admin that founder pay needs by Day 0 anyway. **Get Standard Ledger's written confirmation before contracts are issued.**

### Harvest Pty: not now, define the trigger

Do not incorporate mid-engagement. The landlord minority-shareholder terms are entirely undrafted (D11.1), and a second company, Xero file and payroll during a 10-week sprint is overhead with no protection. ACT-HV tracking inside ACT Pty already carries the allocation (FY26 two-account bank spend $95,159.48 on ACT-HV; xero_transactions mirror, **Verified** against the mirror).

One real tension: the strategy docs want the Harvest lease in the subsidiary's name and the lease operations commence 1 July 2026 (Harvest repo context). Either a dormant shell holds the lease (no payroll, no trading) or ACT Pty takes it with an assignment right. **Decide with Standard Ledger before 1 July.** Don't let staffing force entity timing, and don't let the lease force a half-formed operating subsidiary.

Spin-out triggers, written down now: landlord terms signed; shop trading with recurring revenue; and before any liquor licence application (the licence belongs in the entity that keeps it). The week-9 review (Fri 28 Aug) is the incorporation decision point, targeting FY27 Q2 if triggers are met.

### The Butterfly Movement Ltd: zero involvement in this window

The charity handover completes 26 June, one day before start. Until appointments complete, the outgoing board holds signature authority; the incoming Indigenous-led board must adopt any program as its own; related-party safeguards with ACT Pty are unresolved with Standard Ledger. A payroll-conduit arrangement while ACT directs the worker would breach ACNC governance standards and risks the ATO treating ACT as the real employer (**Verified** principle per the entity/pay research; the specific Butterfly facts are from the goods-butterfly-structure memory, **Inferred** current).

What the charity CAN do, later and properly: run Goods bed-production training as its own charitable program, receipt DGR gifts for it, and eventually employ Mparntwe program staff with the PBI FBT exemption ($30,000 grossed-up cap per employee per FBT year, not pro-rated; **Verified** per research). That value belongs to the Alice Springs facility phase from September onwards, brought as a proposal TO the new board, with Kristy Bloomfield declaring her dual role (Oonchiumpa lead + incoming Butterfly director) and abstaining on the vote.

---

## 4. Pay mechanics per person

### Denis (ACT Pty employee, fixed-term 10 weeks)

- **Flow:** fixed-term employment contract signed by ACT Pty, effective 27 Jun (or 1 Jul fallback). TFN declaration + stapled-super lookup at signing. Pay runs in arrears via Xero Payroll, STP Phase 2 filed each run, SG into his fund within 7 business days of each payday (payday super, **Verified**).
- **Super:** $2,400 over the 10 weeks (computed: $20,000 x 12%, ATO rate table).
- **Award:** identify the modern award (Hospitality Industry (General) Award is the likely fit) and check the Thu-Sun roster's weekend penalty rates against the flat $2,000/wk before the first shift (**Unverified**; this is a named gap).
- **WorkCover QLD:** policy required within 5 business days of first employing (**Verified** per research). If he starts Sat 27 Jun the hard deadline is ~Fri 3 Jul; just have it before start.
- **Housing FBT:** Witta is non-remote. The ATO's own location list classifies adjacent Maleny as non-remote on both List 1 and List 2, and the 100-km-from-Brisbane limb fails on its own (**Verified**: ATO remote-area FBT list fetched 2026-06-10). So his ~$3,000 housing value over 10 weeks is a taxable housing fringe benefit if left as a perk, roughly $2,700 to $2,900 of FBT (computed illustration at 47% grossed-up). Fix: a documented market-rent employee contribution reducing taxable value to nil, or fold the value into gross wages. Keep the car as a work vehicle with private use restricted and a logbook.
- **No ABN questions matter on this path.** If Ben + Nic override and go contractor anyway: no ABN means 47% withholding, and s 12(3) SG is owed regardless (**Verified**, ATO QC 33854).

### Katrina (Oonchiumpa B2B program fee)

- **Flow:** ACT Pty signs an outcomes-based services agreement with Oonchiumpa (the 26 Jun Butterfly handover is irrelevant to this contract; keep it that way). Oonchiumpa selects, employs, rosters and may substitute its personnel. Fees invoice against four milestones mapped to the week 3/6/9/final reviews; first invoice mid-July, entirely post-cutover.
- **Pricing at her $1,500/wk minimum, full cost recovery:** wages $15,000 + 12% super $1,800 (ATO rate) + an org admin/workers-comp loading of 10 to 15% (a design parameter, **Unverified**), so an invoice of roughly **$18,500 to $19,300 ex-GST** over 10 weeks (computed). At the written $1,000/wk the same shape gives ~$12,300 to $12,900 ex-GST. The $5,000 wage gap becomes ~$6,200 of invoice delta after on-costs.
- **GST:** +10% if Oonchiumpa is GST-registered (status unknown; ask). ACT claims the input tax credit, so it is cash-neutral B2B (**Verified** per research).
- **The labour-hire trap, stated correctly.** Supervision is NOT a safe harbour: s 7(2)(d) of the Labour Hire Licensing Act 2017 (Qld) makes it irrelevant who controls the work, and s 7(2)(b) makes the contract drafting non-determinative (**Verified**: the in-force Act, fetched 2026-06-10). The operative question is whether, in substance, the worker does work FOR ACT in ACT's undertaking, or for Oonchiumpa delivering Oonchiumpa's own program. If it reads as supply of a worker, an unlicensed arrangement is an offence with corporate fines to **$500,700** (3,000 penalty units at the 1 Jul 2025 value of $166.90; **Verified**; the earlier ~$378,450 figure was the stale 2017-18 penalty-unit value). So:
  - deliverables, not headcount: training milestones, competency sign-offs, an SOP pack for the Mparntwe facility, never a weekly per-head rate;
  - Oonchiumpa supervises its own worker (right and good for the partnership, but **no legal safe harbour**, so the substance must hold too);
  - keep production quotas OUT: the strongest fact is the direction of benefit, this program produces Oonchiumpa's future production lead, not ACT's output;
  - Oonchiumpa warrants wages, 12% SG, PAYG-W and workers comp covering the QLD placement (cross-border state-of-connection not researched; put a warranty in the agreement);
  - **check the register at labourhire.qld.gov.au before signing.** Being shown as licensed on the register is a statutory reasonable excuse (s 11(2)). The register timed out during verification, so Oonchiumpa's status is **Unverified**. Consider a written query to the QLD Labour Hire Licensing Compliance Unit.
- **Accommodation + car** are provided to the org as documented program resources. FBT attaches to employees, not to contractor/org benefits (**Verified** as to FBT scope; the characterisation here is **Inferred**).
- Trina never gets a Xero contact; her money is a line on Oonchiumpa's bill.

### Joey (Joseph Kirmos)

- **Now:** keep the ACCPAY bill pattern, but start adding 12% SG on the labour component immediately. His "Provision of Labour" bills on GL 486 are labour-only on their face, and the SG Act s 12(3) deeming conditions (contract with the individual, >50% labour, paid for personal labour, no delegation) almost certainly bite (**Verified** mechanism, ATO QC 33854; facts to confirm).
- **Back-position:** the mirror shows six bills totalling $25,237.50 (xero_invoices, **Verified** against the mirror), but that includes one VOIDED $4,500 Dext duplicate, so the live total is likely $20,737.50 (computed). Back-SG at 12% is therefore roughly **$2,490** (computed on $20,737.50) up to **$3,029** (computed on the headline total), before GST/materials adjustments. Quarters past their 28-day due date have converted to the non-deductible SG charge with interest and admin fees; paying Joey extra in lieu does not discharge it. **Hand the whole question to Standard Ledger.**
- Chase **INV-004** ($4,500, 2026-02-16, ACT-GD), showing AUTHORISED and unpaid in the mirror (**Verified** against the mirror; the mirror can be stale, single-GET against live Xero is the only truth).
- He is likely a "worker" for WorkCover QLD under the PAYG test (narrower than the SG test, so this is **Inferred**); name him on the policy question to Standard Ledger.
- Tidy end-state: onto ACT Pty payroll from 1 July with Denis, once the stack is live.

### Suzie

- Her arrangement IS documented: $850/wk fixed contractor, ~$21.25/hr equivalent on a ~40h week, cost centre HV-Staffing (config/harvest-budget.json, **Verified** against the file). What is TBC is the payment vehicle (invoice vs future payroll), and no payments were evidenced in Xero as of 2026-05-26 (harvest-stage-budget plan). **Confirm with Ben/Nic whether payments have started.**
- Regularise as either a documented genuine volunteer (no work-for-rent bargain) or a casual employee at award rate for rostered shop hours. Free rent in exchange for expected work is in-kind wages: award back-pay risk plus a housing fringe benefit, and Witta is non-remote so there is no concession to fall back on (**Verified**, ATO list). Resolve before the shop opens and the roster becomes undeniable.
- At ~$850/wk against Denis's $2,000 and Katrina's $1,500, her rate sharpens the fairness question rather than removing it. See §6.

---

## 5. The $1,500 conversation

### The arithmetic that reframes it

On a 38-hour week (the NES full-time standard, Fair Work Act s 62), Denis at $2,000/wk is ~$53/hr. Katrina at the written $1,000/wk half-time (~19h) is also ~$53/hr. **The written proposal was hourly-fair but weekly-unlivable.** Her $1,500 minimum is a livability statement, not a rate negotiation: rent and food in Witta don't halve because hours do. (Parity math **Verified** as arithmetic; the 19h/38h assumptions and the "reaches her, not the invoice line" reading are load-bearing and **Unverified**. Confirm her actual proposed hours, and the to-her versus invoiced distinction, with Kristy and Tanya before using these numbers in conversation.)

### Options

| | Option | Cost | Read |
|---|---|---|---|
| (a) | **Accept $1,500, reprice, settle before day 1** | +$5,000 wages, ~$6,200 invoice delta after on-costs (computed) | The review process working early, not a concession |
| (b) | Lift hours toward 0.75 FTE so $1,500 restores exact hourly parity (~28.5h at ~$53/hr) | +$5,000 + more of her time | Only honest if Goods production genuinely fills the hours. Invented hours are option (d) in a costume |
| (c) | Split commercial + Butterfly charity-funded component | Governance, not cash | Not a day-1 mechanism. Handover is 26 Jun; routing money through the charity days later is the conduit risk in §3. Revisit with the NEW board if the traineeship becomes the charity's own program |
| (d) | Hold at $1,000 | Save $5,000 | She arrives feeling underpaid, her org feels bargained down, her partner earns double in the next room. No |

### Recommendation

**(a), with (b)'s shape available if the work genuinely grows.** The delta is ~13% of the all-in package, and an underpaid train-the-trainer hire is a failed capability transfer. The relationship is load-bearing for years: ACT-OO ran $103K in / $77K out FY26 (project_monthly_financials and xero mirror context), and Kristy is joining the Butterfly board. Price the Oonchiumpa invoice at cost recovery so the community org never subsidises an ACT-initiated program. Ask Kristy and Tanya how they want it structured rather than guessing their on-costs.

One caution on framing: the actual sent proposal text is not on file anywhere in the repo or reachable mail (verdict, exhaustive negative search 2026-06-10). Before quoting "the package still feels right" or any proposal wording back to anyone, fetch the real sent text from the act.place sent items or WhatsApp, or paraphrase honestly ("the spirit of what we sent you"). Do not quote a reconstruction as if it were the document.

### Talking points for Kristy and Tanya (points, not a script; lead with the money)

- We heard Katrina on the money. $1,500 a week is right, and we want it settled now, before she gets on a plane. No week-3 negotiation hanging over her arrival.
- One thing to design together: does $1,500 need to be what reaches her after your on-costs? Tell us what the invoice needs to be. We'll work to that number, not argue it.
- The outcome we're committing to: Katrina goes home able to run bed production at your facility. That's the whole point, and we'll measure ourselves against it.
- The SOPs and production guides she helps write belong to Oonchiumpa as much as to us. Yours to use, change and build on, no permission needed, ever. We'll put that in writing.
- This is your program too: a check-in call with you both at weeks 3, 6 and 9, the same weeks as her reviews.
- Ten weeks is a long way from Mparntwe. We're covering a trip home around the midpoint, or flying family up, her call, plus phone and data. We'd like you two as her standing support line. What else would help?
- What admin support do you need to run this? Invoicing, payroll, super, insurance for the QLD placement: we can build an admin loading into the fee or lend bookkeeping help. (Critic gap: don't quietly load unsupported admin onto a small Mparntwe org.)
- Hard end at 10 weeks unless we all want more, and "this isn't working" is a safe sentence for anyone at any point, with you in the loop before anything changes on Katrina's side. What does success at the Alice Springs facility look like from where you sit?

---

## 6. Community and fairness layer

### Fairness matrix (corrected with Suzie's documented rate)

| | Katrina | Denis | Joey | Suzie |
|---|---|---|---|---|
| Cash | $1,000/wk written, $1,500/wk asked, via Oonchiumpa (brief) | $2,000/wk (brief) | ~$4,500/mo, ~$1,040/wk (xero_invoices mirror) | $850/wk fixed budgeted (config/harvest-budget.json); payments unconfirmed |
| Accommodation | Provided, ~$300/wk value (brief) | Provided, ~$300/wk value (brief) | Farm, free rent, no written agreement | Farm, free rent, no written agreement |
| Vehicle | Shared car + fuel | Shared car + fuel | Not documented | Not documented |
| Duration | 10 weeks, hard end | 10 weeks, hard end | Open-ended | Open-ended |
| Review rights | Daily + weeks 3/6/9 + final | Same | None formalised | None formalised |

The asymmetries, named before someone does the maths at the dinner table (all four share a farm):

1. Denis gets 2x Katrina's weekly cash. At written terms it was hourly-equal (~$53/hr both); at $1,500 half-time she moves above hourly parity. Both framings are true; have the language ready.
2. The newcomers get packages and review rights; the incumbents get goodwill and memory. The arrival of formal packages is exactly the day questions start.
3. Joey's ~$1,040/wk sits between Katrina's two numbers for possibly more hours. Suzie's $850/wk sits below everyone. Be ready to explain the logic, or pre-empt it.

**Consistency principle:** two rules, written once, applied to all four. Every farm resident gets the same one-page living agreement. Every paid role gets the same review rhythm. Optional third: write the pay logic down once (an ~$53/hr anchor plus named loadings for relocation, lead responsibility, livability) so every difference is explainable from one page. Add a mutual confidentiality-of-terms line to each agreement and brief both founders on one shared fairness narrative (role scope and hours, not dollar comparisons).

### Farm living agreement (one page, same template for all four)

Plain language, signed by resident + one founder:

- **What's provided:** private room, utilities, wifi; shared kitchen/bathroom/laundry; named car shared between named people, fuel for work and reasonable local use, logbook beyond that; insured for listed drivers only, licence sighted before keys. What insurance does NOT cover: personal belongings, personal trips outside the region, unlisted drivers.
- **How we live:** house norms set together in week 1, written on the fridge, not in this agreement. Guests fine with a heads-up; longer than 3 nights, talk to a founder. House problems to a named founder, same day, small while they're small.
- **What this is NOT (the load-bearing clause):** housing is not payment for work and work is not rent. The room does not depend on hours worked, and no work is owed for the roof. Paid work is a separate written arrangement. This keeps a free room from quietly becoming an employment claim, award back-pay and a taxable housing benefit (Witta is non-remote for FBT, ATO list). Not a residential tenancy, not an employment contract.
- **Ending / return:** either side, 2 weeks' notice. Ending work does not end housing the same day: 2 weeks' grace. Room as found, keys and car back, forwarding address swapped. Disagreements: talk first, named founder mediates, nobody loses their bed mid-argument.

### Partnership give/get, named honestly

Katrina trains AT ACT to lead production at Oonchiumpa's facility; she does not work FOR ACT. Per the value-exchange model (wiki/concepts/ecosystem-value-exchange.md), benefit-sharing is the design goal:

- **ACT gets:** production continuity for Goods Stretch Beds, a trained production lead in the network, a future Mparntwe supply node.
- **Oonchiumpa gets:** production capability in their own person, equipment and process knowledge, a revenue line from their own facility.

Both sides should be able to say this out loud in the same room. The final wording belongs to a conversation with Kristy and Tanya, not to this document.

### Knowledge custody: make it a document, not a value

The production SOPs Katrina helps write must be co-owned: usable by Oonchiumpa without ACT's permission, forkable onto their own systems, forever. Today that is implied by the value-exchange doc's possession holds and the locked Goods two-track split, but written nowhere as a rule about these artifacts. Fix it twice: (1) a clause in the Oonchiumpa services agreement; (2) a short ADR at `wiki/decisions/goods-sop-knowledge-custody.md`.

### Cultural load, supported up front, not on request

- A trip home to Mparntwe around the midpoint (~week 5), covered; or fly a family member up, her choice.
- Phone and data covered, so staying connected to home is never a cost decision.
- Kristy and Tanya as her standing support line, a scheduled slot, not "call if you need".
- Sorry Business and family/community obligations are a known path home, not a contract breach. Pay handled respectfully; the placement resumes or closes with grace (§9 covers mechanics).
- Denis being there is itself a real support; name it as part of why the couple package matters.
- If ACT ever wants to photograph or feature Katrina or this program publicly: consent-check first, every time. Her story is hers.

---

## 7. Systems build checklist (task ledger)

Bias to reuse. All Xero/GHL/Notion items are day-shift Tier 2+ external writes: Ben executes, nothing here is done yet.

| # | Item | Surface | Effort | Who / when |
|---|---|---|---|---|
| 1 | Confirm Pty Xero file + banking genuinely live for 1 Jul; if not, invoke the cutover honest-delay rule and shift Denis to 1 Jul | Xero | S | Ben now |
| 2 | Email Standard Ledger: Denis employee confirmation, Joey s 12(3) back-SG + SGC mechanics, WorkCover deemed-worker question, accommodation/car package treatment, lease-name question, cross-cutover week-1 framing | email | S | Ben now |
| 3 | Settle Katrina's rate WITH Kristy and Tanya ($1,500 recommended; confirm to-her vs invoiced + her actual hours). Blocks items 6 and 7 | call | S | Ben now |
| 4 | 1-page engagement form to Denis: TFN/ABN, bank, emergency contact, licence; VEVO/citizenship work-rights check for both Denis and Katrina at signing | paper | S | Ben now |
| 5 | Draft contracts: Denis fixed-term employment contract (Standard Ledger or an employment-template service), Oonchiumpa services agreement (Ben from template, with the labour-hire structuring rules in §4 and the SOP co-ownership clause in §6), package letters. Drafts in `thoughts/shared/drafts/`, signatures targeted 24 Jun | repo then paper | M | Ben + Standard Ledger this week |
| 6 | Xero: create Denis contact (or payroll employee record), verify Oonchiumpa contact legal name + ABN + GST status, agree invoice line format | Xero | S | Ben |
| 7 | Xero: Oonchiumpa milestone bills as DRAFT scaffolding (4 milestones, not weekly headcount); approval only with the received invoice PDF attached. Denis moves to payroll, not bills, if §3 holds | Xero | S | Ben |
| 8 | Payroll stack (now mandatory if Denis is an employee, and needed for founder pay regardless): PAYG-W registration, Xero Payroll + STP Phase 2, auto-super (payday-super-ready, SBSCH is retiring), WorkCover QLD policy, award identification + compliant pay-rate check on the Thu-Sun roster | Xero + registrations | L | Ben + Standard Ledger, start now, live by 26 Jun |
| 9 | Xero: vendor rule Denis only if contractor path is overridden; confirm Joseph Kirmos 50/50 manual flow undisturbed (`manual%` rows hold); start 12% SG on Joey's labour bills | Xero | S | Ben |
| 10 | Notion: build the "10-Week Crew — Witta, Jun-Sep 2026" capture hub: role cards, reviews DB, daily check-in DB, accommodation + vehicle register, closeout checklist. Keep it OUT of every `sync-*-to-notion.mjs` target list (capture page per notion-page-policy) | Notion | M | Ben |
| 11 | Notion: pre-create review rows (Fri 17 Jul, Fri 7 Aug, Fri 28 Aug, Fri 4 Sep) + calendar invites; weeks 3 and 6 are video (Ben overseas 27 Jun to 15 Aug per Harvest repo) | Notion + Calendar | S | Ben |
| 12 | GHL: Katrina + Denis contacts, tags only. Katrina: `project:act-gd`, `role:crew`, `source:oonchiumpa`, `place:mparntwe`, `lane:community`. NEVER any `comms:` or `tier:` tag, no pipelines, no workflows, human-written messages only. Denis: `project:act-hv`, `role:crew`. Before applying: eyeball the published "Harvest — Follow Welcome" workflow trigger in the GHL UI (the one unresolved warning), and note the published Supabase-sync workflow fires on tag adds (benign, send-risk none). Identity tags currently fire no sends (all send-capable workflows are DRAFT per the 2026-06-08 state-of-play), but this assumption expires when Phase E ships | GHL | S | Ben |
| 13 | Goods repo: fix the known-wrong "Ntumbu" name to Oonchiumpa in `wiki/articles/communities/alice-springs-oonchiumpa.md` before any of it is used as training material | repo | S | Ben now |
| 14 | Day-1 handover: photos + condition rows in the register for car + accommodation; named-driver insurance check; smoke-alarm/habitability pass on the rooms | Notion + site | S | Week 1 |
| 15 | Trina operator onboarding: `/production` routes on her phone, operator-name convention, restart the shift-log practice (last entry 2026-03-12 per Goods repo), walk the facility-manual training section | Goods app | M | Week 1 |
| 16 | Harvest repo: stub Denis's target venue SOPs in `docs/sop/` + a Notion "SOP drafts inbox"; harvest drafts into the repo at each review (Notion is the inbox, the repo is the shelf) | repo + Notion | S | Week 1 |
| 17 | **Money pulse fix:** the Monday cron (`scripts/weekly-reconciliation.mjs`) reads only NAB-Visa bank statement lines, on a quarter window. Crew bills paid by bank transfer are invisible to it, not merely untagged (code-verified, see verification log). Extend the input: an ACCPAY-bills query keyed on Xero tracking (or ingest Everyday/Pty statement lines), add a "crew burn: $X of budget, week N of 10" line, THEN run a tracer week. Do not trust the pulse until the tracer passes | script | M | Ben week 1 |
| 18 | GHL user seats: add Denis to the blocked "create Susie/Joey GHL users" batch if he runs the Shop pipeline / shop-chat calendar | GHL | M | Week 1 |
| 19 | Suzie + Joey regularisation: confirm whether Suzie's $850/wk payments have started; living agreements signed for all four the same week; extend the review rhythm to Joey + Suzie | paper + Notion | M | Week 1 |
| 20 | Week-10 closeout (write into the hub now): final invoices attached + paid, milestone bills closed, car/accommodation handback with photos, named-driver removed, Katrina confirmed as owner of the production-facility guide, Denis SOPs merged to `docs/sop/`, GHL `role:crew` swapped for a dated completion tag, Denis seat deactivated, reference letters, draft next-phase Mparntwe agreement co-authored with Kristy + Tanya | all | M | Week 10 |

---

## 8. Compliance and risk register

Deadlines are relative to the Sat 27 Jun start. Severity from the completeness critique + verified findings.

| Risk | Severity | Deadline | Owner | Notes |
|---|---|---|---|---|
| No contracts exist (Denis employment, Oonchiumpa agreement, package letters); these are the new Pty's first-ever engagement documents | Blocking | Signed by 24 Jun | Ben + Standard Ledger | Item 5 above |
| Employer registrations: PAYG-W, STP, payday-super-ready super channel, WorkCover QLD | Blocking | Live by 26 Jun (WorkCover hard statutory deadline ~3 Jul) | Ben + Standard Ledger | Payday super enacted, commences 1 Jul 2026 (ATO). SBSCH retired 1 Jul 2026 |
| Award compliance: Thu-Sun weekend penalties vs flat $2,000/wk | Blocking | Before first shift | Standard Ledger | Hospitality Industry (General) Award likely; unchecked |
| Public + products liability insurance in ACT Pty's name covering food service and events at Witta; cutover can orphan a sole-trader policy | Blocking | Before the 20 Jun open day | Ben | $20M PL was planned, unchecked on the migration checklist |
| Vehicle: named non-owner drivers on the policy, use terms documented, FBT review if Denis is an employee | Blocking | Day 1 | Ben | An unlisted driver in a company-provided car is an uncapped liability |
| Work rights: VEVO or citizenship evidence for Denis + Katrina | Blocking | At contract signing | Ben | 5 minutes; nobody has actually checked |
| Cash-flow: ~$3,500 to $4,800/wk of new outflow never tested against the 13-week cash position, landing in the cutover window | Blocking | Before signing | Ben (run /scenarios or money baseline) | Align Oonchiumpa milestone dates to known inflows |
| QLD labour-hire licensing on the Oonchiumpa arrangement | Blocking | Register check before signing | Ben | s 7(2)(d): supervision is no safe harbour; fines to $500,700; register check is a statutory reasonable excuse (s 11(2)); register status unverified (site timed out 2026-06-10) |
| Food business licence (Sunshine Coast Council) before the shop sells unpackaged food, which is Denis's core job | Important | Lodge week 1, ideally now | Ben | Apply in ACT Pty's name; accept transfer friction later. The under-12-days exemption is non-profit-only |
| Liquor: rule alcohol in or out of revenue experiments now | Important | Decide this week | Ben + Nic | Permits take months; BYO/no-liquor for the 10 weeks recommended; licence belongs in the entity that keeps it |
| FBT on Denis's housing (~$2,700 to $2,900 if unmitigated, computed) | Important | Designed into the contract | Standard Ledger | Witta non-remote on the ATO list (verified); rent contribution to nil or wage fold-in |
| Joey back-SG (~$2,490 to $3,029 computed range) + SGC conversion on late quarters | Important | Standard Ledger ruling this month | Standard Ledger | Non-deductible once SGC; paying him extra does not discharge it |
| Suzie's rent-for-work pattern (in-kind wages, award back-pay, housing benefit) | Important | Resolve before the shop opens | Ben + Nic | Living agreement decouples housing from work for all four |
| WHS: farm-as-workplace induction (workshop, kitchen, vehicle), first aid, incident register; PCBU duties apply regardless of contractor/employee status | Important | One-day safety pass before 27 Jun; inductions signed week 1 | Nic | Includes smoke-alarm/habitability check on the accommodation |
| Key-person continuity: train-the-trainer outcome and shop SOPs live only in heads until written | Important | Weekly documentation milestones from week 1 | Denis + Katrina, checked at reviews | Each review gate checks "usable without them" |
| 20 Jun open day collision: all pre-start admin lands in the open-day week plus the 26 Jun handover and 30 Jun cutover | Important | Admin locked by 18 Jun; 23 to 26 Jun for physical prep only | Ben + Nic | Build the dated runsheet this week |
| Oonchiumpa admin capacity: invoicing, NT/QLD workers comp, super, GST registration status unknown | Important | Ask in the Kristy + Tanya call | Ben | Admin loading or offered bookkeeping help in the fee |
| Pay-detail privacy among a co-living crew | Nice-to-have | Before day 1 | Ben + Nic | Confidentiality-of-terms line + one shared fairness narrative |

---

## 9. Review rhythm

Designed around Ben being overseas 27 Jun to 15 Aug (Harvest repo): Nic on the ground, Denis the senior on-site presence Thu-Sun, self-logging systems.

**Daily check-in (~5 minutes, end of day).** The five questions (placeholder set; swap in the sent proposal's exact wording once fetched, see §5 caution):
1. What landed today?
2. What's blocking you for tomorrow?
3. Anything you need from us?
4. How are you actually going? (the human one; ask it last and mean it)
5. Anything small we should know before it gets big? (house, money, tools, people)

Denis: paper sheet or WhatsApp voice note on the day, typed into the Notion daily DB at the existing Monday sweep. Do not chase 70 pristine daily rows. Katrina: her daily check-in IS the existing Goods `/production` shift log (mobile, photos, voice, handover notes), which restarts a stale practice and feeds `/admin/production` (plastic runway, beds possible, sheets/day) as her review scoreboard for free.

**Weekly:** one named 1:1 holder per person, written down, not "both founders". Suggested split: the Goods-production founder holds Katrina + Joey; the Harvest-venue founder holds Denis + Suzie. Nic extends the existing weekly slot to include Denis + Katrina rather than creating a second meeting. Monday money pulse per checklist item 17 (after the cron fix lands; until then, read the bills directly in Xero).

**Weeks 3 / 6 / 9 (Fri 17 Jul, Fri 7 Aug video; Fri 28 Aug in person), standing agenda:**
1. Scoreboard: Katrina from `/admin/production`; Denis from shop revenue (Square), events run (Humanitix), SOPs drafted then merged.
2. Their words first: what's working, what's unclear, captured verbatim.
3. Package and pay check, said out loud each time so nobody raises it cold. Katrina's rate-gap status stays on the agenda until closed.
4. Mparntwe handover progress: what can she now run unsupervised; which production-facility-guide gaps she filled this cycle.
5. Continue / adjust / stop, plus the next-3-weeks focus.

Same weeks: a separate org-to-org call with Kristy and Tanya. Katrina is never the only channel between ACT and her own organisation.

**Pre-Italy closeout (Fri 4 Sep, pinned now):** outcomes landed vs promised; the kit Katrina takes home (SOPs, supplier list, equipment spec, contacts); Denis's handover docs; the beyond-week-10 decision made explicitly in the room, with Kristy and Tanya in the loop for Katrina's side, never by drift; thank-yous done properly. Hard end at 10 weeks unless ALL agree otherwise; the review row records the agreement.

**Ending early, a known path, not a rupture:**
1. "I don't think this is working" is a legitimate sentence, any day, from anyone, no penalty.
2. 48-hour pause, then a sit-down with the named 1:1 holder. No decisions in the heat.
3. For Katrina: Kristy and Tanya in the loop before any decision. ACT does not end an Oonchiumpa placement unilaterally.
4. Settlement: pay through the current week plus one notice week; housing grace per the living agreement; Katrina's travel home covered regardless of reason.
5. No blame narrative; learnings go in the closeout note and nowhere else.
6. Say in week 1: a placement ending early is not the partnership ending. Then it is already true if needed.

---

## 10. Decision list (day-shift; every one needs a human)

| # | Decision | Who decides | Options | Recommendation |
|---|---|---|---|---|
| D1 | Katrina's pay: $1,000/wk written vs $1,500/wk minimum | Ben + Nic WITH Kristy + Tanya | Hold / accept / lift hours to 0.75 FTE / split via charity | Accept $1,500, priced as cost recovery in the Oonchiumpa fee (~$18,500 to $19,300 ex-GST, computed). Settle before day 1 |
| D2 | Whether $1,500 is what reaches Katrina or the invoice line | Kristy + Tanya | To-her (ACT absorbs on-costs) vs invoice-inclusive | To-her; ask them how they want it structured, work to their number |
| D3 | Denis's engagement form | Ben + Nic, with Standard Ledger written confirmation | Contractor invoices vs ACT Pty fixed-term employee | Employee. Marginal cost ~$2,400 SG + small WorkCover premium; the contractor route owes SG anyway and risks sham-contracting |
| D4 | Denis start date if payroll is not live by 26 Jun | Ben + Nic | Hold 27 Jun via workaround vs shift to 1 Jul | Shift to 1 Jul. Never bridge via the sole trader or unpaid days |
| D5 | Harvest Pty timing + the 1 Jul lease-name tension | Ben + Nic with Standard Ledger | Incorporate operating co now / dormant shell for the lease / ACT Pty lease with assignment right | Defer the operating co; resolve the lease name with Standard Ledger before 1 Jul; incorporation decision at the week-9 review against written triggers |
| D6 | Butterfly involvement in the 10-week window | Ben + Nic now; the NEW Butterfly board later | Charity-funded training component now vs zero involvement until the board adopts a Mparntwe program | Zero now. Bring a granted traineeship proposal to the new board for Sept onwards; Kristy declares her conflict and abstains |
| D7 | Joey regularisation | Ben + Nic + Standard Ledger | Leave as-is / add 12% SG now + rule the back-position / move to payroll 1 Jul | Add SG now and get the back-SG ruling; payroll from 1 Jul as the tidy end-state |
| D8 | Suzie regularisation | Ben + Nic | Documented genuine volunteer vs casual employee for rostered hours | Decide before the shop opens; either is fine, the undocumented middle is not. Confirm whether her budgeted $850/wk has started being paid |
| D9 | Living agreements for all four residents | Ben + Nic | Newcomers only vs same template for all four | All four, signed the same week |
| D10 | Who holds each weekly 1:1 | Ben + Nic | Named-founder split per §9 | Decide and write the names down this week |
| D11 | Where SOP co-ownership is written | Ben + Nic + Kristy + Tanya | Handshake vs contract clause + ADR | Both: clause in the services agreement + `wiki/decisions/goods-sop-knowledge-custody.md` |
| D12 | Alcohol in or out of the 10-week revenue experiments | Ben + Nic | In (start liquor permits now) vs out (BYO/no-liquor) | Out for the 10 weeks; the licence belongs in the entity that keeps it |
| D13 | Tracking code for the Oonchiumpa training fee | Ben | ACT-OO (who is paid) vs ACT-GD (what it buys) | ACT-GD 100%; the relationship lives in the contact and line description. Honest Goods production costing matters for Mparntwe and the REAL Innovation Fund case |
| D14 | Which spend basis anchors future Harvest/Goods budget talk | Ben | project_monthly_financials (HV $55,466 / GD $220,196) vs two-account bank SPEND (HV $95,159 / GD $302,689), both FY26, both from the mirror | Needs a reconciliation pass; until then name the basis every time a figure is used |

### Decision log (running)

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-06-10 | Plan drafted recommending ACT Pty routing, Denis-as-employee, Trina-via-Oonchiumpa at $1,500 cost recovery, no Harvest Pty, no Butterfly | Synthesis of entity/pay, systems and people designs, corrected by the verification verdicts | Yes, nothing executed |

---

## 11. Open questions and unverified items (verification log)

| Claim / question | Status | How / source | Date |
|---|---|---|---|
| Payday super commences 1 Jul 2026; SG due in fund within 7 business days of payday; SBSCH retired | Verified | ATO + FWO pages, Acts passed Nov 2025 (verdict) | 2026-06-10 |
| SG rate is 12% from 1 Jul 2025 | Verified | ATO super guarantee rate table (verdict) | 2026-06-10 |
| Witta is non-remote for FBT; employee housing there is a taxable benefit | Verified | ATO remote-area location list (adjacent Maleny non-remote on both lists; 100-km Brisbane limb fails) | 2026-06-10 |
| ACT Pty employment stack (PAYG-W, STP, super, WorkCover, payroll) not stood up | Verified | Migration checklist §7 unactioned, last_verified 2026-05-08; no payroll tables in the mirror | 2026-06-10 |
| QLD labour-hire: supervision no safe harbour (s 7(2)(d)); drafting non-determinative; corporate fine to $500,700; register check = statutory reasonable excuse | Verified | Labour Hire Licensing Act 2017 (Qld) in-force text + QLD penalty unit $166.90 (verdict) | 2026-06-10 |
| s 12(3) SG deeming on labour-only personal contracts regardless of ABN | Verified | ATO QC 33854 (verdict) | 2026-06-10 |
| Denis would be characterised as an employee under FW s 15AA and TR 2023/4 | Inferred (strong; evaluative, not automatic) | FWO + TR 2023/4; Standard Ledger written confirmation required before contracts | 2026-06-10 |
| Joey bills total $25,237.50 in the mirror; live total likely $20,737.50 ex the voided duplicate; back-SG ~$2,490 to $3,029 | Verified total against the mirror; computed range; GST/materials split unruled | xero_invoices mirror query (money baseline) | 2026-06-10 |
| INV-004 $4,500 genuinely unpaid | Unverified (mirror says AUTHORISED/unpaid; mirror can lie; single-GET live Xero is the only truth) | xero_invoices mirror | 2026-06-10 |
| Suzie's $850/wk: budgeted figure, payments not evidenced in Xero as of 2026-05-26; whether payments have started | Unverified (rate Verified in config/harvest-budget.json; actuals unknown) | config + harvest-stage-budget plan | 2026-06-10 |
| Oonchiumpa GST registration status | Unverified; ask Kristy + Tanya | none | 2026-06-10 |
| Oonchiumpa on the QLD labour-hire register | Unverified (site timed out) | labourhire.qld.gov.au | 2026-06-10 |
| Katrina's actual proposed hours (~19h assumed) and whether $1,500 means to-her or invoiced | Unverified; confirm with Kristy + Tanya | parity math verdict | 2026-06-10 |
| The sent proposal text (wording of review promises, daily questions) | Unverified; not on file anywhere local; fetch from act.place sent items or WhatsApp before quoting | exhaustive negative search (verdict) | 2026-06-10 |
| Hospitality award fit + weekend penalty rates vs flat $2,000/wk | Unverified | named gap; Standard Ledger | 2026-06-10 |
| Contractor high-income threshold figure (s 15AB) | Unverified (Denis is well below on any reading) | verdict note | 2026-06-10 |
| WorkCover premium estimate $300 to $600 and org loading 10 to 15% | Unverified design parameters | entity/pay design | 2026-06-10 |
| Weekly-reconciliation cron is blind to bank-transfer bill payments (NAB-Visa-only input, quarter window, no tracking propagation) | Verified in code (ingest scripts hardcode the Visa account); table contents unobserved (DB was unreachable during the check) | scripts/weekly-reconciliation.mjs, ingest-statement-lines*.mjs, tag-statement-lines.mjs (verdict) | 2026-06-10 |
| GHL identity tags fire no sends today (all send-capable workflows DRAFT); Supabase-sync workflow does fire on tag adds (benign); "Harvest — Follow Welcome" trigger needs a UI eyeball; assumption expires at Phase E | Verified against the 2026-06-08 state-of-play + bucket records | thoughts/shared/reviews/ghl-system-state-of-play-2026-06-08.md (verdict) | 2026-06-10 |
| PMF vs two-account bank-spend divergence (~$40K to $80K per project) | Inferred causes (GST-inclusive cash vs computed ledger; bill payments absent from SPEND); not reconciled | money baseline | 2026-06-10 |
| ACT-OO FY26 flows ($103K in / $77K out) | Verified against the mirror per the systems design; not re-queried in this pass | systems design citation | 2026-06-10 |
| 13-week cash position can absorb ~$3,500 to $4,800/wk new outflow | Unverified; run the scenarios before signing | completeness gap | 2026-06-10 |

---

## Changelog

### 2026-06-10 — Initial synthesis

**Objective:** one decision document for Ben + Nic covering entity routing, pay mechanics, the $1,500 gap, fairness, systems, compliance and review rhythm for the 10-week engagement.
**Changed:** plan + provenance sidecar written. No external system touched.
**Verified:** see §11; verification verdicts applied as corrections over the three design inputs (notably: Suzie's documented $850/wk refuting the "not documented" claim; the labour-hire supervision non-safe-harbour; the $500,700 penalty figure; payday super enacted; the weekly cron's blindness to bank-transfer bills; the Joey voided-bill nuance).
**Failed/Learned:** the sent proposal text could not be located locally; live Xero and the labour-hire register were unreachable during verification.
**Blockers:** Standard Ledger rulings (Denis classification, Joey back-SG, award, lease name) and the Kristy + Tanya conversation gate the contracts.
**Next:** Ben works the week-of-10-Jun items in §7 (items 1 to 5 first), targeting signatures 24 Jun and all admin locked by 18 Jun.

---

## Provenance

- **Data sources queried:** orchestrator inputs (situation brief; entity/pay, systems, people/community designs; verification verdicts with ATO/FWO/QLD-legislation sources; completeness gaps; Harvest + Goods repo context; live money baseline from the shared Supabase mirror tednluwflfhxyucgwigh: project_monthly_financials, xero_transactions, xero_invoices, xero_contacts, information_schema). Local: plan + provenance templates, config/harvest-budget.json (via verdicts).
- **Date range:** FY26 financials (Jul 2025 to Jun 2026); legal sources fetched 2026-06-10; checklist state last verified 2026-05-08.
- **Unverified assumptions:** listed exhaustively in §11.
- **Generated by:** hybrid (multi-agent workflow synthesis, written by a Claude subagent 2026-06-10; all decisions remain human).

Full sidecar: `2026-06-10-harvest-goods-10-week-staffing-alignment.provenance.md`
