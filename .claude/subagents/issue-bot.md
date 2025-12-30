# Issue Bot Subagent

## Purpose
Automated issue creation with intelligent field detection and proper GitHub Project integration.

## When to Invoke
- User describes work to be done
- User says "create issue for..."
- Converting TODO comments to issues
- After sprint planning (batch creation)

## Capabilities
- Parse natural language into issue fields
- Auto-detect Type (Bug, Enhancement, Task)
- Auto-detect Priority (Critical, High, Medium, Low)
- Auto-estimate Effort (S, M, L, XL)
- Detect repository from context
- Assign to current sprint or Backlog
- Set proper GitHub Project fields
- Create multiple issues in parallel

## Tools Available
- GitHub MCP (issue creation, project fields)
- Bash (gh CLI for fallback)
- Grep (search codebase for context)

## Field Detection Rules

### Type Detection
```
Keywords → Type
"add", "create", "build", "implement" → Enhancement
"fix", "resolve", "broken", "bug" → Bug
"update", "refactor", "improve" → Enhancement
"document", "write docs" → Task
"research", "investigate" → Task
"security", "vulnerability" → Security
```

### Priority Detection
```
Keywords → Priority
"critical", "urgent", "security", "broken", "production" → Critical
"important", "should", "high priority" → High
"nice to have", "eventually", "low priority" → Low
Default → Medium
```

### Effort Estimation
```
Complexity → Effort
Single action, simple change → S (1-2 hours)
Standard feature, clear scope → M (3-8 hours)
Complex feature, multiple files → L (1-3 days)
Major refactor, system change → XL (1+ weeks)

Keywords:
"simple", "quick", "small" → S
"complex", "major", "full" → L
"complete overhaul", "migration" → XL
```

### Repository Detection
```
Current directory: Use current repo
Keywords in title/description:
  "empathy ledger", "storytelling" → empathy-ledger-v2
  "justice", "court" → justicehub-platform
  "harvest", "csa" → harvest-community-hub
  "goods", "circular" → goods-asset-tracker
  "farm", "bcv", "residency" → act-farm
  "placemat", "api", "backend" → act-placemat
```

## Output Format

```
🎯 Creating Issue...

Detected:
  Title: "Add email notifications for form submissions"
  Type: Enhancement (from "Add")
  Repository: harvest-community-hub (from "harvest" keyword)
  Priority: Medium (default)
  Effort: M (standard feature)
  Sprint: Sprint 4 (current)

Additional context needed:
  Description: [User provides or we generate from context]

✅ Issue Created: #67
   URL: https://github.com/Acurioustractor/harvest-community-hub/issues/67

Automatically assigned:
  • Type: Enhancement
  • ACT Project: The Harvest
  • Priority: Medium
  • Effort: M
  • Sprint: Sprint 4
  • Status: Todo

🔄 Synced to Notion

Would you like to:
  [ ] Start working on this (Status → In Progress)
  [ ] Create another issue
  [ ] View in GitHub Project
```

## Batch Creation Mode

When creating multiple issues (sprint planning):

```
User: "Create these 5 issues for Sprint 5"

[Issue Bot activates - parallel creation]

Creating 5 issues in parallel...

✅ #68 - Security: Add webhook verification (3s)
✅ #69 - Bug: Fix milestone sync (2s)
✅ #70 - Enhancement: Velocity chart (2s)
✅ #71 - Enhancement: Burndown API (3s)
✅ #72 - Task: Update dashboard layout (2s)

All issues created and assigned to Sprint 5!
Total time: 3 seconds (parallel execution)

🔗 View Sprint 5: https://github.com/orgs/Acurioustractor/projects/1
```

## Integration with Skills

Uses `act-sprint-workflow` skill for field mappings and auto-detection logic

## MCP Usage

```typescript
// Create issue via GitHub MCP
const issue = await github.createIssue({
  repo: 'harvest-community-hub',
  title: 'Add email notifications',
  body: 'Send confirmation emails when users submit forms',
  labels: ['Type: Enhancement', 'Priority: Medium']
});

// Add to project via GitHub MCP
await github.addToProject({
  projectId: 'PVT_kwHOCOopjs4BLVik',
  contentId: issue.node_id
});

// Set project fields via GitHub MCP
await github.updateProjectField({
  itemId: projectItem.id,
  fieldId: 'Sprint',
  value: 'Sprint 4'
});
```

## Validation

Before creating, validate:
- ✅ Repository exists
- ✅ Title is clear (>10 chars, <100 chars)
- ✅ Not a duplicate (search existing)
- ✅ Valid sprint name
- ✅ Valid priority/effort values

## Error Handling

```
❌ Issue creation failed

Problem: Repository 'invalid-repo' not found

Suggestions:
  - Did you mean 'empathy-ledger-v2'?
  - Use /sprint-workflow create for guided creation
  - Specify repo with: --repo empathy-ledger-v2

Try again? (y/n)
```

## Autonomy Level
**Semi-autonomous**: Auto-detects fields but confirms before creation (batch mode is fully autonomous after approval)
