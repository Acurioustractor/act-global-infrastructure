# Ralph - Long-Running Task Agent

Run Ralph to autonomously work through PRD tasks.

## Usage

```
/ralph [action] [options]
```

## Actions

### `run` (default)
Start Ralph to process tasks from PRD:
```
/ralph run
/ralph run --max-iterations 5
```

### `create`
Create a new PRD from template:
```
/ralph create my-project
```

### `status`
Check current PRD status:
```
/ralph status
```

### `add`
Add a new task to the PRD:
```
/ralph add "Fix authentication bug" --priority 1
```

## Instructions

When this command is invoked:

1. **For `run`**: Execute `./ralph/ralph.sh` in the current project directory. Monitor output and report progress.

2. **For `create`**:
   - Create `ralph/` directory if needed
   - Copy ralph.sh and create-prd.sh from skill references
   - Generate prd.json with project name
   - Report created files

3. **For `status`**:
   - Read ralph/prd.json
   - Show table of features with pass/fail status
   - Show progress.txt summary

4. **For `add`**:
   - Read existing prd.json
   - Add new feature with auto-incremented ID
   - Set priority (default: next available)
   - Save updated PRD

## Example PRD

```json
{
  "project": "JusticeHub",
  "features": [
    {
      "id": "fix-map",
      "priority": 1,
      "title": "Fix Australia Map hover",
      "description": "Markers fly around on hover",
      "acceptance_criteria": ["Markers stay fixed", "Build passes"],
      "project_path": "/Users/benknight/Code/JusticeHub",
      "passes": false
    }
  ]
}
```

## How It Works

Ralph spawns Claude agents in a loop. Each agent:
1. Reads PRD, picks highest priority incomplete task
2. Implements the feature
3. Commits changes
4. Marks task as `passes: true`
5. Logs to progress.txt

Loop continues until all tasks complete or max iterations reached.

## Environment Variables

- `MAX_ITERATIONS` - Max loops (default: 10)
- `PROJECT_DIR` - Working directory (default: pwd)
- `PRD_FILE` - PRD location (default: ralph/prd.json)

$ARGUMENTS
