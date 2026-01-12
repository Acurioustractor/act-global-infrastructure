# Ralph Wiggum - Long-Running AI Agent

A methodology for running AI coding agents that ship code while you sleep.

## Quick Start

```bash
# 1. Make scripts executable
chmod +x ralph/*.sh

# 2. Edit the PRD with your features
vim ralph/prd.json

# 3. Run Ralph
./ralph/ralph.sh
```

## How It Works

Ralph runs a coding agent in a loop, with each iteration:

1. **Reads the PRD** - JSON file with prioritized features
2. **Picks ONE feature** - The highest priority incomplete item
3. **Implements it** - Makes changes, runs tests, commits
4. **Updates PRD** - Sets `passes: true` when done
5. **Logs progress** - Appends to progress.txt
6. **Repeats** - Until all features pass or max iterations reached

## Files

- `ralph.sh` - Main runner script
- `prd.json` - Product Requirements Document (your task list)
- `progress.txt` - Log of completed work
- `create-prd.sh` - Helper to create new PRD files

## PRD Format

```json
{
  "project": "My Project",
  "features": [
    {
      "id": "unique-id",
      "priority": 1,
      "title": "Feature Name",
      "description": "What needs to be done",
      "acceptance_criteria": [
        "Criterion 1",
        "Build passes"
      ],
      "project_path": "/path/to/project",
      "passes": false
    }
  ]
}
```

## Configuration

Environment variables:

- `MAX_ITERATIONS` - Max loop iterations (default: 10)
- `PROJECT_DIR` - Working directory (default: current)
- `PRD_FILE` - Path to PRD (default: ralph/prd.json)
- `PROGRESS_FILE` - Path to progress log (default: ralph/progress.txt)
- `AGENT_CMD` - Agent command (default: claude)

## Key Principles

1. **Small, focused tasks** - One feature per iteration
2. **Keep CI green** - Always run tests before committing
3. **Progress tracking** - Every change is logged
4. **Clear stop conditions** - PRD defines "done"

## Running on Specific Projects

```bash
# Run on JusticeHub
PROJECT_DIR=/Users/benknight/Code/JusticeHub ./ralph/ralph.sh

# Run with more iterations
MAX_ITERATIONS=20 ./ralph/ralph.sh
```

## Credit

Based on Matt Pocock's "Ralph Wiggum" approach:
https://twitter.com/mattpocockuk
