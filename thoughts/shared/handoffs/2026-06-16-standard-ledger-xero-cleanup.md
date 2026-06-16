# Session Handoff — Standard Ledger / Xero cleanup (16 June 2026)

> Save-to-clear ledger. Read this first to resume. Branch: `wip/standard-ledger-onboarding-2026-06-16` (2 commits: `b6ed157`, `60b4b8e`).

## What this session did

1. **Answered Standard Ledger's onboarding/balance-sheet review** against live Xero (sole-trader file "Nicholas Marchesi", tenant `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`).
2. **Fixed the Xero MCP** scope error (`XERO_SCOPES=" "` in `.mcp.json`) — but the MCP's real blocker is a Custom Connection **entitlement (403 on all data)**, fixable only in the Xero developer portal. Codebase OAuth is the durable R/W path; don't chase the MCP.
3. **Re-authed Xero** via `scripts/xero-auth.mjs` (the old refresh token got consumed — see traps).
4. **Restarted read-only mirror syncs** (`xero-sync`, `xero-bank-balances`, `xero-payments-sync`) + `pm2 save`. Left write crons stopped (`ai-router-xero-mode --apply`, `xero-project-tag`, `agent-xero-ghl-reconciler`).
5. **Published a plain-language Notion explainer** for the SL team.

## Artifacts (committed on the wip branch)

- `thoughts/shared/analysis/exports/2026-06-16-standard-ledger-onboarding-response/`
  - `balance-sheet-with-client-comments.csv` — SL's sheet with Client Comments filled (hand-back ready)
  - `onboarding-response.md` — cover note answering their 4 questions + AR aging + AP backlog + plan
  - `onboarding-response.provenance.md` — verified-live vs inferred vs open
- Pull scripts: `scripts/sl-balance-crosscheck-2026-06-16.mjs`, `scripts/sl-arap-live-2026-06-16.mjs`
- Notion: **Balance Sheet Review — what the numbers mean** → https://app.notion.com/p/380ebcf981cf8113a006e3b9bdc36427 (row in the Standard Ledger Q&A database)
- Config change (uncommitted, separate): `.mcp.json` `XERO_SCOPES=" "`

## Key findings (all verified against live Xero, 16 Jun)

- **The file is mid-reconciliation** — SL's 8 Jun snapshot is already stale. Static accounts match to the cent; reconciliation-sensitive accounts have all moved.
- **AP $485,116 / 347 bills — 90% ($437K / 314 bills) is 90+ days = paid-but-not-matched backlog + duplicates, NOT real trade debt.**
- 🔴 **The Funding Network $144,558 (2 bills) = ~30% of AP, almost certainly a misbooking** (fundraising intermediary, not a supplier). Clearing it takes "owing" from ~$485K → ~$340K. **Highest-leverage fix; start here.**
- **AR $248,698 / 21 invoices — almost all collectable.** In progress: Sonas $44K (coming), Rotary $82.5K (being worked through). Likely fine: Social Impact Hub $21.8K (repeat payer; due-date mis-keyed), Berry Obsession $13K. Write off ~$11.5K only (Feel Good Project $6.1K/925d, Ebony $10, Keating recurring ×12).
- **Live bank book-balances:** #8536 $56,821 (was $288,982) · #8815 ~$64,870 (was $131,938) · NM Personal −$388,938. Card shows on the credit side = payments recorded, spend not yet coded.
- **534 unreconciled bank lines** (#8536: 213, #8815: 321) — the root job; clears most AP + fixes balances.

## Outstanding (owner-tagged)

**Ben:**
- Reply to SL with the package; **request their chart-of-accounts template** → map names↔codes, confirm codes preserved before saying yes.
- **Share** the Notion page / Standard Ledger Q&A DB with the SL team.
- Decide when to **push `wip` / open PR** — branch is based on pre-#173 main, **rebase onto origin/main first** (all new files, should be clean).

**Nic (attended, day-shift, Tier-3 writes):**
- 3 bank screenshots (NM Personal, #8536, #8815); confirm FFP + Heritage loan balances.
- Attended Xero writes: void 12 Keating recurring invoices; write off Feel Good + Ebony; delete connector duplicate drafts. (Claude preps exact lists on go.)

**The real cleanup (bigger job):**
- Reconcile the 534 bank lines — **start with the TFN $144.6K reclassification**.
- Then lodge the 2 overdue BAS (Oct–Dec 2025, Jan–Mar 2026).

## Traps learned this session

- **`scripts/sync-xero-tokens.mjs` is interactive** — run non-interactively it hangs on stdin AFTER consuming the single-use refresh token → `invalid_grant` everywhere → must re-auth via `scripts/xero-auth.mjs` (browser; pick the *Nicholas Marchesi* org). For one-off live reads, refresh inline in your own script, don't call sync-xero-tokens.mjs.
- **Xero MCP** = Custom Connection entitlement issue (403); scope fix applied but won't work until the portal entitlement is restored.
- **Xero `Reports/BalanceSheet?date=` snaps to period-end** (8 Jun and 16 Jun both returned "as at 30 Jun") — figures are current GL, not date-pinned.
- **Supabase intermittently timed out** this session (both MCP and JS REST); live Xero was the reliable source.
- Recorded in auto-memory: `xero-api-capability-2026.md`.

## Resume commands

```
node scripts/xero-auth.mjs                          # if token expired (browser)
node scripts/sl-balance-crosscheck-2026-06-16.mjs   # live BS vs SL
node scripts/sl-arap-live-2026-06-16.mjs            # live AR/AP/draft detail
```
All read-only against Xero. No Xero writes made this session.
