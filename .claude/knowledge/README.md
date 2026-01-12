# ACT Shared Knowledge Base

This directory contains shared context and knowledge for all ACT ecosystem projects. It is symlinked to each project so Claude Code agents have access to cross-project information.

## Files

| File | Purpose |
|------|---------|
| `act-ecosystem.md` | Overview of all projects, paths, and purposes |
| `cultural-protocols.md` | OCAP principles, cultural review requirements |
| `tech-stack.md` | Shared technology patterns and code examples |
| `integrations.md` | How projects connect and share data |

## Usage

When working in any ACT project, agents can reference this knowledge:

```
Read .claude/knowledge/act-ecosystem.md to understand the project landscape
Read .claude/knowledge/cultural-protocols.md before building storyteller features
Read .claude/knowledge/tech-stack.md for code patterns
```

## Symlinked To

- `/Users/benknight/Code/empathy-ledger-v2/.claude/knowledge`
- `/Users/benknight/Code/JusticeHub/.claude/knowledge`
- `/Users/benknight/Code/act-farm/.claude/knowledge`
- `/Users/benknight/Code/the-harvest/.claude/knowledge`
- `/Users/benknight/Code/goods/.claude/knowledge`
- `/Users/benknight/Code/act-placemat/.claude/knowledge`
- `/Users/benknight/Code/act-regenerative-studio/.claude/knowledge`

## Updating

Edit files in the source location:
`/Users/benknight/act-global-infrastructure/.claude/knowledge/`

Changes automatically reflect in all symlinked projects.
