# Handoff — 2026-05-26 — Harvest finance cleanup · command-center login · overview audit

Long session. Three things shipped, one big audit queued. All Supabase retags are **Supabase-only**
(Xero untouched — the push-back is still the separate task #14).

## 1. The Harvest (ACT-HV) spend — reviewed, deduped, clean
- **Rule reaffirmed:** Harvest spend = **from 1 Jan 2026** only. Pre-Jan rows are NOT Harvest.
- **Xero re-authed** (token had expired 2026-05-18) via `node scripts/xero-auth.mjs`; ran `sync-xero-to-supabase.mjs full`. Bank data current to 2026-05-25. **Tenant: Nicholas Marchesi** (sole trader).
- **Swept 132 pre-Jan rows ($65,815) out of ACT-HV** — the full sync had re-tagged them via `xero_tracking` + vendor rules. Stamped `manual-untagged-pre-jan26`. ⚠️ **They return on every full sync** until the Xero tracking categories are removed (push-back session).
- **Joey = "Joseph Kirmos"** (acct 486 "Provision of Labour"). Labour split **50/50 ACT-GD/ACT-HV**: 4 post-Jan invoices ×$4,500 → $9K Harvest + $9K Goods (`manual-joey-5050-2026-05-26`). His vendor rule auto-tags ACT-GD, so **each new Joey invoice needs half moved manually**.
- **Removed ~$26,291 of duplicates** (all `manual-duplicate-*`): Sophie placeholder bills $4,950+$1,140; Joey 29-Mar dup; Kennedy's $8,525 (audit-flagged); 6 "placeholder bills" (Total Tools/Maleny Landscaping/Bunnings — templated `"Vendor — Materials — ACT-HV"`, no invoice #, duplicating a real bank payment); Maleny Landscaping $1,305; Maleny Hardware $113.40 ×2; Salin $228.90.
- **Final clean ACT-HV: $99,890 gross / ~$99,580 deduped** (36 suppliers, post-Jan).
  Categories: Garden & landscaping $37.8K · Paths/structures (timber) $26.5K · Materials $17.8K · Design $16.9K · Tools $12.9K · Labour (Joey 50%) $9K · Hospitality $4.1K.
- **Still untouched (Ben's eye):** Maleny Landscaping $1,305 "Hardwood Chip" 2-load question; tiny Nest-in-Witta repeats; Bunnings $310.32 legit bill+payment pair.

## 2. Shipped to production (command.act.place) — merged to `main`, deployed, verified
Branch `wip/harvest-stage-budget-2026-05-26` (5 commits) → fast-forwarded to main → Vercel deployed. Verified live.
- **Stage budget page:** `/finance/projects/ACT-HV` → "Build budget by stage" (garden pinned). Config: `apps/command-center/src/lib/harvest-budget.ts` (DRAFT budgets + vendor→zone map — **Ben to set real budgets**). Reuses the deduped `realExpenseRows`.
- **Deep-linkable transaction picker:** `/finance/transactions?project=ACT-HV&since=2026-01-01&accounts=all` now reads filters from URL.
- **🔐 Shared-password login gate (NEW):** all command-center pages now gated. `DASHBOARD_PASSWORD=tractorsrcool` set in Vercel (Production+Preview). Files: `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/api/login/route.ts`, `src/lib/dash-auth.ts`. Webhooks/health/wiki host stay public. **Nic's one-click link: `https://command.act.place/login?k=tractorsrcool`** (30-day cookie). Change pw = update Vercel env + redeploy.

## 3. Notion (acurioustractor workspace) — live, deduped, shareable
- Page: **The Harvest — Spend to date** `36cebcf981cf8167b6a6dfcfaf4c855d` (headline $99,890).
- Database: **Spend by supplier** `5374cef6246641e6b66423dfc3cbec1c` (36 supplier rows + 2 zeroed dups, updated in place). Group by Category / filter Garden area.
- It's a **private page** — Ben needs to Share→invite or Publish for Nic (MCP can't set Notion permissions; teamspace move was blocked).

## 4. ⏭ NEXT: Company Overview (/company) data audit — DONE, remediation PENDING
Full audit: **`thoughts/shared/reviews/2026-05-26-company-overview-data-audit.md`**. The `/company` dashboard
(`api/intelligence/route.ts`) is largely broken — **schema drift** (queries `project_health.health_score`,
`opportunities_unified.value`, and tables `contacts`/`communications` that don't exist), a **sign bug**
(expenses use `total<0` but SPEND is positive → $0 exp, $1.4M fake revenue incl. transfers), **ignores ACCPAY bills**,
**hardcoded wrong R&D deadline (Apr 30)** + `89000` cash fallback, and an **unfiltered calendar (815 meetings)**.
Start with **P0** (type-based P&L + deduped bills, fix the 4 column/table names, real cash, drop the deadline,
filter calendar) — best done fresh with that doc as the brief. P3 = one shared `lib/finance.ts` + a CI "column exists" smoke test + a "no silent zero" rule.

## Repo state at /clear
- On branch `wip/harvest-stage-budget-2026-05-26` (already merged to main). Audit doc + this handoff committed.
- Untracked: throwaway Playwright screenshots in repo root (`login-page.png`, `harvest-*.png`) — safe to delete.
- Pre-existing uncommitted wiki/doc edits (not from this session) remain.
