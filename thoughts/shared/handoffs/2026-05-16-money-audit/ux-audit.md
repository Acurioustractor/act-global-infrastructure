# Finance UX Audit — 2026-05-16

Companion to `inventory.md` + `decisions.md`. After Pass A-I cleanup, 16 active finance routes remain. This audit walks each route, asks the same 5 questions, and proposes specific simplifications.

## The 5 questions

For every page:
1. **Title test** — does the h1 tell you what this page is for in 6 words or less?
2. **First-frame test** — what does the user see in the first second? (Loading skeleton, empty state, hero stat, action prompt?)
3. **One-job test** — can you describe what this page is for in one sentence without "and"?
4. **Redundancy test** — does another page already do this job?
5. **Action test** — when the page is good, what does the user click next?

## The 16 routes after Pass A

| Route | LOC | Title clarity | First frame | One job | Verdict |
|---|---:|---|---|---|---|
| `/finance` | 210 | "Operate" → ✓ clear | 10 cards | Front door to finance ops | **Keep, add "what to do today" hero** |
| `/finance/command` | 1064 | "Money in · out · alignment · incoming" → ✓ | At Risk Today pane | Single canonical money screen | **Keep as home** |
| `/finance/overview` | 1042 | "Overview" → 🟡 vague | 5 metric cards (cash, runway, FY net, AR, payables) | CEO money cockpit | **Refocus on Founder Pay + Receipt Auto; rest absorbed into /command** |
| `/finance/workbench` | 868 | (no h1, filter-driven) → 🟡 | Filters bar + queue | Unified action queue across 3 sources | **Keep, add "Start here" empty state hint** |
| `/finance/money-alignment` | 444 | "Money Alignment" → ✓ | 4 sections | Coverage / freshness / review queue | **Merge into /command middle layer** |
| `/finance/pipeline` | 1164 | "Pipeline" → ✓ | Stage columns | Deal-by-deal opportunity view | **Keep, distinct from /command** |
| `/finance/projects` | 295 | "Projects Hub" → ✓ | Project list w/ tiers | Per-project P&L list | **Keep, drill-down works** |
| `/finance/reconciliation` | 773 | "Reconciliation" → ✓ | Summary card | 95.3% match rate dashboard | **Keep, hero the % stat** |
| `/finance/receipts-triage` | 254 | "Receipts Triage" → ✓ | Bucket counts | Triage queue (missing amount, vendor, file, junk) | **Merge into /workbench filter=receipt_gap** |
| `/finance/receipt-evidence` | 1283 | (NEW, untracked) → ✓ | Evidence rows | Receipt evidence mirror | **Keep, biggest page on surface** |
| `/finance/tagger-v2` | 864 | "Tagger V2" → 🟡 vague | Queue + project badges | Rapid tag UI | **Merge into /workbench filter=needs_project** |
| `/finance/invoices` | 510 | "Invoices" → ✓ | AR/AP metrics | Invoice command | **Merge into /workbench source=xero_invoices** |
| `/finance/dext-push-audit` | 602 | (NEW) → ✓ | Audit items | Prevent Dext-Xero duplicates | **Keep, specialized** |
| `/finance/xero-page-copilot` | 564 | "Paste one Xero reconcile page" → ✓ | Paste textarea | Row-by-row action queue | **Keep, specialized** |
| `/finance/board` | 687 | "Board" → 🟡 | 6 metric cards | Curated board view | **HOLD — role-dependent, see decisions.md** |
| `/finance/accountant` | 574 | "Accountant" → 🟡 | 6 query cards | Curated accountant view | **HOLD** |
| `/finance/revenue` | 386 | "Revenue" → 🟡 | Revenue chart + scenarios | Revenue stream sequencing | **HOLD** |

## End-state target (after 2-3 more sessions)

**11 finance routes** (down from 16):

```
/finance                       (index hub)
/finance/command               (canonical home — Money Command)
/finance/workbench             (action queue — absorbs tagger-v2, receipts-triage, invoices)
/finance/xero-page-copilot     (paste-a-page tool)
/finance/dext-push-audit       (Dext duplicate prevention)
/finance/receipt-evidence      (evidence mirror)
/finance/reconciliation        (95.3% match rate dashboard)
/finance/overview              (CEO cockpit — refocused on Founder Pay + Receipt Auto)
/finance/pipeline              (deal-by-deal)
/finance/projects (+ [code])   (per-project P&L)
/finance/board · /accountant · /revenue   (role views — HOLD)
```

## Top-3 concrete simplifications (shipping this session)

### 1. Group nav by job-to-do

Current: 14 unstructured finance items, alphabetical-ish. Cognitive load high.

Proposed structure (5 groups):

```
Finance
├── Today
│   ├── Money Command           ⭐ canonical home
│   ├── Workbench               ⭐ action queue
│   ├── Xero Page Copilot
│   └── Dext Push Audit
├── Receipts & spending
│   ├── Reconciliation
│   ├── Receipts Triage
│   └── Receipt Evidence
├── Money state
│   ├── CEO Cockpit (overview)
│   ├── Money Alignment
│   └── Projects P&L
├── Pipeline & invoices
│   ├── Pipeline
│   ├── Invoice Command
│   └── Rapid Tagger
└── Role views
    ├── Board Report
    ├── Accountant Pack
    └── Revenue Sequencing
```

### 2. /finance index — add "What needs you today?" hero

The 10-card grid is fine. But add at the top: a single banner that reads from `/api/finance/command` and surfaces the top 3 *do-this-now* signals:

> **3 things waiting**: 32 transactions untagged (Workbench) · 8 receipts ready to attach (`xero-copilot-execute`) · last digest 4 days ago (`narrate-weekly-digest`)

One click each goes to the exact page + filter. The card grid becomes "explore further".

### 3. /finance/reconciliation — hero the 95.3% match rate

Currently the headline number is buried in section 2. Move it to the page header. The headline IS the page.

## Lower-priority simplifications (next sessions)

- **Title clarity pass** — pages with vague h1s ("Overview", "Tagger V2", "Board", "Accountant", "Revenue") rename to job-to-do titles ("CEO money cockpit", "Rapid tagger", "Board report", "Accountant pack", "Revenue sequencing"). Half of these are already-good labels in nav but the page h1 itself is shorter/weaker. Sync them.
- **Workbench empty-state hint** — when filter returns 0, show "Nothing here. Try [another filter]" with a one-click swap.
- **Tagger-v2 sunset** — when workbench's filter=needs_project is fully featured, deprecate tagger-v2 + redirect.
- **Receipts-triage sunset** — same; workbench filter=receipt_gap supersedes.
- **Invoices sunset** — workbench source=xero_invoices covers most. Keep page only for AR/AP collection drill.
- **CEO cockpit refocus** — strip /finance/overview down to just FounderPayCard + ReceiptAutomationCard; everything else moves to /command.

## AI-leverage UX additions

Now that we have `finance_ai_routing_suggestions`, the workbench should grow these columns:
- `ai_suggested_code` (the grader's pick)
- `ai_confidence` (numeric badge)
- `ai_reason` (tooltip)
- `ai_risk_flags` (chips: high_value, duplicate_risk, etc.)

When `ai_confidence >= 0.85` AND `ai_suggested_code` not in [ASK_USER, SL_REVIEW], show a one-click **Accept** button that applies the suggestion in place.

This makes the workbench the "review AI's work" surface instead of the "do everything yourself" surface.

## Out of scope

- The 3 HOLD routes (board, accountant, revenue) need their own role-model refactor.
- /finance/receipt-evidence at 1284 LOC is its own audit later.
- The action tier of execute buttons (Xero copilot) needs UI in workbench, not its own page.
