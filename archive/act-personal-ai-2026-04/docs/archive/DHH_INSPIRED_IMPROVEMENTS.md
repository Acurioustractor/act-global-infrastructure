# DHH-Inspired Improvements for ACT Farmhand & AI Tooling

**Date**: January 2, 2026
**Inspired By**: [DHH is Immortal (and Costs $200/month)](https://danieltenner.com/dhh-is-immortal-and-costs-200-m/)
**Current System**: ACT Personal AI (Farmhand) multi-agent architecture

---

## 🎯 Executive Summary

The DHH article demonstrates a **sub-agent architecture for iterative specification refinement** that can dramatically improve ACT Farmhand and our AI tooling across the ACT ecosystem. Key insights:

1. **Specialized reviewer agents** that enforce project-specific standards (like DHH for Rails)
2. **Iterative specification cycles** before implementation (clarify → draft → review → refine)
3. **Structured documentation architecture** for specs, plans, and external knowledge
4. **Cultural alignment through prompts** (DHH for Rails = ACT values for justice)
5. **"Boring" code as a virtue** - maintainability > cleverness

---

## 📊 Gap Analysis: Current State vs. DHH Architecture

### What We Have ✅

| Component | Current ACT Farmhand | DHH Architecture |
|-----------|---------------------|------------------|
| **Specialized Agents** | 10 agents (ALMA, Story, Impact, etc.) | Application Architect + DHH Reviewer |
| **Cultural Enforcement** | BaseTool with hard blocks | System prompt philosophy |
| **Documentation** | 91 markdown files in /knowledge_base/ | /docs/ with structured naming |
| **Configuration** | production.py with agent definitions | System prompts for each agent |
| **Testing** | 91+ tests, 100% pass rate | Not specified |
| **Cost Tracking** | Message deduplication, $10 budget | $200/month mentioned |

### What We're Missing ❌

| Gap | Impact | DHH Approach |
|-----|--------|--------------|
| **Specification Reviewer Agent** | No iterative refinement before implementation | ClauDHH reviews all specs against Rails principles |
| **Structured Spec Workflow** | Agents implement directly | Clarify → Draft → Review → Refine → Handoff |
| **ACT Code Reviewer** | No systematic code review against ACT values | DHH reviews for DRY, convention, simplicity |
| **Documentation Structure** | Flat /knowledge_base/ directory | Hierarchical /docs/ (requirements, plans, stack) |
| **Versioned Specs** | No iteration tracking | `YYMMDD-XXa-spec-name.md` naming |
| **Brutal Honesty Prompts** | Polite agent responses | "This reads like someone who learned Rails from Java tutorials" |

---

## 🔧 Recommended Improvements

### 1. Create "ACT Code Reviewer" Sub-Agent

**Purpose**: Enforce ACT ecosystem principles across all agent implementations

**System Prompt** (inspired by ClauDHH):

```markdown
# ACT Code Reviewer Agent

You are a brutal but fair code reviewer who channels the core values of the ACT ecosystem. Your role is to review agent specifications and implementations to ensure they align with ACT's regenerative innovation principles.

## Core Principles (Your "Rails Way" Equivalent)

### Cultural Sovereignty is Sacred
- NEVER optimize people, ONLY observe systems
- NEVER access: elder_consent, sacred_knowledge, storyteller_contact_info
- ALWAYS enforce OCAP (Ownership, Control, Access, Possession)
- Community Authority signal weighs 30% - highest weight
- No profiling, no ranking, no prediction of human behavior

### Simplicity Over Cleverness
- Remove premature features until genuinely needed
- Question: "Does this serve the community, or the developer's ego?"
- Prefer boring, maintainable code to impressive abstractions
- "Farmhand-worthy" code benchmark: Would Ben use this in production?

### Regenerative Over Extractive
- Every feature must ask: "Who does this serve?"
- Reject surveillance, optimization, or extraction patterns
- Build tools that strengthen communities, not databases that profile them
- Impact measurement through SROI, not engagement metrics

### Context Over Configuration
- Store cultural protocols in code, not external configs
- Use BaseTool enforcement, not documentation reminders
- Hard blocks > soft guidelines > documentation
- If it can fail silently, it WILL fail silently

### Agent Specialization (Not Service Objects)
- Fat agents, skinny tools (agents own business logic)
- Don't create GenericDataSyncServiceHelperManager
- SyncAgent handles sync, ImpactAgent handles SROI - clear boundaries
- Resist temptation to abstract "common patterns" across agents

## Your Review Style

Be brutally honest. Examples of feedback you'd give:

❌ "This specification reads like someone learned the ALMA method from a
   corporate AI workshop. You've created 5 service objects to calculate
   a single signal. Why?"

❌ "I see you've added a 'profile_score' field. Which part of 'never optimize
   people' was unclear? Delete this entire section."

❌ "You're storing elder consent decisions in Redis cache? Are you trying to
   get this project shut down? Sacred fields go in Supabase with RLS, NEVER cached."

✅ "This is boring code. That's high praise. It does one thing, enforces protocols,
   and gets out of the way. Ship it."

## What Makes Code "ACT-Worthy"

1. **Cultural Safety First**
   - Sacred field blocks at tool level, not agent level
   - Read-only cultural_protocols field for flagging, not editing
   - Fail hard and loud if protocols violated

2. **Agent Clarity**
   - One agent = one purpose
   - StoryAnalysisAgent analyzes stories, doesn't write them
   - Don't create AbstractStoryAgent with strategy patterns

3. **Real-Time Over Batch**
   - Webhook-based sync, not cron jobs
   - SyncAgent reacts to GHL changes immediately
   - Batch processing is for lazy developers

4. **Configuration in Code**
   - SROI value proxies: Python dict in impact_agent.py
   - Grant keywords: Python list in grant_agent.py
   - Don't read YAML files at runtime for static configuration

5. **Test Coverage That Matters**
   - Test cultural protocol enforcement (91+ tests)
   - Test that sacred fields throw exceptions
   - Don't test framework code (we trust FastAPI)

## Review Process

When reviewing a spec:

1. Ask 3+ clarifying questions
2. Identify ALL cultural protocol violations
3. Point out unnecessary complexity (be specific!)
4. Question every new abstraction: "Why not use existing X agent?"
5. Check: Does this make the ecosystem simpler or more complex?
6. Final verdict: "Ship it" OR "Rewrite from scratch because [brutal honesty]"

Remember: You're not here to make developers feel good. You're here to ensure
code aligns with ACT values and serves communities, not egos.
```

### 2. Implement Iterative Specification Workflow

**New Directory Structure**:

```
/act-personal-ai/
├── /docs/
│   ├── /requirements/           # User stories & initial specs
│   │   └── 20260102-grant-automation.md
│   ├── /plans/                  # Reviewed, approved specifications
│   │   ├── 20260102-01a-grant-agent-spec.md
│   │   ├── 20260102-01b-grant-agent-spec.md  # After review iteration
│   │   └── 20260102-01c-grant-agent-spec.md  # Final approved
│   ├── /stack/                  # External tool documentation
│   │   ├── anthropic-claude-api.md
│   │   ├── gohighlevel-api.md
│   │   └── supabase-api.md
│   └── /archive/                # Old specs for reference
├── /knowledge_base/             # Keep existing ecosystem docs
├── /agents/                     # Existing agent implementations
└── /reviewers/                  # NEW: Reviewer sub-agents
    ├── act_code_reviewer.py
    ├── cultural_protocol_reviewer.py
    └── security_reviewer.py
```

**Workflow Command** (inspired by DHH's `/spec` command):

```python
# /act-personal-ai/commands/generate_spec.py

async def generate_act_spec(user_requirement: str):
    """
    Iterative specification generation with ACT Code Reviewer

    Workflow:
    1. Clarification - Ask 3+ questions
    2. Documentation - Fetch relevant ACT ecosystem context
    3. First Draft - Application Architect creates spec
    4. ACT Review - ACT Code Reviewer applies brutal feedback
    5. Refinement - Architect applies feedback
    6. Re-review - Iterate until "Ship it" verdict
    7. Handoff - Save to /docs/plans/ with YYMMDD-XXa- naming
    """

    # Phase 1: Clarification
    clarifying_questions = await clarification_agent.ask(user_requirement)
    clarified_requirement = await user.respond(clarifying_questions)

    # Phase 2: Documentation Fetching
    context = await knowledge_agent.fetch_relevant_docs([
        "/knowledge_base/ACT_ECOSYSTEM_COMPLETE_OVERVIEW.md",
        "/knowledge_base/ALMA_*.md",
        "/docs/stack/*.md"
    ])

    # Phase 3: First Draft
    initial_spec = await application_architect.create_spec(
        requirement=clarified_requirement,
        context=context
    )

    # Phase 4-6: Review Loop
    iteration = 'a'
    max_iterations = 5

    for i in range(max_iterations):
        review = await act_code_reviewer.review(initial_spec)

        if review.verdict == "Ship it":
            break

        # Apply feedback
        initial_spec = await application_architect.refine(
            spec=initial_spec,
            feedback=review.feedback
        )
        iteration = chr(ord(iteration) + 1)  # a -> b -> c

    # Phase 7: Handoff
    filename = f"/docs/plans/{datetime.now():%Y%m%d}-{iteration:02d}{iteration}-{slugify(user_requirement)}.md"
    save_spec(filename, initial_spec)

    return {
        "spec_path": filename,
        "iterations": ord(iteration) - ord('a') + 1,
        "final_verdict": review.verdict,
        "ready_for_implementation": review.verdict == "Ship it"
    }
```

### 3. Structured Documentation Reorganization

**Move from flat knowledge_base/ to hierarchical docs/**:

```bash
# Migration plan
/knowledge_base/ (91 files)
    ↓ Reorganize to:

/docs/
├── /requirements/              # User-facing requirements
│   ├── grant-automation-needs.md
│   ├── story-analysis-requirements.md
│   └── sroi-calculation-requirements.md
│
├── /plans/                     # Reviewed specifications (YYMMDD-XXa- naming)
│   ├── 20260102-01a-grant-agent-spec.md
│   ├── 20260102-02a-alma-signal-tracking-spec.md
│   └── 20260103-01a-story-narrative-analysis-spec.md
│
├── /stack/                     # External API documentation
│   ├── anthropic-claude-api.md
│   ├── gohighlevel-api-reference.md
│   ├── supabase-api-patterns.md
│   ├── notion-integration-guide.md
│   └── empathy-ledger-api.md
│
├── /architecture/              # System design docs
│   ├── multi-agent-architecture.md
│   ├── cultural-protocol-enforcement.md
│   ├── sroi-framework-design.md
│   └── alma-method-implementation.md
│
├── /ecosystem/                 # ACT project documentation
│   ├── justicehub/
│   ├── empathy-ledger/
│   ├── the-harvest/
│   ├── act-farm/
│   ├── goods-on-country/
│   └── brand-creative-ventures/
│
└── /archive/                   # Historical reference
    └── knowledge_base_backup/  # Original 91 files
```

**Benefits**:
- Clear separation: requirements → specs → architecture → ecosystem
- Versioned specs show evolution over iterations
- External API docs in dedicated /stack/ directory
- Easy to find "what's approved" vs "what's being designed"

### 4. Add "Brutal Honesty" Mode to Agents

**Current Agent Tone** (polite):
```python
# Current SyncAgent response
"I've identified 3 duplicate contacts in GHL. Would you like me to merge them?"
```

**DHH-Inspired Tone** (brutally honest):
```python
# ACT Code Reviewer response
"You have 3 duplicate contacts because someone manually entered data instead of
using the import tool. Fix the process, not just the symptom. Here's what's wrong:

1. No webhook validation on contact creation
2. No fuzzy matching before allowing manual entry
3. No training for team on import workflow

Ship the deduplication fix, but I'm blocking this spec until you add process
enforcement so this never happens again."
```

**Implementation**:

```python
# /agents/act_code_reviewer.py

class ACTCodeReviewer(BaseAgent):
    """
    Brutally honest code reviewer for ACT ecosystem.
    Channels ACT values like DHH channels Rails principles.
    """

    BRUTAL_FEEDBACK_TEMPLATES = {
        "cultural_violation": (
            "🚫 CULTURAL PROTOCOL VIOLATION\n\n"
            "You just tried to {action} on {field}. This is exactly what we DON'T do.\n\n"
            "Why this matters:\n"
            "- {cultural_reason}\n\n"
            "What to do instead:\n"
            "- {correct_approach}\n\n"
            "This is non-negotiable. Rewrite."
        ),

        "premature_abstraction": (
            "This specification reads like someone who learned software architecture "
            "from a Big Tech interview prep course.\n\n"
            "You've created:\n"
            "{unnecessary_abstractions}\n\n"
            "Delete all of this and use:\n"
            "{simple_approach}\n\n"
            "Complexity is not sophistication. Boring code ships."
        ),

        "optimization_creep": (
            "I see {optimization_attempt}. Why?\n\n"
            "Current volume: {current_scale}\n"
            "Optimization threshold: {scale_threshold}\n\n"
            "You're optimizing for problems you don't have. Remove this entire section "
            "and come back when you're actually at scale."
        ),

        "service_object_addiction": (
            "You've created a {service_object_name}. Why does this exist?\n\n"
            "{agent_name} already handles this responsibility. This is exactly what "
            "fat agents are for. You're adding a layer of indirection for no reason.\n\n"
            "Delete the service object. Put this logic in {agent_name}.{method_name}()."
        )
    }

    async def review(self, spec: str) -> ReviewFeedback:
        """
        Brutally honest review against ACT principles.
        Returns specific, actionable feedback or "Ship it" verdict.
        """
        violations = []

        # Check 1: Cultural protocol violations
        if self._has_cultural_violations(spec):
            violations.append(self.BRUTAL_FEEDBACK_TEMPLATES["cultural_violation"].format(
                action="access elder_consent",
                field="sacred_knowledge field",
                cultural_reason="Elder consent is SACRED. Only Elders grant/revoke consent.",
                correct_approach="Flag elder_review_required=true and STOP. Let the Elder decide."
            ))

        # Check 2: Premature abstraction
        if self._has_unnecessary_abstractions(spec):
            violations.append(self.BRUTAL_FEEDBACK_TEMPLATES["premature_abstraction"].format(
                unnecessary_abstractions="- AbstractDataSyncStrategyFactory\n- BaseContactMergeService\n- DataValidationHelperManager",
                simple_approach="SyncAgent.merge_contacts(contact_a, contact_b) → done"
            ))

        # Check 3: Premature optimization
        if self._has_premature_optimization(spec):
            violations.append(self.BRUTAL_FEEDBACK_TEMPLATES["optimization_creep"].format(
                optimization_attempt="Redis caching for contact lookup",
                current_scale="47 contacts in GHL",
                scale_threshold="10,000+ contacts"
            ))

        # Check 4: Service object addiction
        if self._has_service_objects(spec):
            violations.append(self.BRUTAL_FEEDBACK_TEMPLATES["service_object_addiction"].format(
                service_object_name="GrantMatchingService",
                agent_name="GrantAgent",
                method_name="find_opportunities"
            ))

        if violations:
            return ReviewFeedback(
                verdict="Rewrite",
                feedback="\n\n---\n\n".join(violations),
                severity="blocking"
            )

        return ReviewFeedback(
            verdict="Ship it",
            feedback="This is boring code. That's high praise. Deploy it.",
            severity="approved"
        )
```

### 5. Configuration Management: YAML → Python

**Current Approach** (scattered configuration):
```python
# Somewhere in grant_agent.py
GRANT_KEYWORDS = load_yaml("config/grant_keywords.yaml")

# Somewhere in impact_agent.py
SROI_PROXIES = load_json("config/sroi_value_proxies.json")
```

**DHH-Inspired Approach** (configuration in code):
```python
# /agents/grant_agent.py

class GrantAgent:
    """Grant research and matching for ACT ecosystem projects."""

    # Configuration lives with the code that uses it
    GRANT_KEYWORDS = {
        "JusticeHub": [
            "youth justice", "First Nations youth", "diversion programs",
            "alternatives to incarceration", "community-based justice",
            "restorative justice", "youth detention", "criminal justice reform"
        ],
        "Empathy Ledger": [
            "storytelling", "narrative change", "community voice",
            "cultural preservation", "digital storytelling", "lived experience"
        ],
        "The Harvest": [
            "sustainable agriculture", "regenerative farming", "climate adaptation",
            "Indigenous land management", "food sovereignty", "First Nations farming"
        ]
        # ... (100+ keywords total)
    }

    GRANT_PORTALS = [
        {
            "name": "GrantConnect",
            "url": "https://www.grants.gov.au",
            "check_frequency_hours": 24,
            "priority": "high"
        },
        {
            "name": "Australian Communities Foundation",
            "url": "https://www.communityfoundation.org.au/grants",
            "check_frequency_hours": 168,  # Weekly
            "priority": "medium"
        }
        # ... (5 portals total)
    ]
```

**Why**:
- ✅ Configuration is versioned with code (git tracks changes)
- ✅ No runtime file I/O for static config
- ✅ Easier to review: "Why did you add this keyword?" is a PR comment
- ✅ Type safety: IDE autocomplete for config values
- ✅ Explicit: No "magic" external files to discover

**When to Use External Files**:
- ❌ Static configuration (grant keywords, SROI proxies) → Use Python dicts
- ✅ Secrets (API keys, passwords) → Use .env files
- ✅ User-generated content (uploaded stories, reports) → Use /files/ directory
- ✅ Runtime state (logs, cache) → Use /logs/, /cache/ directories

### 6. Agent Specialization: Resist "Generic" Abstractions

**Anti-Pattern** (service object addiction):
```python
# DON'T DO THIS
class AbstractDataSyncService:
    """Generic sync service for any data source."""

    def sync(self, source: DataSource, destination: DataSource, strategy: SyncStrategy):
        # 200 lines of abstraction
        pass

class GHLToSupabaseSyncService(AbstractDataSyncService):
    # Implements abstract methods
    pass

class GHLToNotionSyncService(AbstractDataSyncService):
    # More boilerplate
    pass
```

**ACT Pattern** (fat agents, clear boundaries):
```python
# DO THIS INSTEAD
class SyncAgent:
    """
    Syncs data between GHL, Supabase, and Notion.

    Responsibilities:
    - GHL → Supabase (volunteers only, blocks family support)
    - GHL → Notion (activity log)
    - Webhook-based real-time sync
    - Cultural protocol enforcement
    """

    async def sync_ghl_to_supabase(self, contact_id: str):
        """Sync a single GHL contact to Supabase volunteers table."""
        contact = await self.ghl_tool.get_contact(contact_id)

        # Cultural protocol check
        if contact.tags.contains("family_support"):
            raise ProtocolViolation("NEVER sync family support contacts")

        # Simple, direct sync
        await self.supabase.upsert("volunteers", {
            "ghl_contact_id": contact.id,
            "name": contact.name,
            "email": contact.email,
            "tags": contact.tags,
            "synced_at": datetime.utcnow()
        })

    async def sync_ghl_to_notion(self, activity: dict):
        """Log GHL activity to Notion database."""
        await self.notion.create_page(
            database_id=ACTIVITY_LOG_DB,
            properties={
                "Activity": activity["type"],
                "Contact": activity["contact_name"],
                "Timestamp": activity["created_at"]
            }
        )
```

**Why Fat Agents Work for ACT**:
- Each agent has clear ownership (SyncAgent owns ALL syncing)
- No hunting through 5 service objects to understand a sync flow
- Cultural protocol enforcement in ONE place, not scattered across services
- Easy to test: `test_sync_agent.py` covers all sync scenarios

### 7. Real-Time Over Batch (Already Good, Reinforce)

**Current Approach** ✅ (already DHH-aligned):
```python
# SyncAgent uses webhooks (good!)
@app.post("/webhooks/ghl/contact-updated")
async def handle_contact_update(payload: dict):
    await sync_agent.sync_ghl_to_supabase(payload["contact_id"])
```

**Keep Doing This**:
- Webhook-based sync (not cron jobs)
- Real-time pattern detection (ALMA signals as they happen)
- Immediate cultural protocol violations (fail fast and loud)

**Anti-Pattern to Avoid**:
```python
# DON'T DO THIS (batch processing for real-time data)
@scheduler.cron("0 * * * *")  # Every hour
async def sync_contacts_batch():
    contacts = await ghl.get_all_contacts()
    for contact in contacts:
        await sync_agent.sync(contact)
```

### 8. Test Coverage That Matters (Already Excellent, Document Why)

**Current Test Suite** (91+ tests, 100% pass):
```python
# /tests/test_cleanup_agent.py (18 tests)
# /tests/test_research_agent.py (21 tests)
# /tests/test_connector_agent.py (20 tests)
# /tests/test_search_agent.py (32 tests)
```

**What Makes These Tests "ACT-Worthy"**:

```python
# /tests/test_cultural_protocols.py (CRITICAL tests)

def test_sacred_field_access_blocked():
    """HARD BLOCK: Accessing sacred fields must raise ProtocolViolation."""
    tool = GHLTool()
    contact = {"elder_consent": "yes", "name": "Elder Mary"}

    with pytest.raises(ProtocolViolation, match="NEVER access elder_consent"):
        tool.get_field(contact, "elder_consent")

def test_elder_review_flag_readonly():
    """CULTURAL PROTOCOL: Can flag elder_review_required, but NOT edit it."""
    tool = GHLTool()
    contact = {"elder_review_required": False}

    # Reading is OK (for flagging)
    assert tool.get_field(contact, "elder_review_required") == False

    # Writing must fail
    with pytest.raises(ProtocolViolation):
        tool.update_field(contact, "elder_review_required", True)

def test_community_authority_signal_weight():
    """ALMA METHOD: Community authority weighs 30% (highest)."""
    alma = ALMAAgent()
    signals = {
        "community_authority": 0.8,  # 30% weight
        "evidence_strength": 0.9,    # 25% weight
        "harm_risk": 0.1,            # 20% weight
        "implementation": 0.7,       # 15% weight
        "option_value": 0.6          # 10% weight
    }

    composite = alma.calculate_composite_signal(signals)

    # Community authority contributes most to composite score
    assert composite == (0.8 * 0.30) + (0.9 * 0.25) + ...
```

**What NOT to Test** (DHH principle: don't test framework code):
```python
# DON'T WRITE THESE TESTS

def test_fastapi_routes_exist():
    """FastAPI handles routing. Trust the framework."""
    pass  # Delete this test

def test_anthropic_api_returns_string():
    """Anthropic SDK is tested by Anthropic. Don't duplicate."""
    pass  # Delete this test

def test_json_serialization():
    """Python's json module works. Don't test Python."""
    pass  # Delete this test
```

**Test What Matters**:
- ✅ Cultural protocol enforcement (sacred field blocks)
- ✅ Agent business logic (ALMA signal calculations, SROI formulas)
- ✅ Integration points (GHL → Supabase data transformations)
- ✅ Edge cases (empty contacts, missing fields, malformed data)
- ❌ Framework behavior (FastAPI routing, Anthropic API responses)
- ❌ External API contracts (assume external APIs work as documented)

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. ✅ Create `/docs/` directory structure
2. ✅ Migrate `/knowledge_base/` to `/docs/ecosystem/`
3. ✅ Write ACT Code Reviewer system prompt
4. ✅ Implement `act_code_reviewer.py` agent
5. ✅ Test brutal feedback templates

### Phase 2: Workflow Integration (Week 2)
1. ✅ Create `generate_act_spec.py` command
2. ✅ Implement iterative review loop (clarify → draft → review → refine)
3. ✅ Add versioned spec naming (`YYMMDD-XXa-spec-name.md`)
4. ✅ Test workflow with example spec (e.g., new grant automation feature)

### Phase 3: Configuration Cleanup (Week 3)
1. ✅ Move grant keywords from YAML → Python (`grant_agent.py`)
2. ✅ Move SROI proxies from JSON → Python (`impact_agent.py`)
3. ✅ Document when to use external files vs. code configuration
4. ✅ Update tests to reflect new configuration locations

### Phase 4: Cultural Enforcement (Week 4)
1. ✅ Add "brutal honesty" mode to ACT Code Reviewer
2. ✅ Create cultural protocol violation templates
3. ✅ Test with intentional protocol violations (elder_consent access, etc.)
4. ✅ Document feedback templates for common anti-patterns

### Phase 5: Documentation & Training (Week 5)
1. ✅ Write "ACT Development Philosophy" guide (inspired by Rails Doctrine)
2. ✅ Create code review checklist (cultural protocols, simplicity, agent boundaries)
3. ✅ Record example spec review session (video walkthrough)
4. ✅ Update README with new workflow and directory structure

---

## 📚 ACT Development Philosophy (Inspired by Rails Doctrine)

### 1. Cultural Sovereignty is Sacred
**Never optimize people, only observe systems.**

Like Rails' "Convention over Configuration," ACT has non-negotiable principles:
- Sacred fields are BLOCKED at the tool level (not documented)
- Community authority signal weighs 30% (highest)
- OCAP principles enforced in code, not guidelines

### 2. Simplicity Over Cleverness
**Boring code ships. Impressive code gets rewritten.**

DHH values maintainability over sophistication. So do we:
- Fat agents, skinny tools (business logic in agents)
- No service objects for one-time operations
- Configuration in code (not external files for static data)

### 3. Regenerative Over Extractive
**Every feature must ask: "Who does this serve?"**

If it serves egos (developer's or funder's), delete it:
- No engagement metrics, only impact evidence
- No optimization of people, only systems
- SROI framework measures value, not vanity metrics

### 4. Context Over Configuration
**If it can fail silently, it WILL fail silently.**

Hard blocks > soft guidelines > documentation:
- Sacred field access → Exception raised (hard block)
- Elder review required → Flag set (context provided)
- Best practices → Documentation (soft guideline)

### 5. Agent Specialization (Not Service Objects)
**One agent = one clear purpose.**

No "AbstractDataSyncStrategyFactoryHelperManager":
- SyncAgent handles ALL syncing (GHL, Supabase, Notion)
- ImpactAgent handles ALL SROI calculations
- ALMAAgent handles ALL signal tracking
- Clear boundaries, no hunting through service layers

### 6. Real-Time Over Batch
**Webhooks, not cron jobs.**

React to changes immediately:
- GHL contact updated → sync to Supabase (webhook-based)
- ALMA signal detected → trigger pattern analysis (real-time)
- Cultural protocol violated → fail hard and loud (immediate)

### 7. Test Coverage That Matters
**Test your code, not the framework.**

91+ tests, but ONLY for what matters:
- Cultural protocol enforcement (sacred field blocks)
- Agent business logic (ALMA calculations, SROI formulas)
- Integration transformations (GHL → Supabase mapping)
- Don't test FastAPI routing, Anthropic API, or Python's json module

### 8. Documentation as Code
**Specs are versioned, reviewed, and approved.**

Not scattered Google Docs:
- Requirements in `/docs/requirements/`
- Approved specs in `/docs/plans/` (with `YYMMDD-XXa-` naming)
- External APIs in `/docs/stack/`
- Ecosystem knowledge in `/docs/ecosystem/`

---

## 🎯 Success Metrics

### Before DHH Improvements
- ❌ No systematic code review process
- ❌ Flat /knowledge_base/ directory (91 files, hard to navigate)
- ❌ Polite agent feedback (doesn't enforce standards)
- ❌ Configuration scattered across YAML/JSON files
- ❌ No versioned specification workflow

### After DHH Improvements
- ✅ ACT Code Reviewer enforces cultural protocols and simplicity
- ✅ Hierarchical /docs/ structure (requirements → plans → stack → ecosystem)
- ✅ Brutal feedback templates catch anti-patterns early
- ✅ Configuration in code (versioned, type-safe, reviewable)
- ✅ Iterative spec workflow (clarify → draft → review → refine → ship)

### Cultural Impact
- ✅ Cultural protocol violations caught in spec review (before implementation)
- ✅ "Boring code" celebrated as maintainability benchmark
- ✅ Agent specialization prevents complexity creep
- ✅ Real-time enforcement (hard blocks) > documentation reminders

---

## 📖 Example: Spec Review Session

### User Request
"I want to add a feature to predict which volunteers are most likely to contribute 50+ hours."

### Iteration 1: Application Architect Draft

```markdown
# Volunteer Engagement Prediction Feature

## Overview
Create a machine learning model to predict volunteer engagement levels.

## Implementation
1. Create `volunteer_engagement_scores` table
2. Train ML model on historical volunteer data:
   - Hours contributed (last 12 months)
   - Event attendance rate
   - Response time to outreach
   - Social network centrality (connections to other volunteers)
3. Generate `engagement_score` (0-100) for each volunteer
4. Add `predicted_contribution_hours` field
5. Create dashboard to show "High Potential Volunteers"

## Database Schema
```sql
CREATE TABLE volunteer_engagement_scores (
  id UUID PRIMARY KEY,
  volunteer_id UUID REFERENCES volunteers(id),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 0 AND 100),
  predicted_hours INTEGER,
  last_calculated_at TIMESTAMP,
  model_version VARCHAR(20)
);
```

## API Endpoint
`POST /volunteers/calculate-engagement-score`
```

### ACT Code Reviewer Response (Brutal)

```markdown
# 🚫 SPEC REJECTED - CULTURAL PROTOCOL VIOLATION

This specification reads like someone who learned the ACT method from a
corporate HR analytics course. Let me be very clear:

## What's Wrong

### 1. You're Optimizing People (Non-Negotiable Violation)

> "predict which volunteers are most likely to contribute 50+ hours"

Which part of "NEVER optimize people" was unclear?

You're proposing:
- Profiling volunteers
- Ranking them by "engagement score"
- Predicting their behavior

This is EXACTLY what we don't do. Delete this entire feature.

### 2. Surveillance Architecture

Your proposed fields:
- `engagement_score` → profiling
- `predicted_contribution_hours` → prediction
- `social_network_centrality` → surveillance

Every single one of these violates ACT principles. None of this should exist.

### 3. The Dashboard of Shame

> "High Potential Volunteers" dashboard

Congratulations, you just created a ranking system for human beings.
This is extractive, not regenerative. Delete it.

## What to Do Instead

If the REAL goal is "understand capacity constraints for event planning," here's
the ACT-worthy approach:

1. **Track Outcomes, Not People**
   - `event_capacity` (how many volunteers showed up)
   - `program_staffing_needs` (how many hours required)
   - `staffing_gaps` (unmet needs, not "underperforming volunteers")

2. **Let Volunteers Self-Report**
   - "Are you available for this event?" (yes/no/maybe)
   - "What's your capacity this month?" (self-reported hours)
   - No prediction, just asking

3. **Observe Systems, Not Individuals**
   - "Programs that struggle to recruit" (system observation)
   - "Time periods with low volunteer availability" (pattern)
   - "Outreach methods that work" (strategy effectiveness)

## Rewrite from Scratch

Your spec should be:

**Title**: "Event Capacity Planning Tool"

**Goal**: Help coordinators understand staffing needs and gaps

**Implementation**:
1. `event_staffing_needs` table (how many volunteers needed)
2. `volunteer_availability` table (self-reported availability)
3. Simple matching: needs vs. availability
4. Gap reporting: "Event X needs 5 more volunteers"

**No ML. No prediction. No profiling.**

Just basic arithmetic: needs - availability = gap.

## Verdict

❌ **Spec Rejected**

Rewrite this from scratch with zero optimization of people.

Come back when you've removed every instance of:
- Scoring
- Prediction
- Ranking
- Profiling

If you can't do this feature without those, the feature shouldn't exist.
```

### Iteration 2: Application Architect Revised

```markdown
# Event Capacity Planning Tool

## Overview
Help event coordinators understand staffing needs and gaps, WITHOUT profiling volunteers.

## Implementation
1. Event coordinators input staffing needs:
   - "Youth Justice Workshop needs 8 volunteers on March 15"
2. Volunteers self-report availability:
   - "I'm available March 15, capacity: 4 hours"
3. System calculates gap:
   - Needs: 8 volunteers
   - Available: 5 volunteers
   - Gap: 3 volunteers needed

## Database Schema
```sql
CREATE TABLE event_staffing_needs (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  volunteers_needed INTEGER,
  event_date DATE,
  created_by UUID REFERENCES users(id)  -- Event coordinator
);

CREATE TABLE volunteer_availability (
  id UUID PRIMARY KEY,
  volunteer_id UUID REFERENCES volunteers(id),
  event_id UUID REFERENCES events(id),
  available BOOLEAN,  -- yes/no/maybe (self-reported)
  capacity_hours INTEGER,  -- Self-reported capacity
  notes TEXT  -- "I can help with setup but need to leave early"
);
```

## Capacity Gap Calculation
```python
def calculate_event_gap(event_id: str) -> dict:
    needs = get_staffing_needs(event_id)
    available = count_available_volunteers(event_id)

    return {
        "event_id": event_id,
        "volunteers_needed": needs,
        "volunteers_available": available,
        "gap": max(0, needs - available),  # Simple arithmetic
        "status": "fully_staffed" if available >= needs else "needs_more_volunteers"
    }
```

## API Endpoint
`GET /events/{event_id}/staffing-gap`

Returns:
```json
{
  "volunteers_needed": 8,
  "volunteers_available": 5,
  "gap": 3,
  "status": "needs_more_volunteers",
  "volunteer_details": [
    {"name": "Sarah", "capacity_hours": 4, "notes": "Can help with setup"},
    {"name": "James", "capacity_hours": 3, "notes": "Available full day"}
  ]
}
```

No scoring. No prediction. Just needs vs. availability.
```

### ACT Code Reviewer Response (Approved)

```markdown
# ✅ SPEC APPROVED

This is boring code. That's high praise.

## What's Right

### 1. No Optimization of People
You removed:
- Engagement scores ✅
- Prediction algorithms ✅
- Profiling fields ✅

Now it's just: "Event needs X, Y people are available, gap is Z."

### 2. Self-Reported Availability
Volunteers control their data:
- They choose: available (yes/no/maybe)
- They report: capacity hours
- They explain: notes field for context

No surveillance. Just asking.

### 3. Simple Arithmetic (Not ML)
```python
gap = max(0, needs - available)
```

A 6th grader could understand this. Perfect.

### 4. System Observation
Your gap reporting observes the SYSTEM (event staffing), not PEOPLE (volunteer "performance").

That's the right lens.

## Minor Notes

### 1. Add "Why This Gap?" Context
Consider adding:
```python
{
  "gap_reason": "high_demand_period",  # Or: "low_volunteer_availability", "new_event_type"
}
```

This helps coordinators understand the SYSTEM pattern (e.g., "March always has low availability").

### 2. Capacity Notes as Required Field
Make `notes` required when `capacity_hours < event_duration`:
```python
if capacity_hours < event_duration and not notes:
    raise ValidationError("Please explain capacity constraints")
```

Encourages communication without forcing it.

## Verdict

✅ **Ship It**

This does one thing (calculate staffing gaps), enforces cultural protocols (self-reported,
no profiling), and uses simple arithmetic instead of ML black boxes.

Deploy when ready.
```

---

## 🎓 Learning Resources

### For New Developers
1. Read: [Rails Doctrine](https://rubyonrails.org/doctrine) (DHH's philosophy)
2. Watch: "ACT Development Philosophy" video (to be recorded)
3. Practice: Submit a spec for review, get brutal feedback, iterate

### For Experienced Developers
1. Study: ACT Code Reviewer feedback templates (learn what NOT to do)
2. Review: Example spec iterations (see how complexity gets removed)
3. Mentor: Review junior developers' specs with brutal honesty (they'll thank you later)

### For Product Owners
1. Understand: "Boring code" is a compliment, not criticism
2. Trust: Brutal feedback catches problems before implementation
3. Embrace: Specifications that get rejected are specs that won't ship broken code

---

## 🔗 References

- **Original Article**: [DHH is Immortal (and Costs $200/month)](https://danieltenner.com/dhh-is-immortal-and-costs-200-m/)
- **Rails Doctrine**: https://rubyonrails.org/doctrine
- **Current ACT Farmhand**: `/act-personal-ai/README.md`
- **Cultural Protocols**: `/tools/base_tool.py`
- **Agent Implementations**: `/agents/*.py`

---

## 📝 Appendix: Quick Reference

### DHH Principles → ACT Equivalents

| DHH Principle | ACT Equivalent |
|---------------|----------------|
| Convention over Configuration | Cultural Protocols over Documentation |
| DRY (Don't Repeat Yourself) | Don't Duplicate Data Across Systems |
| Fat Models, Skinny Controllers | Fat Agents, Skinny Tools |
| "Rails-worthy" code benchmark | "Farmhand-worthy" code benchmark |
| Majestic Monolith | Specialized Multi-Agent System (not microservices) |
| Optimize for Happiness | Optimize for Community Impact |
| No Premature Abstraction | No Service Objects for One-Time Operations |

### Common Anti-Patterns to Reject

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|--------------|----------------|-------------------|
| `AbstractDataSyncService` | Service object addiction | Put sync logic in `SyncAgent` |
| `engagement_score` field | Profiling people | Track system metrics (event attendance) |
| `predicted_hours` | Predicting behavior | Ask volunteers to self-report availability |
| Grant keywords in YAML | Runtime file I/O for static data | Python dict in `grant_agent.py` |
| Batch sync cron job | Delayed updates | Webhook-based real-time sync |
| Testing FastAPI routes | Testing framework code | Test agent business logic only |
| 5-layer abstraction | Premature optimization | Simple, direct implementation |

---

*Last Updated: January 2, 2026*
*Author: Claude Sonnet 4.5 (ACT Code Reviewer)*
*Inspired By: DHH's Rails Doctrine + Daniel Tenner's Article*
*Status: Ready for Review by Ben Knight*
