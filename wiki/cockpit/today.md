# ACT Cockpit — generation failed 2026-04-25 21:18 UTC

**Error:** Missing SUPABASE_SHARED_SERVICE_ROLE_KEY

The cockpit script requires Supabase credentials in `.env.local` to pull live data. This environment is not configured.

**To fix:** Set up `.env.local` with the shared Supabase credentials and re-run `node scripts/generate-ceo-cockpit.mjs`.
