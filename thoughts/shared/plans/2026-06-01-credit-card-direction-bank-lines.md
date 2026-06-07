# Credit-card bank lines mislabelled as income

**Created:** 2026-06-01 · **Status:** ✅ DONE — shipped `c1b401b`. Verified live: 1,618 bank items → spend 1,570, transfer 48, refund 28, income 0. tsc clean, tests 5/5. Follow-up idea below (account-type field). Recommend clean-context diff review.
**Trigger:** Ben spotted Airbnb/Uber/Kadmium showing as "Incoming" on `/finance/workbench`.

## Root cause (verified 2026-06-01, direct SQL on shared DB)

- `bank_statement_lines` is **100% the NAB Visa #8815** (1,618 rows: 1,542 debit + 76 credit), written by `scripts/ingest-statement-lines-raw.mjs` (parses the Visa statement Credit/Debit column; hardcodes the account name).
- The NAB Visa is a **credit card (liability)** but `xero_bank_accounts.type='BANK'` for ALL accounts — no field distinguishes a card from a deposit account.
- `bankLineToItem` maps `direction==='credit' ? 'income' : 'spend'` — the **deposit-account** convention. On a credit card a "credit" reduces the balance and is never income.
- The 76 credits = **51 card payoffs** ($517,490, payee "Internet Payment" — the bank mirror of the Xero SPEND/RECEIVE-TRANSFER pairs) + **25 vendor refunds** ($12,251 — Kadmium/Airbnb/Uber/DTF, i.e. contra-expense).

## Scope / impact

- **Display + triage bug**, not a P&L corruption: org income comes from Xero `RECEIVE`/`project_monthly_financials`, not from `bank_statement_lines` direction. (Confirmed: `ledger.ts` does not read bank-line credits as income.)
- Affects: the workbench "Incoming" filter, and bank-line `needsProject` (refunds wrongly flagged as untagged income; card payoffs flagged as needing a project).
- Precedent to reuse: `scripts/build-bank-line-action-queue.mjs` already classifies `internet payment|credit card payment|card repayment|linked acc` as transfers vs `refund|rebate|reversal` as refunds.

## Fix (TDD-first; pure builder is testable)

In `apps/command-center/src/lib/finance/workbench.ts`:
1. `isCreditCardAccount(name)` — name-based (`/visa|mastercard|amex|\bcc\b|credit\s*card/i`); the only signal we have (type is uselessly 'BANK').
2. `classifyCardCredit(text)` → `'transfer'` (card payoff) | `'refund'` (everything else), reusing the action-queue regexes.
3. `bankLineToItem`: when `isCreditCardAccount(bank_account)` AND `direction==='credit'`:
   - transfer → `direction='transfer'`, `needsProject=false`, `needsReceipt=false`
   - refund → `direction='spend'`, `isRefund=true`, `needsReceipt=false` (a refund needs no purchase receipt; it should be coded to the original purchase's project, so `needsProject` stays)
   - debit → spend (unchanged). Non-card accounts: credit=income (unchanged).
4. Types: add `'transfer'` to `WorkbenchItem.direction`; add `isRefund?: boolean`. Add `'transfer'` to `DirectionFilter` for an explicit view. Check `page.tsx` renders the new direction value (badge label) without breaking.

## Verification
- Unit test (pure builder): Visa credit "Internet Payment" → direction 'transfer', needsProject false; Visa credit "Kadmium" → direction 'spend', isRefund true, NOT income; Visa debit → spend; deposit-account credit → income.
- Live: the 76 Visa credits reclassify to 51 transfer + 25 refund(spend); the "Incoming" filter no longer lists card payoffs/refunds. `tsc` clean, tests green.

## Guards
- Don't change `ingest-statement-lines-raw.mjs` direction (it faithfully mirrors the statement). The fix is in interpretation only.
- Money-semantics change → recommend clean-context diff review.
