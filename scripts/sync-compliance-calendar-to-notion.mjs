#!/usr/bin/env node
/**
 * Sync compliance calendar → Notion. Outbound-only mirror.
 *
 * Reads thoughts/shared/data/compliance-calendar/<latest>.json and writes it
 * as a child block under the Notion page identified by NOTION_COMPLIANCE_PAGE_ID.
 *
 * If NOTION_COMPLIANCE_PAGE_ID is unset, prints setup instructions and exits 0
 * (so a missing env var doesn't break the daily cron chain).
 *
 * Strategy: clear the page's children, then write fresh blocks. Simple and safe
 * for a read-only page — but DON'T point this at any page you hand-curate.
 *
 * Usage:
 *   node scripts/sync-compliance-calendar-to-notion.mjs              # apply
 *   node scripts/sync-compliance-calendar-to-notion.mjs --dry-run    # print payload, don't write
 */

import { config as loadEnv } from 'dotenv'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
// override: true so the file values take precedence over any stale shell
// exports (e.g. an old NOTION_TOKEN from .envrc or zshrc).
loadEnv({ path: path.join(REPO, '.env.local'), override: true })
loadEnv({ path: path.join(REPO, '.env'), override: true })

const DRY_RUN = process.argv.includes('--dry-run')
const PAGE_ID = process.env.NOTION_COMPLIANCE_PAGE_ID
const NOTION_TOKEN = process.env.NOTION_TOKEN

const SNAPSHOT_DIR = path.join(REPO, 'thoughts', 'shared', 'data', 'compliance-calendar')

function readLatestSnapshot() {
  if (!existsSync(SNAPSHOT_DIR)) return null
  const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) return null
  return JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, files[files.length - 1]), 'utf8'))
}

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

async function notionFetch(path, init = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion ${path}: ${res.status} ${body.slice(0, 200)}`)
  }
  return res.json()
}

function severityEmoji(sev) {
  return { critical: '🔴', high: '🟠', medium: '🟡' }[sev] ?? '⚪'
}

function statusEmoji(status) {
  return { pending: '⏳', filed: '✓', overdue: '🔴', superseded: '—', waived: '—' }[status] ?? '?'
}

function buildBlocks(snap) {
  const blocks = []
  const today = new Date().toISOString().slice(0, 10)

  // Heading
  blocks.push({
    type: 'heading_1',
    heading_1: { rich_text: [{ type: 'text', text: { content: '📋 ACT Compliance Calendar' } }] },
  })
  blocks.push({
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: `Read-only mirror of wiki/finance/compliance-calendar.md. Refreshed ${today}. Source ledger lives in git — do not edit this Notion page.` },
          annotations: { italic: true, color: 'gray' },
        },
      ],
    },
  })

  // Counters
  const c = snap.counters
  blocks.push({
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji: '⚠️' },
      rich_text: [{
        type: 'text',
        text: { content: `${c.critical} critical · ${c.high} high · ${c.medium} medium · ${c.filed} filed` },
      }],
      color: c.critical > 0 ? 'red_background' : c.high > 0 ? 'orange_background' : 'gray_background',
    },
  })

  // Group by status: at-risk first, then upcoming, then filed
  const atRisk = snap.obligations.filter(o => o.at_risk)
  const upcoming = snap.obligations.filter(o => !o.at_risk && o.status === 'pending')
  const filed = snap.obligations.filter(o => o.status === 'filed')

  if (atRisk.length > 0) {
    blocks.push({
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🔥 At risk' } }] },
    })
    for (const o of atRisk) blocks.push(obligationBlock(o))
  }

  if (upcoming.length > 0) {
    blocks.push({
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📅 Upcoming' } }] },
    })
    for (const o of upcoming) blocks.push(obligationBlock(o))
  }

  if (filed.length > 0) {
    blocks.push({
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '✓ Filed' } }] },
    })
    for (const o of filed) blocks.push(obligationBlock(o))
  }

  return blocks
}

function obligationBlock(o) {
  const sev = severityEmoji(o.severity)
  const st = statusEmoji(o.status)
  const dueDate = o.due_date ?? '?'
  const dd = o.days_until_due
  const ddTag = dd == null ? '' : dd < 0 ? `(${Math.abs(dd)}d overdue)` : `(T-${dd}d)`
  const refundLine = o.expected_refund_aud ? ` · expected refund $${o.expected_refund_aud.toLocaleString()}` : ''

  return {
    type: 'paragraph',
    paragraph: {
      rich_text: [
        { type: 'text', text: { content: `${sev} ${st} ` } },
        { type: 'text', text: { content: o.title }, annotations: { bold: true } },
        { type: 'text', text: { content: ` · ${o.entity} · ${o.type}` }, annotations: { color: 'gray' } },
        { type: 'text', text: { content: `\n📅 due ${dueDate} ${ddTag}${refundLine}` }, annotations: { color: 'gray' } },
      ],
    },
  }
}

async function clearPageChildren(pageId) {
  let cursor
  const allBlockIds = []
  do {
    const res = await notionFetch(`/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`)
    for (const b of res.results) allBlockIds.push(b.id)
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  for (const id of allBlockIds) {
    await notionFetch(`/blocks/${id}`, { method: 'DELETE' })
  }
  return allBlockIds.length
}

async function appendBlocks(pageId, blocks) {
  // Notion appends max 100 children per request
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100)
    await notionFetch(`/blocks/${pageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: chunk }),
    })
  }
}

async function main() {
  if (!NOTION_TOKEN) {
    console.error('NOTION_TOKEN not set. Skipping.')
    process.exit(0)
  }
  if (!PAGE_ID) {
    console.error('NOTION_COMPLIANCE_PAGE_ID not set. To enable:')
    console.error('  1. Create a Notion page under the ACT Money Framework (titled e.g. "Compliance Calendar")')
    console.error('  2. Share it with your Notion integration')
    console.error('  3. Add `NOTION_COMPLIANCE_PAGE_ID=<page_id>` to .env.local')
    console.error('  4. Re-run this script')
    process.exit(0)
  }

  const snap = readLatestSnapshot()
  if (!snap) {
    console.error('No compliance snapshot found — run scripts/build-compliance-calendar.mjs first')
    process.exit(2)
  }

  const blocks = buildBlocks(snap)
  console.log(`Built ${blocks.length} Notion blocks from ${snap.obligations.length} obligations`)

  if (DRY_RUN) {
    console.log('DRY-RUN: payload preview (first 3 blocks):')
    console.log(JSON.stringify(blocks.slice(0, 3), null, 2))
    return
  }

  const cleared = await clearPageChildren(PAGE_ID)
  console.log(`Cleared ${cleared} existing blocks`)
  await appendBlocks(PAGE_ID, blocks)
  console.log(`Wrote ${blocks.length} blocks to Notion page ${PAGE_ID}`)
}

main().catch(e => { console.error(e); process.exit(1) })
