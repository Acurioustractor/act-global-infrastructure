# Project Financial Workspaces — Architecture Plan

**Date:** 2026-03-22
**Context:** Ben wants per-project financial pages that show the full story — not just P&L aggregates, but incoming/outgoing, types of money, milestones, people, and path to revenue. Live from Xero.

---

## The Problem

The current `/finance/projects/[code]` page shows a P&L view from pre-computed `project_monthly_financials`. This is useful for accounting but doesn't tell the **story** of a project:

- What milestones have been delivered and paid?
- What invoices are outstanding and when are they due?
- What grants are in the pipeline for this project?
- What type of money is it — commercial revenue, philanthropy, grant, loan?
- Who are the contractors/people and what are they costing?
- What's the path from grant-funded to self-sustaining?

**Example — The Harvest (ACT-HV):**
Sonas Properties is the renovation contractor. Phase 1 Milestone 1 ($44K) delivered and paid. Milestone 2 ($37.3K) is due 27 Mar for pavilion + fire cooking + kids area. Regional Arts is funding Radical Scoops (3 x $16.5K). But none of this context exists in the current page — it just shows a monthly revenue/expense bar chart.

---

## What Each Project Page Should Show

### 1. Income Streams (grouped by type)

| Type | Icon | Examples |
|------|------|----------|
| **Grant** | Gift | Catalysing Impact, QBE, Snow Foundation |
| **Philanthropy** | Heart | Bupa Funding Network, Fairfax |
| **Commercial** | ShoppingBag | Centrecorp bed sales, service contracts |
| **Fee for Service** | Briefcase | Palm Island consulting, Just Reinvest delivery |
| **Arts/Cultural** | Palette | Regional Arts / Radical Scoops, RADF |
| **Loan/Investment** | Landmark | SEFA loan, SIH co-investment |

Each stream shows:
- Source name + description
- Total contract value (if known)
- Amount received (PAID invoices)
- Amount pending (AUTHORISED/SUBMITTED invoices)
- Amount in pipeline (grant_opportunities for this project)
- Next expected payment + date

### 2. Milestone Timeline

Visual timeline of project phases with financial anchors:

```
 DELIVERED                    DUE NOW              UPCOMING
 ─────────────────────────────────────────────────────────────
 [Phase 1 M1]               [Phase 1 M2]          [Phase 2]
  $44,000 PAID               $37,290 DUE 27 Mar    TBD
  Site + garden + access      Pavilion + cooking    Next scope
```

Data source: Parse from Xero invoice `line_items` descriptions which already contain milestone info (e.g., "Phase 1 Milestone 2").

### 3. Outgoing (Expenses by Category)

- **Contractors/People**: Sonas Properties, architect fees, gardener
- **Materials**: Sydney Tools, timber, fixings
- **Travel**: Fuel, accommodation for site visits
- **Operations**: Council rates, insurance, utilities

This already exists in the current page's expense breakdown but needs richer drill-down.

### 4. Pipeline / Grants Being Pursued

Pull from `grant_opportunities` where `aligned_projects @> '{ACT-HV}'`:
- Show each opportunity with stage, amount, probability
- Weighted pipeline total
- Next deadlines

### 5. Revenue Roadmap

For projects with commercial potential (Goods, The Harvest):
- Current revenue run rate
- Revenue targets / milestones
- Path to self-sustainability
- When does grant funding need to be replaced by earned revenue?

### 6. Key People

From `project_salary_allocations` + Xero contractor payments:
- Allocated team members and their cost
- External contractors with payment history
- Roles: architect, gardener, project manager, etc.

---

## Data Architecture

### Option A: Enrich existing page with Xero invoice data (Recommended)

Add a new API section to `/api/finance/projects/[code]` that also fetches:

```typescript
// NEW: Xero invoices for this project (receivables = incoming)
const invoices = await supabase
  .from('xero_invoices')
  .select('*')
  .eq('type', 'ACCREC')
  .filter('line_items', 'cs', `[{"tracking":[{"name":"Project","option":"${projectCode}"}]}]`)
  // OR: match by contact_name patterns mapped to project

// NEW: Grant pipeline for this project
const pipeline = await supabase
  .from('grant_opportunities')
  .select('*')
  .contains('aligned_projects', [projectCode])
  .neq('status', 'closed')
```

**Challenge:** Xero invoices aren't reliably tagged with project codes in `line_items.tracking`. Many invoices are matched to projects by *contact name* patterns (e.g., Sonas → ACT-HV, Palm Island CC → ACT-EL).

**Solution:** Use `vendor_project_rules` table (already exists for transactions) to also map invoice contacts to projects. Add a new column `applies_to_invoices` boolean, or create a lightweight `invoice_project_map` table:

```sql
CREATE TABLE invoice_project_map (
  invoice_id UUID REFERENCES xero_invoices(id),
  project_code TEXT NOT NULL,
  income_type TEXT NOT NULL, -- 'grant', 'philanthropy', 'commercial', 'fee_for_service', 'arts', 'loan'
  milestone TEXT, -- 'Phase 1 M1', 'Phase 1 M2', etc.
  notes TEXT,
  PRIMARY KEY (invoice_id, project_code)
);
```

This gives us:
- Manual override for project assignment (some invoices serve multiple projects)
- Income type classification (can't be derived from Xero alone)
- Milestone tagging (can be auto-parsed from descriptions but editable)

### Option B: Separate "project workspace" concept

Heavier — create a full `project_workspaces` table with phases, milestones, people, targets. More flexible but more to maintain. Probably overkill for now.

**Recommendation: Option A** — enhance the existing page, add `invoice_project_map` for the metadata Xero can't provide. Start with The Harvest as the proof of concept.

---

## Implementation Phases

### Phase 1: Invoice-level data on project pages
- Create `invoice_project_map` table
- Seed initial mappings from today's research (Sonas → ACT-HV, Just Reinvest → ACT-JH, etc.)
- Add invoice fetching to `/api/finance/projects/[code]` route
- Display receivable invoices grouped by status (PAID / AUTHORISED / DRAFT)
- Show payment timeline

### Phase 2: Income type classification + pipeline integration
- Add income_type to invoice_project_map and seed from known data
- Add grant_opportunities to the API response (aligned_projects match)
- Display income streams grouped by type with received/pending/pipeline
- Add weighted pipeline total

### Phase 3: Milestone timeline
- Parse milestone info from invoice descriptions (Phase X Milestone Y)
- Build visual timeline component
- Allow manual milestone creation for future phases

### Phase 4: People + expenses drill-down
- Enhance expense view with contractor-level detail
- Link Sonas Properties payments to specific deliverables
- Show team allocation from salary_allocations

### Phase 5: Revenue roadmap (for commercial projects)
- Path from grant-funded to earned revenue
- Revenue targets and progress
- Self-sustainability timeline

---

## Project-Specific Corrections from Today's Session

### The Harvest (ACT-HV)
| Contact | Invoice | Amount | Status | Description |
|---------|---------|--------|--------|-------------|
| Sonas Properties | INV-0316 | $44,000 | PAID | Phase 1 M1 — site + garden + access |
| Sonas Properties | INV-0323 | $37,290 | AUTH | Phase 1 M2 — pavilion + fire cooking + kids |
| Regional Arts | INV-0299 | $16,500 | PAID | Radical Scoops 1/3 |
| Regional Arts | INV-0301 | $16,500 | AUTH | Radical Scoops 2/3 (due Mar 2026) |
| Regional Arts | INV-0302 | $16,500 | AUTH | Radical Scoops 3/3 (due Jun 2026) |
| **Total** | | **$130,790** | | $60,500 received, $70,290 pending |

### Goods on Country (ACT-GD) — Receivables
| Contact | Invoice | Amount | Status | Description |
|---------|---------|--------|--------|-------------|
| Palm Island CC | INV-0317 | $36,300 | AUTH | Goods Stretch Bed v2.3 |
| Rotary Eclub | INV-0222 | $82,500 | AUTH | (outstanding since Apr 2025!) |
| Centrecorp | Multiple | $84,700+ | DRAFT | Production plant trial |
| Fairfax | GHL | $50,000 | WON | Goods Grant |

### JusticeHub (ACT-JH)
| Contact | Invoice | Amount | Status | Description |
|---------|---------|--------|--------|-------------|
| Just Reinvest | INV-0295 | $9,900 | AUTH | Phase 1 — youth engagement |
| Just Reinvest | INV-0296 | $9,900 | AUTH | Phase 2 |
| Just Reinvest | INV-0297 | $7,700 | AUTH | Phase 3 |
| Dusseldorf Forum | INV-0298 | $16,500 | PAID | Contained rental for Mounty Yarns |
| **Total** | | **$44,000** | | $16,500 received, $27,500 pending |

### Empathy Ledger / Palm Island (ACT-EL)
| Contact | Invoice | Amount | Status | Description |
|---------|---------|--------|--------|-------------|
| Palm Island CC | INV-0231 | $71,500 | PAID | Flood Storytelling Project |
| Palm Island CC | INV-0262 | $68,200 | PAID | Community Hub Photo Studio |
| Palm Island CC | INV-0263 | $50,600 | PAID | Elders Returning to Country |
| Palm Island CC | INV-0264 | $81,400 | PAID | Living Annual Report |
| Palm Island CC | INV-0286 | $165,000 | PAID | Phase 1 Discovery & Planning |
| **Total** | | **$436,700** | | All received |

### Community Capital Report (ACT-CP)
| Contact | Invoice | Amount | Status | Description |
|---------|---------|--------|--------|-------------|
| SIH Foundation | INV-0289 | $21,780 | AUTH | Community Capital Report facilitation |

### ACT General / Bupa (ACT-CA)
| Contact | GHL Amount | Status | Description |
|---------|-----------|--------|-------------|
| Bupa Funding Network | $146,973 | Graduation | Pitch — project ACT-CA |

---

## Still Unknown (Need Ben's Input)

1. **AMP Spark** — not found in any system. What is this?
2. **$20,000 from another place** — which contact/org?
3. **"One we are waiting on"** — is this the Snow Foundation $132K (INV-0321, just invoiced 18 Mar)?
4. **Snow Foundation $132K** — which project does this belong to? ACT-HV? ACT-GD? ACT-OO (Oonchiumpa)?
5. **Contained exhibition build costs** — searched but only found Dusseldorf $16.5K income. Where are the expense invoices for building the exhibition?

---

## Next Steps

1. Get answers on the unknowns above
2. Create `invoice_project_map` table and seed with today's mappings
3. Build Phase 1 — invoice-level data on project pages, starting with ACT-HV as proof of concept
4. Iterate based on what feels right when you see the data
