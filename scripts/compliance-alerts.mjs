#!/usr/bin/env node
/**
 * Compliance alerts — daily Telegram nudge for obligations matching T-30/T-7/T-1.
 *
 * Reads the latest snapshot at thoughts/shared/data/compliance-calendar/.
 * Fires Telegram only when an obligation's days_until_due matches EXACTLY one
 * of its lead_times_days entries (so you don't get nagged every day).
 *
 * Cron: daily 7:30am AEST (PM2 entry in ecosystem.config.cjs).
 *
 * Usage:
 *   node scripts/compliance-alerts.mjs              # send if any matches
 *   node scripts/compliance-alerts.mjs --dry-run    # print message, don't send
 *   node scripts/compliance-alerts.mjs --force      # send even if no exact match (for testing)
 */

import { config as loadEnv } from 'dotenv'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendTelegram } from './lib/telegram.mjs'
import { alertHash, shouldSend, markSent } from './lib/telegram-dedup.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
loadEnv({ path: path.join(REPO, '.env.local') })
loadEnv({ path: path.join(REPO, '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

const SNAPSHOT_DIR = path.join(REPO, 'thoughts', 'shared', 'data', 'compliance-calendar')

function readLatestSnapshot() {
  if (!existsSync(SNAPSHOT_DIR)) return null
  const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) return null
  return JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, files[files.length - 1]), 'utf8'))
}

const SEV_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡' }

function formatObligation(o, leadTime) {
  const sev = SEV_EMOJI[o.severity] ?? '⚪'
  const tag = leadTime != null
    ? (leadTime === 1 ? `*[T-1 DUE TOMORROW]*` : `[T-${leadTime}]`)
    : `[${o.days_until_due ?? '?'}d]`
  const refundLine = o.expected_refund_aud ? `   💰 expected refund: $${o.expected_refund_aud.toLocaleString()}\n` : ''
  const moneyLine = o.monetary_value ? `   💵 value: $${Number(o.monetary_value).toLocaleString()}\n` : ''
  return `${sev} ${tag} *${o.title}*\n   📅 due ${o.due_date} · ${o.entity}\n${refundLine}${moneyLine}`
}

async function main() {
  const snap = readLatestSnapshot()
  if (!snap) {
    console.error('No compliance snapshot found — run `node scripts/build-compliance-calendar.mjs` first')
    process.exit(2)
  }

  // For each obligation, find the largest lead_time entry where days_until_due === entry.
  // (Largest because if both T-30 and T-7 match — they shouldn't on the same day —
  // we want the most actionable signal. In practice exactly one matches per day.)
  const matches = []
  for (const o of snap.obligations) {
    if (!o.lead_times_days || !o.severity) continue
    const dd = o.days_until_due
    if (dd == null) continue
    const matchingLead = o.lead_times_days.find(d => d === dd)
    if (matchingLead != null) matches.push({ o, leadTime: matchingLead })
    else if (dd < 0 && o.severity === 'critical') matches.push({ o, leadTime: null }) // overdue
  }

  if (matches.length === 0 && !FORCE) {
    console.log('No lead-time matches today — no Telegram sent.')
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const lines = [
    `📋 *Compliance alerts — ${today}*`,
    '',
  ]
  for (const { o, leadTime } of matches) {
    lines.push(formatObligation(o, leadTime))
  }
  if (matches.length === 0 && FORCE) {
    lines.push('_No matches today — forced send for testing._')
  }
  lines.push('')
  lines.push('📖 Full calendar: https://github.com/Acurioustractor/act-global-infrastructure/blob/main/wiki/finance/compliance-calendar.md')
  lines.push('🎯 Operate: https://command.act.place/finance/command')

  const message = lines.join('\n')
  console.log(message)
  console.log('')

  if (DRY_RUN) {
    console.log('--- DRY-RUN — Telegram NOT sent ---')
    return
  }

  // Dedup: only push if the set of matching deadlines + lead-times changed
  // since last send. Same set of T-30/-7/-1 hits = no re-ping.
  const hash = alertHash(matches.map(m => `${m.title}@${m.leadTime || ''}`))
  if (!await shouldSend('compliance-deadlines', hash, { ttlHours: 24 })) {
    console.log('✓ Suppressed (same deadlines as last send)')
    return
  }

  const { snoozeButtons } = await import('./lib/telegram-dedup.mjs')
  const { buildInlineKeyboard } = await import('./lib/telegram.mjs')
  const ok = await sendTelegram(message, { replyMarkup: buildInlineKeyboard(snoozeButtons('compliance-deadlines')) })
  if (ok) markSent('compliance-deadlines', hash)
  console.log(ok ? '✓ Sent' : '✗ Telegram send failed (check env)')
}

main().catch(e => { console.error(e); process.exit(1) })
