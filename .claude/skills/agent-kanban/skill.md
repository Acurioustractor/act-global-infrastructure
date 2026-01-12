# Vibe Kanban - ACT Ecosystem Task Orchestration

## Overview

**Vibe Kanban** is an open-source task orchestration platform for AI coding agents. It provides:

- **Parallel agent execution** - Run multiple Claude Code instances simultaneously
- **Git worktree isolation** - Each task gets its own branch/workspace
- **Built-in code review** - Diff viewer before merging
- **Real-time monitoring** - Watch agent reasoning and file changes live

## Quick Start

```bash
# Launch Vibe Kanban (opens browser UI)
npx vibe-kanban
```

## Workflow

1. **Create Task** - Add task with description in the Kanban UI
2. **Assign Agent** - Select Claude Code (or other supported agent)
3. **Agent Executes** - Runs in isolated git worktree
4. **Review Diff** - Inspect changes before merging
5. **Merge or Iterate** - Accept changes or request modifications

## Supported Agents

- Claude Code
- OpenAI Codex
- GitHub Copilot
- Cursor CLI
- Gemini CLI
- Amp
- Opencode
- Qwen Code

## Key Features

### Parallel Execution
Run 5+ agents simultaneously on different tasks. Each agent works in isolation.

### Git Worktree Isolation
Each task automatically gets:
- Its own git branch
- Isolated worktree directory
- Clean workspace without conflicts

### Built-in Code Review
Before merging, review:
- File diffs
- Agent reasoning logs
- Command execution history

### Real-time Monitoring
Watch live:
- Agent thinking process
- File modifications
- MCP tool calls
- Execution logs

## Configuration

Vibe Kanban supports:
- Setup/cleanup scripts per project
- Custom task templates
- MCP server configuration
- GitHub Enterprise and SSH aliases

## ACT Ecosystem Projects

Use Vibe Kanban for any ACT project:
- Empathy Ledger
- JusticeHub
- ACT Studio
- The Harvest
- Goods
- ACT Farm
- ACT Placemat

## Installation

```bash
# One-time setup
npx vibe-kanban

# Vibe Kanban will:
# 1. Open browser UI
# 2. Guide agent authentication
# 3. Ready to create tasks
```

## Comparison to Previous System

| Feature | Old (act-agent) | New (Vibe Kanban) |
|---------|-----------------|-------------------|
| Parallel agents | ❌ | ✅ |
| Git isolation | ❌ | ✅ |
| Code review | ❌ | ✅ |
| Mobile notifications | ✅ Notion | ❌ |
| Async blocking | ✅ RED card | ❌ |

## When Agent Needs Input

In Vibe Kanban, when an agent needs human input:
1. Agent pauses and waits in the UI
2. You respond directly in the web interface
3. Agent continues

Note: This requires being at your computer (no mobile notifications).

## Resources

- [Vibe Kanban Website](https://www.vibekanban.com/)
- [GitHub Repository](https://github.com/BloopAI/vibe-kanban)
- [Documentation](https://github.com/BloopAI/vibe-kanban/blob/main/README.md)

## Legacy System (Deprecated)

The previous `act-agent` CLI using Notion is deprecated but preserved at:
`/Users/benknight/act-global-infrastructure/tools/act-agent/`

It can be restored if mobile/async notifications are needed again.
