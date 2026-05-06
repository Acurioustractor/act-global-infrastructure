# ACT Money Brain Plugin — Handoff (2026-05-06)

## Status: shipped, ready to test

11 skills + 8 slash commands pushed to https://github.com/Acurioustractor/act-claude-plugins (commit `637fa91`). Local install in sync at `~/.claude/plugins/act-money-brain/`.

## What was built today

### 7 new skills (Tier 1 + Tier 2)
| Skill | Trigger |
|---|---|
| `act-pile-movement-analyst` | "How is Voice trending?" / "is the pile mix on track?" |
| `act-decisions-drafter` | "Log this decision" / "we've decided to..." |
| `act-action-spawn` | "Convert this digest into actions" / post-meeting |
| `act-standup-synthesizer` | "What's the stand-up?" / Monday brief |
| `act-cash-scenario-builder` | "What if Goods doesn't land until Q3?" / scenario asks |
| `act-rd-activity-drafter` | Capturing R&DTI Path C activities (FY25-26) |
| `act-funder-outreach-drafter` | "Draft a renewal ask for Snow Foundation" |

### 5 new slash commands
- `/standup` — daily 4-section brief
- `/pile-mix` — pile mix vs FY27 target + concentration risk
- `/decision <description>` — draft Decisions Log entry
- `/scenarios` — Base/Upside/Downside cash scenarios
- `/draft-funder <name> <type>` — funder outreach in ACT voice

### Existing (already deployed)
- Skills: `act-money-context` (auto-loads), `act-funder-research`, `act-money-operations`, `act-grant-triage`
- Commands: `/money-status`, `/brief-funder`, `/find-grants`

## Test plan after `/clear`

Pick any of these to verify the new skills load + work:

1. **`/standup`** — should pull bank delta, AR changes, Decisions Log Proposed > 3d, Action Items Critical/High due today, GHL opps last 24h.
2. **`/pile-mix`** — should query `xero_invoices`, classify into Voice/Flow/Ground/Grants, compare to FY27 targets, flag concentration risk.
3. **`/scenarios`** — Base/Upside/Downside cash projections with explicit drivers.
4. **`/decision Standard Ledger advised 328-G rollover not 122-A`** — should produce a draft Decisions Log entry for review.
5. **`/draft-funder Snow Foundation renewal`** — should pull from Foundations DB + GHL + Xero history, draft in ACT voice.
6. **"Spawn actions from this digest: [paste]"** — invokes `act-action-spawn`.
7. **"Capture this as an R&D activity: built ALMA evidence model in March, evaluated 3 approaches..."** — invokes `act-rd-activity-drafter`.

## Key context to reload after `/clear`

- ACT Pty cutover 30 Jun 2026 — canonical ledger `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- Money alignment cockpit at `/finance/money-alignment`
- Three thesis docs in `wiki/finance/`:
  - `act-money-thesis-discussion.md`
  - `founder-pay-and-rd-thesis-fy26-fy27.md`
  - `act-money-thesis-rebuttal.md` (rules-grounded corrections — Subdiv 328-G, CGT concessions, IPP-JV, PSI/PSB, $180-220K R&D refund)
- Plugin marketplace lives at `/Users/benknight/Code/act-claude-plugins/`
- Local install path: `~/.claude/plugins/act-money-brain/`

## Files changed this session (uncommitted in main repo)

```
M .gitignore
M thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md
?? scripts/draft-jvt-palm-island-invoice.mjs
?? scripts/export-sole-trader-to-pty-mapping.mjs
?? scripts/search-xero-knight-bank-descriptions.mjs
?? scripts/search-xero-knight-photography.mjs
?? thoughts/shared/plans/finance-cutover-review-workflow.md
?? thoughts/shared/plans/knight-photography-fy26-invoice-proposal.md
?? thoughts/shared/reports/act-money-alignment-2026-05-01.md(.provenance.md)
?? wiki/decisions/2026-05-harvest-subsidiary-structure.md
?? wiki/finance/act-money-thesis-discussion.md
?? wiki/finance/act-money-thesis-rebuttal.md
?? wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md
?? wiki/finance/sole-trader-pty-cutover-strategy.md
```

(These are pre-existing — not from today's plugin work.)

## What to do next session

1. `/clear`
2. Read this handoff
3. Pick a command from "Test plan" above and run it
4. If a skill misfires, edit `~/.claude/plugins/act-money-brain/skills/<name>.md`, then mirror to `/Users/benknight/Code/act-claude-plugins/plugins/act-money-brain/skills/<name>.md`, commit, push.

## Reinstall path (if needed)

```bash
claude plugin update act-money-brain@act-claude-plugins
# or
claude plugin uninstall act-money-brain
claude plugin install act-money-brain@act-claude-plugins
```
