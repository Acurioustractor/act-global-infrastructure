#!/usr/bin/env node
/**
 * Phase 1: Ingest published Supabase articles into wiki/raw/
 *
 * Naming: {created_date}-article-{slug}.md
 * Includes frontmatter with metadata for traceability.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RAW_DIR = join(process.cwd(), 'wiki', 'raw')

async function main() {
  // Ensure directory exists
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true })

  // Fetch all published articles
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, content, status, author_id, created_at, updated_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch articles:', error.message)
    process.exit(1)
  }

  console.log(`Found ${articles.length} published articles`)

  let written = 0
  let skipped = 0

  for (const article of articles) {
    const createdDate = article.created_at.slice(0, 10) // YYYY-MM-DD
    const filename = `${createdDate}-article-${article.slug}.md`
    const filepath = join(RAW_DIR, filename)

    // Skip if already exists (immutable raw sources)
    if (existsSync(filepath)) {
      skipped++
      continue
    }

    const frontmatter = [
      '---',
      `title: "${article.title.replace(/"/g, '\\"')}"`,
      `slug: ${article.slug}`,
      `source: supabase/articles`,
      `source_id: ${article.id}`,
      `status: ${article.status}`,
      `created: ${createdDate}`,
      `updated: ${article.updated_at?.slice(0, 10) || createdDate}`,
      `ingested: ${new Date().toISOString().slice(0, 10)}`,
      '---',
    ].join('\n')

    const content = `${frontmatter}\n\n# ${article.title}\n\n${article.content || ''}\n`

    writeFileSync(filepath, content, 'utf-8')
    written++
    console.log(`  ✓ ${filename} (${(article.content?.length || 0).toLocaleString()} chars)`)
  }

  console.log(`\nDone: ${written} written, ${skipped} skipped (already exist)`)
  console.log(`Total in wiki/raw/: ${written + skipped + 7} files (including prior sources)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
