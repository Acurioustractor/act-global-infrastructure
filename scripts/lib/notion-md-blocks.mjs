/**
 * Markdown → Notion blocks converter, shared by every cockpit-style
 * sync-*-to-notion.mjs script. Strips YAML frontmatter, then walks
 * line-by-line emitting heading_1/2/3, quote, paragraph, bulleted_list_item,
 * and table blocks. Inline **bold** spans become rich-text annotations.
 *
 * Not a complete CommonMark renderer. Targets the shape that the cockpit
 * markdown files actually emit (four-lanes-today, money-status,
 * weekly-digest). Extend cautiously — tables are the only multi-line block
 * supported because everything else collapses to a single Notion block.
 */

export function rt(text, opts = {}) {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } }
  if (opts.link) r.text.link = { url: opts.link }
  if (opts.bold || opts.code) {
    r.annotations = {}
    if (opts.bold) r.annotations.bold = true
    if (opts.code) r.annotations.code = true
  }
  return r
}

export function mdInline(line) {
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(rt(line.slice(last, m.index)))
    out.push(rt(m[1], { bold: true }))
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(rt(line.slice(last)))
  return out.length ? out : [rt(line)]
}

function parseTableRow(line) {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim())
}

export function markdownToBlocks(md) {
  const body = md.replace(/^---\n[\s\S]*?\n---\n+/, '')
  const lines = body.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i++
      continue
    }

    // Tables
    if (line.startsWith('|') && i + 1 < lines.length && /^\|\s*[-:]/.test(lines[i + 1])) {
      const header = parseTableRow(line)
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      const tableBlock = {
        object: 'block',
        type: 'table',
        table: {
          table_width: header.length,
          has_column_header: true,
          has_row_header: false,
          children: [
            {
              object: 'block',
              type: 'table_row',
              table_row: { cells: header.map((c) => mdInline(c)) },
            },
            ...rows.map((r) => ({
              object: 'block',
              type: 'table_row',
              table_row: { cells: r.map((c) => mdInline(c)) },
            })),
          ],
        },
      }
      blocks.push(tableBlock)
      continue
    }

    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: mdInline(line.slice(2)) } })
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: mdInline(line.slice(3)) } })
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: mdInline(line.slice(4)) } })
    } else if (line.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: mdInline(line.slice(2)) } })
    } else if (/^\s*[-*]\s+/.test(line)) {
      const text = line.replace(/^\s*[-*]\s+/, '')
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: mdInline(text) } })
    } else if (/^---\s*$/.test(line)) {
      blocks.push({ object: 'block', type: 'divider', divider: {} })
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: mdInline(line) } })
    }
    i++
  }
  return blocks
}

export async function clearPage(notion, pageId, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  // Refuse to operate on a page that's already in trash — protects against
  // accidental restore-then-clear cycles.
  const page = await notion.pages.retrieve({ page_id: pageId })
  if (page.archived || page.in_trash) {
    throw new Error(`clearPage refused: page ${pageId} is archived/in_trash. Restore it before clearing.`)
  }

  let cursor
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 })
    for (const c of res.results) {
      // CRITICAL: never delete child_page or child_database blocks. Calling
      // blocks.delete on them archives the entire child page or database,
      // which cascades through all their descendants. This is the bug pattern
      // that took out 17 money-stack pages on 2026-05-06.
      if (c.type === 'child_page' || c.type === 'child_database') continue
      try {
        await notion.blocks.delete({ block_id: c.id })
        await sleep(80)
      } catch {
        // best-effort delete
      }
    }
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
}

export async function appendBlocks(notion, pageId, blocks, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 50) })
    await sleep(120)
  }
}
