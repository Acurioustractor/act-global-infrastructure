/**
 * Webhook: GrantScope Stage Change → Notion Sync + Telegram Alert
 *
 * Called by a Supabase database trigger on grant_opportunities.pipeline_stage changes.
 * Receives the grant data in the payload and:
 *   1. Creates or updates the grant page in Notion's Grant Pipeline Tracker
 *   2. Sends a Telegram notification about the stage change
 *
 * Supabase trigger payload shape (pg_net http_post):
 *   { type: 'stage_change', grant_id, old_stage, new_stage, grant_name, provider, amount_max, closes_at }
 */

import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Bot } from 'grammy'

export const maxDuration = 30

// ── Stage mapping (mirrors sync-grantscope-to-notion.mjs) ───────────

const STAGE_MAP: Record<string, string> = {
  discovered: 'Discovered',
  researching: 'Researching',
  pursuing: 'Pursuing',
  drafting: 'Drafting',
  submitted: 'Submitted',
  awarded: 'Awarded',
  declined: 'Declined',
  archived: 'Archived',
}

const ACTIVE_STAGES = ['researching', 'pursuing', 'drafting', 'submitted']

// ── Load Notion DB IDs ──────────────────────────────────────────────

let grantPipelineDb: string
try {
  const configPath = join(process.cwd(), 'config', 'notion-database-ids.json')
  const dbIds = JSON.parse(readFileSync(configPath, 'utf8'))
  grantPipelineDb = dbIds.grantPipeline
} catch {
  // Fallback — hardcoded from config
  grantPipelineDb = '2784ae13-61ba-4bbf-bb62-10c42c0553ee'
}

// ── Helpers ──────────────────────────────────────────────────────────

function getNotion(): Client | null {
  const token = process.env.NOTION_TOKEN
  if (!token) return null
  return new Client({ auth: token })
}

function getTelegramApi() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  return new Bot(token).api
}

function getNotifyChatIds(): number[] {
  const raw = process.env.TELEGRAM_AUTHORIZED_USERS || ''
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
}

interface StageChangePayload {
  type: 'stage_change'
  grant_id: string
  old_stage: string
  new_stage: string
  grant_name: string
  provider?: string
  amount_max?: number
  closes_at?: string
}

// ── Main handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization')
  const expectedSecret = (process.env.CRON_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: StageChangePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.type !== 'stage_change' || !payload.grant_id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { grant_id, old_stage, new_stage, grant_name, provider, amount_max, closes_at } = payload
  const results: Record<string, unknown> = { grant_id, old_stage, new_stage }

  // 1. Sync to Notion if new stage is active
  const notion = getNotion()
  if (notion && ACTIVE_STAGES.includes(new_stage)) {
    try {
      // Search for existing page by GrantScope ID in Notes field
      const searchResult = await (notion.databases as any).query({
        database_id: grantPipelineDb,
        filter: {
          property: 'Notes',
          rich_text: { contains: `[gs:${grant_id}]` },
        },
        page_size: 1,
      })

      const notionStage = STAGE_MAP[new_stage] || 'Researching'

      if (searchResult.results.length > 0) {
        // Update existing page stage
        await notion.pages.update({
          page_id: searchResult.results[0].id,
          properties: {
            Stage: { select: { name: notionStage } },
          },
        })
        results.notion = 'updated'
      } else {
        // Create new page (minimal — full sync will enrich later)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const props: Record<string, any> = {
          'Grant Name': {
            title: [{ text: { content: (grant_name || 'Untitled Grant').slice(0, 2000) } }],
          },
          Stage: { select: { name: notionStage } },
          Type: { select: { name: 'Grant' } },
          Notes: {
            rich_text: [{ text: { content: `[gs:${grant_id}]` } }],
          },
        }
        if (provider) {
          props['Funder'] = { rich_text: [{ text: { content: provider.slice(0, 2000) } }] }
        }
        if (amount_max) {
          props['Amount'] = { number: amount_max }
        }
        if (closes_at) {
          props['Deadline'] = { date: { start: closes_at.split('T')[0] } }
        }

        await notion.pages.create({
          parent: { database_id: grantPipelineDb },
          properties: props,
        })
        results.notion = 'created'
      }
    } catch (err) {
      results.notion_error = (err as Error).message
    }
  } else if (!ACTIVE_STAGES.includes(new_stage)) {
    // Archive the Notion page if stage moved to inactive
    if (notion) {
      try {
        const searchResult = await (notion.databases as any).query({
          database_id: grantPipelineDb,
          filter: {
            property: 'Notes',
            rich_text: { contains: `[gs:${grant_id}]` },
          },
          page_size: 1,
        })
        if (searchResult.results.length > 0) {
          const notionStage = STAGE_MAP[new_stage]
          if (notionStage) {
            await notion.pages.update({
              page_id: searchResult.results[0].id,
              properties: {
                Stage: { select: { name: notionStage } },
              },
            })
          }
          results.notion = 'stage_updated_to_inactive'
        }
      } catch (err) {
        results.notion_error = (err as Error).message
      }
    }
  }

  // 2. Send Telegram notification
  const api = getTelegramApi()
  const chatIds = getNotifyChatIds()
  if (api && chatIds.length > 0) {
    const amt = amount_max ? ` $${Number(amount_max).toLocaleString()}` : ''
    const deadline = closes_at || 'no deadline'
    const arrow = `${old_stage || '?'} → ${new_stage}`
    const msg = `🔄 GRANT STAGE CHANGE\n\n${grant_name}${amt}\n${provider || 'Unknown funder'} (${deadline})\n${arrow}`

    for (const chatId of chatIds) {
      try {
        await api.sendMessage(chatId, msg)
      } catch (err) {
        results.telegram_error = (err as Error).message
      }
    }
    results.telegram = 'sent'
  }

  return NextResponse.json({ ok: true, ...results })
}
