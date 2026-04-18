#!/usr/bin/env node
/**
 * Forward sync: wiki pitch surfaces → JusticeHub/output/proposals/
 *
 * Sources (canonical source-of-truth in the wiki):
 *   wiki/projects/justicehub/*.md
 *   wiki/campaigns/minderoo-pitch/*.md
 *   wiki/campaigns/judges-on-country/*.md
 *
 * Target:
 *   /Users/benknight/Code/JusticeHub/output/proposals/
 *
 * Guardrail
 * ---------
 * Hand-edited JH files (e.g. the Minderoo envelope spine Ben is finalising)
 * must NEVER be auto-overwritten. This script:
 *   - Writes only NEW files (target does not exist) when --apply is set
 *   - Emits a divergence report when wiki and JH have drifted on the same
 *     filename; leaves reconciliation to a human
 *   - Stamps every auto-written file with a `<!-- source-of-truth: wiki/... -->`
 *     header so drift is always visible
 *
 * Usage
 * -----
 *   node scripts/sync-wiki-pitches-to-jh.mjs                 # dry-run
 *   node scripts/sync-wiki-pitches-to-jh.mjs --apply         # write new files only
 *   node scripts/sync-wiki-pitches-to-jh.mjs --verbose
 *
 * Output
 * ------
 *   wiki/output/pitch-sync/<YYYY-MM-DD-HHMM>.md — manifest with divergence list
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const JH_ROOT = join(process.env.HOME, 'Code', 'JusticeHub')
const JH_PROPOSALS_DIR = join(JH_ROOT, 'output', 'proposals')
const MANIFEST_DIR = join(REPO_ROOT, 'wiki', 'output', 'pitch-sync')

const SOURCES = [
  { dir: 'wiki/projects/justicehub', includeAll: false, only: ['three-circles.md', 'the-brave-ones.md', 'staying.md', 'judges-on-country.md', 'minderoo-pitch-package.md'] },
  { dir: 'wiki/campaigns/minderoo-pitch', includeAll: true },
  { dir: 'wiki/campaigns/judges-on-country', includeAll: true },
]

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')

function hashBody(text) {
  const body = text.replace(/^<!--\s*source-of-truth[^\n]*-->\n?/m, '')
  return createHash('sha256').update(body.trim()).digest('hex').slice(0, 12)
}

function stampHeader(wikiRelPath, text) {
  const header = `<!-- source-of-truth: ${wikiRelPath} — do not hand-edit; edit the wiki file instead -->\n<!-- generated: ${new Date().toISOString()} -->\n\n`
  return header + text
}

function collectSources() {
  const files = []
  for (const s of SOURCES) {
    const abs = join(REPO_ROOT, s.dir)
    if (!existsSync(abs)) continue
    const entries = readdirSync(abs).filter((f) => f.endsWith('.md'))
    for (const f of entries) {
      if (!s.includeAll && !s.only?.includes(f)) continue
      if (f === 'README.md') continue
      files.push({ absPath: join(abs, f), relPath: `${s.dir}/${f}`, filename: f })
    }
  }
  return files
}

function targetFor(filename) {
  // Preserve filename as-is into JH/output/proposals/
  return join(JH_PROPOSALS_DIR, filename)
}

async function main() {
  console.log('===== sync-wiki-pitches-to-jh =====')
  console.log(`Mode: ${APPLY ? 'APPLY (writes new files only)' : 'DRY-RUN'}`)
  console.log(`Source: wiki pitch surfaces`)
  console.log(`Target: ${JH_PROPOSALS_DIR.replace(process.env.HOME, '~')}`)
  console.log('')

  if (!existsSync(JH_PROPOSALS_DIR)) {
    console.error(`[fatal] Target directory does not exist: ${JH_PROPOSALS_DIR}`)
    console.error('        Is the JusticeHub repo at the expected location?')
    process.exit(1)
  }

  const sources = collectSources()
  console.log(`→ ${sources.length} wiki files in scope`)

  const decisions = { willWrite: [], divergence: [], unchanged: [], stampedAlready: [] }

  for (const src of sources) {
    const target = targetFor(src.filename)
    const wikiText = readFileSync(src.absPath, 'utf8')

    if (!existsSync(target)) {
      decisions.willWrite.push({ src, target, wikiText })
      continue
    }

    const jhText = readFileSync(target, 'utf8')
    const hasStamp = /^<!--\s*source-of-truth/m.test(jhText)

    if (hasStamp) {
      // Auto-managed file — safe to refresh if content drifted
      const wikiHash = hashBody(wikiText)
      const jhHash = hashBody(jhText)
      if (wikiHash === jhHash) {
        decisions.unchanged.push({ src, target })
      } else {
        decisions.stampedAlready.push({ src, target, wikiText })
      }
    } else {
      // Hand-maintained — never overwrite. Report divergence instead.
      const wikiHash = hashBody(wikiText)
      const jhHash = hashBody(jhText)
      if (wikiHash !== jhHash) {
        decisions.divergence.push({ src, target, wikiHash, jhHash })
      } else {
        decisions.unchanged.push({ src, target })
      }
    }
  }

  console.log('')
  console.log('===== Plan =====')
  console.log(`  write new:            ${decisions.willWrite.length}`)
  console.log(`  refresh auto-managed: ${decisions.stampedAlready.length}`)
  console.log(`  unchanged:            ${decisions.unchanged.length}`)
  console.log(`  DIVERGENCE (hand):    ${decisions.divergence.length}`)

  if (decisions.divergence.length) {
    console.log('')
    console.log('  ⚠  Hand-edited JH files have drifted from wiki. Reconcile manually:')
    for (const d of decisions.divergence) {
      console.log(`     • ${d.src.filename}`)
      console.log(`         wiki: ${d.src.relPath} (hash ${d.wikiHash})`)
      console.log(`         jh:   output/proposals/${d.src.filename} (hash ${d.jhHash})`)
    }
  }

  if (VERBOSE) {
    for (const d of decisions.willWrite) console.log(`  [new] ${d.src.filename}`)
    for (const d of decisions.stampedAlready) console.log(`  [refresh] ${d.src.filename}`)
  }

  if (APPLY) {
    console.log('')
    console.log('→ Writing…')
    for (const d of [...decisions.willWrite, ...decisions.stampedAlready]) {
      const stamped = stampHeader(d.src.relPath, d.wikiText)
      writeFileSync(d.target, stamped)
      console.log(`  ✓ ${d.src.filename}`)
    }
  }

  // Manifest
  if (!existsSync(MANIFEST_DIR)) mkdirSync(MANIFEST_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const manifestPath = join(MANIFEST_DIR, `${stamp}.md`)
  const lines = [
    `# wiki → JH pitch sync — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    `Sources scanned: ${sources.length}`,
    '',
    '## Counts',
    `- write new: ${decisions.willWrite.length}`,
    `- refresh auto-managed: ${decisions.stampedAlready.length}`,
    `- unchanged: ${decisions.unchanged.length}`,
    `- divergence (hand-edited, not overwritten): ${decisions.divergence.length}`,
    '',
    '## Divergence (reconcile by hand)',
    '',
    ...decisions.divergence.map(
      (d) => `- **${d.src.filename}** — wiki hash ${d.wikiHash}, JH hash ${d.jhHash}\n    · canonical: ${d.src.relPath}\n    · deployed:  JusticeHub/output/proposals/${d.src.filename}`,
    ),
    '',
    '## Written',
    '',
    ...[...decisions.willWrite, ...decisions.stampedAlready].map(
      (d) => `- ${d.src.filename} ← ${d.src.relPath}`,
    ),
    '',
  ].join('\n')

  if (APPLY) {
    writeFileSync(manifestPath, lines)
    console.log('')
    console.log(`✓ Manifest: ${manifestPath.replace(REPO_ROOT + '/', '')}`)
  } else {
    console.log('')
    console.log(`(dry-run) manifest would be: ${manifestPath.replace(REPO_ROOT + '/', '')}`)
    console.log('  Re-run with --apply to write. Hand-edited JH files are never overwritten.')
  }
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  process.exit(1)
})
