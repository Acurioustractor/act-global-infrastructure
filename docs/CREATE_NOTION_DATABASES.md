# Step-by-Step Guide: Creating Notion Databases

**Updated Based on Your Feedback**:
- ✅ Retrospective field included
- ✅ Team Members field removed from Sprint Tracking
- ✅ Production deployments only (not preview)
- ✅ Build Time and Bundle Size removed
- ✅ 6 Strategic Pillars defined (including ACT Placemat)
- ✅ Team Capacity database skipped for now

---

## Database 1: Sprint Tracking (START HERE)

### Step 1: Create the Database

1. Open Notion workspace
2. Create new page called "Sprint Tracking"
3. Add a database (full page)
4. Change database type to "Table"

### Step 2: Add Properties

**Delete default properties except "Name"**, then add these:

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Sprint Name | Title | (default, rename from "Name") |
| Sprint Number | Number | - |
| Status | Select | Planning, Active, Completed, Archived |
| Start Date | Date | - |
| End Date | Date | - |
| Duration (weeks) | Formula | `dateBetween(prop("End Date"), prop("Start Date"), "weeks")` |
| Goal | Text | - |
| Strategic Focus | Relation | → Strategic Pillars database (create later) |
| Issues | Relation | → GitHub Issues database |
| Total Issues | Rollup | Issues → Title → Count all |
| Completed Issues | Rollup | Issues → Status → Count values → "Done" |
| In Progress | Rollup | Issues → Status → Count values → "In Progress" |
| Blocked | Rollup | Issues → Status → Count values → "Blocked" |
| Total Effort Points | Rollup | Issues → Effort Points → Sum |
| Completed Effort | Rollup | Issues → Effort Points → Sum → Filter: Status = Done |
| Velocity | Formula | `prop("Completed Effort") / prop("Duration (weeks)")` |
| Completion % | Formula | `round(prop("Completed Issues") / prop("Total Issues") * 100)` |
| Projects | Multi-select | ACT Farm Studio, Empathy Ledger, JusticeHub, The Harvest, Goods, BCV/ACT Farm, ACT Placemat |
| Retrospective | Text | - |
| Wins | Text | - |
| Challenges | Text | - |
| Learnings | Text | - |

### Step 3: Add Test Entry

Create a new row with this data:

```
Sprint Name: Sprint 4
Sprint Number: 4
Status: Active
Start Date: Dec 20, 2025
End Date: Jan 3, 2026
Goal: Complete foundation features for Empathy Ledger, JusticeHub, and The Harvest
Projects: Empathy Ledger, JusticeHub, The Harvest
Retrospective: (leave blank for now)
Wins: (leave blank for now)
Challenges: (leave blank for now)
Learnings: (leave blank for now)
```

**Note**: Issues, Strategic Focus relations will link after those databases created. Rollups and formulas will calculate once data is linked.

### Step 4: Verify

- [ ] Database created with correct name
- [ ] All 21 properties added
- [ ] Test entry created
- [ ] Duration formula shows "2" (2 weeks)
- [ ] Completion % shows "0" (no issues linked yet)

**Share link with me to review before proceeding** ✅

---

## Database 2: ACT Projects

### Create Database

1. New page: "ACT Projects"
2. Add table database

### Add Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Project Name | Title | - |
| Description | Text | - |
| Strategic Pillar | Relation | → Strategic Pillars |
| Tech Stack | Multi-select | Next.js, Supabase, Tailwind, Vercel, TypeScript |
| Primary Language | Select | TypeScript, JavaScript, Python |
| GitHub Repo | URL | - |
| Production URL | URL | - |
| Vercel Project | URL | - |
| Notion Doc | URL | - |
| Status | Select | Active Development, Maintenance, Beta, Launched, Archived |
| Current Version | Text | - |
| Last Deployed | Date | - |
| Health Status | Select | Healthy, Degraded, Down, Unknown |
| Uptime % | Number | - |
| Avg Response Time (ms) | Number | - |
| Issues | Relation | → GitHub Issues |
| Active Issues | Rollup | Issues → Status → Count all |
| In Current Sprint | Rollup | Issues → Sprint → Count values → "Sprint 4" |
| Blocked | Rollup | Issues → Status → Count values → "Blocked" |
| Team Members | Person | (multi-person) |
| Primary Contact | Person | - |
| Users (monthly) | Number | - |
| Growth Rate | Number | - |

### Add Test Entries (All 7 Projects)

**1. ACT Farm Studio**:
```
Project Name: ACT Farm and Regenerative Innovation Studio
Description: Multi-project orchestrator and operations hub
Strategic Pillar: Art of Social Impact (link after creation)
Tech Stack: Next.js, Supabase, Tailwind, Vercel, TypeScript
Primary Language: TypeScript
GitHub Repo: https://github.com/Acurioustractor/act-regenerative-studio
Production URL: https://act-studio.vercel.app
Status: Active Development
Health Status: Healthy
```

**2. Empathy Ledger**:
```
Project Name: Empathy Ledger
Description: Ethical storytelling platform with consent-first narratives
Strategic Pillar: Ethical Storytelling
Tech Stack: Next.js, Supabase, Tailwind, Vercel, TypeScript
Primary Language: TypeScript
GitHub Repo: https://github.com/Acurioustractor/empathy-ledger-v2
Production URL: https://empathy-ledger.vercel.app
Status: Active Development
Health Status: Healthy
```

**3. JusticeHub**:
```
Project Name: JusticeHub
Description: Youth justice and community-designed program models
Strategic Pillar: Justice Reimagined
Tech Stack: Next.js, Supabase, Tailwind, Vercel, TypeScript
Primary Language: TypeScript
GitHub Repo: https://github.com/Acurioustractor/justicehub-platform
Production URL: https://justicehub.vercel.app
Status: Active Development
Health Status: Healthy
```

**4. The Harvest**:
```
Project Name: The Harvest
Description: Community hub with therapeutic horticulture and heritage preservation
Strategic Pillar: Community Resilience
Tech Stack: Next.js, Supabase, Tailwind, Vercel
GitHub Repo: https://github.com/Acurioustractor/harvest-community-hub
Production URL: https://harvest-community.vercel.app
Status: Active Development
Health Status: Healthy
```

**5. Goods**:
```
Project Name: Goods Asset Register
Description: Circular economy and community-designed asset management
Strategic Pillar: Circular Economy & Community-Designed Goods
Tech Stack: Next.js, Supabase, Tailwind, Vercel
GitHub Repo: https://github.com/Acurioustractor/goods-asset-tracker
Production URL: https://goods-tracker.vercel.app
Status: Active Development
Health Status: Healthy
```

**6. BCV/ACT Farm**:
```
Project Name: Black Cockatoo Valley / ACT Farm
Description: 150-acre conservation-first regeneration estate
Strategic Pillar: Regeneration at Scale
Tech Stack: Next.js, Supabase, Tailwind, Vercel
GitHub Repo: https://github.com/Acurioustractor/act-farm
Production URL: https://act-farm.vercel.app
Status: Active Development
Health Status: Healthy
```

**7. ACT Placemat**:
```
Project Name: ACT Placemat
Description: Backend services, shared infrastructure, and cross-project support
Strategic Pillar: Art of Social Impact
Tech Stack: Next.js, Supabase, Tailwind, Vercel
GitHub Repo: https://github.com/Acurioustractor/act-intelligence-platform
Production URL: https://act-placemat.vercel.app
Status: Active Development
Health Status: Healthy
```

---

## Database 3: Strategic Pillars

### Create Database

1. New page: "Strategic Pillars"
2. Add table database

### Add Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Pillar Name | Title | - |
| Description | Text | - |
| Mission Statement | Text | - |
| LCAA Phase | Select | Listen, Curiosity, Action, Art |
| Primary Projects | Relation | → ACT Projects |
| Q1 Objective | Text | - |
| Q1 Key Results | Text | - |
| Issues | Relation | → GitHub Issues |
| Issues This Quarter | Rollup | Issues → Title → Count |
| Completed This Quarter | Rollup | Issues → Status → Count values → "Done" |
| Progress % | Formula | `round(prop("Completed This Quarter") / prop("Issues This Quarter") * 100)` |
| Community Impact | Select | Transformative, Significant, Moderate, Emerging |
| Impact Stories | Text | - |

### Add Test Entries (All 6 Pillars)

**1. Ethical Storytelling**:
```
Pillar Name: Ethical Storytelling
Description: Consent-first narratives with OCAP principles
Mission Statement: Give community members full agency over their stories
LCAA Phase: Action
Primary Projects: Empathy Ledger (link after creation)
Community Impact: Transformative
```

**2. Justice Reimagined**:
```
Pillar Name: Justice Reimagined
Description: Community-designed program models for youth justice
Mission Statement: Replace punitive systems with community-led alternatives
LCAA Phase: Action
Primary Projects: JusticeHub
Community Impact: Transformative
```

**3. Community Resilience**:
```
Pillar Name: Community Resilience
Description: Therapeutic horticulture and heritage preservation
Mission Statement: Build food sovereignty and cultural connection through community gardens
LCAA Phase: Action
Primary Projects: The Harvest
Community Impact: Significant
```

**4. Circular Economy & Community-Designed Goods**:
```
Pillar Name: Circular Economy & Community-Designed Goods
Description: Waste-to-wealth manufacturing with community ownership
Mission Statement: Transform waste into community-owned assets
LCAA Phase: Curiosity
Primary Projects: Goods
Community Impact: Emerging
```

**5. Regeneration at Scale**:
```
Pillar Name: Regeneration at Scale
Description: 150-acre conservation-first regeneration estate
Mission Statement: Prove regenerative agriculture at commercial scale
LCAA Phase: Action
Primary Projects: BCV/ACT Farm
Community Impact: Significant
```

**6. Art of Social Impact**:
```
Pillar Name: Art of Social Impact
Description: All ACT projects, contracted work, free programs, art support
Mission Statement: Revolution through creativity - installations, residencies, community art
LCAA Phase: Art
Primary Projects: ACT Farm Studio, ACT Placemat
Community Impact: Transformative
```

---

## Database 4: Deployments (Production Only)

### Create Database

1. New page: "Deployments"
2. Add table database

### Add Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Deployment | Title | (format: "Project - Version") |
| Project | Relation | → ACT Projects |
| Environment | Select | Production |
| Version | Text | - |
| Git SHA | Text | - |
| Git Branch | Text | - |
| Deployed At | Date | (with time) |
| Deployed By | Person | - |
| Status | Select | Success, Failed, In Progress, Rolled Back |
| Duration (seconds) | Number | - |
| Deploy URL | URL | - |
| GitHub Commit URL | URL | - |
| Vercel URL | URL | - |
| Health Check | Select | Healthy, Degraded, Down, Unknown |
| Response Time (ms) | Number | - |
| Last Checked | Date | (with time) |
| Changes | Text | - |
| Issues Closed | Relation | → GitHub Issues |

**Note**: No test entry yet - will be populated by automation

---

## Database 5: Velocity Metrics

### Create Database

1. New page: "Velocity Metrics"
2. Add table database

### Add Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Week Of | Title | (date: "Week of Dec 20") |
| Week Number | Number | - |
| Year | Number | - |
| Sprint | Relation | → Sprint Tracking |
| Issues Completed | Number | - |
| Story Points Completed | Number | - |
| Team Size | Number | - |
| Team Capacity (hours) | Number | - |
| Points per Week | Formula | `prop("Story Points Completed")` |
| Hours per Point | Formula | `prop("Team Capacity (hours)") / prop("Story Points Completed")` |
| Utilization % | Formula | `round(prop("Story Points Completed") / (prop("Team Capacity (hours)") / 2.5) * 100)` |
| vs Last Week | Number | - |
| Trend | Select | Up, Steady, Down |
| Bugs Created | Number | - |
| Bugs Fixed | Number | - |
| Rework % | Formula | `round(prop("Bugs Created") / prop("Issues Completed") * 100)` |
| Deployments | Number | - |
| Deploy Frequency | Formula | `prop("Deployments") / 7` |

**Note**: No test entry yet - will be populated by weekly automation

---

## Database 6: Weekly Reports

### Create Database

1. New page: "Weekly Reports"
2. Add table database

### Add Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Week Ending | Title | (date: "Week Ending Jan 3") |
| Report Date | Date | - |
| Sprint | Relation | → Sprint Tracking |
| Summary | Text | - |
| Top Achievements | Text | - |
| Deployments | Text | - |
| Velocity | Text | - |
| Next Week | Text | - |
| Email HTML | Text | - |
| Blog Draft | Text | - |
| Social Snippets | Text | - |
| Issues Completed | Number | - |
| Points Completed | Number | - |
| Deployments Count | Number | - |
| Sent | Checkbox | - |
| Sent To | Multi-select | Team, Co-Founders, Community, Funders |
| Sent At | Date | (with time) |

**Note**: No test entry yet - will be populated by automation

---

## Database 7: Enhance GitHub Issues (Existing)

### Find Your Existing Database

1. Locate your existing "GitHub Issues" database in Notion
2. Add these NEW properties (don't delete existing ones)

### Add New Properties

| Property Name | Type | Options/Formula |
|--------------|------|----------------|
| Effort Points | Number | - |
| Actual Hours | Number | - |
| Strategic Pillar | Relation | → Strategic Pillars |
| Sprint Relation | Relation | → Sprint Tracking |
| Assigned To | Person | - |
| Started Date | Date | - |
| Completed Date | Date | - |
| Days to Complete | Formula | `dateBetween(prop("Completed Date"), prop("Started Date"), "days")` |
| Community Impact | Select | High, Medium, Low, None |

**Note**: Existing properties (Title, Status, Type, Priority, Sprint, Milestone, ACT Project) remain unchanged

---

## After All Databases Created

### Link Them Together

**Sprint Tracking ↔ GitHub Issues**:
1. Open Sprint Tracking
2. In "Issues" relation, select GitHub Issues database
3. Open GitHub Issues
4. In "Sprint Relation" relation, select Sprint Tracking database

**ACT Projects ↔ Strategic Pillars**:
1. Open ACT Projects
2. In "Strategic Pillar" relation, link each project to its pillar
3. Verify rollups calculate

**And so on for all relations...**

### Verify Formulas

Test that all calculated fields work:
- Sprint Tracking: Duration, Velocity, Completion %
- Velocity Metrics: Points per Week, Hours per Point, etc.
- Strategic Pillars: Progress %

---

## Checklist

### Databases Created
- [ ] Sprint Tracking
- [ ] ACT Projects (with all 7 projects)
- [ ] Strategic Pillars (with all 6 pillars)
- [ ] Deployments
- [ ] Velocity Metrics
- [ ] Weekly Reports
- [ ] GitHub Issues (enhanced with new properties)

### Relations Linked
- [ ] Sprint Tracking ↔ GitHub Issues
- [ ] ACT Projects ↔ GitHub Issues
- [ ] ACT Projects ↔ Strategic Pillars
- [ ] Strategic Pillars ↔ GitHub Issues
- [ ] Deployments → ACT Projects
- [ ] Velocity Metrics → Sprint Tracking
- [ ] Weekly Reports → Sprint Tracking

### Formulas Working
- [ ] Sprint Tracking: Duration, Velocity, Completion %
- [ ] Velocity Metrics: All formulas
- [ ] Strategic Pillars: Progress %
- [ ] GitHub Issues: Days to Complete

### Test Data Added
- [ ] Sprint 4 in Sprint Tracking
- [ ] All 7 projects in ACT Projects
- [ ] All 6 pillars in Strategic Pillars

---

**Next Step**: Share Notion workspace link so I can verify everything is set up correctly before we build the sync scripts! ✅
