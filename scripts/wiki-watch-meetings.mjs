#!/usr/bin/env node
/**
 * Wiki Meeting Watcher — pulls new project_knowledge meeting records into wiki/raw/.
 *
 * Reads a state file at wiki/raw/.last-meeting-sync to track the latest recorded_at
 * it has seen, then queries Supabase for meetings newer than that. New meetings
 * are written to wiki/raw/YYYY-MM-DD-meeting-<slug>.md for subsequent /wiki ingest.
 *
 * Skips ACT-MISC (ephemeral student-team meetings) and meetings shorter than 800 chars.
 *
 * Usage:
 *   node scripts/wiki-watch-meetings.mjs                 # incremental sync
 *   node scripts/wiki-watch-meetings.mjs --since 2026-03-01  # manual cutoff
 *   node scripts/wiki-watch-meetings.mjs --dry-run       # show what would be written
 *
 * Designed to run from cron or on a hook after meeting notes land in Supabase.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const RAW_DIR = join(process.cwd(), 'wiki', 'raw')
const STATE_FILE = join(RAW_DIR, '.last-meeting-sync')
const MIN_CONTENT_LEN = 800
const SKIP_PROJECT_CODES = new Set(['ACT-MISC'])

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const sinceArg = args.indexOf('--since') !== -1 ? args[args.indexOf('--since') + 1] : null

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

async function main() {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true })

  // Determine cutoff timestamp
  let since
  if (sinceArg) {
    since = new Date(sinceArg).toISOString()
  } else if (existsSync(STATE_FILE)) {
    since = readFileSync(STATE_FILE, 'utf8').trim()
  } else {
    // First run: only pull last 30 days
    since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  }

  console.error(`Looking for meetings recorded after: ${since}`)

  const { data: meetings, error } = await supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, recorded_at')
    .eq('knowledge_type', 'meeting')
    .gt('recorded_at', since)
    .order('recorded_at', { ascending: true })

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  if (!meetings || meetings.length === 0) {
    console.error('No new meetings found.')
    process.exit(0)
  }

  console.error(`Found ${meetings.length} meeting(s) since cutoff.`)

  let written = 0
  let skipped = 0
  let latestTimestamp = since

  for (const m of meetings) {
    if (m.recorded_at > latestTimestamp) latestTimestamp = m.recorded_at

    if (SKIP_PROJECT_CODES.has(m.project_code)) {
      skipped++
      continue
    }
    if (!m.content || m.content.length < MIN_CONTENT_LEN) {
      skipped++
      continue
    }

    const date = m.recorded_at.split('T')[0]
    const slug = slugify(m.title || 'untitled')
    const fname = `${date}-meeting-${slug}.md`
    const fpath = join(RAW_DIR, fname)

    const frontmatter = [
      '---',
      `source: Supabase project_knowledge id=${m.id}`,
      `title: ${JSON.stringify(m.title || '')}`,
      `project_code: ${m.project_code || 'unknown'}`,
      `recorded_at: ${m.recorded_at}`,
      `captured_at: ${new Date().toISOString().split('T')[0]}`,
      `captured_by: wiki-watch-meetings`,
      'knowledge_type: meeting',
      '---',
      '',
    ].join('\n')

    const body = frontmatter + m.content + '\n'

    if (dryRun) {
      console.error(`[dry-run] would write: ${fname} (${m.content.length} chars)`)
    } else {
      writeFileSync(fpath, body)
      console.error(`✓ ${fname}`)
    }
    written++
  }

  console.error(`\nDone. ${written} meeting(s) written, ${skipped} skipped.`)

  if (!dryRun && written > 0) {
    writeFileSync(STATE_FILE, latestTimestamp)
    console.error(`State updated: ${STATE_FILE} → ${latestTimestamp}`)
    console.error(`\nNext step: run \`/wiki ingest\` in Claude Code to compile these into wiki articles.`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
