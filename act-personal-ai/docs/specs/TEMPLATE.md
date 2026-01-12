# Spec: [Feature Name]

**Date**: YYMMDD
**Author**: [Name]
**Status**: Draft | Review | Approved | Rejected
**Iteration**: a (first draft), b, c, etc.

---

## Summary

[1-2 sentences describing what this feature does]

---

## User Story

As a [role], I want to [action], so that [benefit].

---

## Requirements

### Must Have
- [ ] Requirement 1
- [ ] Requirement 2

### Nice to Have
- [ ] Optional requirement

### Out of Scope
- Explicitly not included: [list]

---

## Cultural Protocol Check

### Does this optimize or rank people?
[ ] No - this observes systems, not individuals

### Does this touch sacred fields?
[ ] No - elder_consent, sacred_knowledge, story_content not accessed

### Does this extract knowledge without consent?
[ ] No - all data access is consent-based

### Who does this serve?
[ ] Community - not just the organization

---

## Technical Approach

### Which agent owns this?
[Agent name] - because [reason]

### Files to modify
1. `agents/[agent].py` - [changes]
2. `tests/test_[agent].py` - [new tests]

### Configuration
[All configuration in code - Python dicts, not YAML/JSON]

### Dependencies
[None | List of new dependencies]

---

## Simplicity Check

### Could an existing agent handle this?
[Yes/No - if yes, which agent and why create new code?]

### Is this a one-time operation?
[If yes, avoid creating new abstractions]

### What's the simplest implementation?
[Describe the boring, maintainable approach]

---

## Test Plan

### Cultural Protocol Tests
- [ ] Verify sacred boundaries enforced
- [ ] Verify no individual profiling

### Business Logic Tests
- [ ] Test case 1
- [ ] Test case 2

### Integration Tests
- [ ] End-to-end test scenario

---

## Review History

| Date | Reviewer | Verdict | Notes |
|------|----------|---------|-------|
| YYMMDD | [name] | [Approved/Rejected] | [feedback] |

---

## Implementation Notes

[Added after approval - actual implementation details]

---

*Naming Convention: `YYMMDD-[iteration]-[slug].md`*
*Example: `260102a-event-capacity-planning.md`*
