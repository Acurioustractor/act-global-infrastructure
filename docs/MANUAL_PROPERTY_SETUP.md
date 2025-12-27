# Manual Notion Database Property Setup

**Issue**: Notion API won't create properties programmatically with current integration
**Solution**: Add properties manually (15-20 minutes)

---

## Quick Setup

### 1. Sprint Tracking (5 min)

Open: [Sprint Tracking](https://www.notion.so/18654e50f11a4e0782e74c65b5619389)

Click "+ Add a property" and add these (in order):

| Property Name | Type | Options |
|---|---|---|
| Sprint Name | Title | (default) |
| Sprint Number | Number | |
| Status | Select | Planning, Active, Completed, Archived |
| Start Date | Date | |
| End Date | Date | |
| Duration (weeks) | Formula | `dateBetween(prop("End Date"), prop("Start Date"), "weeks")` |
| Goal | Text | |
| Projects | Multi-select | ACT Farm Studio, Empathy Ledger, JusticeHub, The Harvest, Goods, BCV/ACT Farm, ACT Placemat |
| Retrospective | Text | |
| Wins | Text | |
| Challenges | Text | |
| Learnings | Text | |

**Skip for now** (add after linking to GitHub Issues):
- Total Issues, Completed Issues, In Progress, Blocked (rollups)
- Total Effort Points, Completed Effort (rollups)
- Velocity, Completion % (formulas using rollups)

---

### 2. Strategic Pillars (3 min)

Open: [Strategic Pillars](https://www.notion.so/954b3ecdfe4d4baebff84c51f5165522)

| Property Name | Type | Options |
|---|---|---|
| Pillar Name | Title | |
| Description | Text | |
| Mission Statement | Text | |
| LCAA Phase | Select | Listen, Curiosity, Action, Art |
| Community Impact | Select | Transformative, Significant, Moderate, Emerging |
| Q1 Objective | Text | |
| Q1 Key Results | Text | |
| Impact Stories | Text | |

---

### 3. ACT Projects (5 min)

Open: [ACT Projects](https://www.notion.so/ef648c0464d844549106598329e7a6e3)

| Property Name | Type | Options |
|---|---|---|
| Project Name | Title | |
| Description | Text | |
| Tech Stack | Multi-select | Next.js, Supabase, Tailwind, Vercel, TypeScript |
| Primary Language | Select | TypeScript, JavaScript, Python |
| GitHub Repo | URL | |
| Production URL | URL | |
| Status | Select | Active Development, Maintenance, Beta, Launched, Archived |
| Health Status | Select | Healthy, Degraded, Down, Unknown |
| Last Deployed | Date | |
| Team Members | Person | |
| Primary Contact | Person | |

---

### 4. Deployments (3 min)

Open: [Deployments](https://www.notion.so/560e45c4879b43dab51ca5b0a91179b5)

| Property Name | Type | Options |
|---|---|---|
| Deployment | Title | |
| Environment | Select | Production |
| Version | Text | |
| Git SHA | Text | |
| Deployed At | Date | (include time) |
| Deployed By | Person | |
| Status | Select | Success, Failed, In Progress, Rolled Back |
| Deploy URL | URL | |
| Health Check | Select | Healthy, Degraded, Down, Unknown |
| Changes | Text | |

---

### 5. Velocity Metrics (3 min)

Open: [Velocity Metrics](https://www.notion.so/d201657bb06343fda993164d3c87a085)

| Property Name | Type | Options/Formula |
|---|---|---|
| Week Of | Title | |
| Week Number | Number | |
| Year | Number | |
| Issues Completed | Number | |
| Story Points Completed | Number | |
| Team Capacity (hours) | Number | |
| Points per Week | Formula | `prop("Story Points Completed")` |
| Trend | Select | Up, Steady, Down |
| Deployments | Number | |

---

### 6. Weekly Reports (2 min)

Open: [Weekly Reports](https://www.notion.so/8e0d8130201a4402bb75fd1972a050a2)

| Property Name | Type | Options |
|---|---|---|
| Week Ending | Title | |
| Report Date | Date | |
| Summary | Text | |
| Top Achievements | Text | |
| Issues Completed | Number | |
| Points Completed | Number | |
| Sent | Checkbox | |
| Sent To | Multi-select | Team, Co-Founders, Community, Funders |

---

## Alternative: Use Notion Templates

Faster option - duplicate existing databases:
1. Create one database manually with all properties
2. Duplicate it 5 times
3. Rename each duplicate

---

## After Adding Properties

Once properties are added, you can:
1. Add test data manually
2. Link databases with relations
3. Run sync scripts to populate from GitHub

**Total time**: ~20 minutes for all 6 databases

