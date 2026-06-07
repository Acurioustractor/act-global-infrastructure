# Empathy Ledger v2 — R&D narrative deep-dive: Indigenous data sovereignty + consent-led storytelling

> Read-only deep-dive of `/Users/benknight/Code/empathy-ledger-v2`. Purpose: deepen the R&DTI narrative on the **technically novel** software mechanisms. Framed as **external-facing product R&D** — software used by communities and storytellers, NOT internal business admin (the eligibility distinction that matters for the R&D Tax Incentive).
>
> **Eligibility framing (s355-25 ITAA97):** Each item below identifies (a) the technical unknown / implicit hypothesis, (b) why a competent professional could NOT have known the outcome in advance, (c) Australia-relevance. **Arts/storytelling CONTENT is statutorily excluded** — the claim is the *technical mechanism* (the gate, the state machine, the extraction model), never the stories themselves.
> Confidence per verification.md: claims below are **Verified** against source files (paths cited). R&D *eligibility judgement* is **Inferred** — a tax adviser must rule on it.

---

## Component inventory (all source-verified)

| Component | File(s) | Genuine experimental uncertainty? |
|---|---|---|
| OCAP consent-as-code + sovereignty enforcement | `syndication-consent-service.ts`, RLS migration `20260527070848` | **Yes** — bounded |
| Consent state machine + withdrawal→purge | `purge-withdrawn-media.ts`, migrations `20260414233708`, `20260520120000` | **Yes** |
| 30-day media purge job | `src/lib/inngest/functions/purge-withdrawn-media.ts` | **Partial** — see honest exclusion |
| PRISM cultural-field extraction | `src/lib/ai/transcript-analyzer-v3-claude.ts`, `analysis-types.ts` | **Yes** — strongest claim |
| Guardian voice-authenticity gate | `src/lib/ai/guardian-checks.ts`, `inngest/functions/guardian-review.ts` | **Yes** — strongest claim |
| Multi-tenant org-scoped isolation | `src/lib/multi-tenant/queries.ts`, RLS migration `20260527070848` | **Mostly NO** — see exclusion |
| Cultural-safety quote gate | `src/lib/cultural-safety/quote-gate.ts` | **Borderline** — modest |

---

## 1. PRISM cultural-field extraction — STRONGEST R&D claim

**What it is (verified):** `transcript-analyzer-v3-claude.ts` runs an LLM over a consented transcript and extracts a structured "PRISM v2.0" signal object (`alma_signals`) plus `cultural_markers`, `impact_dimensions`, `spiral_resonance`. The schema (Zod, lines 49–137) encodes Indigenous-data-sovereignty constructs as machine fields: `authority.level` (lived_experience > secondary > academic), `voice_control` (full/shared/limited), `evidence_strength.cultural_verification` (not_required/pending/elder_reviewed), `harm_risk_inverted.safety_score`, `cultural_protocols_met`, `community.sovereignty` (0–1), and a `spiral_resonance.story_sovereignty` score described as "OCAP/self-determination strength."

**(a) Technical unknown / hypothesis:** Can a general-purpose LLM reliably extract *culturally-defined, non-Western* signals — authority grounded in lived experience over academic credential, story sovereignty, protocol adherence, sacred-content sensitivity — into a stable, gradeable schema *without* flattening them into generic sentiment/topic tags? Implicit hypothesis: these constructs are machine-detectable at useful fidelity AND can be scored without the act of measurement itself becoming a colonising "ranking engine."

**(b) Why not predictable:** No off-the-shelf NLP/LLM capability extracts "cultural authority" or "story sovereignty" — these are not in any pretrained taxonomy; they are community-defined. Whether an LLM produces consistent, non-fabricated, culturally-faithful values for them is genuinely unknown in advance and required iteration (the `v3`/`v2.0` versioning, the explicit "system-level patterns, NOT individual profiling" guardrail, and the `OCAP_compliance: always true / consent_violations: 0 — we only analyze consented transcripts` invariants are evidence of design experiments converging on a safe extraction contract). A competent professional starting fresh could not state the achievable fidelity or the failure modes.

**(c) Australia-relevance:** Directly serves **National Science & Research Priority 3 — Elevating Aboriginal and Torres Strait Islander knowledge systems**: the mechanism operationalises lived-experience authority and protocol markers as first-class data. Aligns with **Maiam nayri Wingara / Indigenous Data Sovereignty** principles (the schema literally encodes OCAP authority + control).

**Exclude honestly:** the *stories analysed* and any narrative output are arts/content — statutorily excluded. Claim only the extraction model + schema design + grading/calibration work.

---

## 2. Guardian voice-authenticity gate — STRONG R&D claim

**What it is (verified):** `guardian-checks.ts` + `guardian-review.ts` (Inngest, `GUARDIAN_VERSION = v2-guardian-20260328`) run three checks on every AI-generated draft before publish: (1) **voice authenticity** — % of draft sentences traceable to the storyteller's actual transcript words via fuzzy substring + sliding-window word-overlap matching (`sentenceExistsInTranscript`, tuned thresholds: 0.45 overlap, 0.7 content-word match, 25-char step); (2) **fact consistency** — flags names/numbers in the draft absent from the transcript as possible fabrication, with cross-story severity downgrade; (3) **readiness score** — composite gate where consent failure = hard 0/block, cultural HIGH or elder-review caps at 40, voice-drift over a *variant-aware* threshold (long_form 60 / short_form 45 / quote_card 30) caps at 70, and any score <80 forces human approval.

**(a) Technical unknown / hypothesis:** Can you mechanically detect "AI has put words in the storyteller's mouth" (voice drift / fabrication) reliably enough to *gate publication automatically*, while tolerating legitimate paraphrase that varies by output format? Hypothesis: a non-LLM, deterministic matcher can quantify authorship drift well enough to protect storyteller voice at scale.

**(b) Why not predictable:** This is the inverse of a normal plagiarism/similarity problem — here *high* overlap with the source is the *desired* state and AI-invented fluent prose is the failure. The comments document empirical tuning ("was 50 → 25 char step", "tuned for AI models like MiniMax that paraphrase rather than quote") — i.e. the thresholds were discovered by experiment, not derivable a priori. The variant-aware drift thresholds are a research finding (quote cards must be verbatim; long-form may paraphrase). Outcome and tuning were not knowable upfront.

**(c) Australia-relevance:** Enforces **consent-led, voice-preserving** publication — a software guarantee that a community member's words are not synthetically distorted. Supports **Closing the Gap Priority Reform 4 (shared access to / control of data)** by making "is this still the storyteller's voice?" a machine-checkable, auditable gate rather than editorial trust.

---

## 3. OCAP consent-as-code + sovereignty enforcement — bounded R&D claim

**What it is (verified):** `syndication-consent-service.ts` creates per-story/per-gallery consent records with a permission lattice (full-content / excerpt-only / media / comments / analytics / resolution / download / embedding / hotlinking), `cultural_permission_level` (public/community/restricted/sacred), `requires_elder_approval`, scoped embed tokens (30-day, domain-locked, hashed, revocable), and a webhook on grant. Enforcement is partly at the DB floor: RLS migration `20260527070848` default-denies anon/authenticated on sensitive tenant tables and revokes a leaking `contribution_tokens` "read by token" policy that was `USING(true)` (exposed *every* claim token).

**(a) Technical unknown:** Can OCAP (Ownership, Control, Access, Possession) be expressed as an *enforceable runtime contract* — not policy PDF — spanning consent scope, cultural permission tier, elder gate, syndication to third-party sites, and revocation, such that "sacred never auto-consents" and "storyteller can always revoke" hold as system invariants across a multi-surface syndication network?

**(b) Why not fully predictable:** The *primitives* (RLS, tokens, webhooks) are known-solution engineering. The **novel/uncertain** part is the composition: a consent state machine that encodes culturally-defined permission tiers and elder review into syndication + revocation across external embed targets, with auto-approval heuristics (repeat-storyteller skip of elder gate) that must not violate the sovereignty guarantee. Whether that composition holds invariants under real revocation/expiry/cross-site flows was not knowable without building it.

**(c) Australia-relevance:** This *is* OCAP / Indigenous Data Sovereignty rendered executable — **Priority Reform 4 shared data access** and Maiam nayri Wingara made operational.

**Exclude honestly:** straight CRUD on consent rows, the embed-token issuance, and the RLS hardening (closing a `USING(true)` leak) are **routine/known-solution security work** — not experimental. Claim the *state-machine + cultural-tier composition*, not the plumbing.

---

## 4. Consent state machine + 30-day media purge

**What it is (verified):** Two-stage withdrawal. Stage 1 (`media_assets.removed_by_storyteller_at`, migration `20260414233708`) — storyteller self-removes via `/me`; public views must render a placeholder. Stage 2 (`purge-withdrawn-media.ts`, daily Inngest cron `0 17 * * *` = 03:00 Brisbane; `purged_at` column migration `20260520120000`) — after a 30-day grace, the binary is `storage.remove()`d AND every CDN/URL column nulled, with `purged_at` as the permanent deletion record. Code comment is explicit: *"Without this job that promise is theatre: the file row is hidden but the binary still sits in storage."*

**(a) Technical unknown:** modest. The *hypothesis* worth claiming is the design of a **right-to-withdraw guarantee that is provably enforced at the storage layer**, not just the view layer — reconciling a NOT-NULL storage-path schema (breadcrumb retention for audit) with genuine binary deletion and idempotent retry (handles "object not found" so the cron converges).

**(b) Predictability:** The cron + delete is **routine**. The genuinely-considered part is the *audit-vs-erasure tension* (keep `storage_path`/`purged_at` as legal proof of deletion while the bytes are gone). Borderline — claim conservatively or **exclude as known-solution**.

**(c) Australia-relevance:** Operationalises the "Possession" + "Control" of OCAP — withdrawal is real, not cosmetic.

---

## 5. Multi-tenant org-scoped isolation — MOSTLY EXCLUDE

`multi-tenant/queries.ts` forces `organization_id` on every read/write; RLS migration default-denies. This is **standard multi-tenant SaaS practice** — a competent professional knows how to do this. **Not R&D.** Honest exclusion. (The cross-org leak that "required a full rebuild," per ACT memory, was a *bug fix to a known pattern*, not experimental work.) Mention only as the substrate the novel components run on.

## 6. Cultural-safety quote gate — BORDERLINE, modest

`cultural-safety/quote-gate.ts` is default-deny: an anonymous public quote surfaces only if neither its analysis (`cultural_sensitivity_level ∉ {high,sacred,restricted}`) nor transcript (`cultural_sensitivity ∉ {sensitive,sacred,restricted}`) nor elder-review flag marks it for protection; storyteller-rollup surfaces are gated conservatively (any sensitive source → all rollup quotes withheld). Thoughtful safety engineering and well-commented (vocabulary "verified against prod 2026-05-29"), but largely **rule application over a known schema** — modest novelty. Include only as part of the broader consent-enforcement system, not a standalone claim. Note the file *itself* flags an honest gap: it does NOT gate on public-display consent (processing_consent is AI-consent, null on 451/597 transcripts) — evidence of ongoing, unresolved design uncertainty in the consent model.

---

## Recommended R&D framing (for the register / narrative)

**Core experimental activity (claim):** "Design and experimental development of a software system that renders Indigenous Data Sovereignty (OCAP) and cultural-safety protocols into *enforceable, machine-checkable runtime contracts* — comprising (i) an LLM cultural-signal extraction model (PRISM) for community-defined authority/sovereignty/protocol fields, and (ii) a deterministic voice-authenticity + readiness gate (Guardian) protecting storyteller voice at publication — where neither the achievable extraction fidelity nor the gating thresholds were knowable from existing knowledge and were determined only through iterative build-measure-tune cycles (versioned `v2.0`/`v3`/`v2-guardian-20260328`)."

**Supporting activity:** consent state-machine composition across syndication + revocation with cultural permission tiers (the *composition*, not the CRUD).

**Excluded honestly:** the stories/content (statutory arts exclusion); multi-tenant org scoping (standard practice); embed-token issuance, RLS leak-closing, and the cron mechanics (known-solution security/ops engineering).

**External-facing test:** every claimed mechanism is used BY communities/storytellers operating their own data (capture, withdraw, syndicate, gate) — this is product R&D on software for external users, not internal business administration. That distinction holds.

---

### Source files (all absolute)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/ai/transcript-analyzer-v3-claude.ts` (PRISM extraction schema + prompt, lines 49–137, 370–413)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/services/analysis-types.ts` (PrismSignals / CulturalMarkers / ImpactDimensions types)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/ai/guardian-checks.ts` (voice authenticity + readiness scoring)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/inngest/functions/guardian-review.ts` (Guardian orchestration)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/services/syndication-consent-service.ts` (consent-as-code)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/inngest/functions/purge-withdrawn-media.ts` (30-day purge)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/cultural-safety/quote-gate.ts` (public quote gate)
- `/Users/benknight/Code/empathy-ledger-v2/src/lib/multi-tenant/queries.ts` (org isolation — mostly excluded)
- `/Users/benknight/Code/empathy-ledger-v2/supabase/migrations/20260414233708_media_assets_storyteller_removal_tracking.sql`
- `/Users/benknight/Code/empathy-ledger-v2/supabase/migrations/20260520120000_media_assets_purged_at.sql`
- `/Users/benknight/Code/empathy-ledger-v2/supabase/migrations/20260527070848_rls_close_overpermissive_public_write_policies.sql`
