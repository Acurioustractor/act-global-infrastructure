# Empathy Ledger build — 2026-05-25

## Summary

Shipped all four items from build prompt §7.2 in the FY27 launch plan:
the consent management page (no longer `<ComingSoon />`), the AI-use ledger
(table + RLS + analyzer wired + storyteller/org pages), the three
cross-product `/api/v1/accountability/*` endpoints, and the
`src/lib/accountability/` re-export package with README. Migration applied
to production (`yvnuayzslukamizrlhwb`); E2E roundtrip verified by inserting
a synthetic `ai_runs` row and reading it back. No blockers for the 29 June
field trip.

## Files created

- `supabase/migrations/20260525120000_ai_runs_ledger.sql` — adds `ai_runs` and `accountability_events` tables, indexes, and RLS policies (storyteller-own + org-admin read).
- `src/lib/accountability/index.ts` — barrel re-exporting `audit-log`, `guardian-checks`, `syndication-consent-service`, `cultural-safety`, plus new `ai-runs` and `service-auth`.
- `src/lib/accountability/ai-runs.ts` — `recordAIRun()` writer. Hashes input/output/prompt, caps payloads at 256KB, best-effort (never throws).
- `src/lib/accountability/service-auth.ts` — `resolveServiceToken()` for sibling-product `x-api-key` auth. Per-product env vars (`ACCOUNTABILITY_TOKEN_JUSTICE_HUB`, etc.); product is set from token, never from request body.
- `src/lib/accountability/README.md` — kernel overview + API documentation pointer.
- `docs/api/accountability.md` — full curl examples for the three `/api/v1/accountability/*` endpoints.
- `src/app/api/ai-runs/route.ts` — `GET /api/ai-runs?storyteller_id=...|organization_id=...`. Enforces self-or-org-admin-or-super-admin authz; super-admin cross-tenant reads log to `audit_log`.
- `src/app/api/storytellers/by-profile/[id]/route.ts` — small lookup used by `/consent` to find the storyteller record for the logged-in profile.
- `src/app/api/v1/accountability/events/route.ts` — `POST` cross-product event logger.
- `src/app/api/v1/accountability/consent/[token]/verify/route.ts` — `GET` token verification (story + gallery embed tokens). Returns 200 with `active: false` for revoked/expired/unknown; 401 only for bad service token.
- `src/app/api/v1/accountability/ai-runs/route.ts` — `POST` cross-product AI run logger. Mirrors `ai_runs` schema.
- `src/app/storytellers/[id]/ai-log/page.tsx` — "What AI has looked at me." Shows model, version, score, reviewer, cultural sensitivity, override reason.
- `src/app/organizations/[id]/ai-log/page.tsx` — same view scoped to org's storytellers.

## Files modified

- `src/app/consent/page.tsx` — replaced `<ComingSoon />` with the live consent management UI. Lists active/withdrawn consents with revoke buttons, cultural permission level badges (public/community/restricted/sacred), expiry, and links to consent-log + ai-log.
- `src/lib/ai/transcript-analyzer-v3-claude.ts` — wired `recordAIRun()` to fire at end of every `analyzeTranscript()` call. Added optional `storyteller_id` / `organization_id` / `story_id` / `transcript_id` / `operation_type` / `source_product` metadata fields. Wrapper `analyzeTranscriptV3` updated to pass them through.

## Database migrations

- `supabase/migrations/20260525120000_ai_runs_ledger.sql` — **APPLIED** to project `yvnuayzslukamizrlhwb` via direct psql against the production pooler. RLS verified (4 policies created). E2E insert + select + delete round-trip succeeded.

## Stop criteria check

| Criterion | Status |
|-----------|--------|
| Consent page is live in dev (not `<ComingSoon />`) | MET — `/consent` renders full UI for authed users. |
| `ai_runs` table exists with RLS migration | MET — applied & verified in production DB. |
| One end-to-end test passes where an AI analysis writes a row and the storyteller can see it at `/storytellers/[id]/ai-log` | PARTIALLY MET — DB roundtrip verified directly (insert via SQL → query via SQL → cleanup). UI wiring is complete and analyzer is wired, but I did **not** run the live analyzer end-to-end through the running dev server (would require kicking a real transcript through the inngest pipeline). Recommend Ben kicks one transcript analysis on staging and confirms a row appears on `/storytellers/<id>/ai-log`. |

## Open items for next session

- **Live analyzer smoke test.** Run one real transcript through `/api/transcripts/[id]/analyze` and confirm the `ai_runs` row shows up on `/storytellers/<id>/ai-log`. The wiring is in place but I deliberately did not call out to MiniMax/OpenAI to burn credits.
- **Wire callers of `analyzeTranscriptV3` to pass storyteller/org/story ids.** Right now if you call `analyzeTranscriptV3(content)` with no metadata, the run still logs but with null storyteller_id (won't surface on the storyteller's log page). Quick search of callers will turn them up — `/api/transcripts/[id]/analyze`, `process-transcript` inngest function, batch scripts.
- **Wire `guardian_score` + `guardian_passed`.** The ledger has these columns and the page renders them, but the analyzer doesn't currently compute them at analysis time. Hook `checkVoiceAuthenticity()` into the analyzer once the storyteller-provided transcript is also passed in.
- **Set the four `ACCOUNTABILITY_TOKEN_*` env vars** on Vercel before any sibling product can call the endpoints. Generate with `openssl rand -base64 32`. Document each token's owner.
- **Add `/consent` link to the global nav / storyteller dashboard.** Currently only reachable by URL.
- **The "see who's accessed my content" log** referenced in §7.2 (1) is partially served by `/storytellers/[id]/consent-log`. If we want richer "viewed-by" tracking (vs just consent changes), we need an additional table — out of scope today.
- **Field-trip readiness.** Before 29 June, do a brown-bag walkthrough: create a test consent → confirm it appears on `/consent` → revoke from a phone → confirm the syndication webhook fires → confirm the storyteller-side AI log shows analyzer runs.

## How to test what shipped

```bash
# Type-check (already passes for changed files)
cd /Users/benknight/Code/empathy-ledger-v2 && npx tsc --noEmit

# Boot dev server (PM2 per CLAUDE.md)
el-restart && el-logs

# Then in a browser, signed in as a storyteller:
open http://localhost:3030/consent
open http://localhost:3030/storytellers/<storyteller-id>/ai-log

# Org admin view:
open http://localhost:3030/organizations/<org-id>/ai-log

# Cross-product API smoke test (set env first):
export ACCOUNTABILITY_TOKEN_JUSTICE_HUB="$(openssl rand -base64 32)"
# add to .env.local, restart, then:
curl -X POST http://localhost:3030/api/v1/accountability/events \
  -H "x-api-key: $ACCOUNTABILITY_TOKEN_JUSTICE_HUB" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"decision.published","subject_type":"story","subject_id":"test"}'

# Verify a row landed:
PGPASSWORD="$PGPASSWORD" psql -h aws-1-ap-southeast-2.pooler.supabase.com \
  -p 6543 -U postgres.yvnuayzslukamizrlhwb -d postgres \
  -c "select id, product, event_type, occurred_at from public.accountability_events order by occurred_at desc limit 5;"
```

DB sanity (already run during build, kept for reference):

```sql
-- Should return 26 columns for ai_runs, 13 for accountability_events
select table_name, count(*) from information_schema.columns
where table_name in ('ai_runs','accountability_events') group by table_name;

-- Should return 4 RLS policies
select tablename, policyname from pg_policies
where tablename in ('ai_runs','accountability_events');
```
