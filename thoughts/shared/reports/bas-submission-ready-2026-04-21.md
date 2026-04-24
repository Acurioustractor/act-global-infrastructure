# BAS Q2 + Q3 FY26 — Submission Action Sheet

**Prepared:** 2026-04-21
**For:** BAS submission 2026-04-22 (Q3 due 2026-04-28, Q2 overdue since ~Feb 2026)
**Entity:** Nicholas Marchesi T/as A Curious Tractor · ABN 21 591 780 066

---

## Headline

| Quarter | SPEND txns | Covered | Genuine gaps | Gap value | Status |
|---|---:|---:|---:|---:|---|
| **Q2 FY26** (Oct–Dec 2025) | 340 | 312 (91.8%) | 28 | ~$986 | Ready to lodge pending action sheet below |
| **Q3 FY26** (Jan–Mar 2026) | 406 | 364 (89.7%) | 42 | ~$2,872 | Ready to lodge pending action sheet below |
| **Combined** | 746 | 676 (90.6%) | 70 | **$3,858** (1.2% of $318,962) | |

Coverage by **value** is 98.8%. Gaps are small-dollar long-tail.

---

## Sweep completed tonight (2026-04-21)

| Step | Result |
|---|---|
| Xero tokens | ✅ Synced across .xero-tokens.json + Supabase + .env.local |
| Xero invoices sync | ✅ 215 invoices refreshed |
| Xero bank txns sync | ✅ 435 txns synced (Jan 20 → today), 0 errors |
| Gmail receipt capture (30d) | ✅ 0 new (system up to date) |
| Bill-attachment copy Q2+Q3 | ✅ 0 pairs to sync (prior session already processed) |
| Pool-to-Xero matching | ✅ 429 unmatched pool receipts: 73 ambiguous (review), 356 no-match |
| Q2 + Q3 completeness | ✅ Reports written |
| Dext OCR | ✅ 85/85 processed (12 high / 8 med / 65 low) — low-confidence ones were non-receipts (arrival cards, marketing emails). Cost $0.009 |
| **DEFERRED** Xero Me mirror | ⏸ ~360 receipts in Xero not mirrored locally. Not needed for BAS (Nic sees them in Xero UI) |

---

## What to do in Xero UI tomorrow

### A. Uber bulk Find & Match (47 txns, $1,103.62 combined)

**Why this is 67% of the gap by count:** Uber's ACCPAY bills have the receipts (48/48 = 100% coverage). The Xero bank feed creates a separate SPEND line for each card swipe. Find & Match in Xero UI pairs them.

**How:**
1. Xero → Business → Bank Accounts → NAB Visa ACT #8815
2. Filter by "Uber"
3. For each Uber bank line, click **Find & Match** → select the matching ACCPAY bill
4. Commit

Q2 Uber txns (25): all between $5.00–$39.37, Oct–Dec 2025
Q3 Uber txns (22): all between $7.57–$70.06, Feb–Mar 2026

Allow ~20 min. After this, gap drops from 70 → 23 txns.

### B. Qantas Find & Match (Q2, 1 txn)

- 2025-11-21 · Qantas · $281.70 · NAB Visa ACT #8815
- Bill exists (Qantas receipts 97% coverage). Find & Match as above.

### C. Under $82.50 GST-inclusive — bank line is sufficient

ATO: tax invoice not mandatory when <$82.50 inc GST. Bank statement line is acceptable evidence. **No action needed.** Record on BAS worksheet as "bank line sufficient".

| Quarter | Vendor | Amount | Xero ID |
|---|---|---:|---|
| Q2 | Telstra | $80.00 | `615e0a73-48a2-4532-8032-e7c99448e07b` |
| Q3 | Xero | $75.00 | `459d3fa9-3635-4e02-9c98-e5a769be2363` |
| Q3 | LinkedIn Singapore | $74.99 × 2 | `f5058092...`, `fd477b12...` |
| Q3 | Squarespace | $72.90 | `9601e29a...` |
| Q3 | Mighty Networks | $71.72 | `ce31c263...` |
| Q3 | Webflow | $38.41 | `056e1784...` |
| Q3 | OpenAI | $30.00, $14.11 | `3e558571...`, `64e1e8a6...` |
| Q3 | Only Domains | $19.79 | `b5321743...` |
| Q3 | Anthropic | $15.85, $15.77, $15.76, $9.46 | `524b5704...`, etc. |
| Q3 | Linktree | $15.78 | `c7607b0c...` |
| Q3 | Squarespace | $11.80 × 2 | `f225ad9f...`, `4b133013...` |

**Total under-threshold (Q2+Q3): ~$571** — bank line sufficient, no chase needed.

### D. True receipt chases (small set)

| Date | Vendor | Amount | Recommended action |
|---|---|---:|---|
| 2025-10-20 | Chris Witta | $591.00 | Contractor — ask for invoice (NJ Marchesi drawings, possibly owner expense) |
| 2026-02-26 | Bunnings | $571.10 | Gmail search · 14 days around date OR vendor portal |
| 2026-02-06 | Claude.AI | $287.07 | console.anthropic.com → Billing → Invoices |
| 2026-03-06 | Claude.AI | $286.45 | console.anthropic.com → Billing → Invoices |
| 2026-02-05 | Flight Bar Witta | $88.95 | Vendor directly (local Witta business) |

**Total true chase: ~$1,824**

### E. Remaining small Uber/Anthropic items under threshold

Handful of remaining Q3 Uber ($7.57–$70.06, mostly $15–$50) and Anthropic trailing entries are all under $82.50 — bank line OK.

---

## Recommended workflow in Xero tomorrow

1. **15 min** — Find & Match all 47 Uber txns + 1 Qantas txn → drops gap from 70 to 22
2. **10 min** — For Claude.AI × 2, log into Anthropic console, download invoices, upload to Xero SPEND txn
3. **5 min** — Message Nic re: Chris Witta $591 (is this a contractor payment or owner drawing?)
4. **5 min** — Bunnings $571 and Flight Bar Witta $88.95 — check Gmail + vendor portals
5. **Document the under-threshold items** on BAS worksheet as "bank line sufficient per ATO $82.50 rule"

**Expected end state:** 90.6% → 97%+ coverage by count, 99%+ by value. Well above the audit threshold.

---

## Post-BAS follow-ups (non-blocking)

1. **Xero Me local mirror** — ~360 Xero-side receipts not backed up locally. Run `node scripts/sync-xero-me-receipts.mjs --apply --days 200` when convenient (~15 min, no BAS impact).
2. **Review 73 ambiguous pool matches** — `thoughts/shared/reports/ambiguous-matches-2026-04-20.md`
3. **Shell env shadow bug** — `GEMINI_API_KEY` was set in shell (`~/.zshrc` or similar) and shadowed `.env.local`. Either remove the shell export, or run scripts with `unset GEMINI_API_KEY &&` prefix. Current workaround: shell still has old key, but OCR runs via scripts have been fixed for this session.

---

## Source reports

- `thoughts/shared/reports/bas-completeness-Q2-FY26-2026-04-20.md` — Q2 detail, 28 gap txns
- `thoughts/shared/reports/bas-completeness-Q3-FY26-2026-04-20.md` — Q3 detail, 42 gap txns
- `thoughts/shared/reports/bas-completeness-Q2-Q3-FY26-2026-04-20.md` — combined roll-up
- `thoughts/shared/reports/ambiguous-matches-2026-04-20.md` — 73 pool receipts needing review
- `.claude/skills/bas-cycle/references/vendor-patterns.md` — vendor playbook
