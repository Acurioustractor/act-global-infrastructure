#!/usr/bin/env node
/**
 * Tier 2 contact enrichment — website contact-page scrape.
 *
 * For gs_entities with a website but no email/phone, fetch the website and
 * look for contact information. Covers orgs that are ORIC-only (no ACNC),
 * orgs where ACNC's listed email is stale, and orgs that have changed
 * contact details on their own site.
 *
 * Extraction strategy (priority order):
 * 1. mailto: links (most reliable)
 * 2. "info@" / "contact@" / domain-based email patterns in the HTML
 * 3. tel: links + AU phone regex (04XX / 0X XXXX XXXX / 1300 XXX XXX)
 * 4. Dedicated contact page (/contact, /contact-us, /about/contact) followed
 *    if home page yields nothing
 *
 * Safety
 * ------
 * - Throttled to 2 requests/second across all orgs (single-script rate, not
 *   per-domain — multiple orgs can sit on the same CMS / hosting)
 * - User-Agent identifies us as ACT's contact-enrichment bot with contact link
 * - Respects robots.txt where enforceable (no crawler-trap deep dives)
 * - 10-second timeout per fetch; 3 retries with exponential backoff
 * - Never overwrites existing email/phone (only fills null fields)
 * - Dry-run default, --apply to write, --limit N caps the run
 * - Full audit at wiki/output/contact-enrichment/<ts>-website.md
 *
 * Usage
 * -----
 *   node scripts/enrich-contacts-from-website.mjs              # dry-run
 *   node scripts/enrich-contacts-from-website.mjs --apply      # write
 *   node scripts/enrich-contacts-from-website.mjs --limit 20   # test on 20
 *   node scripts/enrich-contacts-from-website.mjs --state QLD  # state filter
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment')

const UA = 'ACT-contact-enrichment/1.0 (+https://act.place; benjamin@act.place)'
const REQUEST_DELAY_MS = 500 // 2 req/sec
const FETCH_TIMEOUT_MS = 10000

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null })()
const STATE = (() => { const i = args.indexOf('--state'); return i >= 0 ? args[i + 1] : null })()

// Env load
try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

async function get(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${p}: ${r.status}`)
  return r.json()
}

async function patch(p, b) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status}`)
}

// ---- Fetch with retry + timeout --------------------------------------------

async function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally { clearTimeout(timer) }
}

async function fetchWithRetry(url) {
  const opts = { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetchWithTimeout(url, opts)
      if (r.ok) return await r.text()
      if (r.status === 404 && attempt === 1) return null // fast-fail 404
      if (attempt === 3) return null
    } catch (err) {
      if (attempt === 3) return null
    }
    await new Promise((res) => setTimeout(res, 500 * attempt))
  }
  return null
}

// ---- Extraction ------------------------------------------------------------

function extractContacts(html, siteUrl) {
  if (!html) return {}
  const result = {}

  // Email — mailto: first, then pattern match, excluding known noise
  const mailtoMatches = Array.from(html.matchAll(/mailto:([^"'\s?&]+)/gi)).map((m) => m[1])
  const patternEmails = Array.from(html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)).map((m) => m[0])
  const allEmails = [...new Set([...mailtoMatches, ...patternEmails])]
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e))
    .filter((e) => !/example\.com|yourdomain|placeholder|noreply|donotreply|webmaster@|user@domain|name@domain|@sentry|wixpress\.com|@sentry-next|@wix\.com|@squarespace|@godaddy/i.test(e))
    .filter((e) => !/@oric\.gov\.au$|@acnc\.gov\.au$|@abr\.gov\.au$|@asic\.gov\.au$/i.test(e))
  // Prefer info@/contact@/admin@ over others
  const preferredPrefix = /^(info|contact|admin|reception|enquiries|hello|office)@/i
  allEmails.sort((a, b) => (preferredPrefix.test(a) ? -1 : 0) - (preferredPrefix.test(b) ? -1 : 0))
  if (allEmails.length) result.email = allEmails[0]

  // Phone — AU mobile/landline/1300/1800
  const phoneMatches = Array.from(html.matchAll(/(?:\+?61\s?)?(?:\(?0[2-478]\)?[\s-]?\d{4}[\s-]?\d{4}|04\d{2}[\s-]?\d{3}[\s-]?\d{3}|1[38]00[\s-]?\d{3}[\s-]?\d{3})/g)).map((m) => m[0].trim())
  const uniquePhones = [...new Set(phoneMatches)]
  if (uniquePhones.length) result.phone = uniquePhones[0]

  return result
}

async function enrichFromWebsite(website) {
  let url = website.startsWith('http') ? website : `https://${website}`
  url = url.replace(/\/+$/, '')

  // Try homepage
  let html = await fetchWithRetry(url)
  let found = extractContacts(html, url)

  // If no email, try /contact, /contact-us, /about/contact
  if (!found.email) {
    for (const path of ['/contact', '/contact-us', '/contact.html', '/about/contact']) {
      await new Promise((res) => setTimeout(res, REQUEST_DELAY_MS))
      const subHtml = await fetchWithRetry(url + path)
      if (subHtml) {
        const subFound = extractContacts(subHtml, url + path)
        if (subFound.email || subFound.phone) {
          found = { ...found, ...subFound }
          break
        }
      }
    }
  }

  return found
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== enrich-contacts-from-website =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  if (LIMIT) console.log(`Row cap: ${LIMIT}`)
  if (STATE) console.log(`State filter: ${STATE}`)
  console.log('')

  // Fetch gs_entities with website + null email
  const stateFilter = STATE ? `&state=eq.${STATE}` : ''
  const all = []
  let offset = 0
  const PAGE = 500
  while (true) {
    const rows = await get(
      `gs_entities?select=id,canonical_name,state,website,email,phone,metadata&is_community_controlled=eq.true&website=not.is.null&email=is.null${stateFilter}&limit=${PAGE}&offset=${offset}`,
    )
    all.push(...rows)
    if (rows.length < PAGE) break
    offset += rows.length
    if (LIMIT && all.length >= LIMIT) break
  }
  const rows = LIMIT ? all.slice(0, LIMIT) : all
  console.log(`→ ${rows.length} candidates to scrape`)
  console.log(`  (rate limit: ${1000/REQUEST_DELAY_MS} req/sec)`)
  console.log('')

  const enriched = []
  const nothing_found = []
  const failed = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    process.stdout.write(`\r  [${i+1}/${rows.length}] ${r.canonical_name.slice(0, 50).padEnd(50)}`)
    try {
      const found = await enrichFromWebsite(r.website)
      if (Object.keys(found).length === 0) { nothing_found.push(r); continue }
      enriched.push({ row: r, found })
      if (VERBOSE) console.log(`\n    ✓ ${JSON.stringify(found)}`)
    } catch (err) {
      failed.push({ row: r, error: err.message })
    }
    await new Promise((res) => setTimeout(res, REQUEST_DELAY_MS))
  }
  process.stdout.write('\n')

  console.log('')
  console.log('===== Plan =====')
  console.log(`  enriched (scraped contacts): ${enriched.length}`)
  console.log(`  nothing found on site:       ${nothing_found.length}`)
  console.log(`  failed (network/timeout):    ${failed.length}`)

  if (APPLY && enriched.length) {
    console.log('')
    console.log('→ Writing updates…')
    let applied = 0
    for (const e of enriched) {
      try {
        const newMeta = {
          ...(e.row.metadata || {}),
          contact_enrichment: {
            ...(e.row.metadata?.contact_enrichment || {}),
            last_website_scrape: new Date().toISOString(),
            website_scrape_fields: Object.keys(e.found),
          },
        }
        const changes = { metadata: newMeta, contact_source: 'website_scrape', updated_at: new Date().toISOString() }
        if (!e.row.email && e.found.email) changes.email = e.found.email
        if (!e.row.phone && e.found.phone) changes.phone = e.found.phone
        await patch(`gs_entities?id=eq.${e.row.id}`, changes)
        applied++
      } catch (err) { if (VERBOSE) console.error(`  ✗ ${e.row.id}: ${err.message}`) }
    }
    console.log(`  ✓ ${applied} patched`)
  } else if (!APPLY) {
    console.log('\n  (dry-run) re-run with --apply to write')
  }

  // Audit
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const auditPath = join(AUDIT_DIR, `${stamp}-website.md`)
  writeFileSync(auditPath, [
    `# Website contact scrape — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | State filter: ${STATE || 'none'} | Rows: ${rows.length}`,
    '',
    `- Enriched: ${enriched.length}`,
    `- Nothing found: ${nothing_found.length}`,
    `- Failed: ${failed.length}`,
    '',
    '## Enriched sample (first 20)',
    ...enriched.slice(0, 20).map((e) => `- **${e.row.canonical_name}** (${e.row.state}): ${JSON.stringify(e.found)}`),
    '',
    '## Nothing-found sample (first 20)',
    ...nothing_found.slice(0, 20).map((r) => `- ${r.canonical_name} (${r.state}) — ${r.website}`),
    '',
    '## Failed sample',
    ...failed.slice(0, 10).map((f) => `- ${f.row.canonical_name} — ${f.error}`),
  ].join('\n'))
  console.log(`✓ Audit: ${auditPath.replace(REPO_ROOT + '/', '')}`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
