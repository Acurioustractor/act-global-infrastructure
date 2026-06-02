# Project-Aligned Finance — design (2026-06-03)
_Tag every dollar (in and out) to a project, then read business strength per project and whole-org every week._

## 1. Where we are

ACT tags both spend (`xero_transactions`) and income (`xero_invoices`) to ACT-XX project codes by writing `project_code` + `project_code_source` onto the Supabase mirror rows (shared instance `tednluwflfhxyucgwigh`), not by relying on Xero alone. The canonical list is the `projects` table overlaid by `config/project-codes.json` — 75 codes, each carrying a `xero_tracking` option string ("ACT-XX — Name"), aliases, `ghl_tags`, `dext_category`. Two layers tag: the Xero sync writes `project_code` straight from a line's "Project Tracking" tag (Phase 3), and standalone taggers backfill the rest by vendor/keyword/tracking rules — all honouring a hard guard (rows with `project_code_source LIKE 'manual%'` are never overwritten).

Gaps:
- **Income is the weak axis.** ~71% of income sits in locked periods that cannot carry a Xero tag (per code comment), so most historical invoice income is tagged only by backfill heuristics or not at all. RECEIVE-TRANSFER settlements get force-coded to ACT-CORE, undercounting the originating project.
- **Two divergent sources of truth.** Xero sync writes ONLY from Project Tracking tags (strict); the backfill taggers write from vendor/keyword/contact heuristics. A `keyword_match` row has no matching Xero tag unless `tag-xero-transactions.mjs` Phase 2 later pushes it — so Supabase and Xero can disagree.
- **Untagged flow silently disappears.** `calculate-project-monthly-financials.mjs` buckets null `project_code` into UNTAGGED and skips it; per-project totals can fall materially short of the org total with no surfaced gap. Account 429 General Expenses (~$486K, incl. ~$144K TFN) carries no project signal and must be recoded by hand.
- **Reported "matched to projects" overstates reality.** `detectProjectCode`'s full text/contact fallback feeds the stat counter but is NOT persisted — only the Project Tracking tag write persists.

## 2. Tagging protocol (the rules)

Every transaction line carries four orthogonal facts. Tag at the **line** level, never the header.

| Fact | Axis | Rule |
|---|---|---|
| **Project** | Tracking category "Project Tracking" → ACT-XX | Required on entry. One option per project code. Income lines AND spend lines. |
| **Account** | Chart of accounts (e.g. 429) | Account = expense TYPE, never a project proxy. Many:many with project, uncoupled. |
| **Tax** | Tax type (GST / GST-free / BASEXCLUDED) | Set at capture via Dext supplier rule. |
| **Contact** | Xero contact ↔ GHL | Deduped contact; contact→project link maintained on CRM side, not used to set tx project_code on the persisted path. |

Rules:
- **Two tracking categories max** (Xero hard cap, 100 options each). Spend them deliberately: one = **Project**, the second = **funder/entity**. Never explode two axes into one list ("ACT-GD—Concrete"). Cannot filter both at once in standard reports — export or Syft/Calxa for cross-cuts.
- **Tag income to project, not just spend.** Untagged revenue is the silent gap that breaks the strength read. Tag invoice LINES; Xero Projects revenue does NOT reach the tracking-category P&L.
- **Dext aligns IN and OUT at capture.** Supplier/Customer Rules set account + tax + tracking before the doc hits Xero; Auto-Publish pushes it coded. Set tracking defaults inside bank rules + repeating bills so recurring lines self-tag.
- **One canonical project-code source** — the `projects` table overlaid by `config/project-codes.json` via `project-loader.mjs`. Every tagger consumes this; no second list.
- **Don't separate GL account ranges per project** (anti-pattern — clutters chart, breaks consolidation). Project lives in the tracking dimension.

Pitfalls to avoid: General-Expenses/untagged drift (no retroactive bulk-tag in Xero — enforce at entry); header-only tagging hiding splits; tracking-option sprawl (archive dead options, never rename ones with history); **payroll gap** — Xero payroll does not honour both tracking categories, so verify wage tracking separately; contact sprawl breaking reconciliation.

## 3. Sync architecture

| Flow | Mechanism | Auto? |
|---|---|---|
| Dext → Xero | Supplier/Customer rule codes account+tax+tracking at capture; Auto-Publish pushes coded bill/spend | yes (future docs only) |
| Xero ↔ Supabase | `sync-xero-to-supabase.mjs` mirrors invoices/tx; taggers backfill `project_code`; `tag-xero-transactions.mjs` Phase 2 pushes tracking back to Xero | yes |
| Xero line → tracking | Accounting API `update-bank-transaction`/`update-invoice` writes tracking option per line; `apply-xero-tracking-backfill.mjs` | yes |
| GHL invoice → Xero | Native GHL Payments–Xero one-way: invoice + lines + status (Sent/Paid/Void) pushed; contact matched/created | yes |
| Xero contacts → GHL | Native connector imports contacts on connect (one-way, initial only) | yes |
| GHL contact edits → Xero | NOT in native connector — needs Zapier/Make keyed on email | (unverified in ACT stack) |
| GHL opps → project_code | `align-ghl-opportunities.mjs` matches name/pipeline, auto-assigns at conf >0.7; Notion Opportunities mirror | yes |
| Xero payments → acquittal ledger | Supabase → `sync-opportunities-to-notion.mjs` + grant-tranche scripts (filter `status=PAID`, not `amount_due=0`) | yes |

Ceilings (hard):
- **No Bank Rules API** — UI-only (declined). Capture-time coding must live in Dext, not scripts.
- **No statement-line reconcile API** — `IsReconciled` is UI-only; raw unreconciled lines not exposed. `/finance/reconcile` is read-only by design; the click stays in Xero.
- **2 tracking categories per org**, 60 calls/min + 5,000/day per org (sleep ~1100ms, batch bulk recodes).
- **Xero Projects ≠ tracking** — a Project is not a tracking option, doesn't appear in tracking-filtered P&L, can't retro-tag historical tx. ACT uses tracking, not Projects (Projects API unverified-in-use).

## 4. Weekly business-strength report

### Sections + KPIs

| Section | KPIs |
|---|---|
| **Whole-org snapshot** | Cash on hand (#8815 + ACT Everyday, ex personal/savings); net cash flow wk/MTD; runway (cash ÷ trailing-3mo burn); burn rate; income vs spend MTD; receipted % |
| **Per-project P&L** | Income, spend, net surplus/deficit per code; budget-vs-actual variance %; % budget consumed; funded vs self-funded split |
| **People costs** | Payroll+contractor (MTD, trailing-3mo); people as % of spend; per-project allocation (e.g. Joey 50/50 GD/HV); founder drawings flagged separately; unallocated people cost |
| **GST / tax** | GST collected vs paid (net BAS); est. BAS owing/refund; BASEXCLUDED+GST-free share (sanity); R&D-eligible YTD + est. 43.5% offset; receipt-coverage gap on claimable spend |
| **Committed / betting on** | Forward spend (open bills, recurring subs, payroll run-rate); committed-but-unfunded; weighted pipeline (opp × prob); secured-unbilled tranches; cash gap = committed − (cash + secured) |
| **Opportunities & pile mix** | Top open opps by value/stage; pile mix vs target (Voice/Flow/Ground/Grants); single-funder concentration %; next-90-day inflows; stalled opps |

### Alerts (trigger → why)

| Trigger | Why |
|---|---|
| Project actual >10% over budget, OR >90% budget consumed with scope left | Catch overspend weekly so the project re-scopes/re-funds before the deficit compounds |
| Income lands with no project code, OR spend posts to a generic account (429) | Untagged in/out distorts every per-project P&L; the $486K GE pile shows how fast it corrupts |
| Org net margin drops >15pts vs trailing-3mo, OR a project flips surplus→deficit | Margin drop is the earliest leading signal; beats discovery in the quarterly P&L |
| Runway <6 months at current burn, OR committed-unfunded > cash + secured | The most decision-relevant numbers — below threshold = fundraise/cut now |
| Net BAS liability moves materially, OR claimable spend lacks a receipt as BAS closes | A surprise BAS is a runway event; missing receipts forfeit GST credits + weaken R&D evidence |
| Single funder >50% of secured income, OR a large opp stalls N weeks | Concentration + pipeline stall are the income-side overspend; threaten runway from the revenue side |

### Graphs to build (command-center)

| Name | Type | Source |
|---|---|---|
| Cash & runway trend | line | `ledger.ts` cash over time + projected-burn dashed line, runway annotation |
| Income vs spend per project | grouped bar | `project_monthly_financials` by tracking code |
| Budget vs actual variance | horizontal bar | `finance/budgets.ts` vs actual; red past threshold |
| Spend composition | stacked bar | `ledger.ts` monthly split: people / project-direct / overhead / drawings |
| Org net cash flow | waterfall | `ledger.ts` inflows − outflows by type (RECEIVE/SPEND/drawings/transfers) |
| Committed / betting on | stacked area or sankey | `finance/pipeline-rollup.ts`: secured + weighted pipeline vs committed forward spend |
| GST / BAS position | bar (collected vs paid + net) | line_items GST by tax_type for the quarter |
| Pile mix vs target | donut / 100% stacked | GHL/Notion opps pile vs FY27 target + concentration flag |

(`finance/budgets.ts` and `finance/pipeline-rollup.ts` referenced as report sources — confirm they exist before wiring (unverified).)

## 5. Pty cutover hooks (30 Jun 2026)

| Change | Hook |
|---|---|
| **Entity split** | Sole trader (Nic, ABN 21 591 780 066) → A Curious Tractor Pty Ltd (ABN 36 697 347 676). Pre-cutover spend stays on sole-trader accounts; new spend on Pty. Project codes carry across both. |
| **R&D tagging** | CT Pty Ltd is the only R&D claimant (FY25-26, lodge by 30 Apr 2027). FY24-25 forfeited (sole-trader, ineligible). Founder drawings flagged separately so R&D basis isn't inflated (81% of the FY26 R&D-eligible flag was drawings → real basis ~$55K). |
| **Two-account rule** | ACT spend lives ONLY in NAB Visa #8815 (credit card) + NJ Marchesi T/as ACT Everyday (bank). Exclude NM Personal + ACT Maximiser from all project totals. `tagging-guard.mjs` `ACT_BANK_ACCOUNTS` enforces. |
| **Goods = Butterfly DGR** | Goods on Country = The Butterfly Movement Ltd (ABN 22 155 132 684), endorsed DGR/PBI since 2012, handover 26 Jun 2026. Goods grant income tags to its codes, not ACT Pty. Charity = grants/DGR; Pty = commercial + R&D claimant. |
| **Second tracking axis** | Use the second tracking category for **entity/funder** so post-cutover the P&L splits ACT Pty vs Butterfly cleanly without a third Xero org. |

## Sources

- Xero Tracking Categories vs Projects (job costing setup) — Planyard: https://planyard.com/blog/tracking-categories-in-xero-for-contractors-the-practical-setup-for-job-costing
- Xero Projects and Tracking Categories: Job Costing & Unit-Level P&L — FHP Accounting: https://fhpaccounting.co.uk/xero-projects-and-tracking-categories/
- Using Xero Tracking Categories to Get Better Reports — Accountingprose: https://blog.accountingprose.com/xero-tracking-categories
- Xero Payroll Tracking Categories Guide (workaround) — Satva Solutions: https://satvasolutions.com/blog/xero-payroll-dual-tracking-categories
- Set up tracking categories and options — Xero Central: https://central.xero.com/s/article/Set-up-tracking-categories
- Project tracking: Categories or Xero Projects — Xero Central community: https://central.xero.com/s/question/0D53m00008M7AZOCA3/are-the-only-options-for-project-tracking-to-use-categories-or-xero-project
- Bank rules in the API (declined) — Xero Developer: https://xero.uservoice.com/forums/5528-xero-accounting-api/suggestions/36208999-bank-rules-in-the-api
- Reconcile via the API (declined) — Xero Developer: https://xero.uservoice.com/forums/5528-xero-accounting-api/suggestions/2884040-reconcile-via-the-api
- Accounting API — Bank Transactions: https://developer.xero.com/documentation/api/accounting/banktransactions
- Accounting API — Bank Statements: https://developer.xero.com/documentation/api/accounting/bankstatements
- Accounting API Overview (CRUD + pagination): https://developer.xero.com/documentation/api/accounting/overview
- OAuth 2.0 API limits (60/min, 5000/day): https://developer.xero.com/documentation/guides/oauth2/limits/
- Projects API (Tasks): https://developer.xero.com/documentation/api/projects/tasks
- xero-node — Projects API reference: https://xeroapi.github.io/xero-node/projects/index.html
- Dext — Using supplier and customer rules: https://help.dext.com/en/articles/216125-how-to-use-supplier-and-customer-rules-in-dext
- Dext — Rules and automation: https://help.dext.com/en/articles/416713-rules-and-automation-in-dext
- App Advisory Plus — Automatic Publishing in Dext: https://www.appadvisoryplus.com/resources/news/when-and-how-should-you-use-automatic-publishing-in-dext
- HighLevel Support — Xero Integration: https://help.gohighlevel.com/support/solutions/articles/155000006078-xero-integration-with-highlevel
- HighLevel Changelog — Invoices: Xero Integration Now Live: https://ideas.gohighlevel.com/changelog/invoices-xero-integration-now-live
- Profitability dashboard — Xero Central: https://central.xero.com/s/article/Profitability-dashboard
- Profitability at a glance in Xero Projects — Xero Blog: https://blog.xero.com/accountants-bookkeepers/profitability-at-a-glance-in-xero-projects/
- Syft Analytics — Xero Tracking Categories dashboards: https://www.syftanalytics.com/content/xero-tracking-categories
- Analytics powered by Syft — Xero: https://www.xero.com/us/accounting-software/analytics/analytics-by-syft/
- List of Default Financial KPIs — Fathom: https://support.fathomhq.com/en/articles/2330939-list-of-default-financial-kpis
- Build Smarter Financial Dashboards with Fathom — Accounting Department: https://www.accountingdepartment.com/blog/build-smarter-financial-dashboards-with-fathom
- Best 3 Forecasting Tools: Excel vs Fathom vs Syft — GM Professional Accountants: https://gmprofessionalaccountants.co.uk/2025/10/best-3-forecasting-tools-for-better-insights-excel-vs-fathom-vs-syft/
- Budget vs Actual Dashboard (overspend alerts) — Bold BI: https://www.boldbi.com/dashboard-examples/finance/budget-vs-actual-dashboard/
- Track Cash Position in Xero (burn rate & runway) — ScaleSuite: https://www.scalesuite.com.au/resources/track-cash-position-in-xero
- How Xero populates the Simpler BAS / GST position — Xero Central: https://central.xero.com/s/article/How-Xero-populates-the-Simpler-BAS
