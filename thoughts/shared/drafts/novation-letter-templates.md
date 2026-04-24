---
title: Novation letter templates — sole trader → A Curious Tractor Pty Ltd
summary: Draft scaffolding for the Week 5-6 novation letter batch flagged in the entity migration checklist. Two templates — grant funders, commercial counterparties. Standard Ledger to review before any letter is sent.
status: DRAFT — needs Standard Ledger review before sending
date: 2026-04-24
---

# Novation letter templates

> **DRAFT — do not send without Standard Ledger review.** This is scaffolding
> produced by the ACT Alignment Loop as a starting point for the Week 5-6
> novation batch. Standard Ledger should adjust the legal language for ATO / ACNC /
> grant-deed specifics before any letter leaves the office. Both templates
> assume the counterparty doesn't need to sign anything back — if a specific
> grant deed requires a variation/novation deed to be counter-signed, that's
> a separate artefact and Standard Ledger should produce it.

## Context (for the session or agent preparing a letter batch)

- Cutover: **30 June 2026**. Nic's sole trader ABN `21 591 780 066` stops
  receiving new transactions at close of business 30 June 2026.
- From 1 July 2026: A Curious Tractor Pty Ltd `ACN 697 347 676` is the trading
  entity. ABN issued by Standard Ledger (pending at time of drafting — fill in
  real ABN when sending).
- GST treatment unchanged: Pty is GST-registered from day one.
- Bank: NAB. Payment details for the Pty to be confirmed once the NAB business
  account is active.
- The charity A Kind Tractor Ltd (`ACN 669 029 341 / ABN 73 669 029 341`) is
  dormant and unaffected by this migration.
- Enumeration of recipient batches lives in
  `wiki/synthesis/funder-alignment-2026-04-24.md` (funders) and
  `wiki/synthesis/entity-migration-truth-state-2026-04-24.md` (full $507K
  outstanding receivables list).

## Placeholders used in both templates

- `{{RECIPIENT_NAME}}` — e.g. "Sally Grimsley-Ballard" or "The Grants Officer"
- `{{RECIPIENT_ORG}}` — e.g. "The Snow Foundation"
- `{{RECIPIENT_ADDRESS}}` — postal block
- `{{RELATIONSHIP_TYPE}}` — one of: grant, consulting engagement, supplier
  agreement, licensing arrangement, customer relationship
- `{{RELATIONSHIP_DETAIL}}` — e.g. "Grant ref `#SF2025-0xx`, deed dated 11
  November 2024" / "Monthly storytelling retainer per SOW dated …"
- `{{OUTSTANDING_REF}}` — the Xero invoice(s) still open under the sole trader,
  e.g. "INV-0321 ($132,000 outstanding, issued 18 March 2026)"
- `{{PTY_ABN}}` — fill in once ABN issues (Standard Ledger, Week 1-2)
- `{{BANK_DETAILS_BLOCK}}` — BSB, account number, account name, PayID — all
  filled in once NAB account is active
- `{{SIGNATORY}}` — Ben Knight or Nicholas Marchesi
- `{{SIGNATORY_TITLE}}` — Director, A Curious Tractor Pty Ltd

---

## Template A — for grant funders

Subject: **Notice of entity transition — future grant tranches to A Curious Tractor Pty Ltd**

---

{{RECIPIENT_ORG}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

I'm writing to give {{RECIPIENT_ORG}} formal notice that the entity behind the
work {{RECIPIENT_ORG}} has funded to date is changing legal form.

### What's changing

From 1 July 2026, the organisation trading as A Curious Tractor moves from
Nicholas Marchesi (sole trader, ABN 21 591 780 066) to A Curious Tractor Pty
Ltd, ACN 697 347 676, ABN {{PTY_ABN}}. The Pty was registered with ASIC on
24 April 2026. Directors are Benjamin Knight and Nicholas Marchesi. The Pty is
wholly owned by the Knight Family Trust (50%) and the Marchesi Family Trust
(50%).

### What stays the same

- The people. Same founders, same team, same work.
- The mission and the programs {{RECIPIENT_ORG}} has funded.
- GST registration — the Pty is GST-registered from day one; no change to the
  GST treatment of any grant payment.
- Reporting and acquittal obligations. The Pty picks up all reporting
  commitments the sole trader was under.

### What we're asking {{RECIPIENT_ORG}} to do

1. **Update your vendor/payee records** so that future grant tranches on
   {{RELATIONSHIP_DETAIL}} are made payable to _A Curious Tractor Pty Ltd_ from
   1 July 2026 onward. New banking details below.
2. **Confirm, if needed, that this administrative change does not require a
   formal deed of variation.** Most grant deeds we have reviewed allow for
   administrative assignment with written notice; if {{RECIPIENT_ORG}}'s
   standard terms require a deed of novation, please let us know and our
   accountants at Standard Ledger will prepare one for countersignature.
3. **Continue to send any outstanding-on-sole-trader invoices (e.g.
   {{OUTSTANDING_REF}}) to the sole trader bank details you have on file.**
   Any grant payments dated on or before 30 June 2026 still land with the sole
   trader and are acquitted against the sole trader's FY26 accounts; from
   1 July 2026, all new tranches route to the Pty.

### New invoicing and banking details (from 1 July 2026)

- **Payee**: A Curious Tractor Pty Ltd
- **ACN**: 697 347 676
- **ABN**: {{PTY_ABN}}
- **Bank**: {{BANK_DETAILS_BLOCK}}
- **Invoice contact**: accounts@act.place
- **Program contact**: unchanged — me, or via your existing program lead at ACT

### Acquittal of existing tranches

Any acquittal work for spending incurred before 30 June 2026 stays with the
sole trader's FY26 accounts and will be lodged under the sole trader's ABN.
Acquittal work for spending incurred from 1 July 2026 onward will be under
the Pty. Our accountants will keep the two books clearly separated.

If you have a grant-manager view of this that departs from the above, I'd be
grateful for a short call — we want this transition to be invisible to the
programs you're funding.

Warmly,

{{SIGNATORY}}
{{SIGNATORY_TITLE}}
A Curious Tractor Pty Ltd

---

## Template B — for commercial counterparties (customers, suppliers, licensees)

Subject: **A Curious Tractor — entity change from 1 July 2026**

---

Dear {{RECIPIENT_NAME}},

Quick administrative note about {{RELATIONSHIP_TYPE}}.

From 1 July 2026, our trading entity changes from Nicholas Marchesi (sole
trader, ABN 21 591 780 066) to **A Curious Tractor Pty Ltd**, ACN 697 347 676,
ABN {{PTY_ABN}}. The work, the team and the contact points all stay the same.
This is an administrative step, not a strategic one — we've grown and it's
time the legal shape matched.

### What changes for you

- **Invoices from 1 July 2026** will come from _A Curious Tractor Pty Ltd_,
  carrying the new ACN/ABN and new bank details (below). Please update your
  supplier/vendor records accordingly. GST treatment is unchanged.
- **Any invoices already issued on or before 30 June 2026** (including any
  outstanding at the date of this letter — {{OUTSTANDING_REF}}) should still
  be paid to the sole trader bank details you have on file.
- **Existing purchase orders, SOWs, or contracts** with the sole trader continue
  to their scheduled completion. Any work carrying across the 30 June
  boundary: we'll issue a short addendum assigning the remaining scope to the
  Pty; please let us know if you'd prefer a fresh agreement instead.

### New entity details (from 1 July 2026)

- **Payee**: A Curious Tractor Pty Ltd
- **ACN**: 697 347 676
- **ABN**: {{PTY_ABN}}
- **Bank**: {{BANK_DETAILS_BLOCK}}
- **Invoicing**: accounts@act.place
- **Day-to-day contact**: unchanged

If anything about {{RELATIONSHIP_TYPE}} needs a more formal handover document
(novation deed, assignment of rights, updated MSA), please flag it and we'll
prepare one.

Thanks for your patience with the paperwork.

Regards,

{{SIGNATORY}}
{{SIGNATORY_TITLE}}
A Curious Tractor Pty Ltd

---

## Notes for the human packaging these letters

- **Don't send in bulk without review.** Each recipient's specific grant deed
  or contract may impose requirements this template doesn't cover. Standard
  Ledger should eyeball the recipient list against the specific counterparty's
  terms.
- **Minderoo and QBE Catalysing Impact are already Pty-contracted** — they
  don't need this letter.
- **A Kind Tractor Ltd (the charity) doesn't need this letter** either — it's
  dormant and its relationships are unaffected.
- **Grant funders ahead of commercial counterparties.** If sequencing matters
  (e.g. some funders have month-end grant cycles), prioritise the six named in
  the migration checklist: Snow Foundation, Paul Ramsay Foundation, Lord
  Mayor's Charitable Foundation, Dusseldorp Forum, Equity Trustees, any
  Commonwealth/state grant.
- **Letterhead**: use A Kind Tractor's existing letterhead (for visual
  continuity) with a footer that names both entities and the transition — or
  produce a Pty letterhead as part of the Week 4-5 brand-asset update.
- **Sign-off choice (Ben vs Nic)**: grants to funders who primarily relate to
  Nic should go out under Nic's name; those where Ben is lead should go out
  under Ben's. Joint sign-off is an option for the largest relationships (Snow,
  Paul Ramsay).
- **Keep a file** of sent letters with counterparty, date, acknowledgement —
  lives alongside the Pty minute book.

## Related

- `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` — the
  full 10-section cutover plan that schedules this work for Week 5-6
- `wiki/synthesis/funder-alignment-2026-04-24.md` — funder list + stage + last
  comm window, the source-of-truth for the grant-funder batch
- `wiki/synthesis/entity-migration-truth-state-2026-04-24.md` — the full $507K
  outstanding receivables enumeration, source for commercial counterparty batch
- Memory: `project_act_entity_structure.md` — canonical entity facts, do not
  mis-quote ACNs/ABNs from older documentation
