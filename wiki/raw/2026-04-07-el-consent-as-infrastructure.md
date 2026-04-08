---
title: "Consent as Infrastructure: Why 'Yes' Isn't a Boolean"
storyteller: "Benjamin Knight"
storyteller_id: "c29b07a0-45a7-4703-89af-07e9ed765525"
type: "article"
category: "Indigenous Data Sovereignty"
project: "ACT Ecosystem"
permission_level: "public"
tags:
  - consent
  - ocap
  - data-sovereignty
  - platform-design
  - cultural-protocols
published_at: "2026-02-05T00:00:00Z"
---

# Consent as Infrastructure: Why 'Yes' Isn't a Boolean

**Most platforms treat consent as a checkbox. Indigenous data sovereignty requires it to be infrastructure.**

---

## Abstract

This article examines how consent functions in the ACT digital ecosystem—not as a one-time permission event, but as ongoing infrastructure that shapes every technical decision. Drawing on two years building Empathy Ledger with Aboriginal communities in Central Australia and Queensland, I argue that treating consent as a boolean (`true`/`false`) fundamentally misunderstands both Indigenous data sovereignty principles and the nature of community relationships. Consent must be granular, revocable, contextual, and auditable—requirements that demand architectural choices most platforms never consider.

---

## Introduction

When we launched Empathy Ledger in early 2025, the consent flow was simple: a checkbox, a timestamp, a database field set to `true`. Storytellers agreed to share their stories, we recorded that agreement, stories went live. Clean, efficient, legally compliant.

An elder from Alice Springs changed everything with one question: "What if I change my mind?"

The technical answer was straightforward: contact admin, request removal, wait for manual processing. The cultural answer revealed a problem: that's not consent—that's permission you can't really revoke. And if consent can't be revoked as easily as it's granted, it wasn't freely given in the first place.

This article examines what happens when you build consent not as a feature, but as infrastructure. When OCAP principles (Ownership, Control, Access, Possession) shape database schemas, API design, and deployment architecture. When "yes" isn't a boolean but a relationship that evolves over time.

---

## Background: OCAP and the Problem with Checkboxes

### What OCAP Actually Means

OCAP—Ownership, Control, Access, Possession—emerged from First Nations research principles developed by the First Nations Information Governance Centre. While often cited in Indigenous research contexts, its implications for digital platforms remain under-explored.

**Ownership** means communities own data about them, not the platforms that store it.
**Control** means communities direct how that data is collected, used, and shared.
**Access** means communities decide who can see or use their data.
**Possession** means communities must be able to retrieve, delete, or move their data.

These aren't policy guidelines—they're architectural requirements. You can't bolt OCAP onto existing systems. You build it into the foundation or you don't have it.

### The Checkbox Problem

Most platforms implement consent like this:

```typescript
interface User {
  id: string
  consent_given: boolean
  consent_date: Date
}

function publishStory(user: User, story: Story) {
  if (user.consent_given) {
    story.publish()
  }
}
```

This works for terms of service. It fails for Indigenous data sovereignty because:

1. **Consent is binary** - You said yes once, so yes forever
2. **Consent is global** - All uses of your data treated identically
3. **Consent is irrevocable** - Changing your mind requires special process
4. **Consent is invisible** - No audit trail of what you agreed to when

### What Sovereignty Requires

Control means storytellers can:
- Grant consent for specific uses (AI analysis vs. public sharing vs. research)
- Revoke consent for one use while maintaining others
- See exactly what they've consented to and when
- Change decisions as contexts change
- Know who accessed their data and why

This transforms consent from a gate ("can I proceed?") to infrastructure ("how do I respect ongoing relationship?").

---

## The Core Argument: Five Types of Consent

Through two years working with Aboriginal storytellers across ACT projects, a pattern emerged: consent isn't one thing. It's at least five distinct relationships, each requiring different technical implementation.

### Type 1: Collection Consent

**Question:** Can we record your story?

This is the closest to traditional consent. Before audio recording, before transcription, before anything enters the system: do you agree to participate?

**Technical implementation:**
- Separate from account creation
- Recorded before media upload
- Includes recording method (audio, video, text)
- Can be withdrawn (cascades to deletion)

```typescript
interface CollectionConsent {
  storyteller_id: string
  consent_given: boolean
  consent_date: Date
  consent_version: string
  recording_method: 'audio' | 'video' | 'text' | 'written'
  can_revoke: boolean
}
```

### Type 2: Processing Consent

**Question:** Can we use AI to analyze your story?

This is often bundled with collection consent, but Indigenous communities frequently distinguish between sharing a story and having it algorithmically processed. Some storytellers trust human listening but not machine analysis. Others worry about AI training on Indigenous knowledge.

**Technical implementation:**
- Separate consent flag
- Model-specific permissions (Claude yes, but not for training data)
- Processing type specification (themes, quotes, sentiment)
- Revocable without affecting story itself

```typescript
interface ProcessingConsent {
  storyteller_id: string
  ai_analysis_allowed: boolean
  ai_models_approved: string[] // ['claude-sonnet', 'gpt-4o']
  ai_purposes: ('theme_extraction' | 'quote_generation' | 'sentiment_analysis')[]
  training_data_consent: boolean // Can story be used to train models?
  revoked_at?: Date
}
```

### Type 3: Sharing Consent

**Question:** Who can see your story?

This maps to our four-tier permission system: public, community, restricted, sacred. But critically, this consent is mutable. A storyteller might share publicly initially, then restrict after community feedback. Or start restricted, then open access once elder review confirms appropriateness.

**Technical implementation:**
- Permission level per story (not per storyteller)
- Change history tracked
- Elder review flags
- Community-specific access rules

```typescript
type PermissionLevel = 'public' | 'community' | 'restricted' | 'sacred'

interface SharingConsent {
  story_id: string
  permission_level: PermissionLevel
  permission_history: Array<{
    level: PermissionLevel
    changed_at: Date
    changed_by: string
    reason?: string
  }>
  elder_approved: boolean
  elder_reviewer_id?: string
  cultural_warnings: string[]
}
```

### Type 4: Attribution Consent

**Question:** How do you want to be named?

Some storytellers want full names. Others prefer community attribution ("Elder from Arrernte country"). Some want anonymity. This isn't privacy vs. transparency—it's control over identity presentation.

**Technical implementation:**
- Multiple name options (legal, preferred, anonymous, community)
- Context-specific names (public vs. research vs. internal)
- Photo/avatar consent separate from story consent
- Bio control (who can see what details)

```typescript
interface AttributionConsent {
  storyteller_id: string
  public_name: string // How to attribute publicly
  community_name: string // How community refers to them
  research_name: string // How to cite in research
  show_photo: boolean
  show_cultural_background: boolean
  show_location: boolean
  bio_visibility: PermissionLevel
}
```

### Type 5: Syndication Consent

**Question:** Can your story appear on partner platforms?

ACT works with partners (JusticeHub, The Harvest, external researchers). Storytellers might consent to internal use but not external syndication. Or approve specific partners but not blanket distribution.

**Technical implementation:**
- Partner-specific consent
- API key scoping (partner can only access consented stories)
- Revocable per partner
- Usage tracking and reporting back to storyteller

```typescript
interface SyndicationConsent {
  storyteller_id: string
  approved_partners: Array<{
    partner_id: string
    partner_name: string
    approved_at: Date
    approved_uses: ('display' | 'research' | 'api_access')[]
    expires_at?: Date
  }>
  default_syndication: boolean // Automatically approve new partners?
  require_notification: boolean // Tell me when partner accesses
}
```

---

## Case Study: The Consent Refactor

### Context: What Needed to Change

By mid-2025, we had 240 storytellers and 335 stories in the Empathy Ledger. Our consent model was the checkbox I described: `consent_given: boolean`. When the Alice Springs elder asked "What if I change my mind?", we had two choices:

1. Improve the UX around the existing model (make revocation easier)
2. Rebuild consent as infrastructure (recognize the model itself was wrong)

We chose option 2. Here's why.

### Design Decisions

**Decision 1: Consent as a separate table**

Instead of consent living as columns on the `storytellers` table, we created a dedicated `consent_records` table with full audit trail.

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  storyteller_id UUID NOT NULL REFERENCES storytellers(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'collection', 'processing', 'sharing', 'attribution', 'syndication'
  )),
  consent_given BOOLEAN NOT NULL,
  consent_scope JSONB NOT NULL, -- What specifically was consented to
  consent_version TEXT NOT NULL, -- Which version of protocols
  granted_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trigger: Log every consent change
CREATE TRIGGER consent_audit_trigger
  BEFORE UPDATE ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();
```

**Why:** Audit trail, granularity, revocability without data loss.

**Decision 2: Consent check at query time**

Instead of checking consent once at publication, we check every time a story is accessed.

```typescript
async function getStory(storyId: string, requestContext: RequestContext) {
  const story = await db.stories.findById(storyId)

  // Check current consent state
  const consent = await checkConsent({
    storyteller_id: story.storyteller_id,
    consent_type: 'sharing',
    requested_by: requestContext.user_id,
    access_context: requestContext.context // 'public_web' | 'research_api' | 'partner_feed'
  })

  if (!consent.allowed) {
    throw new ConsentError(
      `Storyteller has ${consent.revoked_at ? 'revoked' : 'not granted'} sharing consent`
    )
  }

  return story
}
```

**Why:** Consent changes take effect immediately. No cached assumptions.

**Decision 3: Consent dashboard for storytellers**

Built a full UI for storytellers to see and manage all five consent types, with clear language about what each means.

**Before:**
- "I agree to terms and conditions" checkbox

**After:**
- "Story Collection: You agreed on [date] that we can record your story via audio" ✓
- "AI Processing: You have not given permission for AI analysis" ✗
- "Public Sharing: You approved public sharing on [date] after elder review" ✓
- "Attribution: You chose to be named as 'Elder from Arrernte country' in public contexts" ✓
- "Syndication: You approved JusticeHub but not external research partners" ⚠️

Each type has a "Change" button that immediately updates. No admin approval needed.

**Why:** Control isn't control if you need permission to exercise it.

### Outcome: What Happened

**Storyteller response:**
Within the first month, 12 storytellers changed consent settings. Not because they regretted sharing—because contexts changed. One storyteller went from public to community after realizing family members weren't ready. Another enabled AI analysis after seeing how it worked. A third approved syndication to a specific partner doing related work.

The system worked: consent evolved with relationships.

**Technical overhead:**
Query complexity increased. Every story fetch now includes consent check. Performance cost: ~15ms per request. Worth it? Absolutely. Sovereignty isn't a feature you optimize away.

**Cultural authority recognition:**
When we presented this model at an Indigenous data sovereignty workshop, an elder said: "This is the first platform I've seen that understands consent isn't a contract. It's a relationship."

That validation mattered more than any technical metric.

---

## Implications

### For Community-Led Technology

**Consent as infrastructure means:**
- Cultural protocols shape database schemas, not just UI
- Performance optimizations can't compromise sovereignty
- "Move fast and break things" becomes "Move at the speed of trust"

**Practically:**
If you're building for Indigenous communities and consent is still a boolean, you're not there yet.

### For Indigenous Data Sovereignty

**OCAP isn't a policy layer—it's an architecture requirement.**

You can't claim data sovereignty while:
- Treating consent as irrevocable
- Bundling all uses into one agreement
- Making revocation harder than granting
- Hiding consent history from storytellers

**The technical choice to implement granular consent is a cultural choice to honor sovereignty.**

### For Platform Design

**What becomes possible:**
- Storytellers as co-creators, not content sources
- Dynamic data governance that respects community process
- Platforms that earn trust through transparency
- Technology that amplifies rather than extracts

**What's required:**
- Rethinking "consent fatigue" (granularity isn't burden if it's control)
- Accepting performance costs of doing things right
- Building for ongoing relationships, not one-time transactions

---

## Challenges and Open Questions

### We Don't Have This Right Yet

**Problem 1: Consent complexity**
Five consent types is better than one, but is it the right decomposition? Should processing consent distinguish between different AI uses? Should attribution consent vary by context (web vs. print vs. research)?

We're still learning.

**Problem 2: Inter-community consent**
When a story involves multiple communities, whose consent governs? Our current model assumes individual storytellers, but some knowledge belongs to groups. How do you technically implement collective consent?

Open question.

**Problem 3: Platform control**
Even with perfect consent infrastructure, communities don't control the *platform*. Supabase hosts the data. Next.js serves the UI. If those services change terms, revoke access, or get acquired, sovereignty is compromised.

True data sovereignty might require communities hosting their own infrastructure. We're exploring this with The Harvest, but it's non-trivial.

**Problem 4: Consent education**
Granular consent only works if storytellers understand what they're consenting to. How do you explain AI processing to elders with limited tech exposure? How do you make permission levels legible without jargon?

We're iterating, but accessibility remains hard.

---

## Conclusion

Consent as infrastructure isn't a feature—it's a foundation. It shapes database design, API architecture, query patterns, and UI flows. It costs performance, increases complexity, and challenges assumptions most platforms take for granted.

But when an elder can change her mind about sharing a story and that change takes effect immediately across all systems, when a storyteller can approve AI analysis for one purpose but not another, when communities can see exactly who accessed what and when—that's not complexity. That's control.

And control is what data sovereignty looks like in practice.

The technical work is to make that control real. To build systems where "yes" isn't a boolean, where consent evolves with relationships, where cultural protocols shape code at the type level.

It's slower than moving fast and breaking things. It's more expensive than assuming consent is permanent. It's worth it.

Because the measure of good technology isn't efficiency—it's whether communities want to use it, trust it, and feel their values reflected in how it works.

---

## References

**OCAP Principles:**
- First Nations Information Governance Centre: https://fnigc.ca/ocap-training/

**Related ACT Work:**
- Empathy Ledger Consent Workflow: [Link to admin panel consent UI]
- Multi-tenant Architecture for Data Sovereignty: [Link to technical deep dive]
- The Architecture of Assertion: [Link to previous article]

**Code:**
- Consent table schema: `supabase/migrations/20260205_consent_infrastructure.sql`
- Consent checking logic: `src/lib/consent/check-consent.ts`
- Storyteller consent dashboard: `src/app/storyteller/consent/page.tsx`

---

## About This Work

*This article emerges from two years building Empathy Ledger with Aboriginal communities in Central Australia and Queensland. The consent model described reflects ongoing collaboration with community leaders, elders, and storytellers who shaped these principles through patient correction of technical assumptions. Mistakes in interpretation remain my own.*

**Published:** February 5, 2026
**Contact:** benjamin@act.place
**License:** This work belongs to the communities who shaped it. Technical patterns may be adapted for community use with appropriate cultural protocols.

---

## For Developers

**If you're implementing similar systems:**

1. **Start with consent audit:** What are you bundling that should be separate?
2. **Model relationships, not states:** Consent isn't true/false, it's an ongoing relationship
3. **Make revocation trivial:** If it's harder than granting, it's not real consent
4. **Audit everything:** Every consent change, every access, every use
5. **Check at query time:** Don't cache consent assumptions

**Questions welcome:** benjamin@act.place

**Code review welcome:** [Link to repo issues]
