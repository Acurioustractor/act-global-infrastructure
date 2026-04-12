#!/usr/bin/env node
/**
 * Wiki Search Indexer — populate wiki_search_index for hybrid search.
 *
 * Reads all canonical wiki articles, generates embeddings via OpenAI,
 * and upserts into Supabase. Supports incremental (default) and full reindex.
 *
 * Usage:
 *   node scripts/wiki-index-search.mjs          # incremental (changed files only)
 *   node scripts/wiki-index-search.mjs --full   # reindex everything
 *   node scripts/wiki-index-search.mjs --dry    # show what would be indexed
 */

import '../lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import {
  CANONICAL_GRAPH_DIRS,
  WALK_SKIP_DIRS,
  isCanonicalGraphFile,
} from './lib/wiki-scope.mjs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const WIKI_ROOT = join(process.cwd(), 'wiki')

const args = process.argv.slice(2)
const FULL_REINDEX = args.includes('--full')
const DRY_RUN = args.includes('--dry')

if (!SUPABASE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
if (!OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---- Markdown helpers ---------------------------------------------------

function walkMarkdown(dir, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return files
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (WALK_SKIP_DIRS.has(entry)) continue
      walkMarkdown(full, files)
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue
    frontmatter[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '')
  }
  return { frontmatter, body: match[2] }
}

function extractTitle(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

function parseList(val) {
  if (!val) return []
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

// ---- Collect articles ---------------------------------------------------

function collectArticles() {
  const articles = []

  // Index page
  const indexPath = join(WIKI_ROOT, 'index.md')
  try {
    const raw = readFileSync(indexPath, 'utf8')
    const { frontmatter, body } = parseFrontmatter(raw)
    articles.push({
      articlePath: 'index',
      title: extractTitle(body, 'ACT Wikipedia'),
      sectionId: 'overview',
      aliases: parseList(frontmatter.aliases),
      tags: parseList(frontmatter.tags),
      body,
      mtime: statSync(indexPath).mtimeMs,
    })
  } catch { /* no index */ }

  // Canonical graph sections
  for (const sectionId of CANONICAL_GRAPH_DIRS) {
    const sectionDir = join(WIKI_ROOT, sectionId)
    for (const file of walkMarkdown(sectionDir)) {
      const relPath = relative(WIKI_ROOT, file).replaceAll('\\', '/')
      if (!isCanonicalGraphFile(relPath)) continue

      const raw = readFileSync(file, 'utf8')
      const { frontmatter, body } = parseFrontmatter(raw)

      // Derive article_path (matches wiki-files.ts logic)
      let articlePath = relPath.replace(/\.md$/, '')
      if (articlePath.endsWith('/index')) articlePath = articlePath.slice(0, -'/index'.length)
      const parts = articlePath.split('/')
      if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) {
        articlePath = parts.slice(0, -1).join('/')
      }

      articles.push({
        articlePath,
        title: extractTitle(body, articlePath),
        sectionId,
        aliases: parseList(frontmatter.aliases),
        tags: parseList(frontmatter.tags),
        body,
        mtime: statSync(file).mtimeMs,
      })
    }
  }

  return articles
}

// ---- Embeddings ---------------------------------------------------------

async function generateEmbeddings(texts) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.slice(0, 8000)),
      dimensions: 384,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI embeddings failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.data.map(d => d.embedding)
}

// ---- Main ---------------------------------------------------------------

async function main() {
  const articles = collectArticles()
  console.log(`Found ${articles.length} canonical articles`)

  // Get existing indexed_at timestamps for incremental mode
  let existingIndex = new Map()
  if (!FULL_REINDEX) {
    const { data } = await supabase
      .from('wiki_search_index')
      .select('article_path, indexed_at')
    if (data) {
      for (const row of data) {
        existingIndex.set(row.article_path, new Date(row.indexed_at).getTime())
      }
    }
  }

  // Filter to changed articles (incremental mode)
  const toIndex = FULL_REINDEX
    ? articles
    : articles.filter(a => {
        const existingTs = existingIndex.get(a.articlePath)
        return !existingTs || a.mtime > existingTs
      })

  console.log(`${toIndex.length} articles need (re)indexing${FULL_REINDEX ? ' (full)' : ''}`)

  if (DRY_RUN) {
    for (const a of toIndex) console.log(`  ${a.articlePath}`)
    return
  }

  if (toIndex.length === 0) {
    // Still clean up stale entries
    await cleanupStale(articles)
    console.log('Done — nothing to index')
    return
  }

  // Generate embeddings in batches of 25
  const BATCH_SIZE = 25
  let indexed = 0
  let errors = 0

  for (let i = 0; i < toIndex.length; i += BATCH_SIZE) {
    const batch = toIndex.slice(i, i + BATCH_SIZE)
    const embeddingTexts = batch.map(a => `${a.title}\n\n${a.body}`)

    let embeddings
    try {
      embeddings = await generateEmbeddings(embeddingTexts)
    } catch (err) {
      console.error(`Embedding batch ${i / BATCH_SIZE + 1} failed:`, err.message)
      errors += batch.length
      continue
    }

    // Upsert each article
    for (let j = 0; j < batch.length; j++) {
      const a = batch[j]
      const { error } = await supabase
        .from('wiki_search_index')
        .upsert({
          article_path: a.articlePath,
          title: a.title,
          section_id: a.sectionId,
          aliases: a.aliases,
          tags: a.tags,
          body: a.body,
          embedding: embeddings[j],
          indexed_at: new Date().toISOString(),
        }, { onConflict: 'article_path' })

      if (error) {
        console.error(`  Error indexing ${a.articlePath}:`, error.message)
        errors++
      } else {
        indexed++
      }
    }

    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} articles embedded`)
  }

  await cleanupStale(articles)

  console.log(`\nDone: ${indexed} indexed, ${errors} errors`)
}

async function cleanupStale(articles) {
  const validPaths = new Set(articles.map(a => a.articlePath))
  const { data: existing } = await supabase
    .from('wiki_search_index')
    .select('article_path')

  if (!existing) return

  const stale = existing.filter(r => !validPaths.has(r.article_path))
  if (stale.length === 0) return

  for (const row of stale) {
    await supabase.from('wiki_search_index').delete().eq('article_path', row.article_path)
  }
  console.log(`Cleaned up ${stale.length} stale entries`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
