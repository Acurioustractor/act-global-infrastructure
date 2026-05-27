# Civic OS Cross-Product Env-Var Rollout

**Date:** 2026-05-25
**Owner:** Ben Knight
**Status:** Ready to execute. ~30 min total wall time.
**Prerequisite:** The three build-prompt agents have shipped code that uses these env vars. The code currently falls back to stubs/local-queues when the vars are absent (intentional). This doc takes the system from "stub-fallback mode" to "live cross-product wiring."

---

## What this enables

Once these env vars are set in production, the three layers of the [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Operating System]] start talking in production:

- **CivicGraph** stops queuing audit events in its local `audit_events` table and starts forwarding them live to Empathy Ledger's `/api/v1/accountability/events`
- **JusticeHub** SDK clients (`empathy-ledger-client`, `civic-scope-client`) stop returning stub responses and start hitting real endpoints
- **Empathy Ledger** starts accepting cross-product event/consent/AI-run writes from CivicGraph and JusticeHub

This is the wiring that turns "three products that happen to be sold together" into "one civic OS enforced in code." Until it's live, the architecture is real on paper but not real on the wire.

---

## Inventory — every env var across the three repos

### On Empathy Ledger v2 (the producer)

Set on Vercel project for `empathy-ledger-v2` (production + preview environments):

| Var | Purpose | How to generate |
|---|---|---|
| `ACCOUNTABILITY_TOKEN_CIVIC_GRAPH` | Token CivicGraph presents in `x-api-key` when calling EL accountability endpoints | `openssl rand -base64 32` |
| `ACCOUNTABILITY_TOKEN_JUSTICE_HUB` | Token JusticeHub presents in `x-api-key` when calling EL accountability endpoints | `openssl rand -base64 32` |
| `ACCOUNTABILITY_TOKEN_GRANTSCOPE` | Alias for CivicGraph (the repo name is legacy `grantscope`) — set both, the code resolves either | Same value as `ACCOUNTABILITY_TOKEN_CIVIC_GRAPH` |
| `ACCOUNTABILITY_TOKEN_CONTAINED` | Reserved for the CONTAINED campaign surface when it starts logging events | `openssl rand -base64 32` (or defer until needed) |

Token-to-product mapping is resolved server-side from the token, never from the request body. A leaked CivicGraph token cannot impersonate JusticeHub.

### On CivicGraph (`grantscope` repo) — the consumer

Set on Vercel project for `grantscope` (production + preview):

| Var | Purpose | Value |
|---|---|---|
| `EMPATHY_LEDGER_ACCOUNTABILITY_URL` | Base URL for EL's accountability API | `https://<el-prod-domain>/api/v1/accountability` |
| `EL_ACCOUNTABILITY_TOKEN` | The token EL knows this product by | Same value as `ACCOUNTABILITY_TOKEN_CIVIC_GRAPH` on EL |

If either is missing, CivicGraph keeps queuing events in its local `audit_events` table. Safe degradation; no user-visible breakage.

### On JusticeHub (`JusticeHub` repo) — the consumer

Set on Vercel project for `JusticeHub` (production + preview):

| Var | Purpose | Value |
|---|---|---|
| `EMPATHY_LEDGER_ACCOUNTABILITY_URL` | Base URL for EL's accountability API | Same as CivicGraph |
| `EL_ACCOUNTABILITY_TOKEN` | The token EL knows JusticeHub by | Same value as `ACCOUNTABILITY_TOKEN_JUSTICE_HUB` on EL |
| `CIVIC_SCOPE_API_URL` | Base URL for CivicGraph's public API | `https://<civicgraph-prod-domain>/api/v1/public` |

If `EMPATHY_LEDGER_ACCOUNTABILITY_URL` or `EL_ACCOUNTABILITY_TOKEN` are missing, JusticeHub's `empathy-ledger-client` returns stub responses and logs a warning. Same pattern for `CIVIC_SCOPE_API_URL` — `civic-scope-client` returns stubs. Safe degradation.

### Local dev (each repo's `.env.local`)

For local dev across all three repos, generate ONE shared dev token (different from production) and use it everywhere. Pointing at `localhost` URLs:

```bash
# In each of: empathy-ledger-v2/.env.local, grantscope/.env.local, JusticeHub/.env.local

EMPATHY_LEDGER_ACCOUNTABILITY_URL=http://localhost:3030/api/v1/accountability
CIVIC_SCOPE_API_URL=http://localhost:3003/api/v1/public

# Dev token (single value used by all three repos in dev — for dev only, never production):
EL_ACCOUNTABILITY_TOKEN=dev-shared-token-here

# On the EL side (.env.local only):
ACCOUNTABILITY_TOKEN_CIVIC_GRAPH=dev-shared-token-here
ACCOUNTABILITY_TOKEN_JUSTICE_HUB=dev-shared-token-here
ACCOUNTABILITY_TOKEN_GRANTSCOPE=dev-shared-token-here
```

The point of the shared dev token is so you can smoke-test the full chain locally without juggling four separate tokens. Production tokens MUST be per-product.

---

## Rollout order (do these in sequence)

### Step 1 — Generate the four production tokens

Locally:

```bash
echo "CIVIC_GRAPH=$(openssl rand -base64 32)"
echo "JUSTICE_HUB=$(openssl rand -base64 32)"
echo "GRANTSCOPE=$(openssl rand -base64 32)"  # alias; can match CIVIC_GRAPH
echo "CONTAINED=$(openssl rand -base64 32)"   # optional, defer if not needed
```

Save these in a password manager under the entry name "ACT Civic OS — Accountability Tokens 2026-05-25." Document the rotation date target (12 months) in the same entry.

### Step 2 — Set tokens on Empathy Ledger v2 Vercel project

Production + preview environments both need them:

```bash
# Via Vercel CLI
cd /Users/benknight/Code/empathy-ledger-v2
vercel env add ACCOUNTABILITY_TOKEN_CIVIC_GRAPH production
vercel env add ACCOUNTABILITY_TOKEN_CIVIC_GRAPH preview
vercel env add ACCOUNTABILITY_TOKEN_JUSTICE_HUB production
vercel env add ACCOUNTABILITY_TOKEN_JUSTICE_HUB preview
vercel env add ACCOUNTABILITY_TOKEN_GRANTSCOPE production
vercel env add ACCOUNTABILITY_TOKEN_GRANTSCOPE preview
```

Or via the Vercel dashboard if preferred. Redeploy EL prod after setting.

### Step 3 — Smoke test EL endpoints with the new tokens

```bash
# From any machine with curl
EL_URL="https://<el-prod-domain>/api/v1/accountability"
TOKEN="<CIVIC_GRAPH token from step 1>"

# Events endpoint
curl -X POST "$EL_URL/events" \
  -H "x-api-key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test.smoke","subject_type":"system","subject_id":"rollout-2026-05-25"}'
# Expect: 200 with event_id

# Consent verify endpoint (will return active: false for unknown token, that's expected)
curl "$EL_URL/consent/test-unknown-token/verify" \
  -H "x-api-key: $TOKEN"
# Expect: 200 with {"active": false}

# AI runs endpoint
curl -X POST "$EL_URL/ai-runs" \
  -H "x-api-key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"smoke-test","analyzer_version":"rollout-2026-05-25","operation_type":"test"}'
# Expect: 200 with run_id
```

Verify the row landed in production DB:

```bash
PGPASSWORD="$PGPASSWORD" psql \
  -h aws-1-ap-southeast-2.pooler.supabase.com -p 6543 \
  -U postgres.yvnuayzslukamizrlhwb -d postgres \
  -c "select id, product, event_type, occurred_at from public.accountability_events order by occurred_at desc limit 3;"
```

Clean up the smoke-test rows after:

```sql
DELETE FROM public.accountability_events WHERE subject_id = 'rollout-2026-05-25';
DELETE FROM public.ai_runs WHERE analyzer_version = 'rollout-2026-05-25';
```

If anything fails here, **STOP** and fix before moving to Step 4. Do not propagate broken state to consumer products.

### Step 4 — Set vars on CivicGraph (grantscope) Vercel

```bash
cd /Users/benknight/Code/grantscope
vercel env add EMPATHY_LEDGER_ACCOUNTABILITY_URL production
# Value: https://<el-prod-domain>/api/v1/accountability
vercel env add EL_ACCOUNTABILITY_TOKEN production
# Value: <CIVIC_GRAPH token from step 1>
```

Repeat for `preview` environment. Redeploy.

### Step 5 — Smoke test CivicGraph live-forwarding

Visit the Atlas in production: `https://<civicgraph-prod-domain>/atlas/funding-deserts`. That single page view should now fire an event to EL.

Verify on EL:

```sql
SELECT product, event_type, occurred_at, payload
FROM public.accountability_events
WHERE product = 'civic_graph'
ORDER BY occurred_at DESC
LIMIT 5;
```

Then check the local CivicGraph queue is no longer growing for new events (the local audit_events table is now a fallback only):

```bash
node --env-file=.env scripts/gsql.mjs \
  "SELECT COUNT(*) FROM audit_events WHERE forwarded = false AND created_at > NOW() - INTERVAL '5 minutes'"
# Expect: 0 (events are going live, not queuing)
```

### Step 6 — Set vars on JusticeHub Vercel

```bash
cd /Users/benknight/Code/JusticeHub
vercel env add EMPATHY_LEDGER_ACCOUNTABILITY_URL production
vercel env add EL_ACCOUNTABILITY_TOKEN production
# Value: <JUSTICE_HUB token from step 1>
vercel env add CIVIC_SCOPE_API_URL production
# Value: https://<civicgraph-prod-domain>/api/v1/public
```

Repeat for `preview`. Redeploy.

### Step 7 — Smoke test JusticeHub live cross-product calls

Visit the launch companion page: `https://<justicehub-prod-domain>/from-programs-to-practice`. That should:
1. Read ALMA interventions from JusticeHub's own Supabase (unchanged)
2. Fire an event to EL via `empathy-ledger-client`
3. (Optionally) fetch live grant opportunities from CivicGraph via `civic-scope-client`

Verify on EL:

```sql
SELECT product, event_type, occurred_at
FROM public.accountability_events
WHERE product = 'justice_hub'
ORDER BY occurred_at DESC
LIMIT 5;
```

Quick check JusticeHub isn't using stubs anymore — look at the dev server logs (or production logs) for the line `[civic-scope-client] STUB MODE` (should be absent now).

---

## Rollback

If any step goes wrong:

1. **Tokens stale or compromised:** generate new ones, replace on EL + consumer, redeploy each. Old tokens stop working immediately.
2. **EL endpoint broken:** unset `EMPATHY_LEDGER_ACCOUNTABILITY_URL` on the consumer (CivicGraph or JusticeHub) and redeploy. Consumer falls back to local-queue / stub mode. No user-visible breakage.
3. **Migration regression in EL:** the migration that landed today (`20260525120000_ai_runs_ledger.sql`) is additive only — two new tables, no ALTER on existing schema. Rollback is `DROP TABLE public.ai_runs; DROP TABLE public.accountability_events;`. Do this only if you intend to fully unwind the AI-use ledger feature; otherwise leave the tables and disable the writers via env-var removal.

---

## Critical reminders

- **Production tokens are per-product.** Never share a token between CivicGraph and JusticeHub in production. A token leak should burn one product, not the whole OS.
- **Dev tokens can be shared** within a single developer's local environment for ease of smoke-testing. Document clearly that they are NOT production credentials.
- **The EL accountability DB is the multi-tenant production DB Oonchiumpa lives in** (`yvnuayzslukamizrlhwb`). Any change to the `accountability_events` or `ai_runs` schema affects every tenant. Always verify RLS isolation on changes.
- **The Vercel preview environments matter.** Preview deploys triggered by PRs will use preview env vars. Without them, PR previews will run in stub-fallback mode (safe but invisible). Set production + preview together.
- **Token rotation cadence:** 12 months. Set a calendar reminder for 2027-05-25.

---

## Related

- [[2026-05-25-fy27-launch-operations-plan|FY27 Launch Operations Plan]] — the original plan that commissioned this wiring
- [[../decisions/2026-05-25-civic-cerebellum-reframe|Civic Cerebellum Reframe ADR]] — the decision the wiring serves
- [[../concepts/civic-operating-system|Civic Operating System concept]] — the architecture this wiring makes real
- Build handoffs (this session):
  - `thoughts/shared/handoffs/2026-05-25-empathy-ledger-build.md`
  - `thoughts/shared/handoffs/2026-05-25-civicgraph-build.md`
  - `thoughts/shared/handoffs/2026-05-25-justicehub-build.md`
