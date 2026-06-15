# Provenance — Standard Ledger Onboarding Response (2026-06-16)

Sidecar for `onboarding-response.md` + `balance-sheet-with-client-comments.csv`. Per ACT verification rules: every dollar figure carries a source and a confidence level. These figures are going to an external party (Standard Ledger), so the bar is "verified or labelled".

## Sources

| Source | What it gave | Access path |
|---|---|---|
| Live Xero — tenant *Nicholas Marchesi* `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` | Balance Sheet, AR detail, AP aging, draft bills | Codebase OAuth (re-authed 16 Jun via `scripts/xero-auth.mjs`), NOT the MCP |
| `scripts/sl-balance-crosscheck-2026-06-16.mjs` | Balance Sheet at period-end vs SL's 8 Jun sheet | Reports/BalanceSheet |
| `scripts/sl-arap-live-2026-06-16.mjs` | 21 AR invoices, 347 AP bills (aged), 170 draft bills | Invoices endpoint, paginated |
| SL "Nicholas Marchesi - Balance Sheet" CSV | The 8 Jun snapshot being reviewed | Supplied by Standard Ledger |
| Supabase mirror `xero_invoices` (tednluwflfhxyucgwigh) | First-pass AR/AP (since superseded by live) | mcp execute_sql |

## Verified (queried live Xero directly, 16 Jun 2026)

- **AR = $248,697.88, 21 invoices** — full list with contact, due date, days overdue. Aging buckets and the per-invoice table in the response are exact.
- **AP = $485,115.61, 347 bills**; aging 90+ = $436,618.22 / 314 bills.
- **Draft bills = $45,385.13, 170 bills**; top contacts exact.
- **Balance Sheet line balances** (banks, drawings, funds introduced, GST, etc.) as at the current GL.

## Inferred / judgement (not fact — flagged as recommendations)

- **AR collectibility** — aging is verified-live; the collect/write-off split is judgement. **Confirmed by Ben (16 Jun): Sonas ($44K) payment is coming and Rotary ($82.5K) is being actively worked through — both collectible, not bad debt.** Social Impact Hub ($21.8K) and Berry Obsession ($13K) still to confirm. Write-off list (Feel Good Project, Ebony Reimers, Keating ~$11.5K) is age-based and to be confirmed with Nic before booking.
- **"$437K of AP is paid-not-matched, not real trade debt"** — strong inference from the 90%-over-90-days profile + the known 534 unreconciled bank lines + Dext-duplicate history. Proven case-by-case only by reconciling.
- **NAB Visa negative GL balance = payments-recorded-spend-not-coded** — inference consistent with 321 unreconciled card lines; the exact composition is confirmed only on reconciliation.

## Not yet established (open — owner named)

- **Real bank balances** for NM Personal / #8536 / #8815 — pending Nic's screenshots. The response cites Xero *book* balances only.
- **Loan confirmations** — FFP Holdings $457.79, FFP Inv Trust $1,996.50, Heritage $967,816.72 — match the live ledger but the underlying balances are Nic's to confirm with the counterparties/lender.
- **AP function owner** — who actions `accounts@act.place` — Nic to confirm.
- **COA code-vs-name** — whether SL's standardisation preserves account codes (low automation risk) or renumbers (needs our code references updated) — to confirm with SL.

## Known caveats / traps

- **Date-param snapping:** Xero's `Reports/BalanceSheet?date=YYYY-MM-DD` rounds to **period-end** — `2026-06-08` and `2026-06-16` both returned **as at 30 Jun 2026**. The live figures are therefore "current GL presented at FY-end", not a true 8 Jun snapshot. Immaterial here (the point is current state vs SL's stale snapshot), but don't read them as date-pinned.
- **SL's sheet is stale:** static accounts reconcile to the cent (same file); reconciliation-sensitive accounts have moved materially since 8 Jun. Do not treat SL's frozen figures as current.
- **Mirror was stale** (last full sync ~late May; `xero-*` crons had been stopped). Read-only mirror syncs (`xero-sync`, `xero-bank-balances`, `xero-payments-sync`) restarted 16 Jun + `pm2 save`. Write/apply crons (`ai-router-xero-mode --apply`, `xero-project-tag`, `agent-xero-ghl-reconciler`) deliberately left stopped (no unattended Xero writes).

## Reproducibility

```
node scripts/xero-auth.mjs                       # if token expired (browser re-auth)
node scripts/sl-balance-crosscheck-2026-06-16.mjs  # balance sheet vs SL
node scripts/sl-arap-live-2026-06-16.mjs           # AR/AP/draft detail
```

All read-only against Xero. No writes were made to Xero in producing this response.
