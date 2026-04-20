import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename, join, relative } from 'path'

export function normalizeWikiPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.?\//, '')
}

export function walkMarkdown(dir, files = []) {
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walkMarkdown(full, files)
    else if (entry.endsWith('.md')) files.push(full)
  }

  return files
}

export function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {}

  const endIndex = content.indexOf('\n---\n', 4)
  if (endIndex === -1) return {}

  const data = {}
  for (const line of content.slice(4, endIndex).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }

  return data
}

export function buildSourcesIndexContent({
  wikiRoot,
  sourcesDir = join(wikiRoot, 'sources'),
  today = new Date().toISOString().slice(0, 10),
}) {
  const files = walkMarkdown(sourcesDir)
    .filter((file) => basename(file) !== 'index.md')
    .map((file) => {
      const content = readFileSync(file, 'utf8')
      const frontmatter = parseFrontmatter(content)
      const rel = normalizeWikiPath(relative(sourcesDir, file))
      const stem = basename(rel, '.md')
      const title = frontmatter.title || stem
      const summary = frontmatter.summary || 'Source summary.'
      const date = frontmatter.date || ''
      const rawSource = normalizeWikiPath(frontmatter.raw_source || '')
      const rawTarget = rawSource ? `[[../${rawSource.replace(/\.md$/i, '')}|raw]]` : '—'

      return { rel, stem, title, summary, date, rawTarget }
    })
    .sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '')
      if (dateCompare !== 0) return dateCompare
      return b.rel.localeCompare(a.rel)
    })

  const lines = [
    '---',
    'title: Sources Index',
    'status: Auto-maintained',
    'cluster: sources',
    `updated: ${today}`,
    '---',
    '',
    '# Sources',
    '',
    '> One summary per ingested raw file. The bridge between the immutable `raw/` folder and the curated wiki.',
    '',
    'When a document, transcript, export, or article is brought into the ACT knowledge loop, two things should happen:',
    '',
    '1. The original lands in [[../raw/index|wiki/raw/]] as immutable source material',
    '2. A bridge summary lands here in `sources/` so the wiki can trace what the source contains, why it matters, and which canonical pages it should inform',
    '',
    'This separation matters: `raw/` is the historical record, `sources/` is the processed layer the LLM and humans use to navigate. Concept and entity articles synthesize across sources; this folder keeps that synthesis accountable.',
    '',
    '## Source articles',
    '',
    '| Date | Source summary | Raw |',
    '|---|---|---|',
  ]

  for (const entry of files) {
    lines.push(`| ${entry.date || '—'} | [[${entry.stem}|${entry.title}]] — ${entry.summary} | ${entry.rawTarget} |`)
  }

  if (!files.length) {
    lines.push('| — | No source summaries yet | — |')
  }

  lines.push('')
  lines.push('## Backlinks')
  lines.push('')
  lines.push('- [[../raw/index|raw/]] — the immutable originals')
  lines.push('- [[../synthesis/index|synthesis/]] — answers built on top of sources')
  lines.push('- [[../concepts/llm-knowledge-base|LLM Knowledge Base pattern]] — why this folder exists')
  lines.push('- [[../technical/act-knowledge-ops-loop|ACT Knowledge Ops Loop]] — the operating rhythm that keeps raw -> sources -> wiki honest')
  lines.push('')

  return `${lines.join('\n')}\n`
}

export function writeSourcesIndex({ wikiRoot, sourcesIndexPath = join(wikiRoot, 'sources', 'index.md') }) {
  const content = buildSourcesIndexContent({ wikiRoot })
  writeFileSync(sourcesIndexPath, content, 'utf8')
  return content
}
