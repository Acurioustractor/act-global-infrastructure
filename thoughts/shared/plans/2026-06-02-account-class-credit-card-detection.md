# Record account class (credit-card vs deposit) as data, not name-matching

**Created:** 2026-06-01 · **Status:** Tier-1 SHIPPED (`c7bc7e0`, review CONFIRMED) · Tier-3 DEFERRED (Ben, 2026-06-01)

## Update 2026-06-01 — investigation done, Tier-1 shipped, Tier-3 deferred
- **Investigation answered:** Xero DOES expose the class via `BankAccountType` (config/xero-chart.json, verified): `NAB Visa ACT #8815` + `Heritage Visa CC` = `CREDITCARD`; `NJ Marchesi T/as ACT Everyday` / `Maximiser` / `NM Personal` = `BANK`. `type`='BANK' and `Class`='ASSET' for ALL accounts (useless). So the preferred branch ("capture BankAccountType") is viable.
- **Tier-1 SHIPPED (`c7bc7e0`):** replaced the fuzzy `isCreditCardAccount` regex in `workbench.ts` with an explicit enumerated `accountClass()` lookup seeded from that data; unknown → safe `deposit` default. This is the permanent fallback layer. TDD (`accountClass` pinned), tsc clean, clean-context review CONFIRMED.
- **Tier-3 DEFERRED (Ben's call):** capturing `BankAccountType` into `xero_bank_accounts.bank_account_type` (migration + sync edit + backfill) is behaviorally identical today (the registry covers the only live card, #8815). Its only benefit is auto-classing NEW accounts — relevant at the **30 Jun 2026 Pty cutover** when NAB business accounts land. **Revisit then.** When done, the workbench can swap `accountClass()` to read the column, keeping the registry as fallback.

---


## Problem

`c1b401b` fixed credit-card bank lines being mislabelled as income, but it detects credit cards by **account-name regex** (`isCreditCardAccount` in `apps/command-center/src/lib/finance/workbench.ts`: `/visa|mastercard|amex|\bcc\b|credit\s*card/i`). That's fragile:
- A future card not matching the pattern → silently treated as a deposit account (credits become "income" again).
- A deposit account whose name happens to match → its real income wrongly treated as transfer/refund.
- The root enabler: **`xero_bank_accounts.type = 'BANK'` for every account** (verified 2026-06-01 — the NAB Visa, ACT Everyday, even an archived "Heritage Visa CC" all say BANK). Nothing records account *class*.

## Investigate first (don't assume the fix)

1. Does the **Xero API** actually expose the Visa as a credit card? Xero's BankAccount has a `BankAccountType` (`BANK` vs `CREDITCARD`). Check the sync that populates `xero_bank_accounts` (`scripts/sync-xero-bank-balances.mjs` / the main Xero sync) — is it capturing `BankAccountType`, or always writing 'BANK'? If Xero returns CREDITCARD and the sync drops it, the fix is just **capture the real type in the sync** + backfill.
2. If Xero genuinely classifies the Visa as 'BANK' (because it's set up that way in Xero), a **local override** is needed.

## Fix (pick based on step 1)

- **If Xero has the type:** capture `BankAccountType` into a column (e.g. `xero_bank_accounts.account_class` or reuse `type` correctly), backfill, and have consumers read it.
- **If not:** a small local registry/config of account → class (`credit_card` | `deposit`), co-located with the existing two-account rule. Consider extending `apps/command-center/src/lib/finance/entities.ts` (the entity registry) or a `config/` JSON. The two-account rule already enumerates these exact accounts.

## Consumers to update (replace name-regex with the class lookup)
- `workbench.ts` `isCreditCardAccount` → read account class.
- Anywhere else that interprets bank-line direction or applies the two-account rule (`ledger.ts` `isActBankAccount`). Share one source of truth.

## Done criteria
- A single authoritative account-class lookup; `workbench.ts` no longer name-matches.
- Test: a credit-card account → credits are transfer/refund; a deposit account → credit=income. tsc clean.
- Cross-ref: [[2026-06-02-ingest-deposit-account-bank-lines]] (deposit account must be classed 'deposit' so credit=income works once it's ingested).

## Guards
- Two-account rule unchanged (NAB Visa #8815 + NJ Marchesi T/as ACT Everyday only).
- Money-semantics change → clean-context review.
