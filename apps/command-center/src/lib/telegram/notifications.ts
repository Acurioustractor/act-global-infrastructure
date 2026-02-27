import { Bot, InlineKeyboard } from 'grammy'
import { supabase } from '@/lib/supabase'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from '@/lib/timezone'
import type { TelegramAction } from '@/lib/events/types'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE NOTIFICATION SENDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getBotApi(): Bot['api'] {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured')
  // Create a lightweight Bot just for API calls (no handlers needed)
  const bot = new Bot(token)
  return bot.api
}

function getNotifyChatIds(): number[] {
  const raw = process.env.TELEGRAM_AUTHORIZED_USERS || ''
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))
}

export async function sendNotification(chatId: number, message: string): Promise<void> {
  const api = getBotApi()
  // Split long messages
  const chunks = splitNotification(message, 4000)
  for (const chunk of chunks) {
    await api.sendMessage(chatId, chunk)
  }
}

function splitNotification(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }
    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt < maxLength * 0.5) splitAt = remaining.lastIndexOf(' ', maxLength)
    if (splitAt < maxLength * 0.3) splitAt = maxLength
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }
  return chunks
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DAILY BRIEFING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendDailyBriefing(): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []

  const briefing = await buildDailyBriefing()

  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, briefing)
    } catch (err) {
      errors.push(`Chat ${chatId}: ${(err as Error).message}`)
    }
  }

  return { sent: chatIds.length - errors.length, errors }
}

async function buildDailyBriefing(): Promise<string> {
  const now = getBrisbaneNow()
  const today = getBrisbaneDate()
  const weekFromNow = getBrisbaneDateOffset(7)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [calendar, overdue, followUps, staleContacts, grants] = await Promise.all([
    // Today's calendar — all sources
    supabase
      .from('calendar_events')
      .select('title, start_time, end_time, location, is_all_day, sync_source, calendar_name, metadata, event_type')
      .gte('start_time', `${today}T00:00:00.000Z`)
      .lte('start_time', `${today}T23:59:59.999Z`)
      .order('start_time', { ascending: true }),

    // Overdue actions
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date')
      .eq('action_required', true)
      .lt('follow_up_date', today)
      .order('follow_up_date', { ascending: true })
      .limit(10),

    // Upcoming follow-ups (next 7 days)
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date')
      .eq('action_required', true)
      .gte('follow_up_date', today)
      .lte('follow_up_date', weekFromNow)
      .order('follow_up_date', { ascending: true })
      .limit(10),

    // Contacts needing follow-up
    supabase
      .from('ghl_contacts')
      .select('full_name, company_name, last_contact_date')
      .in('engagement_status', ['active', 'prospect'])
      .lt('last_contact_date', fourteenDaysAgo)
      .order('last_contact_date', { ascending: true })
      .limit(5),

    // Grants closing within 7 days
    supabase
      .from('grant_opportunities')
      .select('name, provider, closes_at, amount_max')
      .eq('status', 'open')
      .lte('closes_at', weekFromNow)
      .gte('closes_at', today)
      .order('closes_at', { ascending: true })
      .limit(5),
  ])

  const lines: string[] = []
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  lines.push(`Good morning! Here's your briefing for ${dayName}.\n`)

  // Calendar — grouped by time blocks with source badges
  const events = calendar.data || []
  if (events.length > 0) {
    lines.push(`YOUR SCHEDULE (${events.length} events)`)

    const allDay = events.filter((e: { is_all_day?: boolean }) => e.is_all_day)
    const timed = events.filter((e: { is_all_day?: boolean }) => !e.is_all_day)

    // Group timed events by time block
    const morning: typeof timed = []
    const afternoon: typeof timed = []
    const evening: typeof timed = []
    for (const e of timed) {
      const hour = new Date(e.start_time).getHours()
      if (hour < 12) morning.push(e)
      else if (hour < 17) afternoon.push(e)
      else evening.push(e)
    }

    const formatEvent = (e: typeof events[0]) => {
      const time = new Date(e.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
      const endTime = e.end_time ? new Date(e.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
      const timeStr = endTime && endTime !== time ? `${time}–${endTime}` : time
      const source = e.sync_source === 'notion' ? ' [Notion]' : (e.calendar_name && e.calendar_name !== 'Primary' ? ` [${e.calendar_name}]` : '')
      // Extract conference link from metadata
      let confLink = ''
      try {
        const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
        if (meta?.conferenceData?.entryPoints?.[0]?.uri) {
          confLink = ` (${meta.conferenceData.entryPoints[0].label || 'Join'})`
        }
      } catch { /* ignore */ }
      return `  ${timeStr}  ${e.title}${confLink}${e.location ? ` (${e.location})` : ''}${source}`
    }

    if (morning.length > 0) {
      lines.push('MORNING')
      for (const e of morning) lines.push(formatEvent(e))
    }
    if (afternoon.length > 0) {
      lines.push('AFTERNOON')
      for (const e of afternoon) lines.push(formatEvent(e))
    }
    if (evening.length > 0) {
      lines.push('EVENING')
      for (const e of evening) lines.push(formatEvent(e))
    }
    if (allDay.length > 0) {
      lines.push('ALL DAY')
      for (const e of allDay) {
        const source = e.sync_source === 'notion' ? ' [Notion]' : ''
        lines.push(`  ${e.title}${e.location ? ` — ${e.location}` : ''}${source}`)
      }
    }
    lines.push('')
  } else {
    lines.push('CALENDAR: No events today.\n')
  }

  // Overdue actions
  const overdueItems = overdue.data || []
  if (overdueItems.length > 0) {
    lines.push(`OVERDUE ACTIONS (${overdueItems.length})`)
    for (const item of overdueItems) {
      lines.push(`  [${item.project_code}] ${item.title} (due ${item.follow_up_date})`)
    }
    lines.push('')
  }

  // Upcoming follow-ups
  const upcomingItems = followUps.data || []
  if (upcomingItems.length > 0) {
    lines.push(`UPCOMING THIS WEEK (${upcomingItems.length})`)
    for (const item of upcomingItems) {
      lines.push(`  [${item.project_code}] ${item.title} (${item.follow_up_date})`)
    }
    lines.push('')
  }

  // Contacts needing attention
  const contacts = staleContacts.data || []
  if (contacts.length > 0) {
    lines.push(`CONTACTS NEEDING FOLLOW-UP (${contacts.length})`)
    for (const c of contacts) {
      const days = Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
      lines.push(`  ${c.full_name}${c.company_name ? ` (${c.company_name})` : ''} — ${days} days`)
    }
    lines.push('')
  }

  // Grants closing soon
  const grantItems = grants.data || []
  if (grantItems.length > 0) {
    lines.push(`GRANTS CLOSING SOON (${grantItems.length})`)
    for (const g of grantItems) {
      const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
      lines.push(`  ${g.name} — ${g.provider}${amount} — closes ${g.closes_at}`)
    }
    lines.push('')
  }

  // Intelligence insights
  const insightsSummary = await getInsightsSummary()
  if (insightsSummary) {
    lines.push(insightsSummary)
  }

  // Relationship decay alerts
  const relationshipAlerts = await getRelationshipAlerts()
  if (relationshipAlerts) {
    lines.push(relationshipAlerts)
  }

  // Sync health
  const syncHealth = await getSyncHealthSummary()
  if (syncHealth) {
    lines.push(syncHealth)
  }

  if (lines.length <= 2) {
    lines.push('All clear — nothing urgent today.')
  }

  return lines.join('\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANT MONITORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkGrantAlerts(): Promise<{ sent: number; alerts: string[] }> {
  const chatIds = getNotifyChatIds()
  const alerts: string[] = []
  const now = getBrisbaneNow()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekFromNow = getBrisbaneDateOffset(7)
  const today = getBrisbaneDate()

  // New grants discovered in last 24h
  const { data: newGrants } = await supabase
    .from('grant_opportunities')
    .select('name, provider, amount_max, closes_at, fit_score, aligned_projects')
    .gte('discovered_at', yesterday)
    .order('fit_score', { ascending: false })
    .limit(5)

  if (newGrants && newGrants.length > 0) {
    const lines = [`NEW GRANTS DISCOVERED (${newGrants.length})`]
    for (const g of newGrants) {
      const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
      const fit = g.fit_score ? ` — fit: ${g.fit_score}%` : ''
      const projects = (g.aligned_projects as string[] | null)?.length
        ? ` — ${(g.aligned_projects as string[]).join(', ')}`
        : ''
      const closes = g.closes_at ? ` — closes ${g.closes_at}` : ''
      lines.push(`  ${g.name} — ${g.provider}${amount}${fit}${projects}${closes}`)
    }
    alerts.push(lines.join('\n'))
  }

  // Grants closing within 7 days
  const { data: closingGrants } = await supabase
    .from('grant_opportunities')
    .select('name, provider, closes_at')
    .eq('status', 'open')
    .lte('closes_at', weekFromNow)
    .gte('closes_at', today)
    .order('closes_at', { ascending: true })

  if (closingGrants && closingGrants.length > 0) {
    const lines = [`GRANTS CLOSING THIS WEEK (${closingGrants.length})`]
    for (const g of closingGrants) {
      lines.push(`  ${g.name} — ${g.provider} — closes ${g.closes_at}`)
    }
    alerts.push(lines.join('\n'))
  }

  // Application status changes (check for recently updated applications)
  const { data: recentApps } = await supabase
    .from('grant_applications')
    .select('application_name, status, updated_at')
    .gte('updated_at', yesterday)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (recentApps && recentApps.length > 0) {
    const lines = [`GRANT APPLICATION UPDATES (${recentApps.length})`]
    for (const a of recentApps) {
      lines.push(`  ${a.application_name} — ${a.status}`)
    }
    alerts.push(lines.join('\n'))
  }

  if (alerts.length === 0) return { sent: 0, alerts: [] }

  const message = alerts.join('\n\n')
  let sent = 0
  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, message)
      sent++
    } catch (err) {
      console.error(`Grant alert to ${chatId}:`, (err as Error).message)
    }
  }

  return { sent, alerts }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FINANCE NUDGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkFinanceAlerts(): Promise<{ sent: number; alerts: string[] }> {
  const chatIds = getNotifyChatIds()
  const alerts: string[] = []
  const now = getBrisbaneNow()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  // Overdue invoices (receivables past due date)
  const today = getBrisbaneDate()
  const { data: overdueInvoices } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'SUBMITTED'])
    .gt('amount_due', 0)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(10)

  if (overdueInvoices && overdueInvoices.length > 0) {
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)
    const lines = [`OVERDUE INVOICES (${overdueInvoices.length}, $${totalOverdue.toLocaleString('en-AU', { minimumFractionDigits: 2 })})`]
    for (const inv of overdueInvoices) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
      lines.push(`  ${inv.contact_name || 'Unknown'} — $${Number(inv.amount_due).toLocaleString('en-AU', { minimumFractionDigits: 2 })} — ${daysOverdue}d overdue (${inv.invoice_number || ''})`)
    }
    alerts.push(lines.join('\n'))
  }

  // Pending receipts older than 7 days
  const { data: pendingReceipts } = await supabase
    .from('receipt_matches')
    .select('vendor_name, amount, transaction_date')
    .eq('status', 'pending')
    .lt('created_at', sevenDaysAgo)
    .order('transaction_date', { ascending: true })
    .limit(10)

  if (pendingReceipts && pendingReceipts.length > 0) {
    const total = pendingReceipts.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)
    const lines = [`RECEIPTS PENDING > 7 DAYS (${pendingReceipts.length}, $${total.toFixed(2)})`]
    for (const r of pendingReceipts) {
      lines.push(`  ${r.vendor_name || 'Unknown'} — $${Number(r.amount).toFixed(2)} (${r.transaction_date})`)
    }
    alerts.push(lines.join('\n'))
  }

  // Cashflow runway warning
  const { data: snapshots } = await supabase
    .from('financial_snapshots')
    .select('income, expenses, closing_balance')
    .order('month', { ascending: false })
    .limit(6)

  if (snapshots && snapshots.length >= 3) {
    const currentBalance = snapshots[0]?.closing_balance || 0
    let totalBurn = 0
    for (const s of snapshots) {
      const burn = (s.expenses || 0) - (s.income || 0)
      totalBurn += Math.max(0, burn)
    }
    const avgBurn = totalBurn / snapshots.length
    const runwayMonths = avgBurn > 0 ? currentBalance / avgBurn : Infinity

    if (runwayMonths < 3 && runwayMonths > 0) {
      const lines = [`CASHFLOW WARNING — ${runwayMonths.toFixed(1)} MONTHS RUNWAY`]
      lines.push(`  Balance: $${Number(currentBalance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`)
      lines.push(`  Avg monthly burn: $${Math.round(avgBurn).toLocaleString('en-AU')}`)
      if (runwayMonths < 1) {
        lines.push(`  CRITICAL: Less than 1 month of runway remaining`)
      }
      alerts.push(lines.join('\n'))
    }
  }

  if (alerts.length === 0) return { sent: 0, alerts: [] }

  const message = alerts.join('\n\n')
  let sent = 0
  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, message)
      sent++
    } catch (err) {
      console.error(`Finance alert to ${chatId}:`, (err as Error).message)
    }
  }

  return { sent, alerts }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENING REFLECTION PROMPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendReflectionPrompt(): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let sent = 0

  const today = getBrisbaneDate()

  for (const chatId of chatIds) {
    try {
      // Check if today's reflection already exists
      const { data } = await supabase
        .from('daily_reflections')
        .select('id')
        .eq('chat_id', chatId)
        .eq('reflection_date', today)
        .maybeSingle()

      if (data) continue // Already reflected today

      await sendNotification(
        chatId,
        "Time to reflect on today. Send me a voice note about your day \u2014 what you listened to, what surprised you, what you built, and what meaning you made. I'll weave it into your LCAA reflection.\n\nOr just say \"not tonight\" to skip."
      )
      sent++
    } catch (err) {
      errors.push(`Chat ${chatId}: ${(err as Error).message}`)
    }
  }

  return { sent, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REMINDER CHECKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkAndSendReminders(): Promise<{ sent: number; errors: string[] }> {
  const now = new Date()
  const errors: string[] = []
  let sent = 0

  // Get due reminders
  const { data: dueReminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('active', true)
    .lte('trigger_at', now.toISOString())
    .order('trigger_at', { ascending: true })

  if (error || !dueReminders || dueReminders.length === 0) {
    return { sent: 0, errors: error ? [error.message] : [] }
  }

  for (const reminder of dueReminders) {
    try {
      await sendNotification(reminder.chat_id, `Reminder: ${reminder.message}`)
      sent++

      if (reminder.recurring) {
        // Schedule next occurrence
        const nextTrigger = getNextTriggerTime(new Date(reminder.trigger_at), reminder.recurring)
        await supabase
          .from('reminders')
          .update({ trigger_at: nextTrigger.toISOString() })
          .eq('id', reminder.id)
      } else {
        // One-off — deactivate
        await supabase
          .from('reminders')
          .update({ active: false })
          .eq('id', reminder.id)
      }
    } catch (err) {
      errors.push(`Reminder ${reminder.id}: ${(err as Error).message}`)
    }
  }

  return { sent, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTELLIGENCE INSIGHTS SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getInsightsSummary(): Promise<string> {
  const { data: insights } = await supabase
    .from('intelligence_insights')
    .select('insight_type, title, description, priority')
    .eq('status', 'active')
    .in('priority', ['high', 'medium'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(8)

  if (!insights || insights.length === 0) return ''

  const highPriority = insights.filter((i) => i.priority === 'high')
  const medPriority = insights.filter((i) => i.priority === 'medium')

  const lines: string[] = []

  if (highPriority.length > 0) {
    lines.push(`INTELLIGENCE — HIGH PRIORITY (${highPriority.length})`)
    for (const i of highPriority) {
      lines.push(`  ${i.title}`)
      if (i.description) lines.push(`    ${i.description.substring(0, 100)}`)
    }
    lines.push('')
  }

  if (medPriority.length > 0) {
    lines.push(`INTELLIGENCE — INSIGHTS (${medPriority.length})`)
    for (const i of medPriority.slice(0, 5)) {
      lines.push(`  ${i.title}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RELATIONSHIP DECAY ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getRelationshipAlerts(): Promise<string> {
  const now = new Date()

  // Contacts awaiting response (inbound with no reply > 2 days)
  const { data: awaitingResponse } = await supabase
    .from('communications_history')
    .select('subject, ghl_contact_id, occurred_at, metadata')
    .eq('waiting_for_response', true)
    .eq('response_needed_by', 'us')
    .eq('direction', 'inbound')
    .lt('occurred_at', new Date(now.getTime() - 2 * 86400000).toISOString())
    .order('occurred_at', { ascending: true })
    .limit(5)

  // Contacts going cold — important tags past threshold
  const { data: coolingContacts } = await supabase
    .from('ghl_contacts')
    .select('full_name, tags, last_contact_date')
    .or('tags.cs.{"partner"},tags.cs.{"funder"},tags.cs.{"responsive"}')
    .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
    .not('full_name', 'is', null)
    .order('last_contact_date', { ascending: true })
    .limit(5)

  const lines: string[] = []

  if (awaitingResponse && awaitingResponse.length > 0) {
    lines.push(`AWAITING YOUR RESPONSE (${awaitingResponse.length})`)
    for (const email of awaitingResponse) {
      const from = email.metadata?.from || 'Unknown'
      const days = Math.floor((now.getTime() - new Date(email.occurred_at).getTime()) / 86400000)
      const subject = (email.subject || '(no subject)').substring(0, 50)
      lines.push(`  ${from.substring(0, 25)} — ${days}d — "${subject}"`)
    }
    lines.push('')
  }

  if (coolingContacts && coolingContacts.length > 0) {
    lines.push(`RELATIONSHIPS GOING COLD (${coolingContacts.length})`)
    for (const c of coolingContacts) {
      const days = Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
      const tags = (c.tags || []).slice(0, 2).join(', ')
      lines.push(`  ${c.full_name?.substring(0, 25)} — ${days}d — ${tags}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYNC HEALTH SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SyncCheck {
  label: string
  table: string
  column: string
  warnHours: number
  criticalHours: number
}

const SYNC_CHECKS: SyncCheck[] = [
  { label: 'GHL Contacts', table: 'ghl_contacts', column: 'updated_at', warnHours: 48, criticalHours: 168 },
  { label: 'Communications', table: 'communications_history', column: 'occurred_at', warnHours: 24, criticalHours: 72 },
  { label: 'GHL Opportunities', table: 'ghl_opportunities', column: 'updated_at', warnHours: 48, criticalHours: 168 },
  { label: 'Calendar', table: 'calendar_events', column: 'synced_at', warnHours: 72, criticalHours: 336 },
  { label: 'Knowledge', table: 'project_knowledge', column: 'recorded_at', warnHours: 48, criticalHours: 168 },
]

export async function getSyncHealthSummary(): Promise<string> {
  const stale: string[] = []
  const critical: string[] = []

  for (const check of SYNC_CHECKS) {
    const { data } = await supabase
      .from(check.table)
      .select(check.column)
      .order(check.column, { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) {
      critical.push(`${check.label}: NO DATA`)
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUpdate = new Date((data as any)[check.column])
    const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)

    if (hoursAgo >= check.criticalHours) {
      critical.push(`${check.label}: ${Math.floor(hoursAgo / 24)}d stale`)
    } else if (hoursAgo >= check.warnHours) {
      stale.push(`${check.label}: ${Math.floor(hoursAgo)}h since last update`)
    }
  }

  if (critical.length === 0 && stale.length === 0) return ''

  const lines: string[] = []
  if (critical.length > 0) {
    lines.push(`DATA SYNC — CRITICAL`)
    for (const c of critical) lines.push(`  ${c}`)
    lines.push('')
  }
  if (stale.length > 0) {
    lines.push(`DATA SYNC — STALE`)
    for (const s of stale) lines.push(`  ${s}`)
    lines.push('')
  }

  return lines.join('\n')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACTIVE NOTIFICATIONS (Event-driven)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send a reactive notification to all authorized users with optional inline action buttons.
 * Used by the event reactor for real-time push notifications.
 */
export async function sendReactiveNotification(
  message: string,
  actions?: TelegramAction[]
): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let sent = 0

  const api = getBotApi()

  // Build inline keyboard if actions provided
  let reply_markup: InlineKeyboard | undefined
  if (actions && actions.length > 0) {
    const keyboard = new InlineKeyboard()
    for (const action of actions) {
      keyboard.text(action.label, action.callback)
    }
    reply_markup = keyboard
  }

  for (const chatId of chatIds) {
    try {
      const chunks = splitNotification(message, 4000)
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1
        if (isLast && reply_markup) {
          await api.sendMessage(chatId, chunks[i], { reply_markup })
        } else {
          await api.sendMessage(chatId, chunks[i])
        }
      }
      sent++
    } catch (err) {
      errors.push(`Chat ${chatId}: ${(err as Error).message}`)
    }
  }

  return { sent, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getNextTriggerTime(current: Date, recurring: string): Date {
  const next = new Date(current)
  switch (recurring) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekday': {
      next.setDate(next.getDate() + 1)
      // Skip weekends
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1)
      }
      break
    }
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    default:
      next.setDate(next.getDate() + 1) // Fallback to daily
  }
  return next
}
