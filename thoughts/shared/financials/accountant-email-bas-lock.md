# Accountant email — BAS lock + Q2/Q3 draft cleanup

**Status:** Draft — review, tweak, send.
**To:** [new accountant email]
**Subject:** Q2+Q3 FY26 BAS prep — question on 30 Sep lock date + 36 legacy drafts

---

Hi [name],

Hope you're well. A couple of questions as we're tightening up Q2 and Q3 FY26 BAS prep.

**Context on what we've been doing**

I've done a comprehensive receipt capture + attribution exercise across card 1656 for Q2 and Q3 FY26. Currently:
- ~300 new ACCPAY bills pushed into Xero (all DRAFT, with PDF attachments), coded to account + tax + project tracking via vendor rules
- ~258 will approve and flow to Awaiting Payment as normal
- R&D-eligible spend has been flagged ($251K across Q2+Q3 on vendors tagged ACT-EL / ACT-IN / ACT-JH / ACT-GD — ~43.5% refund potential of $47K if evidence holds)
- Xero auto-flagged 23 duplicate bill sets (my pushes overlapping with the existing Qantas/Uber/Paddle auto-connector bills) — I'll clean those on my side by deleting my duplicates

**The questions**

1. **30 September 2025 lock date** — 36 of our pushed bills ($16,437) have dates in July–Sep 2025, and Xero is blocking us from approving them because that period is locked. Can you confirm:
   - (a) Is this a BAS lock because Q1 FY26 has already been lodged?
   - (b) If so, is this safe-to-void? My assumption is that these 36 bills are duplicates of transactions already reconciled directly from the bank feed at the time, and pushing them now would double-count into a filed period. Happy to void all 36 on that basis if you confirm.
   - (c) Alternatively — if any of them represent receipts that weren't coded at the time and should be reflected, we could re-date them to 1 Oct 2025 with a note showing original date, and process them in Q2 FY26 BAS.

2. **R&D substantiation** — we've flagged $251K as R&D eligible (Q2+Q3 combined) and I'm populating per-project commentary for each so we have contemporaneous evidence if the ATO ever reviews. Want to send that to you for a once-over before we claim?

3. **BAS filing rhythm** — do you want to file Q2 FY26 now that we're past the 28 Feb deadline (or have we already?) and file Q3 around 28 May? I can prepare the data packs once we've resolved the above.

No rush — would love a call or async reply when you've got a moment.

Thanks,
Ben

---

## Attachments to include when sending

- [ ] Screenshot of Xero → Purchases → Bills → Draft tab showing the 36 locked bills
- [ ] CSV export of the 36 bills (contact, date, amount, description) — generate via Xero Bills export
- [ ] Link to self-reliance dashboard (read-only share if possible)

## After accountant responds — decision tree

| Response | Action |
|---|---|
| "BAS locked — safe to void duplicates" | Bulk-void the 36 DRAFT bills via script |
| "Can unlock — will do it for 24h" | Process the 36 during window, then they relock |
| "Re-date to 1 Oct 2025" | Bulk-update dates via script |
| "Need more info per bill" | Export detailed list, schedule a call |

## What I expect they'll say

Most likely: "void them, they're duplicates of historical bank-feed reconciliations". Xero's own duplicate detection flagged 23 sets already — similar pattern applies to the older 36.
