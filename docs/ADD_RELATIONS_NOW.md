# 🔗 Add Database Relations - Quick Guide (15 minutes)

**Why Manual?** Notion API doesn't support creating relations programmatically (yet)

---

## Step 1: Find Your GitHub Issues Database

You should already have a "GitHub Issues" database in Notion from your existing sync script.

**To find it**:
1. Search in Notion for "GitHub Issues"
2. Or check your existing sync script config

---

## Step 2: Add Relations to Sprint Tracking (5 min)

Open: [Sprint Tracking](https://www.notion.so/2d6ebcf981cf815fa30fc7ade0c0046d)

### Add "Issues" Relation
1. Click **"+ Add a property"** (in table header)
2. Property name: `Issues`
3. Property type: **Relation**
4. Select database: **GitHub Issues** (your existing database)
5. Click **Create relation**

### Add "Strategic Focus" Relation
1. Click **"+ Add a property"**
2. Property name: `Strategic Focus`
3. Property type: **Relation**
4. Select database: **Strategic Pillars**
5. URL: https://www.notion.so/2d6ebcf981cf81fea62fe7dc9a42e5c1
6. Click **Create relation**

---

## Step 3: Add Rollups to Sprint Tracking (5 min)

After relations are created, add these rollup properties:

### Total Issues
- Type: **Rollup**
- Relation: **Issues**
- Property: **Title** (or any property)
- Calculate: **Count all**

### Completed Issues
- Type: **Rollup**
- Relation: **Issues**
- Property: **Status**
- Calculate: **Count values**
- Filter: Where Status = "Done" (or "Completed")

### In Progress
- Type: **Rollup**
- Relation: **Issues**
- Property: **Status**
- Calculate: **Count values**
- Filter: Where Status = "In Progress"

### Blocked
- Type: **Rollup**
- Relation: **Issues**
- Property: **Status**
- Calculate: **Count values**
- Filter: Where Status = "Blocked"

### Total Effort Points
- Type: **Rollup**
- Relation: **Issues**
- Property: **Effort Points** (if exists in GitHub Issues)
- Calculate: **Sum**

### Completed Effort
- Type: **Rollup**
- Relation: **Issues**
- Property: **Effort Points**
- Calculate: **Sum**
- Filter: Where Status = "Done"

---

## Step 4: Add Formulas to Sprint Tracking (2 min)

### Velocity
- Type: **Formula**
- Expression: `prop("Completed Effort") / prop("Duration (weeks)")`

### Completion %
- Type: **Formula**
- Expression: `round(prop("Completed Issues") / prop("Total Issues") * 100)`

---

## Step 5: Link Strategic Pillars (2 min)

Open: [Strategic Pillars](https://www.notion.so/2d6ebcf981cf81fea62fe7dc9a42e5c1)

### Add "Issues" Relation
1. Click **"+ Add a property"**
2. Property name: `Issues`
3. Property type: **Relation**
4. Select database: **GitHub Issues**
5. Click **Create relation**

### Add "Primary Projects" Relation
1. Click **"+ Add a property"**
2. Property name: `Primary Projects`
3. Property type: **Relation**
4. Select database: **ACT Projects**
5. URL: https://www.notion.so/2d6ebcf981cf814195a0f8688dbb7c02
6. Click **Create relation**

---

## Step 6: Link ACT Projects (2 min)

Open: [ACT Projects](https://www.notion.so/2d6ebcf981cf814195a0f8688dbb7c02)

### Add "Issues" Relation
1. Click **"+ Add a property"**
2. Property name: `Issues`
3. Property type: **Relation**
4. Select database: **GitHub Issues**
5. Click **Create relation**

### Add "Strategic Pillar" Relation
1. Click **"+ Add a property"**
2. Property name: `Strategic Pillar`
3. Property type: **Relation**
4. Select database: **Strategic Pillars**
5. Click **Create relation**

---

## Step 7: Link Other Databases (Optional for now)

### Deployments → ACT Projects
- Property: `Project`
- Relation: ACT Projects database

### Deployments → GitHub Issues
- Property: `Issues Closed`
- Relation: GitHub Issues database

### Velocity Metrics → Sprint Tracking
- Property: `Sprint`
- Relation: Sprint Tracking database

### Weekly Reports → Sprint Tracking
- Property: `Sprint`
- Relation: Sprint Tracking database

---

## ✅ Verification

After adding relations:

1. **Test Sprint 4**:
   - Open Sprint 4 entry in Sprint Tracking
   - Click in the "Issues" relation field
   - Try linking to a GitHub issue
   - Verify "Total Issues" rollup shows "1"

2. **Check Formulas**:
   - Duration (weeks) should show "2"
   - Velocity should calculate (if issues linked)
   - Completion % should calculate (if issues linked)

---

## 🎯 What This Enables

Once relations are set up, you can:

✅ **Link GitHub issues to sprints** - See which issues are in Sprint 4
✅ **Track sprint progress** - Rollups automatically count issues
✅ **Calculate velocity** - Formulas work with rollup data
✅ **Align to strategy** - Link issues to strategic pillars
✅ **Project dashboards** - See all issues per project

---

## 📝 Next Steps After Relations

Once relations are working, we can:

1. **Enhance GitHub Sync** - Auto-populate sprint relations
2. **Build Sprint Snapshot** - Daily metrics update
3. **Create Dashboards** - Visualize progress across projects

---

**Time**: ~15 minutes total
**Difficulty**: Easy (just clicking through Notion UI)
**Status**: Required before automation scripts will work

