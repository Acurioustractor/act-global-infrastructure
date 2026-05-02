# ACT Steering Files

This repo has several kinds of steering files. They should not all live in the same place.

The rule: root-level files orient agents and developers; `wiki/` holds the canonical philosophy and operating model; `docs/` holds system architecture; `thoughts/` holds working memory.

## Authority Order

1. `AGENTS.md` - agent and implementation rules for this repo.
2. `STEERING.md` - this map of where steering truth lives.
3. `llms.txt` - small LLM-facing entrypoint for external assistants and repo indexers.
4. `.soul` - root pointer to the canonical soul file.
5. `wiki/concepts/soul.md` - the upstream why. If another layer contradicts this, soul wins.
6. `wiki/concepts/act-identity.md` - who ACT is.
7. `wiki/concepts/lcaa-method.md` - how ACT works.
8. `wiki/concepts/four-lanes.md` - how money sustains the work.
9. `wiki/decisions/act-core-facts.md` - canonical entity and structure facts.
10. `docs/architecture/` - system architecture and integration design.
11. `thoughts/shared/` - plans, handoffs, drafts, reports, and working memory.

## The Core Stack

| Layer | Canonical file | Purpose |
| --- | --- | --- |
| Soul | `wiki/concepts/soul.md` | Why Ben and Nic do this work. The upstream file. |
| Identity | `wiki/concepts/act-identity.md` | What A Curious Tractor is. |
| Method | `wiki/concepts/lcaa-method.md` | Listen, Curiosity, Action, Art as operating practice. |
| Obsolescence | `wiki/concepts/beautiful-obsolescence.md` | The handover discipline. |
| Economy | `wiki/concepts/four-lanes.md` | To Us, To Down, To Grow, To Others. |
| Structure | `wiki/decisions/act-core-facts.md` | Entities, ABNs/ACNs, banks, and canonical operating facts. |
| Projects | `wiki/projects/` | The durable project pages. |
| Surfaces | `apps/website/`, `apps/command-center/` | Public and operational interfaces. |

## Where New Steering Belongs

Use `wiki/concepts/` for philosophy, methods, frameworks, taxonomies, and theories.

Use `wiki/decisions/` for choices that should not drift: entity structure, operating rules, canonical facts, governance decisions, naming decisions.

Use `docs/architecture/` for system design, integration architecture, data flows, and implementation-level architecture.

Use `AGENTS.md` for agent behavior, repo rules, codebase navigation, verification discipline, and "never do this" instructions.

Use `CLAUDE.md` only for Claude-specific project rules. Keep it aligned with `AGENTS.md`, but do not make it the only source of repo truth.

Use `llms.txt` as the short entrypoint for ChatGPT-style tools and repo indexers. Keep it concise and link out to canonical files instead of copying their content.

Use `thoughts/shared/plans/` for active plans and trackers. Plans are not canonical once the decision has settled. Promote settled truth into `wiki/`.

Use `thoughts/shared/handoffs/` for session continuity. Handoffs explain what happened, but they are not the long-term source of truth.

## Dotfile Rule

The repo now has a physical `.soul` file because people and agents expect to find it at the root.

Root dotfiles should be pointers only. Do not put long philosophical content in root dotfiles. That creates drift.

If future root anchors are needed, use the same pattern:

- `.soul` points to `wiki/concepts/soul.md`
- `.identity` would point to `wiki/concepts/act-identity.md`
- `.method` would point to `wiki/concepts/lcaa-method.md`
- `.economy` would point to `wiki/concepts/four-lanes.md`

Do not create those extra dotfiles unless a tool or workflow actually needs them.

## Working Rule For Agents

Before changing public copy, project positioning, entity language, money logic, or strategic architecture:

1. Read `STEERING.md`.
2. Read `.soul`.
3. Read the canonical wiki file for the layer being changed.
4. Make the change in the canonical layer first if the truth has moved.
5. Then update downstream surfaces.

If a question is about "why", start at `wiki/concepts/soul.md`.
If a question is about "who we are", start at `wiki/concepts/act-identity.md`.
If a question is about "how we work", start at `wiki/concepts/lcaa-method.md`.
If a question is about money, start at `wiki/concepts/four-lanes.md`.
If a question is about entities, start at `wiki/decisions/act-core-facts.md`.
