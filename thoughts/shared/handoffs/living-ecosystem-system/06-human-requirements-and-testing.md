---
title: Living Ecosystem Site - Human Requirements and Testing
created: 2026-04-12
updated: 2026-04-12
status: active
type: reference
tags:
  - project/living-ecosystem
  - governance
  - qa
  - release
  - human-in-the-loop
aliases:
  - Living Ecosystem QA and Governance
  - Living Ecosystem Human Requirements
cssclasses: []
---

# Living Ecosystem Site - Human Requirements and Testing

## Purpose

This document defines the human governance model for the living ecosystem site: who must decide what, where people stay in the loop, what must be reviewed before release, and how we test and monitor changes after launch.

It is the operational QA and governance brief for cross-system changes. If a change affects content, permissions, data model, release readiness, or public trust, it needs a human checkpoint.

> [!warning] Non-negotiable rule
> Do not treat automation, generated copy, or inferred schema as final without a human approval step at the release boundary.

## Decision Ownership

### Who must decide what

| Decision area | Human owner | Must decide |
|---|---|---|
| Brand voice, positioning, and public narrative | Product owner / content lead | Whether the change matches the living ecosystem voice and public intent |
| Sensitive cultural or community-facing content | Cultural reviewer / domain lead | Whether the content is appropriate, accurate, and safe to publish |
| Data model and field meanings | Technical owner / schema steward | Whether the schema change matches the real source of truth |
| Release readiness | Release captain | Whether the change is allowed to ship |
| Rollback or pause | Release captain + technical owner | Whether to revert, hold, or hotfix |
| Access and permissions | Admin / security owner | Who can edit, approve, publish, or administer |
| Test sign-off | QA owner | Whether the change passes the acceptance criteria |

> [!note] Default rule
> If a decision changes what the public sees, what data is trusted, or who can act, a human must sign off.

## Human-in-the-Loop Checkpoints

### 1. Content approval

Humans must review:
- headline and section copy
- project names, summaries, and calls to action
- cultural or community-specific language
- any generated content that will appear publicly

### 2. Data and schema approval

Humans must review:
- new or changed database fields
- route payload shape changes
- any fallback logic that hides missing data
- any inferred normalisation that could mask bad source data

### 3. Permission approval

Humans must review:
- who can edit public content
- who can publish or schedule releases
- who can access admin-only actions
- any change to reviewer roles or super-admin behaviour

### 4. Release approval

Humans must review:
- final staging output
- production deploy candidate
- rollback plan
- monitoring plan for the first post-release window

### 5. Post-release confirmation

Humans must verify:
- the live site renders correctly
- the expected content is visible
- no critical console or API errors appear
- analytics or tracking still behave as expected

## Review Permissions

### Required roles

- `Owner`: can decide scope, approve release, and accept rollback.
- `Editor`: can draft and revise content or implementation.
- `Reviewer`: can comment and approve, but cannot publish alone.
- `QA`: can test, report, and block release on failed criteria.
- `Security / admin`: can approve permission changes and access-sensitive behavior.

### Permission boundaries

- Editors may not self-approve content they authored if the change is public-facing.
- Reviewers may not override blocked QA or security findings.
- Release captains may not bypass cultural or legal review on sensitive material.
- Automation may prepare, prefill, or suggest, but it may not be the final approver.

> [!important] Separation of duties
> The person who implements a risky public change should not be the only person signing it off.

## Release Gates

### Gate 1 - Pre-merge

Must have:
- targeted typecheck or build success for the touched area
- reviewed diff
- schema or API shape verified where relevant
- no unresolved high-risk comments

### Gate 2 - Pre-deploy

Must have:
- staging or preview link checked in browser
- content and layout verified on desktop and mobile
- permissions and auth paths tested if affected
- rollback plan confirmed

### Gate 3 - Production release

Must have:
- explicit release approval
- live deploy completed successfully
- smoke test passed on the production URL
- error logs checked for regressions

### Gate 4 - Post-release watch

Must have:
- a short monitoring window after deploy
- confirmation that critical user journeys still work
- a decision point for rollback if errors appear

## Acceptance Criteria

The living ecosystem site is acceptable only if all of the following are true:

- The public story or project surface reflects the intended narrative.
- No required data is missing from the visible page.
- No broken links, blank cards, or placeholder content are visible in the public flow.
- Mobile and desktop layouts both render cleanly.
- Any admin or protected action enforces the right permissions.
- The underlying schema or API shape matches the runtime code.
- No critical runtime errors occur in the tested path.
- The deploy can be explained and rolled back by a human.

> [!tip] Practical acceptance test
> If a non-technical reviewer cannot tell what changed, why it changed, and whether it is safe, the release is not ready.

## Regression Checks

Run these checks whenever a change touches the living ecosystem site:

### Content regressions

- Confirm headline hierarchy and section order.
- Confirm project names, labels, and CTAs are correct.
- Confirm generated text has not overwritten editorial intent.

### Functional regressions

- Click through primary navigation.
- Open the flagship/project detail pages.
- Test key forms, submissions, and admin actions if touched.
- Confirm auth-gated views still redirect or block correctly.

### Data regressions

- Verify schema-driven fields still resolve from the real source of truth.
- Confirm no nullability assumptions are hiding invalid values.
- Confirm any normalisation layer still preserves the original meaning of the data.

### Visual regressions

- Check desktop and mobile screenshots.
- Inspect spacing, truncation, wrapping, and contrast.
- Confirm no accidental empty states or overflow.

### Safety regressions

- Confirm sensitive content is still gated or reviewed.
- Confirm logs do not show new warnings or errors in the release path.
- Confirm permissions have not widened unintentionally.

## Testing Strategy

### Layer 1 - Targeted compile

Use a narrow TypeScript compile for only the touched area first.

Purpose:
- catch schema and nullability drift quickly
- avoid wasting time on unrelated repo noise

### Layer 2 - Local runtime check

Run the affected route or page path locally when possible.

Purpose:
- verify the code path actually executes
- catch request/response shape issues

### Layer 3 - Preview / staging browser test

Open the preview in a real browser and check:
- the expected content is visible
- the page behaves correctly on mobile and desktop
- no obvious UX regressions are present

### Layer 4 - Production smoke test

After release, confirm:
- the live URL loads
- the primary journey works
- no critical errors appear in logs or console

### Layer 5 - Monitoring window

Keep watch for:
- 500s and repeated route failures
- missing content or empty state regressions
- permission errors
- unusual data gaps after deployment

## Ongoing Monitoring

### Daily

- Check critical route errors and deploy health.
- Confirm content surfaces still render as expected.
- Scan for new schema drift warnings or auth failures.

### Weekly

- Review regressions found in the last release cycle.
- Re-check ownership boundaries and permissions.
- Confirm the site still matches the intended governance model.

### After every release

- Record what changed.
- Record what was tested.
- Record what was approved by a human.
- Record what remains unverified.

## Escalation Rules

- If the same failure appears twice, stop patching and write a root-cause analysis.
- If a schema change is needed, confirm the actual database shape before changing code.
- If content or permissions are unclear, pause release and ask for a human decision.
- If production health is uncertain, prefer rollback over guessing.

## Operational Checklist

- [ ] Content reviewed by a human
- [ ] Permissions reviewed by a human
- [ ] Schema or API shape verified
- [ ] Targeted compile passed
- [ ] Preview / staging checked in browser
- [ ] Production smoke test passed
- [ ] Monitoring window completed
- [ ] Rollback plan confirmed

