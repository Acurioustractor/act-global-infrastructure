// Load .env.local for local development
// In CI, environment variables are injected by GitHub Actions secrets.
//
// override: true so .env.local always wins against stale shell-env values.
// 2026-05-07 incident: a stale NOTION_TOKEN exported from ~/.zshrc was
// shadowing the rotated token in .env.local for hours, with every Notion
// API call returning 'unauthorized'. dotenv's default behaviour is to
// preserve existing env vars, which makes .env.local a no-op for any var
// the shell has already set. For local development where .env.local is
// the canonical source, override is the safer default. CI is unaffected
// (no .env.local present in CI runs).
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath, override: true });
}
