# Vibe Kanban - ACT Ecosystem Integration

## Overview

Vibe Kanban provides task orchestration for all 7 ACT ecosystem projects with parallel agent execution and git worktree isolation.

## Symlink Status

All projects have the `agent-kanban` skill available (now referencing Vibe Kanban):

| Project | Symlink | Status |
|---------|---------|--------|
| Empathy Ledger | `.claude/skills/global/agent-kanban` | ✅ |
| JusticeHub | `.claude/skills/global/agent-kanban` | ✅ |
| ACT Farm | `.claude/skills/global/agent-kanban` | ✅ |
| The Harvest | `.claude/skills/global/agent-kanban` | ✅ |
| Goods | `.claude/skills/global/agent-kanban` | ✅ |
| ACT Placemat | `.claude/skills/global/agent-kanban` | ✅ |

## When to Use Vibe Kanban

### Best For:
- **Parallel development** - Multiple features across projects simultaneously
- **Large refactors** - Each change isolated in its own worktree
- **Sprint work** - Run several tasks in parallel during focused sessions
- **Code review workflow** - Built-in diff review before merge

### Skip For:
- Single quick fixes
- Research/exploration tasks
- Simple documentation updates

## Workflow Patterns

### Pattern 1: Parallel Feature Development

```
┌─────────────────────────────────────────────────────────────┐
│                    Vibe Kanban Board                         │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   To Do     │ In Progress │  In Review  │      Done       │
├─────────────┼─────────────┼─────────────┼─────────────────┤
│             │ Task 1      │             │                 │
│             │ Claude #1   │             │                 │
│             │ EL: Auth    │             │                 │
│             ├─────────────┤             │                 │
│             │ Task 2      │             │                 │
│             │ Claude #2   │             │                 │
│             │ JH: Forms   │             │                 │
│             ├─────────────┤             │                 │
│             │ Task 3      │             │                 │
│             │ Claude #3   │             │                 │
│             │ Farm: API   │             │                 │
└─────────────┴─────────────┴─────────────┴─────────────────┘
```

### Pattern 2: Single Project Sprint

Run multiple tasks on the same project:

1. Create 3-5 tasks for sprint items
2. Launch agents in parallel
3. Each gets its own git worktree
4. Review and merge as they complete

### Pattern 3: Cross-Project Shared Component

1. Create task for shared component
2. Agent works in global-infrastructure
3. Create follow-up tasks for each project integration
4. Run integration tasks in parallel

## Git Worktree Isolation

Each task automatically gets:
```
/project/
├── .git/
├── main-branch/           # Your normal working directory
├── .worktrees/
│   ├── task-1-abc123/     # Claude #1's isolated workspace
│   ├── task-2-def456/     # Claude #2's isolated workspace
│   └── task-3-ghi789/     # Claude #3's isolated workspace
```

Benefits:
- No merge conflicts during parallel work
- Clean git history
- Easy to discard failed attempts

## Code Review Flow

When agent completes:

1. **Review Diff** - See all file changes
2. **Check Logs** - Review agent reasoning
3. **Test** - Run tests in worktree
4. **Merge** - Accept changes to main
5. **Cleanup** - Worktree auto-removed

## Project-Specific Notes

### Empathy Ledger
- Use for sprint tasks (beads)
- Cultural review still done manually
- Deployment tracking via Vibe Kanban

### JusticeHub
- Legal document processing tasks
- Integration work with Empathy Ledger

### ACT Farm / The Harvest / Goods / ACT Placemat
- Feature development
- Cross-project dependencies

## Migration from act-agent

The previous Notion-based system is deprecated. Key changes:

| Aspect | Old (act-agent) | New (Vibe Kanban) |
|--------|-----------------|-------------------|
| Task creation | `act-agent create` | Browser UI |
| Status updates | `act-agent status` | Automatic |
| Blocking | `act-agent block` → RED card | Agent pauses in UI |
| Mobile access | ✅ Notion app | ❌ Must be at computer |

## Troubleshooting

### Vibe Kanban won't start
```bash
# Ensure Node.js 18+
node --version

# Try fresh install
npx vibe-kanban@latest
```

### Agent not connecting
- Verify Claude Code is authenticated (`claude --version`)
- Check agent is in supported list

### Worktree conflicts
- Vibe Kanban handles cleanup automatically
- Manual cleanup: `git worktree prune`

## Resources

- [Vibe Kanban Website](https://www.vibekanban.com/)
- [GitHub Repository](https://github.com/BloopAI/vibe-kanban)
- [Tool Review](https://elite-ai-assisted-coding.dev/p/vibe-kanban-tool-review)
