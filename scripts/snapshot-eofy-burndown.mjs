#!/usr/bin/env node
/**
 * Daily EOFY burndown maintenance + countdown push.
 *
 * Reads the Notion "EOFY Setup Tracker" and:
 *   1. Stamps a Done date (today) on any task that is Status=Done but has no
 *      Done date — so the /eofy burndown's "actual" line stays accurate even
 *      if someone forgets to set the date when ticking a task off.
 *   2. Pushes a one-line countdown to Telegram (open / P0 / overdue / % done).
 *
 * The burndown chart itself derives from Done dates read live by /api/eofy —
 * this script is the safety net + the daily nudge, not the data store.
 *
 * Usage:
 *   node scripts/snapshot-eofy-burndown.mjs --dry-run   # print, don't write or push
 *   node scripts/snapshot-eofy-burndown.mjs             # stamp Done dates + Telegram push
 *
 * Env: NOTION_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USERS (first = chat id).
 * Needs the Notion integration connected to the EOFY DB (else it no-ops with a note).
 */

import { Client } from '@notionhq/client'
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
loadEnv({ path: path.join(REPO, '.env.local') })
loadEnv({ path: path.join(REPO, '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const CUTOVER = '2026-06-30'
const MS_PER_DAY = 1000 * 60 * 60 * 24

const token = process.env.NOTION_TOKEN
if (!token) {
  console.error('✗ NOTION_TOKEN not set')
  process.exit(1)
}
const ids = JSON.parse(readFileSync(path.join(REPO, 'config', 'notion-database-ids.json'), 'utf-8'))
const dataSourceId = ids.eofyTrackerDataSource
if (!dataSourceId) {
  console.error('✗ eofyTrackerDataSource not in config/notion-database-ids.json')
  process.exit(1)
}

const notion = new Client({ auth: token })
const today = new Date().toISOString().slice(0, 10)

function getText(prop) {
  if (!prop) return ''
  if (prop.type === 'title') return (prop.title ?? []).map((t) => t.plain_text ?? '').join('')
  if (prop.type === 'select') return prop.select?.name ?? ''
  return ''
}
function getDate(prop) {
  if (!prop || prop.type !== 'date') return null
  return prop.date?.start ?? null
}

async function sendTelegram(text) {
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
  const chat = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim()
  if (!tgToken || !chat) {
    console.log('TELEGRAM creds not set — printing only:\n' + text)
    return
  }
  const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'Markdown' }),
  })
  if (!res.ok) console.error('✗ Telegram send failed:', res.status, await res.text())
}

async function main() {
  let rows = []
  try {
    let cursor
    let pages = 0
    do {
      const res = await notion.dataSources.query({ data_source_id: dataSourceId, page_size: 100, start_cursor: cursor })
      rows = rows.concat(res.results)
      cursor = res.has_more ? res.next_cursor ?? undefined : undefined
      if (++pages > 20) break
    } while (cursor)
  } catch (err) {
    const code = err?.code ?? err?.body?.code
    if (code === 'object_not_found') {
      console.log('⚠ EOFY DB not shared with this Notion integration yet — no-op. Connect it in Notion → ••• → Connections.')
      process.exit(0)
    }
    throw err
  }

  const now = Date.now()
  const tasks = rows.map((p) => {
    const props = p.properties ?? {}
    const status = getText(props.Status)
    const due = getDate(props.Due)
    return {
      id: p.id,
      task: getText(props.Task),
      status,
      priority: getText(props.Priority) || 'P2',
      done: status === 'Done',
      doneDate: getDate(props['Done date']),
      due,
      overdue: status !== 'Done' && due != null && new Date(due + 'T23:59:59Z').getTime() < now,
    }
  })

  // 1. Backfill Done dates.
  const needStamp = tasks.filter((t) => t.done && !t.doneDate)
  for (const t of needStamp) {
    if (DRY_RUN) {
      console.log(`  would stamp Done date ${today} → ${t.task}`)
      continue
    }
    await notion.pages.update({ page_id: t.id, properties: { 'Done date': { date: { start: today } } } })
    console.log(`  ✓ stamped Done date → ${t.task}`)
  }

  // 2. Countdown line.
  const total = tasks.length
  const done = tasks.filter((t) => t.done).length
  const open = total - done
  const p0open = tasks.filter((t) => !t.done && t.priority === 'P0').length
  const overdue = tasks.filter((t) => t.overdue).length
  const pct = total ? Math.round((done / total) * 100) : 0
  const daysToCutover = Math.ceil((new Date(CUTOVER + 'T23:59:59Z').getTime() - now) / MS_PER_DAY)

  const msg =
    `🗓 *EOFY cutover* — ${daysToCutover}d to 30 June\n` +
    `${open} open · ${p0open} P0 · ${overdue} overdue · ${done}/${total} done (${pct}%)\n` +
    `command.act.place/eofy`

  if (DRY_RUN) {
    console.log(`\nDRY RUN — would stamp ${needStamp.length} Done dates and push:\n${msg}`)
    return
  }
  await sendTelegram(msg)
  console.log(`\nDone. Stamped ${needStamp.length} Done dates, pushed countdown (${daysToCutover}d, ${pct}% done).`)
}

main().catch((err) => {
  console.error('✗ snapshot failed:', err.body ?? err.message ?? err)
  process.exit(1)
})
