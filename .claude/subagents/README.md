# ACT Ecosystem Subagents

Specialized autonomous agents for project management and development workflows.

## Available Subagents

### 1. Sprint Planner (`sprint-planner`)
**Purpose**: Autonomous sprint planning and backlog analysis

**Invoke when**:
- User asks "what should we build next?"
- Monday morning sprint planning
- After completing a sprint

**Capabilities**:
- Analyze backlog issues
- Calculate velocity from historical data
- Recommend optimal sprint composition
- Assign issues to sprints

**Autonomy**: Semi-autonomous (recommends, requires approval)

---

### 2. Code Reviewer (`code-reviewer`)
**Purpose**: Automated code review and quality checks

**Invoke when**:
- After completing feature implementation
- User creates a PR
- User asks "review my code"

**Capabilities**:
- Security vulnerability detection
- Performance issue identification
- Bug pattern recognition
- Test coverage analysis
- Best practice validation

**Autonomy**: Fully autonomous (reviews but doesn't modify)

---

### 3. Deploy Monitor (`deploy-monitor`)
**Purpose**: Continuous deployment health monitoring

**Invoke when**:
- After any deployment
- Daily at 5 PM UTC (automated)
- User asks "are sites healthy?"

**Capabilities**:
- HTTP health checks (all 8 sites)
- Database connectivity tests
- Performance monitoring
- Deployment age tracking
- Alert on critical issues

**Autonomy**: Fully autonomous (monitors and alerts)

---

### 4. Issue Bot (`issue-bot`)
**Purpose**: Intelligent issue creation with auto-field detection

**Invoke when**:
- User describes work to be done
- Converting TODOs to issues
- Batch issue creation after sprint planning

**Capabilities**:
- Parse natural language → issue fields
- Auto-detect Type, Priority, Effort
- Repository detection from context
- Parallel batch creation
- GitHub Project integration

**Autonomy**: Semi-autonomous (confirms before creation)

---

### 5. Knowledge Bot (`knowledge-bot`)
**Purpose**: Automated knowledge capture and institutional memory

**Invoke when**:
- After sprint completion
- Issue marked Done
- Weekly retrospective
- User asks "what did we learn?"

**Capabilities**:
- Extract learnings from issue comments
- Identify technical decisions
- Detect patterns (quick wins, blockers)
- Analyze commit insights
- Create knowledge base pages

**Autonomy**: Fully autonomous (captures without approval)

---

## How Subagents Work

### Architecture
```
Main Conversation (You)
  ↓
  Invokes Subagent (specialized job)
  ↓
  Subagent uses:
    - Skills (how to do the task)
    - MCPs (what tools to access)
    - Tools (execute actions)
  ↓
  Returns result to Main Conversation
```

### Example Flow
```
You: "Plan next sprint"
  ↓
Main Claude: [Activates sprint-planner subagent]
  ↓
Sprint Planner:
  1. Reads act-sprint-workflow skill (methodology)
  2. Uses GitHub MCP (query backlog)
  3. Uses Postgres MCP (get velocity data)
  4. Analyzes and recommends
  ↓
Main Claude: "Here are 11 recommended issues. Assign?"
  ↓
You: "Yes"
  ↓
Main Claude: [Activates issue-bot subagent in batch mode]
  ↓
Issue Bot:
  1. Creates all 11 issues in parallel (GitHub MCP)
  2. Sets project fields
  3. Syncs to Notion
  ↓
Main Claude: "Done! 11 issues assigned to Sprint 5"
```

---

## Usage Patterns

### Explicit Invocation
```
User: "Run sprint planner"
→ Directly activates sprint-planner subagent
```

### Implicit Invocation (Recommended)
```
User: "What should I work on next?"
→ Claude recognizes intent, activates sprint-planner automatically
```

### Chained Subagents
```
User: "Plan and start the next sprint"
→ Claude activates:
   1. sprint-planner (get recommendations)
   2. issue-bot (create issues)
   3. deploy-monitor (check pre-sprint health)
```

### Background Automation
```
GitHub Action triggers daily at 5 PM UTC
→ deploy-monitor runs automatically
→ Results posted to Slack/saved to Notion
```

---

## Subagent vs Skill vs MCP

**Skill** (How to do):
- Static guide/instructions
- Tells Claude the methodology
- Example: "How to calculate velocity"

**Subagent** (Who does what):
- Autonomous worker
- Specializes in one job
- Can invoke skills and use MCPs
- Example: "Sprint planner that uses velocity calculations"

**MCP** (What tools to reach):
- External system connector
- Provides data access
- Example: "GitHub API access via MCP"

### Combined Example
```
sprint-planner subagent
  ├─ Uses: act-sprint-workflow skill (methodology)
  ├─ Uses: GitHub MCP (get backlog data)
  ├─ Uses: Postgres MCP (get velocity data)
  └─ Returns: Sprint recommendations
```

---

## Configuration

Subagents are defined in individual `.md` files in this directory.

Claude Code automatically discovers them and makes them available for invocation.

No additional setup required beyond:
1. ✅ MCP servers configured (`.claude/mcp.json`)
2. ✅ Skills present (`.claude/skills/*`)
3. ✅ Subagent definitions (`.claude/subagents/*`)

---

## Best Practices

### When to Create a Subagent
Create a subagent when:
- Task is repetitive and well-defined
- Task requires multiple steps/tools
- Task benefits from specialization
- Task can run autonomously or semi-autonomously

### When NOT to Create a Subagent
Don't create a subagent when:
- Task is one-time or highly variable
- Task requires deep user interaction throughout
- Task is better as a skill (simple guide)

### Naming Convention
- Use kebab-case: `sprint-planner`, `code-reviewer`
- Be descriptive but concise
- Avoid generic names like `helper` or `manager`

### Documentation
Each subagent file should include:
- Purpose (one-line)
- When to invoke (trigger conditions)
- Capabilities (what it can do)
- Tools available (MCPs, skills, native tools)
- Output format (what user sees)
- Autonomy level (semi/fully autonomous)

---

## Monitoring & Debugging

### View Subagent Activity
In Claude Code, subagent invocations show in the conversation:
```
[sprint-planner subagent activated]
📊 Analyzing backlog...
[sprint-planner subagent complete - 3.2s]
```

### Debug Mode
Set environment variable for verbose output:
```bash
export CLAUDE_SUBAGENT_DEBUG=true
```

Shows:
- Which skills were loaded
- Which MCPs were called
- Execution time per step

---

## Future Enhancements

### Planned Subagents (not yet built)
- `test-runner`: Automated test execution and reporting
- `doc-updater`: Keep README and docs in sync with code
- `dependency-checker`: Monitor for outdated packages
- `security-scanner`: Check for vulnerabilities
- `performance-profiler`: Identify slow code paths

### Planned Features
- Subagent chaining (one subagent calls another)
- Subagent scheduling (run at specific times)
- Subagent history (view past invocations)
- Subagent metrics (track success rates, execution times)

---

## Support

Questions or issues?
1. Check individual subagent `.md` files for details
2. Review `.claude/skills/*` for methodology
3. Check `.claude/mcp.json` for tool configuration
4. Open issue in `act-global-infrastructure` repo

---

**Last Updated**: 2025-12-30
**Maintained By**: ACT Development Team
**Version**: 1.0.0
