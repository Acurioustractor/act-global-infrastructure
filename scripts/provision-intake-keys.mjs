#!/usr/bin/env node
/**
 * Issue and install the intake spine's per-site keys.
 *
 * THE BLOCKER THIS REMOVES
 * The wayfinder map recorded `readable_home_for_site_keys: UNKNOWN` as blocking the
 * whole spine, with Bitwarden as the candidate home and its lapse on 8 September as
 * the clock. That framing was wrong. A site key is read by exactly two machines: the
 * edge function that checks it, and the site's server that presents it. No human ever
 * types one. So its home is the two machine stores it already needs to be in, and a
 * password manager adds a third copy that can only drift or leak. Bitwarden lapsing is
 * irrelevant to this. If a key is ever lost, it is not recovered, it is rotated, which
 * is one line here and is the correct response to a lost credential anyway.
 *
 *   node scripts/provision-intake-keys.mjs                 # show what exists, change nothing
 *   node scripts/provision-intake-keys.mjs --apply         # issue + install the missing ones
 *   node scripts/provision-intake-keys.mjs --apply --site goods
 *   node scripts/provision-intake-keys.mjs --apply --rotate --site goods
 *
 * Installing means: set the secret on the Supabase project (the checking half), then
 * print the exact `vercel env add` for the site (the presenting half). The Vercel half
 * is printed rather than run, because it binds at BUILD time: setting it without a
 * redeploy looks done and is not, and that trap has already cost this project a day.
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const PROJECT_REF = 'tednluwflfhxyucgwigh';

/**
 * The properties that have a server able to hold a secret. Slug is the contract: the
 * site sends it as `site`, and the function looks for ACT_INTAKE_KEY_<SLUG uppercased,
 * . and - as _>. Anything not listed here cannot post to the spine, by design, because
 * siteFromKey fails closed on an unconfigured site.
 *
 * Ordered by how much it hurts that they are not wired yet.
 */
const SITES = [
  { slug: 'act-regenerative-studio', vercel: 'act-regenerative-studio', note: 'one chokepoint, /api/forms/submit, 7 forms. WIRED, awaiting env' },
  { slug: 'justicehub',              vercel: 'justicehub',              note: '12 routes, no chokepoint. Notifies NO human today' },
  { slug: 'goods',                   vercel: 'v2',                      note: 'one chokepoint, lib/contact-delivery, 7 routes' },
  { slug: 'harvest',                 vercel: 'the-harvest-website',     note: '16 forms, 13 rows waiting' },
  { slug: 'empathy-ledger',          vercel: 'empathy-ledger-v2',       note: '3 storyteller support rows waiting, flagged critical' },
];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rotate = args.includes('--rotate');
const only = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;

const envName = (slug) => `ACT_INTAKE_KEY_${slug.replace(/[.-]/g, '_').toUpperCase()}`;

/** 32 bytes hex. The function requires >= 16 chars and compares in constant time. */
const mint = () => randomBytes(32).toString('hex');

function installed() {
  // `-o json` returns a bare array; the default format wraps it in { secrets: [...] }.
  // Accept both so a CLI upgrade cannot silently make every key look missing, which
  // with --apply would rotate the lot and lock every wired site out at once.
  const raw = execFileSync('supabase', ['secrets', 'list', '--project-ref', PROJECT_REF, '-o', 'json'], {
    encoding: 'utf8',
  });
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.secrets;
  if (!Array.isArray(list)) throw new Error('Could not read the secret list; refusing to guess what exists.');
  return new Set(list.map((s) => s.name));
}

const present = installed();
const targets = SITES.filter((s) => !only || s.slug === only);
if (only && targets.length === 0) {
  console.error(`No site with slug "${only}". Known: ${SITES.map((s) => s.slug).join(', ')}`);
  process.exit(1);
}

console.log(`\nIntake site keys on ${PROJECT_REF}\n`);

const toPrint = [];
for (const site of targets) {
  const name = envName(site.slug);
  const exists = present.has(name);

  if (exists && !rotate) {
    console.log(`  ok      ${site.slug.padEnd(24)} ${name}`);
    continue;
  }
  if (!apply) {
    console.log(`  MISSING ${site.slug.padEnd(24)} ${name}   ${site.note}`);
    continue;
  }

  const key = mint();
  execFileSync('supabase', ['secrets', 'set', `${name}=${key}`, '--project-ref', PROJECT_REF], {
    stdio: 'pipe',
  });
  console.log(`  ${exists ? 'ROTATED' : 'ISSUED '} ${site.slug.padEnd(24)} ${name}`);
  toPrint.push({ site, key });
}

if (!apply) {
  console.log(`\n  Nothing was changed. Re-run with --apply to issue the missing keys.\n`);
  process.exit(0);
}

if (toPrint.length === 0) {
  console.log(`\n  Every key already exists. Use --rotate --site <slug> to replace one.\n`);
  process.exit(0);
}

console.log(`\n  The spine can now check these. The other half is the site presenting one.`);
console.log(`  Run each pair below in that site's repo, then REDEPLOY it: Vercel env binds`);
console.log(`  at build time, so an env var set without a redeploy is not live.\n`);

for (const { site, key } of toPrint) {
  console.log(`  # ${site.slug}  (${site.note})`);
  console.log(`  vercel env add ACT_INTAKE_URL production   # https://${PROJECT_REF}.supabase.co/functions/v1/intake`);
  console.log(`  vercel env add ACT_INTAKE_KEY production   # ${key}`);
  console.log('');
}

console.log(`  These values are printed once and not stored here. If one is lost, rotate it.\n`);
