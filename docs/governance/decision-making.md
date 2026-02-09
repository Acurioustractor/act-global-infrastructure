# ACT Decision-Making Framework

> **Status:** TEMPLATE - Ben to review and confirm
> **Last Updated:** 31 January 2026
> **Entities:** New Pty Ltd (operating) + AKT LTD (dormant charity) + Family Trust (to create)

---

## Governance Structure

### Operating Entity: ACT Pty Ltd (to be created)

The Pty Ltd will be the **main operating entity**. All day-to-day decisions flow through here.

| Role | Person | Authority |
|------|--------|-----------|
| Director | Ben Knight | Full operational authority |
| Director | Nic Marchesi | <!-- TODO: confirm --> |
| Secretary | <!-- TODO --> | Administrative |

### Dormant Charity: A Kind Tractor LTD

AKT board meets minimum quarterly (constitutional requirement). Minimal decisions while dormant.

| Name | Role | Status |
|------|------|--------|
| Nicholas Marchesi | Director + Secretary | Active |
| Benjamin Knight | Director | Active |
| Jessica Adams | Director | <!-- Confirm still active --> |

---

## Decision Authority Matrix

### Financial Decisions (Pty Ltd)

| Decision | Threshold | Who Decides | Process |
|----------|-----------|-------------|---------|
| Day-to-day expenses | < $500 | Ben | Direct approval |
| Project expenses | $500 - $5,000 | Ben | Review + approve |
| Major expenditure | $5,000 - $20,000 | Ben + Nic | Written approval |
| Capital investment | > $20,000 | Both directors | Formal resolution |
| Grant applications | Any | Ben | Review before submission |
| Grant acquittals | Any | Ben + accountant | Joint sign-off |
| Family trust distributions | Annual | Trustee + accountant | Annual resolution |

### Operational Decisions

| Decision | Who Decides | Consultation Required |
|----------|-------------|---------------------|
| New project initiation | Ben | Nic informed |
| Innovation Studio contracts | Ben | Nic informed for > $10K |
| Harvest operations | Ben | Nic consulted (lease relationship) |
| Farm operations | Ben + Nic | Nic owns property |
| Staff/contractor hiring | Ben | Directors informed |
| Technology choices | Ben | Nic informed for major spend |
| Community programs | Ben | Elder/community consultation |
| Indigenous data use | Ben + community | **Elder review REQUIRED** (OCAP) |
| Content publication | Ben | Storyteller consent required |

### Lease Decisions

| Decision | Who Decides | Notes |
|----------|-------------|-------|
| Harvest lease terms | Both directors + legal | Philanthropist relationship |
| Farm lease terms | Ben (Pty Ltd) + Nic (landlord) | Arm's length required for ATO |
| Lease renewals | Both directors | Review 6 months before expiry |

---

## Community Authority

> ACT operates with a philosophy of community ownership and Indigenous data sovereignty.

### Elder Review Required

The following decisions **must** include Elder consultation:
- Use of Indigenous stories or cultural knowledge
- Programs involving First Nations communities
- Empathy Ledger content involving Indigenous storytellers
- Cultural protocols for events and gatherings
- JusticeHub content involving community stories

### Storyteller Consent Required

Per Empathy Ledger principles:
- Stories cannot be published without storyteller consent
- Storytellers retain ownership of their narratives
- Data use must comply with OCAP principles (Ownership, Control, Access, Possession)

---

## Agentic System Decisions

| Level | Autonomy | Approval | Examples |
|-------|----------|----------|---------|
| Level 1 | Manual | Every action | Contact updates, data changes |
| Level 2 | Supervised | Batch approval (weekly sweep) | Enrichment, tagging, alerts |
| Level 3 | Autonomous | Post-hoc review | Data sync, notifications, health checks |

### Agent Proposal Flow

```
Agent generates proposal
  → Stored in agent_proposals table
  → Weekly review by Ben
  → Approve / Reject / Modify
  → Approved actions execute
```

---

## Escalation Path

```
Issue arises
  → Ben handles directly (if within authority)
  → Ben consults Nic (if financial > $5K or strategic)
  → Ben consults Elder (if Indigenous/cultural matter)
  → Directors' resolution (if > $20K or major commitment)
  → AKT board (if charity-related matter)
  → Legal advice (if contractual / regulatory)
  → Accountant (if tax / structure implications)
```

---

## Action Items

- [ ] Confirm Nic is co-director of new Pty Ltd
- [ ] Confirm financial thresholds are appropriate
- [ ] Confirm Elder consultation contacts
- [ ] Set up quarterly AKT board meeting schedule (constitutional requirement)
- [ ] Review and adjust agentic autonomy levels
- [ ] Confirm Jessica Adams is still active as AKT director
