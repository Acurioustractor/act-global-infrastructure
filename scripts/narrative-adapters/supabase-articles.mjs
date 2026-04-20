#!/usr/bin/env node
/**
 * supabase-articles adapter — pull published articles from the shared
 * Supabase instance, write each to a temp .md, and call narrative-ingest.
 *
 * Routes by tag/category to the right project narrative folder. The
 * tag → project map lives below; edit it as new projects are seeded.
 *
 * Schema (verified 2026-04-09 via information_schema):
 *   id, slug, title, excerpt, content, status, author_id, category,
 *   tags ARRAY, categories ARRAY, organization_id, is_contained,
 *   published_at, created_at, updated_at
 *
 * Usage:
 *   node scripts/narrative-adapters/supabase-articles.mjs [--since YYYY-MM-DD] [--project <slug>]
 *
 * Env required:
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const ROOT = process.cwd()
const TMP = join(tmpdir(), 'narrative-adapter-articles')
mkdirSync(TMP, { recursive: true })

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const since = flag('since')
const projectOverride = flag('project')

// Tag/category → narrative project folder
const ROUTING = {
  'contained': 'contained',
  'CONTAINED': 'contained',
  'youth-justice': 'contained',
  'justicehub': 'contained',
  'goods-on-country': 'goods-on-country',
  'goods': 'goods-on-country',
  'goods.': 'goods-on-country',
  'empathy-ledger': 'empathy-ledger',
  'empathy ledger': 'empathy-ledger',
}

function projectForArticle(article) {
  if (projectOverride) return projectOverride
  if (article.is_contained) return 'contained'
  const tags = [...(article.tags || []), ...(article.categories || []), article.category]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase())
  for (const t of tags) {
    if (ROUTING[t]) return ROUTING[t]
  }
  return 'unassigned'
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('[supabase-articles] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

let query = supabase
  .from('articles')
  .select('id, slug, title, excerpt, content, status, category, tags, categories, organization_id, is_contained, published_at, created_at, updated_at')
  .eq('status', 'published')
  .order('updated_at', { ascending: false })

if (since) {
  query = query.gte('updated_at', since)
}

const { data: articles, error } = await query.limit(200)

if (error) {
  console.error('[supabase-articles] query failed:', error.message)
  process.exit(1)
}

console.log(`[supabase-articles] ${articles?.length || 0} article(s) fetched (since=${since || 'all'})`)

if (!articles || articles.length === 0) process.exit(0)

// Group by project
const byProject = {}
for (const a of articles) {
  const proj = projectForArticle(a)
  ;(byProject[proj] = byProject[proj] || []).push(a)
}

for (const [project, items] of Object.entries(byProject)) {
  // Concatenate items into one batch file per project so the ingest digest
  // shows them together
  const batchPath = join(TMP, `${project}-articles-${Date.now()}.md`)
  const lines = []
  lines.push(`# Supabase articles batch — ${project}`)
  lines.push(`> ${items.length} articles · since ${since || 'beginning'} · pulled ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  for (const a of items) {
    lines.push('---')
    lines.push('')
    lines.push(`## ${a.title}`)
    lines.push('')
    lines.push(`*Slug:* \`${a.slug}\` · *Published:* ${a.published_at?.slice(0, 10) || '—'} · *Updated:* ${a.updated_at?.slice(0, 10) || '—'}`)
    lines.push(`*Tags:* ${(a.tags || []).join(', ') || '—'} · *Categories:* ${(a.categories || []).join(', ') || '—'}`)
    lines.push(`*Source:* supabase://articles/${a.id}`)
    lines.push('')
    if (a.excerpt) {
      lines.push(`> ${a.excerpt}`)
      lines.push('')
    }
    // Strip HTML if present, keep first 4000 chars (ingest only needs sentences with stats/quotes)
    const body = String(a.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000)
    lines.push(body)
    lines.push('')
  }
  writeFileSync(batchPath, lines.join('\n'))
  console.log(`[supabase-articles] wrote ${batchPath} (${items.length} articles for ${project})`)

  try {
    execSync(
      `node scripts/narrative-ingest.mjs "${batchPath}" --project ${project} --source-type website`,
      { stdio: 'inherit', cwd: ROOT }
    )
  } catch (e) {
    console.warn(`[supabase-articles] ingest failed for ${project}:`, e.message)
  }
}
