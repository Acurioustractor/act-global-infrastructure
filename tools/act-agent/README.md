# act-agent CLI (DEPRECATED)

> **⚠️ DEPRECATED**: This tool has been replaced by [Vibe Kanban](https://www.vibekanban.com/).
>
> Use `npx vibe-kanban` instead.

## Why Deprecated?

Vibe Kanban provides:
- Parallel agent execution (run 5+ agents simultaneously)
- Git worktree isolation (no conflicts)
- Built-in code review
- Real-time agent monitoring

## What This Tool Did

act-agent was a CLI for Notion-based task tracking with:
- Mobile notifications via Notion app
- RED card when agent blocked
- Async communication flow

## Restoring This Tool

If you need the Notion-based mobile workflow again:

```bash
cd /Users/benknight/act-global-infrastructure/tools/act-agent
npm install
npm run build
npm link
```

Then use the CLI:
```bash
act-agent create "Task name" --project "Empathy Ledger"
act-agent block <id> "Question?"
act-agent unblock <id>
act-agent complete <id>
```

## Original Documentation

See `skill.md.bak` for the original skill documentation.
