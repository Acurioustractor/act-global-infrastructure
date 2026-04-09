# Quarterly BAS Checklist

Step-by-step runbook from "new quarter starts" to "BAS lodged and retro written". Follow in order. Check off as you go.

---

## Phase 0 — Setup (day 1 of the quarter)

- [ ] Run `node scripts/sync-xero-tokens.mjs --dry-run` to verify auth is live
- [ ] Read `references/quarterly-learnings.md` — what did the last quarter teach us?
- [ ] Read the most recent `references/q{N}-fy{YY}-retro.md` — any open actions?
- [ ] Confirm Xero, Dext, Gmail inboxes, and bank feeds are all connected and flowing
- [ ] Set up a fresh handoff file at `thoughts/shared/handoffs/bas-q{N}-fy{YY}-session-handoff.md`

---

## Phase 1 — Routine hygiene (weekly during the quarter)

- [ ] `node scripts/sync-xero-to-supabase.mjs` — refresh mirror
- [ ] `node scripts/ocr-dext-processing.mjs --apply` — OCR new Dext rows
- [ ] `node scripts/match-receipts-to-xero.mjs --apply` — auto-match new receipts
- [ ] `node scripts/sync-bill-attachments-to-txns.mjs --apply` — copy bill receipts to bank txns
- [ ] `node scripts/bas-completeness.mjs Q{N}` — check coverage trend

Spend no more than 20 minutes per week on this. If the trend isn't improving, something is wrong — investigate.

---

## Phase 2 — Pre-close sweep (2 weeks before quarter end)

- [ ] Re-run full hygiene pipeline
- [ ] `node scripts/bas-completeness.mjs Q{N}` — print the full completeness report
- [ ] For every vendor in the gap report: check `references/vendor-patterns.md` — is there a known playbook?
- [ ] `node scripts/gmail-deep-search.mjs Q{N}` — find receipts Dext missed
- [ ] `node scripts/xero-files-library-scan.mjs Q{N}` — find loose receipts in Xero Files
- [ ] Review ambiguous matches in `thoughts/shared/reports/ambiguous-matches-{date}.md`
- [ ] Nic or Ben: resolve the ambiguous list (should take 15 min)

---

## Phase 3 — Close (quarter end)

- [ ] Verify all bank feeds have imported through the last day of the quarter
- [ ] Verify Xero's Bank Summary report totals match your expected figures
- [ ] Run `node scripts/pair-bank-transfers.mjs Q{N}` — list bank-transfer pairs needing UI reconciliation
- [ ] Nic: manually reconcile bank transfers in Xero UI (usually 30-45 minutes)
- [ ] Nic: run Find & Match in Xero UI for any Qantas/connector bills that weren't auto-copied (check `vendor-patterns.md` for the list)

---

## Phase 4 — Prepare for accountant (week 1 of next quarter)

- [ ] `node scripts/prepare-bas.mjs Q{N} --save` — generate BAS worksheet
- [ ] `node scripts/bas-completeness.mjs Q{N}` — final coverage state
- [ ] `node scripts/generate-accountant-brief.mjs Q{N}` — one-page cover letter
- [ ] `node scripts/generate-bookkeeping-workbook.mjs Q{N}` — CSV tabs for accountant
- [ ] Send everything to accountant via `accountant-email-bas-q{N}.md`
- [ ] Follow up in 48h if no response

---

## Phase 5 — Post-lodge (1 week after BAS is lodged)

- [ ] Confirm BAS receipt from ATO
- [ ] `node scripts/bas-retrospective.mjs Q{N}-FY{YY}` — generate retro file
- [ ] Review the auto-generated retro — what did the quarter teach us?
- [ ] Manually append to `references/quarterly-learnings.md` with anything the script missed
- [ ] Update `references/vendor-patterns.md` with any new vendor quirks discovered
- [ ] Close the handoff file with final state
- [ ] Start Phase 0 for the next quarter

---

## Escalation triggers

Stop and ask for help if:

- [ ] Coverage trend is declining instead of improving
- [ ] A vendor shows up with 10+ unreceipted txns and no matching bills anywhere
- [ ] Xero sync fails repeatedly
- [ ] Token refresh fails (run `node scripts/sync-xero-tokens.mjs` first)
- [ ] BAS worksheet numbers don't match Xero Bank Summary
- [ ] Accountant flags a discrepancy

---

## The discipline

**Follow this checklist literally.** Don't skip steps because "last time they were fine". The reason this skill exists is to make sure nothing gets missed. If a step is redundant, edit the checklist — don't silently bypass it.

**Every quarter should get easier than the last.** If this quarter took more time than last quarter, something regressed — check what's broken before blaming workload.
