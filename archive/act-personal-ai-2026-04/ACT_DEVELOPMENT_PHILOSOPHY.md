# ACT Development Philosophy

*Principles for building regenerative technology in the ACT ecosystem*

---

## The ACT Doctrine

Just as Rails has its doctrine, ACT has principles that guide how we build. These aren't suggestions - they're non-negotiables enforced in code.

---

## 1. Cultural Sovereignty is Sacred

**The Principle**: Indigenous communities own their data, their stories, and their futures. Technology serves sovereignty, never undermines it.

**In Practice**:
- OCAP (Ownership, Control, Access, Possession) enforced at tool level
- Sacred fields (`elder_consent`, `sacred_knowledge`) are HARD BLOCKED
- Community Authority signal has highest weight (30%) in ALMA
- Never sync family support data or elder consent across systems
- If a field is sacred, it doesn't have a "soft warning" - it throws an error

**Anti-Patterns** (ALWAYS REJECT):
- "We'll add a consent checkbox later"
- "It's just metadata, not the actual story"
- "We can anonymize it"
- Accessing sacred fields for "analytics"

**Why This Matters**: Technology has historically been used to extract from Indigenous communities. ACT exists to reverse that pattern. Every line of code either reinforces or undermines sovereignty.

---

## 2. Observe Systems, Never Optimize People

**The Principle**: We track patterns in systems (remand rates, program continuity, policy changes). We NEVER profile, rank, or predict individual behavior.

**In Practice**:
- ALMA uses SIGNALS (direction indicators), not SCORES (rankings)
- No engagement metrics - we track IMPACT EVIDENCE
- Volunteer capacity is self-reported, not predicted
- System pressure (remand rates) is tracked; individual "risk scores" are forbidden

**Anti-Patterns** (ALWAYS REJECT):
- "Predict which volunteers will contribute 50+ hours"
- "Engagement score to prioritize outreach"
- "AI risk assessment for youth"
- Any feature that ranks or profiles humans

**The Test**: If you're building something, ask: "Am I observing a system or optimizing a person?" If the latter, delete it.

---

## 3. Simplicity Over Cleverness

**The Principle**: Boring, maintainable code beats clever, impressive code. Every abstraction must justify its existence.

**In Practice**:
- Fat agents, skinny tools (agents own logic, tools are thin wrappers)
- No service objects for one-time operations
- Configuration in Python dicts, not external YAML/JSON
- If it can be done with 10 lines, don't write 100
- Existing patterns before new abstractions

**Anti-Patterns** (ALWAYS REJECT):
- `AbstractDataSyncService` for one sync operation
- External config files for static data that rarely changes
- Creating a new agent when an existing one could handle it
- "Extensible framework" for a single use case

**The Compliment**: "This is boring code" is high praise. It means: simple, readable, maintainable, and does exactly what it should.

---

## 4. Fat Agents, Skinny Tools

**The Principle**: Agents own business logic and decision-making. Tools are thin wrappers around external APIs.

**In Practice**:
- SyncAgent owns ALL synchronization logic (not 5 sync services)
- GHLTool is a thin wrapper - it doesn't decide what to sync
- ALMAAgent owns pattern recognition - tools just fetch data
- One agent = one clear domain of responsibility

**Anti-Patterns** (ALWAYS REJECT):
- Business logic in tools
- Multiple agents with overlapping responsibilities
- Service objects that fragment agent responsibilities
- Tools that make decisions about what data to return

**Why This Works**: When something breaks, you know exactly where to look. SyncAgent broke? Fix SyncAgent. Not a mystery across 5 service objects.

---

## 5. Hard Blocks Over Soft Warnings

**The Principle**: If something shouldn't happen, make it impossible. Don't rely on documentation or training.

**In Practice**:
- Sacred fields throw errors when accessed, not warnings
- Cultural protocols enforced in BaseTool, not in docs
- Dangerous operations blocked by hooks, not guidelines
- If you can bypass it, it's not a real protection

**Anti-Patterns** (ALWAYS REJECT):
- "Document that they shouldn't do this"
- Soft warnings that users dismiss
- Training as the primary control
- "We'll monitor and catch violations"

**The Test**: Can a developer who hasn't read the docs accidentally violate this? If yes, make it a hard block.

---

## 6. Real-Time Over Batch

**The Principle**: React to changes immediately. Don't wait for nightly jobs to discover problems.

**In Practice**:
- Webhooks for data sync, not cron jobs
- Immediate conflict detection in SyncAgent
- Real-time pattern detection in ALMA
- Fail hard and loud (no silent failures)

**Anti-Patterns** (ALWAYS REJECT):
- "We'll catch it in the nightly batch"
- Silent failures that log but don't alert
- Eventual consistency where immediate consistency is possible
- Cron jobs for real-time concerns

**Why This Matters**: Justice-involved youth can't wait for a nightly sync. A story consent revocation must be immediate. Real-time isn't a luxury - it's a requirement.

---

## 7. Test Cultural Protocols, Not Frameworks

**The Principle**: Test what you own. Don't test that Python works.

**In Practice**:
- Test that sacred boundaries are enforced
- Test agent business logic decisions
- Test cultural protocol detection
- DON'T test FastAPI routing (FastAPI tested it)
- DON'T test Anthropic API calls (mock them)

**Anti-Patterns** (ALWAYS REJECT):
- Tests that verify Python stdlib works
- Integration tests against external APIs in CI
- Testing framework behavior instead of your behavior
- Low-value tests that don't prevent regressions

**The 91+ Test Standard**: ACT Farmhand has 91+ tests with 100% pass rate. Every test exists to prevent a real regression, not to inflate coverage numbers.

---

## 8. Specs Before Code

**The Principle**: Catch anti-patterns in specifications, not in production. Review and iterate before writing code.

**In Practice**:
- All non-trivial features start with a spec in `docs/specs/`
- Specs reviewed against ACT Development Philosophy
- Iterate on specs (versions a, b, c...) until approved
- Only then write code

**The Workflow**:
```
User Request
    ↓
Draft Spec (TEMPLATE.md)
    ↓
ACT Code Reviewer (brutal feedback)
    ↓
Iterate (if rejected)
    ↓
"Ship It" (approved)
    ↓
Implementation
```

**Why This Works**: It's 10x easier to delete a paragraph than refactor code. Brutal spec review prevents wasted effort.

---

## 9. Regenerative Over Extractive

**The Principle**: Every feature should leave communities better off. If it extracts value without returning it, it doesn't belong.

**In Practice**:
- Empathy Ledger: Stories remain with storytellers, not platform
- JusticeHub: Community Authority is highest-weighted signal
- The Harvest: Volunteers benefit from connection, not just give labor
- SROI measures social value, not engagement metrics

**Anti-Patterns** (ALWAYS REJECT):
- "We need this data for our reports"
- Features that benefit funders more than communities
- Metrics that measure platform success, not community outcomes
- "User-generated content" that the platform owns

**The Question**: For every feature, ask: "Who benefits?" If the answer is primarily the organization, redesign it.

---

## 10. Distributed Cognition

**The Principle**: Don't centralize all intelligence. State nodes can operate autonomously. Humans decide.

**In Practice**:
- ALMA provides signals, humans decide
- Each ACT project can run its own ALMA instance
- Pattern recognition is distributed, not centralized
- No single point of control over decision-making

**Anti-Patterns** (ALWAYS REJECT):
- "The AI will decide which projects to fund"
- Centralized scoring that determines resource allocation
- Automated decision-making for human choices
- Single-database-of-truth for community data

**The Philosophy**: "Here is what we are seeing. Humans must decide." ALMA is a sense-making tool, not a decision-maker.

---

## Applying These Principles

### When Writing Code

1. Check: Does this respect cultural sovereignty?
2. Check: Am I observing systems or optimizing people?
3. Check: Is there a simpler approach?
4. Check: Does the right agent own this?
5. Check: Is this a hard block or a soft warning?

### When Reviewing Code

Use `/act-code-reviewer` to check specs and PRs against these principles.

### When Designing Features

Start with the spec template in `docs/specs/TEMPLATE.md`. Answer the cultural protocol questions FIRST.

---

## Credits

This philosophy is inspired by:
- **Rails Doctrine** - DHH's principles for Ruby on Rails
- **OCAP Principles** - First Nations Information Governance Centre
- **ALMA Method** - ACT's approach to ethical intelligence
- **Regenerative Design** - Building systems that restore, not extract

---

## Living Document

This philosophy evolves as ACT learns. Propose changes via spec review.

**Current Version**: 1.0
**Last Updated**: January 2, 2026
**Maintainer**: ACT Farmhand Team

---

*"The goal is not to build impressive technology. The goal is to build technology that serves community sovereignty. If those conflict, sovereignty wins."*
