# Notion Integration Schema for ACT Ecosystem

**Purpose**: Complete Notion database architecture for cross-project visibility, estimation, and strategic alignment

---

## Database Overview

```
Notion Workspace: ACT Curious Tractor
├── 📊 GitHub Issues (existing - enhanced)
├── 🎯 Sprint Tracking (new)
├── 🚀 Deployments (new)
├── 📈 Velocity Metrics (new)
├── 🏗️ ACT Projects (new)
├── 🎨 Strategic Pillars (new)
├── 👥 Team Capacity (new)
└── 📝 Weekly Reports (new)
```

---

## 1. GitHub Issues Database (Enhanced)

**Existing Properties** + **New Additions**:

```json
{
  "Title": { "type": "title" },
  "Status": { "type": "select", "options": ["Todo", "In Progress", "Done", "Blocked"] },
  "Type": { "type": "select", "options": ["Feature", "Bug", "Enhancement", "Integration", "Documentation"] },
  "Priority": { "type": "select", "options": ["Critical", "High", "Medium", "Low"] },
  "Sprint": { "type": "select", "options": ["Backlog", "Sprint 1", "Sprint 2", ...] },
  "Milestone": { "type": "select", "options": ["Beta Launch", "Community Features", ...] },
  "ACT Project": { "type": "select", "options": ["ACT Farm Studio", "Empathy Ledger", ...] },

  // NEW PROPERTIES:
  "Effort Points": { "type": "number" },
  "Actual Hours": { "type": "number" },
  "Strategic Pillar": { "type": "relation", "database": "Strategic Pillars" },
  "Sprint Relation": { "type": "relation", "database": "Sprint Tracking" },
  "Assigned To": { "type": "person" },
  "Started Date": { "type": "date" },
  "Completed Date": { "type": "date" },
  "Days to Complete": { "type": "formula", "formula": "dateBetween(prop('Completed Date'), prop('Started Date'), 'days')" },
  "Community Impact": { "type": "select", "options": ["High", "Medium", "Low", "None"] },
  "GitHub URL": { "type": "url" },
  "Labels": { "type": "multi_select" }
}
```

---

## 2. Sprint Tracking Database (New)

**Purpose**: Track sprint goals, velocity, and completion

```json
{
  "Sprint Name": { "type": "title" },
  "Sprint Number": { "type": "number" },
  "Status": { "type": "select", "options": ["Planning", "Active", "Completed", "Archived"] },
  "Start Date": { "type": "date" },
  "End Date": { "type": "date" },
  "Duration (weeks)": { "type": "formula", "formula": "dateBetween(prop('End Date'), prop('Start Date'), 'weeks')" },

  "Goal": { "type": "rich_text" },
  "Strategic Focus": { "type": "relation", "database": "Strategic Pillars" },

  // Rollups from GitHub Issues
  "Issues": { "type": "relation", "database": "GitHub Issues" },
  "Total Issues": { "type": "rollup", "relation": "Issues", "property": "Title", "function": "count" },
  "Completed Issues": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_values", "value": "Done" },
  "In Progress": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_values", "value": "In Progress" },
  "Blocked": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_values", "value": "Blocked" },

  // Effort tracking
  "Total Effort Points": { "type": "rollup", "relation": "Issues", "property": "Effort Points", "function": "sum" },
  "Completed Effort": { "type": "rollup", "relation": "Issues", "property": "Effort Points", "function": "sum", "filter": { "Status": "Done" } },

  // Velocity
  "Velocity": { "type": "formula", "formula": "prop('Completed Effort') / prop('Duration (weeks)')" },
  "Completion %": { "type": "formula", "formula": "round(prop('Completed Issues') / prop('Total Issues') * 100)" },

  // Projects involved
  "Projects": { "type": "multi_select", "options": ["ACT Farm Studio", "Empathy Ledger", ...] },

  // Notes
  "Retrospective": { "type": "rich_text" },
  "Wins": { "type": "rich_text" },
  "Challenges": { "type": "rich_text" },
  "Learnings": { "type": "rich_text" }
}
```

---

## 3. Deployments Database (New)

**Purpose**: Track all deployments across all 7 projects

```json
{
  "Deployment": { "type": "title" },
  "Project": { "type": "relation", "database": "ACT Projects" },
  "Environment": { "type": "select", "options": ["Production", "Preview", "Development"] },

  "Version": { "type": "rich_text" },
  "Git SHA": { "type": "rich_text" },
  "Git Branch": { "type": "rich_text" },

  "Deployed At": { "type": "date" },
  "Deployed By": { "type": "person" },

  "Status": { "type": "select", "options": ["Success", "Failed", "In Progress", "Rolled Back"] },
  "Duration (seconds)": { "type": "number" },

  "Deploy URL": { "type": "url" },
  "GitHub Commit URL": { "type": "url" },
  "Vercel URL": { "type": "url" },

  // Health
  "Health Check": { "type": "select", "options": ["Healthy", "Degraded", "Down", "Unknown"] },
  "Response Time (ms)": { "type": "number" },
  "Last Checked": { "type": "date" },

  // Changelog
  "Changes": { "type": "rich_text" },
  "Issues Closed": { "type": "relation", "database": "GitHub Issues" }
}
```

---

## 4. Velocity Metrics Database (New)

**Purpose**: Track development velocity over time for forecasting

```json
{
  "Week Of": { "type": "title" },
  "Week Number": { "type": "number" },
  "Year": { "type": "number" },

  "Sprint": { "type": "relation", "database": "Sprint Tracking" },

  // Completion
  "Issues Completed": { "type": "number" },
  "Story Points Completed": { "type": "number" },

  // Team
  "Team Size": { "type": "number" },
  "Team Capacity (hours)": { "type": "number" },

  // Velocity
  "Points per Week": { "type": "formula", "formula": "prop('Story Points Completed')" },
  "Hours per Point": { "type": "formula", "formula": "prop('Team Capacity (hours)') / prop('Story Points Completed')" },
  "Utilization %": { "type": "formula", "formula": "round(prop('Story Points Completed') / (prop('Team Capacity (hours)') / 2.5) * 100)" },

  // Trend
  "vs Last Week": { "type": "number" },
  "Trend": { "type": "select", "options": ["Up", "Steady", "Down"] },

  // Quality
  "Bugs Created": { "type": "number" },
  "Bugs Fixed": { "type": "number" },
  "Rework %": { "type": "formula", "formula": "round(prop('Bugs Created') / prop('Issues Completed') * 100)" },

  // Deployment
  "Deployments": { "type": "number" },
  "Deploy Frequency": { "type": "formula", "formula": "prop('Deployments') / 7" }
}
```

---

## 5. ACT Projects Database (New)

**Purpose**: Overview of all 7 projects with health and status

```json
{
  "Project Name": { "type": "title" },
  "Description": { "type": "rich_text" },
  "Strategic Pillar": { "type": "relation", "database": "Strategic Pillars" },

  // Tech
  "Tech Stack": { "type": "multi_select", "options": ["Next.js", "Supabase", "Tailwind", "Vercel"] },
  "Primary Language": { "type": "select", "options": ["TypeScript", "JavaScript", "Python"] },

  // Links
  "GitHub Repo": { "type": "url" },
  "Production URL": { "type": "url" },
  "Vercel Project": { "type": "url" },
  "Notion Doc": { "type": "url" },

  // Status
  "Status": { "type": "select", "options": ["Active Development", "Maintenance", "Beta", "Launched", "Archived"] },
  "Current Version": { "type": "rich_text" },
  "Last Deployed": { "type": "date" },

  // Health
  "Health Status": { "type": "select", "options": ["Healthy", "Degraded", "Down", "Unknown"] },
  "Uptime %": { "type": "number" },
  "Avg Response Time (ms)": { "type": "number" },

  // Issues
  "Active Issues": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_all" },
  "In Current Sprint": { "type": "rollup", "relation": "Issues", "property": "Sprint", "function": "count_values", "value": "Sprint 4" },
  "Blocked": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_values", "value": "Blocked" },

  // Team
  "Team Members": { "type": "people" },
  "Primary Contact": { "type": "person" },

  // Community
  "Users (monthly)": { "type": "number" },
  "Growth Rate": { "type": "number" }
}
```

---

## 6. Strategic Pillars Database (New)

**Purpose**: Link all work to strategic mission

```json
{
  "Pillar Name": { "type": "title" },
  "Description": { "type": "rich_text" },
  "Mission Statement": { "type": "rich_text" },

  // LCAA Phase
  "LCAA Phase": { "type": "select", "options": ["Listen", "Curiosity", "Action", "Art"] },

  // Projects
  "Primary Projects": { "type": "relation", "database": "ACT Projects" },

  // OKRs
  "Q1 Objective": { "type": "rich_text" },
  "Q1 Key Results": { "type": "rich_text" },

  // Metrics
  "Issues This Quarter": { "type": "rollup", "relation": "Issues", "property": "Title", "function": "count" },
  "Completed This Quarter": { "type": "rollup", "relation": "Issues", "property": "Status", "function": "count_values", "value": "Done" },
  "Progress %": { "type": "formula", "formula": "round(prop('Completed This Quarter') / prop('Issues This Quarter') * 100)" },

  // Impact
  "Community Impact": { "type": "select", "options": ["Transformative", "Significant", "Moderate", "Emerging"] },
  "Impact Stories": { "type": "rich_text" }
}
```

**The 6 Strategic Pillars**:
1. **Ethical Storytelling** - Empathy Ledger (consent-first narratives)
2. **Justice Reimagined** - JusticeHub (community-designed programs)
3. **Community Resilience** - The Harvest (therapeutic horticulture, heritage preservation)
4. **Circular Economy & Community-Designed Goods** - Goods (waste-to-wealth, community ownership)
5. **Regeneration at Scale** - BCV/ACT Farm (150-acre conservation-first regeneration)
6. **Art of Social Impact** - ACT Placemat (all ACT projects, contracted work, free programs, art support)

---

## 7. Team Capacity Database (SKIPPED - Build Later)

**Status**: Not needed for initial launch - can add later when team grows

**Purpose**: Track team availability and workload (for future use)

```json
{
  "Week Of": { "type": "title" },
  "Team Member": { "type": "person" },

  // Availability
  "Available Hours": { "type": "number" },
  "Out of Office": { "type": "checkbox" },
  "OOO Reason": { "type": "rich_text" },

  // Planned
  "Planned Work (points)": { "type": "number" },
  "Planned Hours": { "type": "formula", "formula": "prop('Planned Work (points)') * 2.5" },

  // Actual
  "Actual Work (points)": { "type": "number" },
  "Actual Hours": { "type": "number" },

  // Efficiency
  "Utilization %": { "type": "formula", "formula": "round(prop('Actual Hours') / prop('Available Hours') * 100)" },
  "Over/Under": { "type": "formula", "formula": "prop('Actual Hours') - prop('Planned Hours')" },

  // Context
  "Sprint": { "type": "relation", "database": "Sprint Tracking" },
  "Notes": { "type": "rich_text" }
}
```

---

## 8. Weekly Reports Database (New)

**Purpose**: Archive of automated weekly updates

```json
{
  "Week Ending": { "type": "title" },
  "Report Date": { "type": "date" },

  "Sprint": { "type": "relation", "database": "Sprint Tracking" },

  // Content
  "Summary": { "type": "rich_text" },
  "Top Achievements": { "type": "rich_text" },
  "Deployments": { "type": "rich_text" },
  "Velocity": { "type": "rich_text" },
  "Next Week": { "type": "rich_text" },

  // Generated content
  "Email HTML": { "type": "rich_text" },
  "Blog Draft": { "type": "rich_text" },
  "Social Snippets": { "type": "rich_text" },

  // Metrics
  "Issues Completed": { "type": "number" },
  "Points Completed": { "type": "number" },
  "Deployments Count": { "type": "number" },

  // Sent
  "Sent": { "type": "checkbox" },
  "Sent To": { "type": "multi_select", "options": ["Team", "Co-Founders", "Community", "Funders"] },
  "Sent At": { "type": "date" }
}
```

---

## Dashboard Views

### 1. Executive Dashboard

**For**: Co-Founders, Strategic Decision Makers

**Sections**:
- **Strategic Health**: All 7 projects with health status
- **Current Sprint**: Progress, velocity, blockers
- **Milestone Roadmap**: Next 3 milestones with dates
- **Velocity Trend**: Last 5 sprints chart
- **Community Growth**: Users, engagement, impact

**Key Metrics**:
- Sprint completion: 87%
- Velocity trend: ↑ 15%
- Sites healthy: 7/7
- Community growth: +120%

---

### 2. Developer Dashboard

**For**: Development Team, Daily Use

**Sections**:
- **My Work Today**: Issues assigned, in progress
- **Sprint Board**: Kanban of current sprint
- **Recent Deployments**: Last 10 across all projects
- **Code Reviews**: PRs awaiting review
- **Blockers**: Issues tagged as blocked

**Quick Actions**:
- Create new issue
- Log time on issue
- Request help/review
- Update issue status

---

### 3. Project Dashboard

**For**: Per-Project View

**Sections**:
- **Project Health**: Status, uptime, performance
- **Active Sprint Work**: Issues for this project
- **Recent Deployments**: This project only
- **Milestone Progress**: Toward next milestone
- **Community Metrics**: Users, engagement, stories

**Per Project**:
- ACT Farm Studio
- Empathy Ledger
- JusticeHub
- The Harvest
- Goods
- BCV/ACT Farm
- ACT Placemat

---

### 4. Community Dashboard (Public)

**For**: Community Members, Transparency

**Sections**:
- **What We're Building**: Current sprint goals
- **Recent Updates**: Completed features
- **Roadmap**: Next 3 milestones
- **How to Contribute**: Ways to participate
- **Impact Stories**: Real examples

**Public URL**: notion.so/acurioustractor/community

---

## Sync Scripts

### 1. sync-github-to-notion-enhanced.mjs

**Enhancements to existing script**:
- Add effort points syncing
- Add sprint relation
- Add strategic pillar relation
- Add started/completed dates
- Calculate days to complete

---

### 2. sync-sprint-metrics.mjs (NEW)

**Purpose**: Calculate and sync sprint metrics

**What it does**:
1. Query GitHub Project for current sprint
2. Count issues by status
3. Sum effort points
4. Calculate velocity
5. Update Sprint Tracking database
6. Create Velocity Metrics entry

**Run**: Every day at 5 PM (with snapshot script)

---

### 3. sync-deployments.mjs (NEW)

**Purpose**: Log deployments from Vercel

**What it does**:
1. Query Vercel API for deployments
2. Get deployment status, time, URL
3. Run health check on production URL
4. Log to Deployments database
5. Update ACT Projects last deployed

**Run**: Every deployment (via GitHub Action)

---

### 4. generate-weekly-report.mjs (NEW)

**Purpose**: Create automated weekly update

**What it does**:
1. Query last week's completed issues
2. Group by project and strategic pillar
3. Get deployment stats
4. Calculate velocity
5. Generate report content (AI-assisted)
6. Create entry in Weekly Reports database
7. Send email to stakeholders

**Run**: Every Friday at 5 PM

---

## Implementation Plan

### Phase 1: Database Setup (Week 1)
- [ ] Create 7 core databases in Notion (skip Team Capacity for now)
- [ ] Set up relations between databases
- [ ] Create formulas and rollups
- [ ] Test with sample data

### Phase 2: Enhanced GitHub Sync (Week 2)
- [ ] Update sync script with new properties
- [ ] Add sprint relation linking
- [ ] Add effort points
- [ ] Test full sync

### Phase 3: Sprint Metrics (Week 2)
- [ ] Build sprint metrics calculation script
- [ ] Integrate with snapshot script
- [ ] Test velocity calculations
- [ ] Verify rollups working

### Phase 4: Deployment Tracking (Week 3)
- [ ] Create GitHub Action for deployment logging
- [ ] Build Vercel sync script
- [ ] Add health check automation
- [ ] Test across all 7 repos

### Phase 5: Dashboards (Week 3-4)
- [ ] Create Executive dashboard view
- [ ] Create Developer dashboard view
- [ ] Create Project dashboards (7)
- [ ] Create Community dashboard (public)

### Phase 6: Weekly Reports (Week 4)
- [ ] Build report generation script
- [ ] Create email templates
- [ ] Set up automation schedule
- [ ] Test with team

---

## Success Criteria

✅ **All databases created and linked**
✅ **Data syncing automatically every 30 min**
✅ **Dashboards showing real-time data**
✅ **Velocity calculations accurate**
✅ **Weekly reports generating**
✅ **Co-founders using Notion weekly**
✅ **Team using for daily work**

---

**Next Steps**:
1. Review schema with team
2. Create first database (Sprint Tracking)
3. Test with current sprint data
4. Iterate based on feedback
5. Build out remaining databases

**Document Owner**: Ben Knight + Claude AI
**Last Updated**: 2025-12-27
**Status**: Ready for Implementation
