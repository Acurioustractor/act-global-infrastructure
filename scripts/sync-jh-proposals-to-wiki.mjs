#!/usr/bin/env node
/**
 * Reverse sync: JusticeHub/output/proposals/ → wiki/output/narrative-drafts/
 *
 * Treats every JH proposal document as a deployment snapshot. Each run writes
 * a dated copy into wiki/output/narrative-drafts/ so the wiki carries an
 * audit trail of what has actually been sent / packaged. This is what
 * autoreason reads as "past drafts" when judging new pitch iterations.
 *
 * Design
 * ------
 * - Snapshot filename: <YYYY-MM-DD>-jh-<slug>.md
 * - Idempotent per day: if today's snapshot already exists and content
 *   matches, skip. If content drifted since today's snapshot, overwrite
 *   today's file only.
 * - Never touches the canonical wiki/ articles — only the `output/` log.
 * - Auto-calls wiki-source-bridge to tag each snapshot with likely backlinks
 *   so autoreason's story-anchor pre-pass can surface them cleanly.
 *
 * Usage
 * -----
 *   node scripts/sync-jh-proposals-to-wiki.mjs              # dry-run
 *   node scripts/sync-jh-proposals-to-wiki.mjs --apply
 *   node scripts/sync-jh-proposals-to-wiki.mjs --since 2026-04-01  # only newer
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { inferConnectedPages } from './lib/wiki-source-bridge.mjs'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const JH_PROPOSALS_DIR = join(process.env.HOME, 'Code', 'JusticeHub', 'output', 'proposals')
const NARRATIVE_DRAFTS_DIR = join(REPO_ROOT, 'wiki', 'output', 'narrative-drafts')
const MANIFEST_DIR = join(REPO_ROOT, 'wiki', 'output', 'pitch-sync')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const SINCE = (() => {
  const i = args.indexOf('--since')
  return i >= 0 ? new Date(args[i + 1]) : null
})()

function today() {
  return new Date().toISOString().slice(0, 10)
}

function kebab(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function hashBody(s) {
  return createHash('sha256').update(s.trim()).digest('hex').slice(0, 12)
}

function buildSnapshot(jhFilename, jhText, jhMtime) {
  const backlinks = inferConnectedPages(jhText)
  const stamp = new Date().toISOString()
  const slug = kebab(jhFilename)
  const targetName = `${today()}-jh-${slug}.md`
  const hash = hashBody(jhText)

  const frontmatter = [
    '---',
    `title: "JH deployment snapshot — ${jhFilename.replace(/\.md$/, '')}"`,
    `source: jh-proposal-auto`,
    `source_path: "JusticeHub/output/proposals/${jhFilename}"`,
    `source_mtime: "${jhMtime.toISOString()}"`,
    `snapshot_date: "${today()}"`,
    `snapshot_hash: "${hash}"`,
    `synced_at: "${stamp}"`,
    '---',
    '',
  ].join('\n')

  const body = [
    `# JH deployment snapshot — ${jhFilename.replace(/\.md$/, '')}`,
    '',
    `> Snapshot of \`JusticeHub/output/proposals/${jhFilename}\` as deployed on ${today()}. Source-of-truth lives in the JH repo; canonical claim logic lives in \`wiki/projects/justicehub/\` and \`wiki/campaigns/\`.`,
    '',
    backlinks.length ? '## Backlinks\n\n' + backlinks.map((b) => `- ${b}`).join('\n') + '\n' : '',
    '## Contents',
    '',
    jhText.trim(),
    '',
  ].filter(Boolean).join('\n')

  return { targetName, content: frontmatter + body, hash }
}

async function main() {
  console.log('===== sync-jh-proposals-to-wiki =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  if (SINCE) console.log(`Only files mtime >= ${SINCE.toISOString()}`)

  if (!existsSync(JH_PROPOSALS_DIR)) {
    console.error(`[fatal] JH proposals dir not found: ${JH_PROPOSALS_DIR}`)
    process.exit(1)
  }

  const files = readdirSync(JH_PROPOSALS_DIR).filter((f) => f.endsWith('.md'))
  const decisions = { willWrite: [], refreshed: [], unchanged: [], filteredOut: 0 }

  for (const filename of files) {
    const abs = join(JH_PROPOSALS_DIR, filename)
    const stat = statSync(abs)
    if (SINCE && stat.mtime < SINCE) {
      decisions.filteredOut++
      continue
    }

    const text = readFileSync(abs, 'utf8')
    const { targetName, content, hash } = buildSnapshot(filename, text, stat.mtime)
    const target = join(NARRATIVE_DRAFTS_DIR, targetName)

    if (!existsSync(target)) {
      decisions.willWrite.push({ filename, targetName, target, content, hash })
    } else {
      const existing = readFileSync(target, 'utf8')
      const existingHashMatch = existing.match(/^snapshot_hash:\s*"?([^"\n]+)"?/m)
      if (existingHashMatch?.[1] === hash) {
        decisions.unchanged.push({ filename, targetName })
      } else {
        decisions.refreshed.push({ filename, targetName, target, content, hash })
      }
    }
  }

  console.log(`→ ${files.length} JH proposals scanned`)
  console.log('')
  console.log('===== Plan =====')
  console.log(`  new snapshots:   ${decisions.willWrite.length}`)
  console.log(`  refresh today's: ${decisions.refreshed.length}`)
  console.log(`  unchanged:       ${decisions.unchanged.length}`)
  console.log(`  filtered out:    ${decisions.filteredOut}`)

  if (VERBOSE) {
    for (const d of [...decisions.willWrite, ...decisions.refreshed]) {
      console.log(`  [write] ${d.targetName} ← ${d.filename}`)
    }
  }

  if (APPLY) {
    if (!existsSync(NARRATIVE_DRAFTS_DIR)) mkdirSync(NARRATIVE_DRAFTS_DIR, { recursive: true })
    console.log('')
    console.log('→ Writing snapshots…')
    for (const d of [...decisions.willWrite, ...decisions.refreshed]) {
      writeFileSync(d.target, d.content)
      console.log(`  ✓ ${d.targetName}`)
    }
  }

  // Manifest
  if (!existsSync(MANIFEST_DIR)) mkdirSync(MANIFEST_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const manifestPath = join(MANIFEST_DIR, `reverse-${stamp}.md`)
  const lines = [
    `# JH → wiki narrative-drafts sync — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    `Source: ${JH_PROPOSALS_DIR.replace(process.env.HOME, '~')}`,
    `Target: wiki/output/narrative-drafts/`,
    '',
    '## Counts',
    `- new: ${decisions.willWrite.length}`,
    `- refreshed: ${decisions.refreshed.length}`,
    `- unchanged: ${decisions.unchanged.length}`,
    `- filtered: ${decisions.filteredOut}`,
    '',
    '## Snapshots',
    '',
    ...[...decisions.willWrite, ...decisions.refreshed].map(
      (d) => `- [[${d.targetName.replace(/\.md$/, '')}]] ← ${d.filename}`,
    ),
    '',
  ].join('\n')

  if (APPLY) {
    writeFileSync(manifestPath, lines)
    console.log('')
    console.log(`✓ Manifest: ${manifestPath.replace(REPO_ROOT + '/', '')}`)
  } else {
    console.log('')
    console.log('  Re-run with --apply to write snapshots.')
  }
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  process.exit(1)
})
