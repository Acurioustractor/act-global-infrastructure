# ACT Unified Intelligence System - Plan Updated

**Date**: 2025-12-29
**Status**: Plan revised to integrate existing ACT Placemat subscription system

---

## 🎯 What Changed

### Before
The original plan included building a complete subscription intelligence system from scratch:
- Gmail scanning for subscriptions
- Xero invoice reconciliation
- Annual cost analytics
- Email consolidation tracking
- ~30+ hours of development effort

### After
The plan now **integrates** the existing ACT Placemat subscription system:
- ✅ Gmail scanner already built (nicholas@, hi@, accounts@act.place)
- ✅ Xero reconciliation already working (60%+ confidence matching)
- ✅ Annual cost analytics already complete
- ✅ Email consolidation tracking already implemented
- 🔄 Need to build: Proxy APIs + Dashboard UI + Automation integration
- **~15-20 hours of integration effort** (saves 20-30 hours)

---

## 📋 Updated Plan Location

**Main Plan**: `/Users/benknight/.claude/plans/act-unified-intelligence-system.md`

**Integration Guide**: `/Users/benknight/act-global-infrastructure/docs/ACT_PLACEMAT_INTEGRATION.md`

---

## 🏗️ Revised Architecture

```
ACT Studio (Dashboard + Proxy APIs)
       ↓ HTTP requests
ACT Placemat Backend (Subscription Intelligence)
       ↓ Database queries
Supabase (discovered_subscriptions, subscription_receipts)
```

**Key Principle**: **Integration, not duplication**

---

## 📅 Revised Timeline

### Original Estimate: 8 weeks (112-143 hours)
### Revised Estimate: 6-7 weeks (92-123 hours)

**Time saved**: ~20-30 hours by leveraging existing ACT Placemat subscription system

### Phase Breakdown:

1. **Multi-Timeframe Planning** (Week 1-2): 12-16 hours
   - Notion databases for yearly → daily planning
   - Moon cycle integration
   - Enhanced sprint workflow skill

2. **Subscription Integration** ✅ (Week 2-3): 15-20 hours (reduced from 30+)
   - Proxy API endpoints in ACT Studio
   - Dashboard UI to visualize ACT Placemat data
   - Daily scan automation
   - Notion sync

3. **Perfect GitHub ↔ Notion Sync** (Week 3-4): 13-17 hours
   - Bidirectional sync
   - Codebase activity tracking
   - Intelligent issue assignment

4. **Information Hub** (Week 4-5): 20-25 hours
   - Unified search index (Gmail, Notion, Drive, GitHub, Xero)
   - "Where is X?" API
   - Natural language search

5. **Learning Modules** (Week 5-6): 16-20 hours
   - Pattern learning framework
   - CRM intelligence (GHL)
   - Project intelligence (velocity predictions)
   - Code intelligence (workflows, patterns)

6. **Claude Code Excellence** (Week 6-7): 16-20 hours
   - CLAUDE.md optimization
   - Skills refactoring (<500 lines)
   - Workflow library
   - Context monitoring

7. **Integration & Polish** (Week 7-8): 20-25 hours
   - Unified dashboard
   - E2E testing
   - Team rollout

---

## 🔗 Integration Strategy

### ACT Placemat Provides:
- Subscription detection from Gmail
- Xero invoice reconciliation
- Cost analytics + savings opportunities
- Email consolidation tracking
- API endpoints for consumption

### ACT Studio Provides:
- Proxy API layer for ACT Placemat
- Dashboard UI for visualization
- Integration with GitHub/Notion workflow
- Automation scheduling (daily scans)

### ACT Global Infrastructure Provides:
- Daily scan automation (GitHub Actions)
- Notion sync scripts
- Cross-project coordination

---

## 📊 What Already Exists

### ACT Placemat Subscription Tracker
**Location**: `/Users/benknight/Code/ACT Placemat/apps/backend/subscription-tracker/`

**Components**:
- `services/gmail/multiAccountScanner.js` - Multi-account Gmail scanner
- `services/reconciliation/fuzzyMatcher.js` - Levenshtein matching
- `services/reconciliation/reconciliationEngine.js` - Xero invoice matching
- `services/analytics/costEstimator.js` - Annual cost calculations
- `services/migration/emailConsolidation.js` - Consolidation tracking

**Database (Supabase)**:
- `discovered_subscriptions` table
- `subscription_receipts` table
- `outstanding_invoices` view

**API Endpoints**:
- `POST /api/v1/subscriptions/reconcile`
- `GET /api/v1/subscriptions/outstanding`
- `GET /api/v1/subscriptions/analytics/annual-costs`
- `GET /api/v1/subscriptions/migration/vendor-contacts`

**Documentation**:
- Implementation summary
- Deployment guide
- Frontend integration guide
- R&D tax claim documentation

---

## 🛠️ What We'll Build

### 1. Proxy API Layer (ACT Studio)
**Location**: `src/app/api/subscriptions/`

**Endpoints**:
- `GET /api/subscriptions/analytics` → Proxies to ACT Placemat
- `GET /api/subscriptions/outstanding` → Proxies to ACT Placemat
- `POST /api/subscriptions/reconcile` → Proxies to ACT Placemat
- `GET /api/subscriptions/migration` → Proxies to ACT Placemat
- `GET /api/subscriptions/list` → Proxies to ACT Placemat

### 2. Dashboard UI (ACT Studio)
**Location**: `src/app/admin/subscriptions/page.tsx`

**Views**:
- Overview Tab (annual costs, savings opportunities)
- Outstanding Invoices Tab (unpaid/unmatched invoices)
- Migration Tracker Tab (email consolidation progress)

**Components**:
- `SubscriptionStats.tsx` - Total costs, savings
- `OutstandingInvoices.tsx` - Unpaid invoices table
- `MigrationProgress.tsx` - Email consolidation status
- `SavingsOpportunities.tsx` - Duplicate/unused subscriptions

### 3. Automation (Global Infrastructure)
**Location**: `scripts/`

**Scripts**:
- `daily-subscription-scan.mjs` - Trigger ACT Placemat scanner
- `sync-subscriptions-to-notion.mjs` - Update Notion database

**GitHub Actions**:
- `.github/workflows/daily-subscription-scan.yml` - Daily at 9 AM

### 4. Notion Integration
**Database**: Subscription Tracking

**Properties**:
- Vendor, Annual Cost, Billing Cycle
- Account Email, Status, Next Renewal
- Migration Status, Potential Savings

---

## ✅ Benefits of Integration Approach

1. **No Duplication** - Leverage 23 hours of R&D already invested
2. **Proven System** - Gmail scanner, reconciliation already working
3. **Single Source of Truth** - One Supabase database
4. **Faster Implementation** - 15-20 hours vs 30+ hours
5. **Maintainability** - Updates in one place
6. **R&D Tax Credit** - Existing work already documented for AusIndustry

---

## 🚀 Next Steps

### If Plan Approved:

**Immediate (Week 1):**
1. Create 5 Notion databases for multi-timeframe planning
2. Generate moon cycles for 2025
3. Start ACT Studio subscription proxy APIs

**Week 2:**
4. Build subscription dashboard UI in ACT Studio
5. Set up daily scan automation
6. Create Notion subscription tracking database

**Week 3:**
7. Implement bidirectional GitHub ↔ Notion sync
8. Add codebase activity tracking
9. Build intelligent issue assignment

**Weeks 4-7:**
10. Continue with Information Hub, Learning Modules, Claude Code Excellence
11. Integration & Polish
12. Team rollout

---

## 📚 Key Documents

1. **Unified Intelligence Plan**: `/Users/benknight/.claude/plans/act-unified-intelligence-system.md`
   - Complete 7-phase implementation plan
   - Multi-timeframe planning system
   - Information hub, learning modules
   - Claude Code optimization strategies

2. **ACT Placemat Integration Guide**: `/Users/benknight/act-global-infrastructure/docs/ACT_PLACEMAT_INTEGRATION.md`
   - Integration architecture diagram
   - Implementation steps
   - Data flow documentation
   - Security considerations

3. **ACT Placemat Summary**: `/Users/benknight/Code/ACT Placemat/SUBSCRIPTION_INTELLIGENCE_HUB_SUMMARY.md`
   - What's already built
   - API usage examples
   - Manual setup requirements
   - R&D tax documentation

---

## 💡 Key Insights Applied

From research (Sankalp's Claude Code Guide):
- **Context Engineering**: "Convert unknown unknowns to known unknowns"
- **Skills <500 lines**: Load expertise on-demand, not upfront
- **Sub-agents for exploration**: Preserve main conversation context
- **Todo lists anchor**: Prevent context drift
- **Fast feedback loops**: More iterations = better learning
- **Quality enables AI**: Good naming, tests, refactoring

---

## 📊 Success Metrics

### Subscription Intelligence
- ✅ 85%+ auto-detection rate from Gmail
- ✅ 90%+ Xero invoice matching accuracy
- ✅ API response time <500ms
- ✅ Dashboard load time <2s
- ✅ Daily scan 100% completion rate

### Multi-Timeframe Planning
- All issues linked: Sprint → Moon Cycle → 6-Mo Phase → Yearly Goal
- Progress rolls up automatically
- Can generate daily plan from yearly vision in <5 min

### Overall System
- Can find any document in <30 seconds
- 10-20 hours saved per week across team
- 85%+ conversation success rate with Claude Code
- Average context usage <50% for common tasks

---

**Status**: Ready for approval and implementation
**Timeline**: 6-7 weeks
**Effort**: 92-123 hours
**Savings**: ~20-30 hours by integrating existing systems
