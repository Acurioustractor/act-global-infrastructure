# Domain Docs

How mattpocock engineering skills should consume this repo's ACT domain documentation when exploring the codebase.

This repo does not use a vanilla `CONTEXT.md` / `docs/adr/` layout. Use ACT's existing multi-source steering structure instead.

## Before Exploring, Read These

Start with:

- `STEERING.md` - map of where steering truth lives and the authority order.
- `.soul` - root pointer to the canonical soul file.
- `wiki/concepts/glossary.md` - cross-ACT glossary and canonical terms.

Then read the specific canonical files for the area being touched:

- `wiki/concepts/` - philosophy, methods, frameworks, taxonomies, and domain language.
- `wiki/decisions/` - settled strategic decisions, operating rules, entity facts, naming decisions, and governance decisions.
- `docs/architecture/` - system architecture, integration design, data flows, and implementation-level architecture.
- `docs/governance/git-branching.md` - branch and worktree hygiene before branch/process work.

Use `thoughts/shared/` for active plans, handoffs, reports, and working memory. Do not treat `thoughts/shared/` as canonical once a decision has settled.

## Where Skills Write

`grill-with-docs`, `improve-codebase-architecture`, and similar skills default to creating a vanilla `CONTEXT.md` and `docs/adr/`. **Do not create either** — that forks ACT's domain truth and causes the doc-rot split-brain the wiki exists to prevent. ACT already has these surfaces; write to them instead:

- **Resolved domain term / sharpened vocabulary** → append to `wiki/concepts/glossary.md` (or the relevant `wiki/concepts/*.md`). Never a root `CONTEXT.md`.
- **Architecture Decision Record** (only when it is hard-to-reverse, surprising-without-context, AND the result of a real trade-off) → `wiki/decisions/<YYYY-MM-DD>-<slug>.md`, matching the existing decision-record style. Never `docs/adr/`.
- **Implementation-level architecture** (data flows, integration design) → `docs/architecture/`.

If you catch yourself about to create `CONTEXT.md` or `docs/adr/`, stop and use the targets above.

## Vocabulary Rules

Use terms exactly as defined in `wiki/concepts/glossary.md` and the relevant `wiki/concepts/*.md` files.

Always spell out Australian Living Map of Alternatives (ALMA) on first use.

Do not describe Australian Living Map of Alternatives (ALMA) as:

- the Soul
- an AI agent
- a ranking engine
- a measurement dashboard
- a replacement for human or community authority

Describe Australian Living Map of Alternatives (ALMA) as ACT's catalogue of community-led alternatives, evidence-graded with cultural authority.

## Decision Conflicts

If a recommendation contradicts a settled decision in `wiki/decisions/`, surface the conflict explicitly rather than silently overriding it.

Use this shape:

> Contradicts `wiki/decisions/<file>.md` - but worth reopening because...

Only recommend reopening a decision when the friction is real and current, not theoretical.

## Architecture Work

For architecture reviews and refactors, read:

- `STEERING.md`
- `wiki/concepts/glossary.md`
- relevant `wiki/concepts/*.md`
- relevant `wiki/decisions/*.md`
- relevant files in `docs/architecture/`

Use ACT's repo-local implementation rules from `AGENTS.md` and `CLAUDE.md` alongside these domain docs.
