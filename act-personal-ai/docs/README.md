# ACT Farmhand Documentation

Structured documentation for the ACT Farmhand multi-agent system.

## Directory Structure

```
docs/
├── specs/           # Approved specifications (versioned)
│   ├── TEMPLATE.md  # Spec template for new features
│   └── YYMMDD-X-slug.md  # Approved specs
└── README.md        # This file
```

## Spec Workflow

Inspired by DHH's "catch anti-patterns in specs, not production" approach.

### 1. Draft Spec
Create a new spec using the template:
```bash
cp docs/specs/TEMPLATE.md docs/specs/$(date +%y%m%d)a-feature-name.md
```

### 2. Review with ACT Code Reviewer
Use the Claude Code skill:
```
/act-code-reviewer docs/specs/260102a-feature-name.md
```

### 3. Iterate
If rejected, create iteration b, c, etc.:
- `260102a-feature-name.md` → Draft
- `260102b-feature-name.md` → After first review
- `260102c-feature-name.md` → After second review

### 4. Approval
When approved, update status to "Approved" and implement.

## Naming Convention

**Format**: `YYMMDD[iteration]-[slug].md`

**Examples**:
- `260102a-event-capacity-planning.md` - First draft, Jan 2, 2026
- `260102b-event-capacity-planning.md` - Revised after review
- `260103a-volunteer-availability.md` - New spec, Jan 3

## What Goes in Specs

### Do Include
- User story
- Requirements (must have / nice to have / out of scope)
- Cultural protocol check
- Technical approach
- Simplicity check
- Test plan

### Don't Include
- Implementation details (wait until approved)
- Code snippets (unless essential for understanding)
- Time estimates (we don't estimate)

## Review Criteria

Specs are reviewed against ACT Development Philosophy:

1. **Cultural Sovereignty** - Does it respect sacred boundaries?
2. **Simplicity** - Is there a simpler approach?
3. **Agent Ownership** - Which agent should own this?
4. **Test Coverage** - What tests are needed?

See [ACT Development Philosophy](../ACT_DEVELOPMENT_PHILOSOPHY.md) for full principles.

---

*Last Updated: January 2, 2026*
