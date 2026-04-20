#!/usr/bin/env node
/**
 * url-scrape adapter — fetch a public URL, convert to markdown, ingest.
 *
 * Diff against the last-saved snapshot so only new/changed content
 * generates an ingest digest. Without firecrawl, this uses the built-in
 * fetch + a basic HTML→text conversion. With firecrawl available, set
 * USE_FIRECRAWL=1 in env and the script will call firecrawl_scrape via
 * the firecrawl HTTP API directly (requires FIRECRAWL_API_KEY).
 *
 * Usage:
 *   node scripts/narrative-adapters/url-scrape.mjs <url> --project <slug>
 *
 * Examples:
 *   node scripts/narrative-adapters/url-scrape.mjs https://justicehub.com.au/contained --project contained
 *   node scripts/narrative-adapters/url-scrape.mjs https://act.place --project unassigned
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { createHash } from 'crypto'

const ROOT = process.cwd()
const TMP = join(tmpdir(), 'narrative-adapter-url')
const SNAPSHOT_DIR = join(ROOT, 'wiki', 'narrative', '.url-snapshots')
mkdirSync(TMP, { recursive: true })
mkdirSync(SNAPSHOT_DIR, { recursive: true })

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: url-scrape.mjs <url> [--project <slug>] [--source-type <type>]')
  process.exit(1)
}

const url = args[0]
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const project = flag('project') || 'unassigned'
const sourceType = flag('source-type') || 'website'

const slug = createHash('md5').update(url).digest('hex').slice(0, 12)
const snapshotPath = join(SNAPSHOT_DIR, `${slug}.md`)

// ---- Fetch & convert ------------------------------------------------

async function fetchAsMarkdown(targetUrl) {
  // Firecrawl path
  if (process.env.USE_FIRECRAWL === '1' && process.env.FIRECRAWL_API_KEY) {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: targetUrl, formats: ['markdown'] }),
    })
    if (!res.ok) throw new Error(`firecrawl ${res.status}`)
    const data = await res.json()
    return data.data?.markdown || ''
  }

  // Plain fetch path
  const res = await fetch(targetUrl, {
    headers: { 'User-Agent': 'narrative-watch/0.1 (+act-global-infrastructure)' },
  })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  const html = await res.text()
  return htmlToText(html)
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<\/(p|div|h\d|li|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

console.log(`[url-scrape] fetching ${url}`)
let content
try {
  content = await fetchAsMarkdown(url)
} catch (e) {
  console.error(`[url-scrape] fetch failed:`, e.message)
  process.exit(1)
}

if (!content || content.length < 100) {
  console.warn(`[url-scrape] content too short (${content?.length || 0} chars) — skipping`)
  process.exit(0)
}

// ---- Diff against last snapshot ------------------------------------

const previous = existsSync(snapshotPath) ? readFileSync(snapshotPath, 'utf8') : ''
const newHash = createHash('md5').update(content).digest('hex')
const oldHash = previous ? createHash('md5').update(previous).digest('hex') : ''

if (newHash === oldHash) {
  console.log(`[url-scrape] no change since last snapshot — skipping ingest`)
  process.exit(0)
}

const isFirstSnapshot = !previous

// ---- Write batch + ingest ------------------------------------------

const batchPath = join(TMP, `url-${slug}-${Date.now()}.md`)
const lines = []
lines.push(`# URL scrape — ${url}`)
lines.push(`> ${isFirstSnapshot ? 'first snapshot' : 'changed since last snapshot'} · pulled ${new Date().toISOString()}`)
lines.push(`> *Source:* ${url}`)
lines.push('')
lines.push(content.slice(0, 8000))
writeFileSync(batchPath, lines.join('\n'))

// Save the new snapshot
writeFileSync(snapshotPath, content)
console.log(`[url-scrape] snapshot updated → ${snapshotPath}`)

try {
  execSync(
    `node scripts/narrative-ingest.mjs "${batchPath}" --project ${project} --source-type ${sourceType}`,
    { stdio: 'inherit', cwd: ROOT }
  )
} catch (e) {
  console.warn(`[url-scrape] ingest failed:`, e.message)
}
