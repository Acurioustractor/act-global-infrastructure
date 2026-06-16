# DRAFT — email to Standard Ledger (review before sending)

> **Supersedes** `08-standard-ledger-email-draft.md` (2026-05-29). Updated 2026-06-13 to: confirm recipient (Vanessa, `vanessa@standardledger.co`), add the BAS draft figures + overdue/penalty-remission ask, and refresh the reconciliation status to the post-12-Jun-sprint position. Still **do not send** until Ben reviews — see the checklist at the foot.

**To:** Vanessa / Standard Ledger team — `vanessa@standardledger.co`
**From:** Ben
**Subject:** ACT books — Oct–Mar BAS ready to lodge, plus a few clean-up decisions

---

Hi Vanessa,

Ahead of getting the books straight for BAS and the Pty cutover, we've done a thorough clean-up pass on the sole-trader org (Nicholas Marchesi / NJ Marchesi T/as ACT) for Oct 2025 – Mar 2026, so the reconciliation is mostly teed up for you. Summary below; the full working pack with line-by-line detail is in our shared folder (happy to send however's easiest for you).

**First — the unblocker.** Could you sign off the Ignition BAS proposal and let us know what you need for Xero access on this org (and the Pty ATO client-to-agent linking, which I'll coordinate with Nic)? Nothing below can be finalised until you're in.

**BAS Q2 + Q3 — both overdue.** Q2 (Oct–Dec, was due 28 Feb) and Q3 (Jan–Mar, was due 28 Apr) haven't been lodged yet. Our draft worksheets (cash basis, quarterly) currently show net GST **payable of about $8,700 for Q2 and $5,900 for Q3 — roughly $15,350 combined**, after correcting a batch of duplicate bills that had over-claimed input credits. Treat these as draft until I finish the reconcile this week; Q3 in particular may come down a little once the last of its purchases are coded. Two asks once you're across them: (1) please lodge both via Xero Tax, and (2) since both are overdue, would you request remission of any failure-to-lodge penalty at the same time? It's a first miss and we're self-reporting, so I gather remission is commonly granted, but I'll leave the framing to you.

**The big one — The Funding Network ($144,558).** Two "bills" from The Funding Network (27 Nov $89,361 + 17 Dec $55,197) are actually the **grant distributions ACT received** from TFN's September event — they've been entered backwards as expense bills coded to General Expenses, claiming GST. We think they should be **voided and recognised as GST-free grant income**, and the **$13,141.64 of GST input credit reversed**. Two questions for you:
- Which account did the two deposits actually land in? (We can't see them in the synced ACT accounts.)
- Was the Q2 BAS lodged with that GST credit? If so — since $13,142 exceeds the $12,500 "fix on a later BAS" limit — I think we need to **revise the original BAS**. Your call on the mechanism. (Note this interacts with the Q2 figure above.)

**A few other things we found:**
- **General Expenses is overloaded** — ~$486K (182 bills) sits in account 429. We've built a line-by-line recode worklist (spreadsheet) with a suggested account + project for each; ~$263K of it is straightforward. A handful need your judgement (flagged).
- **Possible double-counting (~$272K)** — in ~90 cases a supplier bill *and* the bank payment for it were both booked to expense accounts instead of the payment being reconciled against the bill. **Telford Smith Engineering** is the clearest: one ~$19,800 job appears to be booked four times (2 bills + 2 payments) — could you check against their invoice whether it was one job or two stages, and whether it was actually paid twice? We've ring-fenced it rather than deleting anything.
- **Reconciliation — as at 13 June, nearly there.** Last week's pass cleared Q3 and Q4; Q2 is the remaining piece. About $710K across Oct–Mar still shows unreconciled in our mirror, but the bulk is **internal Everyday → NAB Visa transfers** (the Everyday account alone holds ~$372K of these) rather than un-itemised spend, so it clears quickly. I'm finishing Q2 and Q3 to zero this week; we've listed proposed matches for the rest.
- **Founder payments (~$242K) to Nic, currently coded ACT-CORE + R&D-eligible.** A full FY26 pass on the Everyday account found **13 payments totalling $241,982, of which $238,654 is flagged R&D-eligible — 81% of everything we currently have flagged R&D-eligible ($294,186)**. They're round amounts to the director, no receipts, the account-880/equity pattern, and all predate the Pty (registered 24 Apr 2026). We think they should come **out of the R&D basis** — both as equity drawings and as pre-incorporation sole-trader spend — which re-baselines R&D-eligible spend to **~$55,532** and resolves the founder amounts via the Pty's salary + Director's-Loan structure instead. Because this materially resizes the claim, we'd really value your view before we lodge.
- **Voided sales invoices ($455K)** — all accounted for, no lost revenue (re-issues / re-scopes). The only open revenue item is the Centrecorp production-plant deal.

**A couple of setup questions for the Pty migration:**
- Do you maintain Xero bank rules, or would you like us to set them up for the recurring vendors (Qantas, Uber, SaaS, fees)? We've drafted the list.
- Are we on a Xero plan with the AI auto-reconciliation (Grow or above)? And — do we keep paying for Dext, or consolidate to the free Hubdoc that's included with Xero, for the new entity?
- Can you pull/confirm the Everyday bank statement for Oct–Mar so we can reconcile the bank side as well as the card?

I know this is a lot — the detail is all written up and we've done the legwork so it should be efficient on your end. Happy to jump on a call to walk through any of it.

Thanks so much,
Ben

---

## Ben's pre-send checklist (not part of the email)

- [x] **Send timing — DECIDED 2026-06-13: HOLD until the Q2+Q3 reconcile is at zero and `prepare-bas Q2|Q3 --save` is re-run.** Before sending: swap the BAS paragraph for the final figures, change "finishing this week" to "done," and confirm the reconciliation paragraph reads "complete." **Do not send while figures are draft.**
- [ ] **Recipient confirmed:** Vanessa, `vanessa@standardledger.co` (from the SL contact list; other functional addresses on file: xero@, success@, practice@). Add Nic to cc if he should see the R&D/founder-payment section.
- [ ] **Figures are draft** until reconcile-to-zero + `prepare-bas Q2|Q3 --save`. The $8,700 / $5,900 / $15,350 are pre-final; the $13,141.64 GST reversal and ~$55,532 R&D re-baseline are current as of the 2026-06-01 review.
- [ ] **Attachments / shared folder:** decide whether to attach the recode worklist + reconciliation matches or link the folder.
- [ ] Sending is a Tier-3 action — it goes out under your name, not from here.

*Draft figures: BAS worksheets `bas-worksheet-q{2,3}-fy26-2026-06-01.md`; reconciliation `recon-status-latest.md` (cron 2026-06-13 07:27 AEST); structural items from the 2026-05-29 SL MASTER pack, R&D re-baseline 2026-06-01. ATO debit-error limit $12,500 for turnover under $20M — confirm the BAS-revision mechanism with SL.*
