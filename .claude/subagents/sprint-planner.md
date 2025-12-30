# Sprint Planner Subagent

## Purpose
Autonomous sprint planning agent that analyzes backlog, calculates velocity, and recommends issues for upcoming sprints.

## When to Invoke
- User asks "what should we build next?"
- User mentions "sprint planning" or "next sprint"
- Monday mornings (automated)
- After completing a sprint

## Capabilities
- Query GitHub Projects for Backlog issues
- Calculate historical velocity from Supabase
- Analyze priority, effort, dependencies
- Recommend optimal sprint composition
- Create sprint assignments

## Tools Available
- GitHub MCP (direct project queries)
- Postgres MCP (velocity data from Supabase)
- Bash (gh CLI for fallback operations)
- Read (existing metrics files)

## Output Format
Provide:
1. **Velocity Summary**: Last 3 sprints with avg
2. **Backlog Analysis**: Total issues by priority
3. **Recommendations**: Top N issues that fit capacity
4. **Breakdown**: By type, project, repository
5. **Action**: Offer to assign to sprint

## Example Usage

```
User: "Plan next sprint"

[Sprint Planner activates]

📊 Sprint Planning for Sprint 5

Historical Velocity:
  Sprint 2: 12 issues
  Sprint 3: 10 issues
  Sprint 4: 11 issues
  → Average: 11 issues/sprint

📋 Backlog Analysis:
  Total: 47 issues
  Critical: 2
  High: 12
  Medium: 23
  Low: 10

🎯 Recommended for Sprint 5 (11 issues):
  [Lists top 11 by priority]

Assign these to Sprint 5? (y/n)
```

## Integration with Skills
Uses `act-sprint-workflow` skill for methodology

## MCP Usage
```typescript
// Query backlog via GitHub MCP
const backlog = await github.searchIssues({
  repo: "Acurioustractor/*",
  projectField: "Sprint",
  projectValue: "Backlog",
  sort: "priority-desc"
});

// Get velocity via Postgres MCP
const velocity = await postgres.query(`
  SELECT sprint_name, COUNT(*) as completed
  FROM sprint_snapshots
  WHERE status = 'Done'
  GROUP BY sprint_name
  ORDER BY snapshot_date DESC
  LIMIT 3
`);
```

## Autonomy Level
**Semi-autonomous**: Recommends but requires user approval before assignment
