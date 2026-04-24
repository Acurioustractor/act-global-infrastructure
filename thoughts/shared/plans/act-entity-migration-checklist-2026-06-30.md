# Migration checklist: Nic sole trader → A Curious Tractor Pty Ltd

> Cutover: 30 June 2026 (end of FY26)
> Sole trader ABN 21 591 780 066 stops receiving new transactions at close of business 30 June 2026.
> Pty Ltd ACN 697 347 676 begins trading 1 July 2026 (FY27).
> Status: 9 weeks out. Standard Ledger engaged for the accounting side.

## Principle

Nic's sole trader keeps doing its current work until 30 June 2026, then stops. The Pty picks up 1 July 2026. For any obligation, contract, grant, or subscription where the counterparty cares who they're dealing with, we actively novate (transfer the obligation) in writing rather than letting it auto-renew or silently lapse.

Everything on this list needs one of three outcomes:
- **NOVATE**: written transfer from sole trader to Pty (counterparty acknowledges)
- **REASSIGN**: simple account-holder change (where counterparty doesn't care about legal entity)
- **CLOSE / REOPEN**: sole trader closes the relationship, Pty starts fresh

---

## 1. Commercial contracts and customer relationships

| Type | Action | Notes |
|------|--------|-------|
| Innovation Studio consulting engagements (active) | NOVATE | Written letter to each client: "from 1 July 2026, services continue under A Curious Tractor Pty Ltd ACN 697 347 676. Please update your vendor records. Invoicing entity changes, GST treatment unchanged." |
| Innovation Studio consulting engagements (completing before 30 June) | CLOSE clean | Finish under sole trader, final invoice by 28 June. New engagements from July onward land in the Pty. |
| JusticeHub partnerships (e.g. NJP partnership, any active community MoUs) | NOVATE | Variation deed or exchange of letters. |
| Goods on Country buyer relationships (19 active pipeline contacts) | NOVATE | Email notification with updated invoice footer from 1 July. |
| Goods on Country supplier agreements (Indigenous business suppliers) | NOVATE | Written notification with new entity details. Standard Ledger can provide template. |
| Empathy Ledger licensing / hosting arrangements | NOVATE | |
| The Harvest lease (philanthropist as landlord) | ASSIGN via new lease in Pty name | Lease should be signed in the Pty's name from day one, not transferred. Confirm timing with landlord. |
| The Farm lease (Nic as landlord, Pty as tenant) | NEW LEASE | Draft a new lease agreement with Nic as lessor, Pty as lessee, arm's-length market rate. Standard Ledger to confirm rate. |
| Any supplier or vendor contracts in sole trader name | NOVATE or CLOSE | Audit the Xero supplier list. |

---

## 2. Grants and funders

| Item | Action | Notes |
|------|--------|-------|
| **QBE Catalysing Impact 2026** | Contract straight to Pty | Confirmed: grant contracted against A Curious Tractor Pty Ltd. No transfer needed. |
| **Minderoo pitch** (lands mid-May 2026) | Contract straight to Pty | Pitch appendix already reflects this. |
| **Current grants in Nic's sole trader** | NOVATE with funder approval | For each current grant: email the funder's grant officer with the transition notice, ask for a grant variation or deed of novation. Do this by end of May 2026 so 30 June cutover is clean. |
| **Acquittals due post-cutover** | STAY with sole trader OR migrate | Discuss with each funder: acquittal for spending incurred pre-30-June stays with sole trader ABN; any residual spending after cutover transfers to Pty. |
| **Grants under A Kind Tractor Ltd** | Stay with charity | Nothing changes. Charity continues as-is. |

**Funders to notify list** (enumerate before May 2026):
- [ ] Snow Foundation
- [ ] Paul Ramsay Foundation
- [ ] Lord Mayor's Charitable Foundation
- [ ] Dusseldorp Forum (if active)
- [ ] Equity Trustees (if active)
- [ ] Any Commonwealth or state grant (check grant register)
- [ ] Any philanthropic trust PAF distribution in flight

---

## 3. Tax, ABR, and regulatory

| Item | Action | Notes |
|------|--------|-------|
| ABN (Pty) | Apply via ABR | Standard Ledger handles. Target: first week of May. |
| GST registration (Pty) | Register with ABN application | Standard Ledger handles. |
| ABN (sole trader) | Cancel after 30 June 2026 | Once sole trader's final BAS is lodged (typically late July), cancel via ABR. |
| GST registration (sole trader) | Cancel after final BAS | Same timing. |
| Final sole trader BAS | Lodge by standard deadline | Q4 FY26 BAS due 28 July 2026 (quarterly) or per sole trader's registered cycle. Standard Ledger handles. |
| Final sole trader tax return FY26 | Lodge under normal schedule | Personal tax return due 31 October 2026 (or 15 May 2027 if using a registered tax agent). |
| PAYG Instalments (sole trader) | Discontinue | Nic's PAYG instalments under sole trader cease at cutover. |
| PAYG Instalments (Pty) | Register | ATO will set up after first tax return. Expect voluntary pre-payment Year 1. |
| R&D Tax Incentive registration (AusIndustry) | RE-REGISTER under Pty for FY27 | Current R&D activities under Nic's sole trader are grandfathered through 30 June. For FY27, the Pty registers fresh. Standard Ledger coordinates. |
| R&D FY26 claim (sole trader) | Lodge with sole trader tax return | Claim the FY26 activities in Nic's personal return. |
| Fringe Benefits Tax | Assess if applicable | Not relevant to sole trader; becomes a consideration once Pty has staff. |

---

## 4. Banking and payment rails

| Item | Action | Notes |
|------|--------|-------|
| NAB business account (Pty) | OPEN | Apply this week. 2-week onboarding. Standard Ledger may have a direct banker contact. |
| Bank account (sole trader) | KEEP for run-off | Nic's personal business account stays open through 30 June + final acquittals + final BAS. Consider closing in late FY27. |
| Stripe account | NEW account for Pty OR update existing | Stripe prefers new account under new ABN. From 1 July, Pty invoices accept payment to Pty's Stripe. |
| PayID / Osko | Set up on Pty NAB account | Standard for Australian B2B payment. |
| Expense cards | Issue under Pty's business account | Staff cards, founder cards under the Pty. |
| Auto-debits (current sole trader) | Audit and migrate | Every recurring direct debit on Nic's sole trader account: update to Pty account after 1 July. |

---

## 5. Subscriptions and tooling

Audit every SaaS subscription Nic's sole trader pays for. For each, one of three paths.

**For subscriptions tied to a person (e.g. ChatGPT personal, GitHub Copilot personal)**: keep personal, reimburse via expense claim.

**For subscriptions tied to a business (e.g. Xero, GHL, Supabase, Vercel, Stripe, Anthropic API, Google Workspace)**: transfer billing to Pty from 1 July.

Known subscriptions to audit:

- [ ] Xero (create Pty file; keep sole trader file read-only for history)
- [ ] GoHighLevel (GHL) CRM
- [ ] Supabase (3 projects: shared ACT/GS, EL v2, EL unused)
- [ ] Vercel (act-global-infrastructure, regenerative-studio, others)
- [ ] Google Workspace (4 mailboxes @act.place)
- [ ] Stripe
- [ ] Anthropic API
- [ ] OpenAI API
- [ ] Google Gemini
- [ ] GitHub organisation
- [ ] Notion workspace
- [ ] Cloudflare / DNS
- [ ] Domain registrar(s) — act.place, civicgraph.app, justicehub.com.au, etc.
- [ ] Telegram Bot hosting
- [ ] PM2 / deployment infra
- [ ] Any design tools (Figma, Adobe, etc.)
- [ ] Any accounting / BAS tools beyond Xero
- [ ] Any communication tools (Slack, etc.)

---

## 6. Intellectual property

| Item | Action | Notes |
|------|--------|-------|
| Codebases in Nic's GitHub (personal) | ASSIGN to Pty | Written IP assignment deed: "Nic Marchesi assigns all rights, title and interest in [listed repos] to A Curious Tractor Pty Ltd, effective 1 July 2026." Standard Ledger or a lawyer drafts. |
| Codebases in `ACurious/` or `act-` GitHub org | MOVE org ownership | Transfer organisation ownership to Pty's Google/GitHub identity. |
| Brands and trademarks (Empathy Ledger, JusticeHub, ALMA, Goods on Country) | REGISTER in Pty name | Trademark applications should be filed under the Pty. Separate trademark research needed. |
| Written methodologies (LCAA, Aesthetics of Asymmetry) | ASSIGN to Pty | Same deed. |
| Design assets, photography, videos | ASSIGN to Pty | Deed plus cross-reference to Empathy Ledger consent artefacts. |

---

## 7. Employment and HR (if applicable)

If ACT takes on any staff before 30 June 2026:

| Item | Action |
|------|--------|
| PAYG Withholding registration (Pty) | Register via ATO |
| Single Touch Payroll (STP) setup | Required from first pay |
| Superannuation (11.5% FY26, 12% FY27) | Set up clearing house |
| WorkCover Queensland | Register with QLD WorkCover |
| Fair Work awards | Identify applicable modern award |
| Contracts of employment | Draft per award |
| Payroll software | Xero Payroll or alternative |

If no staff by 30 June, none of the above needed yet.

---

## 8. Insurance (see separate insurance research brief)

All new policies go in Pty name. Sole trader's current insurance (if any) runs off at 30 June with no renewal.

| Type | Required by | Target date |
|------|-------------|-------------|
| Public Liability $20M | Harvest lease signing | Before lease is signed |
| Workers Compensation | First employee | Day first employee starts |
| Professional Indemnity | First consulting contract post-cutover | 1 July 2026 |
| Product Liability | First Goods product sale | When first product ships |
| Directors and Officers | Any time after Pty registration | Within 30 days of registration is standard practice |
| Cyber | Any time | Recommend Year 1 |
| Contents / equipment | Before stocking Harvest or Farm | Before fit-out |

---

## 9. Communications

| Item | Action |
|------|--------|
| Email footer updates (all @act.place accounts) | 1 July: new ABN + ACN on invoices and signatures |
| Website footer (act.place, project sites) | 1 July: legal entity name updated |
| Invoice templates (Xero) | 1 July: Pty template replaces sole trader template |
| Social media bios | 1 July: update if any name or legal-entity mentions |
| Business cards | Print new batch with Pty details |
| Announcement email to key relationships | Week of 1 July: short note to funders, partners, community contacts. Tone: "we've matured into a company structure." Not an event, just a fact. |

---

## 10. Records and governance

| Item | Action |
|------|--------|
| Pty's minute book | Open; first entry = registration (24 April 2026); next = accepted director appointments; next = shareholder subscription by the two family trusts; next = banking resolution; then ongoing resolutions. |
| Pty's statutory register | ASIC keeps the master; internal copy is best practice. |
| Share register | Two shareholders (Knight Family Trust, Marchesi Family Trust), 50 shares each. |
| Shareholders Agreement | Sign before any third-party investment; standard practice to sign at establishment. Standard Ledger's referred lawyer. |
| Directors' annual declarations | Not required unless requested by ASIC. |
| ASIC annual review | First review ~24 April 2027; reminder arrives early April 2027. |
| ACNC (A Kind Tractor) | Ongoing obligations unchanged; annual information statement next due. |

---

## Dependencies and sequence

A rough sequence, read top-to-bottom:

1. This week: NAB account applied, Standard Ledger brief sent, Director IDs confirmed. Research insurance brokers. **Shareholders Agreement drafted by Standard Ledger's referred lawyer.**
2. Week 2: **Shareholders Agreement signed.** NAB onboarding in flight.
3. Week 3: ABN + GST issued. Pty Xero file opens. NAB account active.
4. Week 4-5: Insurance policies in place (at minimum: PL $20M, D&O). IP clause audit on grant + partnership agreements before IP assignment deed drafting.
5. Week 5-6: Grant novation letters sent to all current funders. IP assignment deed drafted.
6. End May: **R&D FY26 records review with dedicated R&D consultant** (separate from Standard Ledger's tax prep). Verify contemporaneous activity records support the ~$109K claim.
7. Week 7-8: Subscriptions audited. Customer novations in progress. Stripe account for Pty.
8. Week 9 (22-29 June): Final sole trader invoices raised. Sole trader Xero closes to new entries.
9. Cutover (30 June 2026): Sole trader stops trading. Pty starts trading.
10. Week 10-12: Final sole trader BAS and tax return prepared. Cancellation of sole trader ABN lodged. Domain, website, email, invoice footers updated.

---

## Cutover rules (decided by CEO review 2026-04-24)

### Rule 1 — Pre-cutover invoices stay with sole trader
Invoices issued under the sole trader ABN before 30 June 2026 get paid to the sole trader bank account, regardless of when the payment actually lands. This matches ATO income recognition (revenue belongs to the entity that earned it) and keeps FY26 R&D attribution clean. Sole trader bank account stays open through FY27 Q1 (at least) for run-off receipts. Novation letters to existing funders must say: "existing invoices pay as normal; new tranches from 1 July invoice to the Pty."

### Rule 2 — Cutover fallback (honest delay over silent mis-attribution)
If ABN / NAB / Pty Xero is not invoice-ready by 1 July, the sole trader continues trading until the Pty is genuinely live. The announcement email and website/invoice footer updates happen when the real cutover occurs, not on an aspirational date. This protects against ATO exposure from sole trader issuing invoices past a registered cutover date or Pty issuing retroactive invoices without an operational Xero file.

### Rule 3 — Rotary eClub INV-0222 is a recovery problem, not a novation one
INV-0222 ($82,500 AUTHORISED, 380+ days unpaid) does not need a novation letter. It needs a chase-or-write-off decision. Recovery is tracked separately from the migration batch.

### Rule 4 — Shareholders Agreement is Week 1-2, not Week 4-5
Pty has two equal shareholders from two separate family trusts. Until the SHA is signed, Corporations Act defaults apply (deadlock, dividend discretion, 50/50 removal votes). For the 9-week cutover window with grants landing and Minderoo potentially due-diligencing the Pty, this is latent risk worth closing immediately. Standard Ledger's referred lawyer drafts from template.

---

## Known gaps (Ben to fill or Standard Ledger to advise)

- Full list of active grants under Nic's sole trader (need to enumerate before novation letters)
- Full list of SaaS subscriptions and their billing cycles (supplement: `subscription_patterns` DB table has 38 vendor patterns)
- Full list of current Innovation Studio consulting clients
- Specific Goods on Country supplier agreements requiring novation
- **IP clause audit on grant + partnership agreements before IP deed** (unverified assumption: Nic has clean title to assign; Commonwealth grants may contain IP clauses)
- **Buyer-contract assignment-clause audit** for the 19 Goods on Country active buyers (some commercial contracts require prior written consent, not unilateral notice)
- **Stripe subscription migration plan** — Stripe doesn't move between ABNs; customer re-authentication required with 30+ days notice
- Trademark registration priority and timing
- R&D consultant selection for R&D claim preparation (see Rule 1 above — dedicated consultant, scheduled end May)

---

## Open actions from CEO review 2026-04-24

All accepted by Ben during review. Each slots into an existing week or adds a small item.

- [ ] **IP clause audit on grant + partnership contracts** — Week 4-5 — Standard Ledger's referred lawyer. Blocks IP assignment deed. Verify Nic holds clean title to assign before drafting deed.
- [ ] **Buyer assignment-clause audit for 19 Goods on Country active buyers** — Week 4-5 — Ben. Commercial contracts may require prior written consent, not unilateral notice. Flag consent-required ones for individual negotiation.
- [ ] **Stripe subscription migration plan with 30+ day customer notice** — Week 6-7 — Ben. Stripe doesn't transfer between ABNs; customers re-authenticate. Audit recurring subs now, notify 30+ days before cutover.
- [ ] **Dry-run $1 test invoice from Pty Xero** — Week 8 — Ben. Issue to a friendly recipient, pay it, verify end-to-end: Xero tenant, bank account, Stripe, project_code tagging, BAS treatment.
- [ ] **Secrets hygiene for Pty Xero / Stripe / NAB creds** — Week 3-4 — Ben. Rotate new tenant credentials into project env vars via existing `env-secrets-manager` skill pattern.
- [ ] **Weekly scheduled Alignment Loop agent from 2026-05-08** — Ben. Currently one-shot (`trig_018X1ZRtc9zdgFENiYsx5t8c` fires 2026-05-07T22:00:00Z). Update to cron weekly until 2026-07-01 for drift signal every week through cutover.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | HOLD_SCOPE | 5 critical gaps surfaced; 4 decisions applied (cutover rules 1-4); 6 TODOS proposed |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | N/A (no UI scope) | — |
| Outside Voice | Independent challenge | 2nd opinion | 1 | ran (claude subagent; codex errored on model access) | 7 additions surfaced; 2 incorporated as D7/D8, 5 to TODOS |

**CROSS-MODEL:** Claude main review + Claude outside-voice subagent. Outside voice surfaced 5 issues main review missed (Rotary recovery vs novation, R&D records verification, IP title cleanness, SHA timing, Stripe migration complexity). User incorporated 2 into plan (Rules 3 + 4) + 1 as new scope item (R&D records review, Rule 3 block). Remaining 2 (IP clause audit, Stripe migration) added to Known Gaps.

**UNRESOLVED:** 0.

**VERDICT:** CEO review applied. Plan upgraded with 4 cutover rules + resequenced SHA + R&D records scope. Eng review not applicable (this is a legal/operational checklist, not an architectural plan). Ready for execution.
