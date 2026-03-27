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
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [
    calendar, overdue, followUps, staleContacts, grantsClosing,
    newGrants, grantApps, overdueInvoices, pendingReceipts, snapshots,
  ] = await Promise.all([
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

    // Contacts needing follow-up (capped at 3)
    supabase
      .from('ghl_contacts')
      .select('full_name, company_name, last_contact_date')
      .in('engagement_status', ['active', 'prospect'])
      .lt('last_contact_date', fourteenDaysAgo)
      .order('last_contact_date', { ascending: true })
      .limit(3),

    // Grants closing within 7 days
    supabase
      .from('grant_opportunities')
      .select('name, provider, closes_at, amount_max')
      .eq('status', 'open')
      .lte('closes_at', weekFromNow)
      .gte('closes_at', today)
      .order('closes_at', { ascending: true })
      .limit(5),

    // New grants discovered in last 24h (for consolidated grant alerts)
    supabase
      .from('grant_opportunities')
      .select('name, provider, amount_max, closes_at, fit_score, aligned_projects')
      .gte('discovered_at', yesterday)
      .order('fit_score', { ascending: false })
      .limit(5),

    // Grant application status changes in last 24h
    supabase
      .from('grant_applications')
      .select('application_name, status, updated_at')
      .gte('updated_at', yesterday)
      .order('updated_at', { ascending: false })
      .limit(5),

    // Overdue invoices (for consolidated finance alerts)
    supabase
      .from('xero_invoices')
      .select('invoice_number, contact_name, amount_due, due_date')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SUBMITTED'])
      .gt('amount_due', 0)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(10),

    // Pending receipts older than 7 days
    supabase
      .from('receipt_matches')
      .select('vendor_name, amount, transaction_date')
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo)
      .order('transaction_date', { ascending: true })
      .limit(10),

    // Cashflow snapshots
    supabase
      .from('financial_snapshots')
      .select('income, expenses, closing_balance')
      .order('month', { ascending: false })
      .limit(6),
  ])

  const sections: string[] = []

  // Collect summary counts for header
  const events = calendar.data || []
  const overdueItems = overdue.data || []
  const grantItems = grantsClosing.data || []
  const newGrantItems = newGrants.data || []
  const invoiceItems = overdueInvoices.data || []

  // Summary header
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const summaryParts: string[] = []
  if (events.length > 0) summaryParts.push(`${events.length} events`)
  if (overdueItems.length > 0) summaryParts.push(`${overdueItems.length} overdue`)
  if (grantItems.length > 0) summaryParts.push(`${grantItems.length} grant${grantItems.length === 1 ? '' : 's'} closing`)
  if (invoiceItems.length > 0) summaryParts.push(`${invoiceItems.length} overdue invoice${invoiceItems.length === 1 ? '' : 's'}`)

  const summaryLine = summaryParts.length > 0 ? summaryParts.join(' | ') : 'All clear'
  sections.push(`Good morning! ${dayName}\n${summaryLine}`)

  // Calendar — grouped by time blocks with source badges
  if (events.length > 0) {
    const calLines: string[] = [`YOUR SCHEDULE (${events.length})`]

    const allDay = events.filter((e: { is_all_day?: boolean }) => e.is_all_day)
    const timed = events.filter((e: { is_all_day?: boolean }) => !e.is_all_day)

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
      let confLink = ''
      try {
        const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
        if (meta?.conferenceData?.entryPoints?.[0]?.uri) {
          confLink = ` (${meta.conferenceData.entryPoints[0].label || 'Join'})`
        }
      } catch { /* ignore */ }
      return `  ${timeStr}  ${e.title}${confLink}${e.location ? ` (${e.location})` : ''}${source}`
    }

    if (morning.length > 0) { calLines.push('MORNING'); for (const e of morning) calLines.push(formatEvent(e)) }
    if (afternoon.length > 0) { calLines.push('AFTERNOON'); for (const e of afternoon) calLines.push(formatEvent(e)) }
    if (evening.length > 0) { calLines.push('EVENING'); for (const e of evening) calLines.push(formatEvent(e)) }
    if (allDay.length > 0) {
      calLines.push('ALL DAY')
      for (const e of allDay) {
        const source = e.sync_source === 'notion' ? ' [Notion]' : ''
        calLines.push(`  ${e.title}${e.location ? ` — ${e.location}` : ''}${source}`)
      }
    }
    sections.push(calLines.join('\n'))
  }

  // Overdue actions
  if (overdueItems.length > 0) {
    const lines = [`OVERDUE ACTIONS (${overdueItems.length})`]
    for (const item of overdueItems) {
      lines.push(`  [${item.project_code}] ${item.title} (due ${item.follow_up_date})`)
    }
    sections.push(lines.join('\n'))
  }

  // Upcoming follow-ups
  const upcomingItems = followUps.data || []
  if (upcomingItems.length > 0) {
    const lines = [`UPCOMING THIS WEEK (${upcomingItems.length})`]
    for (const item of upcomingItems) {
      lines.push(`  [${item.project_code}] ${item.title} (${item.follow_up_date})`)
    }
    sections.push(lines.join('\n'))
  }

  // Contacts needing attention (capped at 3)
  const contacts = staleContacts.data || []
  if (contacts.length > 0) {
    const lines = [`CONTACTS NEEDING FOLLOW-UP (${contacts.length})`]
    for (const c of contacts) {
      const days = Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
      lines.push(`  ${c.full_name}${c.company_name ? ` (${c.company_name})` : ''} — ${days} days`)
    }
    sections.push(lines.join('\n'))
  }

  // --- Consolidated Grant Alerts ---
  // Grants closing soon
  if (grantItems.length > 0) {
    const lines = [`GRANTS CLOSING SOON (${grantItems.length})`]
    for (const g of grantItems) {
      const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
      lines.push(`  ${g.name} — ${g.provider}${amount} — closes ${g.closes_at}`)
    }
    sections.push(lines.join('\n'))
  }

  // New grants discovered
  if (newGrantItems.length > 0) {
    const lines = [`NEW GRANTS DISCOVERED (${newGrantItems.length})`]
    for (const g of newGrantItems) {
      const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
      const fit = g.fit_score ? ` — fit: ${g.fit_score}%` : ''
      const projects = (g.aligned_projects as string[] | null)?.length
        ? ` — ${(g.aligned_projects as string[]).join(', ')}`
        : ''
      const closes = g.closes_at ? ` — closes ${g.closes_at}` : ''
      lines.push(`  ${g.name} — ${g.provider}${amount}${fit}${projects}${closes}`)
    }
    sections.push(lines.join('\n'))
  }

  // Grant application updates
  const recentApps = grantApps.data || []
  if (recentApps.length > 0) {
    const lines = [`GRANT APPLICATION UPDATES (${recentApps.length})`]
    for (const a of recentApps) {
      lines.push(`  ${a.application_name} — ${a.status}`)
    }
    sections.push(lines.join('\n'))
  }

  // --- Consolidated Finance Alerts ---
  if (invoiceItems.length > 0) {
    const totalOverdue = invoiceItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)
    const lines = [`OVERDUE INVOICES (${invoiceItems.length}, $${totalOverdue.toLocaleString('en-AU', { minimumFractionDigits: 2 })})`]
    for (const inv of invoiceItems) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
      lines.push(`  ${inv.contact_name || 'Unknown'} — $${Number(inv.amount_due).toLocaleString('en-AU', { minimumFractionDigits: 2 })} — ${daysOverdue}d overdue (${inv.invoice_number || ''})`)
    }
    sections.push(lines.join('\n'))
  }

  const receiptItems = pendingReceipts.data || []
  if (receiptItems.length > 0) {
    const total = receiptItems.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)
    const lines = [`RECEIPTS PENDING > 7 DAYS (${receiptItems.length}, $${total.toFixed(2)})`]
    for (const r of receiptItems) {
      lines.push(`  ${r.vendor_name || 'Unknown'} — $${Number(r.amount).toFixed(2)} (${r.transaction_date})`)
    }
    sections.push(lines.join('\n'))
  }

  // Receipt pipeline stuck items
  const { data: stuckPipeline } = await supabase
    .from('receipt_pipeline_status')
    .select('vendor_name, amount, stage')
    .not('stage', 'eq', 'reconciled')
    .lt('updated_at', new Date(now.getTime() - 14 * 86400000).toISOString())
    .limit(5)

  if (stuckPipeline && stuckPipeline.length > 0) {
    const lines = [`RECEIPT PIPELINE — ${stuckPipeline.length} STUCK >14 DAYS`]
    for (const item of stuckPipeline) {
      lines.push(`  ${item.vendor_name || 'Unknown'} — $${Number(item.amount).toFixed(2)} — ${item.stage}`)
    }
    sections.push(lines.join('\n'))
  }

  // Cashflow runway warning
  const snapshotItems = snapshots.data || []
  if (snapshotItems.length >= 3) {
    const currentBalance = snapshotItems[0]?.closing_balance || 0
    let totalBurn = 0
    for (const s of snapshotItems) {
      const burn = (s.expenses || 0) - (s.income || 0)
      totalBurn += Math.max(0, burn)
    }
    const avgBurn = totalBurn / snapshotItems.length
    const runwayMonths = avgBurn > 0 ? currentBalance / avgBurn : Infinity

    if (runwayMonths < 3 && runwayMonths > 0) {
      const lines = [`CASHFLOW WARNING — ${runwayMonths.toFixed(1)} MONTHS RUNWAY`]
      lines.push(`  Balance: $${Number(currentBalance).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`)
      lines.push(`  Avg monthly burn: $${Math.round(avgBurn).toLocaleString('en-AU')}`)
      if (runwayMonths < 1) {
        lines.push(`  CRITICAL: Less than 1 month of runway remaining`)
      }
      sections.push(lines.join('\n'))
    }
  }

  // Intelligence insights (capped at 3)
  const insightsSummary = await getInsightsSummary()
  if (insightsSummary) {
    sections.push(insightsSummary)
  }

  // Relationship decay alerts
  const relationshipAlerts = await getRelationshipAlerts()
  if (relationshipAlerts) {
    sections.push(relationshipAlerts)
  }

  // Sync health — only critical issues
  const syncHealth = await getSyncHealthSummary()
  if (syncHealth) {
    sections.push(syncHealth)
  }

  if (sections.length <= 1) {
    sections.push('All clear — nothing urgent today.')
  }

  return sections.join('\n\n')
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
// PROACTIVE GRANT DEADLINE ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkGrantDeadlineAlerts(): Promise<{ sent: number; alerts: string[] }> {
  const chatIds = getNotifyChatIds()
  const alerts: string[] = []
  const now = getBrisbaneNow()
  const today = getBrisbaneDate()
  const weekFromNow = getBrisbaneDateOffset(7)

  // Get grants closing within 7 days that haven't been alerted today
  const { data: closingGrants } = await supabase
    .from('grant_opportunities')
    .select('id, name, provider, closes_at, amount_max, application_status, aligned_projects, last_deadline_alert_at')
    .not('application_status', 'in', '("not_relevant","next_round")')
    .lte('closes_at', weekFromNow)
    .gte('closes_at', today)
    .order('closes_at', { ascending: true })

  if (!closingGrants || closingGrants.length === 0) return { sent: 0, alerts: [] }

  const grantLines: string[] = []
  const grantIdsToUpdate: string[] = []

  for (const g of closingGrants) {
    // Skip if already alerted today
    if (g.last_deadline_alert_at) {
      const lastAlert = new Date(g.last_deadline_alert_at).toISOString().split('T')[0]
      if (lastAlert === today) continue
    }

    const daysLeft = Math.ceil(
      (new Date(g.closes_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
    const projects = (g.aligned_projects as string[] | null)?.length
      ? ` [${(g.aligned_projects as string[]).join(', ')}]`
      : ''

    let prefix: string
    if (daysLeft <= 1) {
      prefix = 'URGENT'
    } else if (daysLeft <= 3) {
      prefix = 'SOON'
    } else {
      prefix = 'UPCOMING'
    }

    const deadlineLabel = daysLeft <= 1 ? 'closes TOMORROW' : `closes in ${daysLeft} days`
    grantLines.push(`  [${prefix}] ${g.name} — ${deadlineLabel}${amount}${projects}`)
    grantIdsToUpdate.push(g.id)
  }

  if (grantLines.length === 0) return { sent: 0, alerts: [] }

  const message = `GRANT DEADLINE ALERTS (${grantLines.length})\n\n${grantLines.join('\n')}`
  alerts.push(message)

  let sent = 0
  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, message)
      sent++
    } catch (err) {
      console.error(`Grant deadline alert to ${chatId}:`, (err as Error).message)
    }
  }

  // Update last_deadline_alert_at for all alerted grants
  if (sent > 0 && grantIdsToUpdate.length > 0) {
    await supabase
      .from('grant_opportunities')
      .update({ last_deadline_alert_at: now.toISOString() })
      .in('id', grantIdsToUpdate)
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
    .limit(3)

  if (!insights || insights.length === 0) return ''

  const lines: string[] = [`INTELLIGENCE (${insights.length})`]
  for (const i of insights) {
    const tag = i.priority === 'high' ? '[!] ' : ''
    lines.push(`  ${tag}${i.title}`)
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

    const lastUpdate = new Date((data as any)[check.column]) // eslint-disable-line
    const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)

    if (hoursAgo >= check.criticalHours) {
      critical.push(`${check.label}: ${Math.floor(hoursAgo / 24)}d stale`)
    } else if (hoursAgo >= check.warnHours) {
      stale.push(`${check.label}: ${Math.floor(hoursAgo)}h since last update`)
    }
  }

  // Only report critical issues in daily briefing (stale warnings are noise)
  if (critical.length === 0) return ''

  const lines: string[] = [`DATA SYNC — CRITICAL`]
  for (const c of critical) lines.push(`  ${c}`)

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
// PRE-MEETING BRIEFINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendPreMeetingBriefings(): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let sent = 0
  const now = getBrisbaneNow()

  // Quiet hours check (10pm-7am Brisbane)
  const hour = now.getHours()
  if (hour >= 22 || hour < 7) return { sent: 0, errors: [] }

  // Find events starting in 25-35 minutes
  const from = new Date(now.getTime() + 25 * 60000).toISOString()
  const to = new Date(now.getTime() + 35 * 60000).toISOString()

  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_time, attendees, location')
    .gte('start_time', from)
    .lte('start_time', to)

  if (!events || events.length === 0) return { sent: 0, errors: [] }

  for (const event of events) {
    const attendees: Array<{ email?: string; displayName?: string }> = Array.isArray(event.attendees)
      ? event.attendees
      : []
    const externalAttendees = attendees.filter(
      (a) => a.email && !a.email.includes('calendar.google.com') && !a.email.endsWith('@act.place')
    )
    if (externalAttendees.length === 0) continue

    // Build contact context for each attendee
    const contactLines: string[] = []
    for (const att of externalAttendees.slice(0, 5)) {
      const { data: contact } = await supabase
        .from('ghl_contacts')
        .select('full_name, company_name, last_contact_date, tags')
        .eq('email', att.email!)
        .maybeSingle()

      if (contact) {
        const daysSince = contact.last_contact_date
          ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
          : null

        // Get last communication topic
        const { data: lastComm } = await supabase
          .from('communications_history')
          .select('subject')
          .or(`contact_id.eq.${att.email}`)
          .order('communication_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        const parts = [contact.full_name || att.displayName || att.email]
        if (contact.company_name) parts[0] += ` (${contact.company_name})`
        if (daysSince !== null) parts.push(`last spoke ${daysSince}d ago`)
        if (lastComm?.subject) parts.push(`re: ${lastComm.subject.substring(0, 40)}`)
        contactLines.push(`  ${parts.join(' — ')}`)
      } else {
        contactLines.push(`  ${att.displayName || att.email} — new contact`)
      }
    }

    const time = new Date(event.start_time).toLocaleTimeString('en-AU', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const message = [
      `MEETING IN 30 MIN — ${time}`,
      event.title,
      event.location ? `Location: ${event.location}` : '',
      '',
      ...contactLines,
    ].filter(Boolean).join('\n')

    for (const chatId of chatIds) {
      try {
        await sendNotification(chatId, message)
        sent++
      } catch (err) {
        errors.push(`Chat ${chatId}: ${(err as Error).message}`)
      }
    }
  }

  return { sent, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST-MEETING KNOWLEDGE CAPTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendPostMeetingPrompts(): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let sent = 0
  const now = getBrisbaneNow()

  // Quiet hours check
  const hour = now.getHours()
  if (hour >= 22 || hour < 7) return { sent: 0, errors: [] }

  // Find events that ended 5-15 minutes ago
  const from = new Date(now.getTime() - 15 * 60000).toISOString()
  const to = new Date(now.getTime() - 5 * 60000).toISOString()

  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, attendees')
    .gte('end_time', from)
    .lte('end_time', to)

  if (!events || events.length === 0) return { sent: 0, errors: [] }

  for (const event of events) {
    // Skip solo/focus blocks — need 2+ attendees
    const attendees: Array<{ email?: string; displayName?: string }> = Array.isArray(event.attendees)
      ? event.attendees
      : []
    if (attendees.length < 2) continue

    // Check if notes already exist for this event
    const { data: existing } = await supabase
      .from('project_knowledge')
      .select('id')
      .eq('knowledge_type', 'meeting')
      .ilike('title', `%${event.title}%`)
      .gte('recorded_at', new Date(now.getTime() - 4 * 3600000).toISOString())
      .maybeSingle()

    if (existing) continue // Already captured

    const names = attendees
      .map((a) => a.displayName || a.email?.split('@')[0])
      .filter((n) => n && !n?.endsWith('@act.place'))
      .slice(0, 4)
      .join(', ')

    const message = `You just finished "${event.title}"${names ? ` with ${names}` : ''}. Send a voice note with takeaways and I'll save them.`

    for (const chatId of chatIds) {
      try {
        await sendNotification(chatId, message)
        sent++
      } catch (err) {
        errors.push(`Chat ${chatId}: ${(err as Error).message}`)
      }
    }
  }

  return { sent, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST-MEETING FALLBACK (auto-create minimal records)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendPostMeetingFallback(): Promise<{ created: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let created = 0
  const now = getBrisbaneNow()

  // Find events that ended today (run at 9pm, catch everything from today)
  const todayStart = `${getBrisbaneDate()}T00:00:00.000Z`

  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, attendees, google_event_id, detected_project_code, ghl_contact_ids')
    .gte('end_time', todayStart)
    .lte('end_time', now.toISOString())

  if (!events || events.length === 0) return { created: 0, errors: [] }

  for (const event of events) {
    // Skip solo/focus blocks — need 2+ attendees
    const attendees: Array<{ email?: string; displayName?: string }> = Array.isArray(event.attendees)
      ? event.attendees
      : []
    if (attendees.length < 2) continue

    // Check if notes already exist for this event
    const { data: existing } = await supabase
      .from('project_knowledge')
      .select('id')
      .eq('knowledge_type', 'meeting')
      .ilike('title', `%${event.title}%`)
      .gte('recorded_at', todayStart)
      .maybeSingle()

    if (existing) continue // Already captured

    // Also check by source_ref to avoid duplicates from previous fallback runs
    if (event.google_event_id) {
      const { data: byRef } = await supabase
        .from('project_knowledge')
        .select('id')
        .eq('source_ref', event.google_event_id)
        .maybeSingle()

      if (byRef) continue
    }

    const names = attendees
      .map((a) => a.displayName || a.email?.split('@')[0])
      .filter((n) => n && !n?.endsWith('@act.place'))
      .slice(0, 6)
      .join(', ')

    // Auto-create minimal record
    const { error: insertError } = await supabase
      .from('project_knowledge')
      .insert({
        knowledge_type: 'meeting',
        title: event.title,
        content: `Calendar meeting — no notes captured. Attendees: ${names || 'unknown'}`,
        source_type: 'calendar_fallback',
        source_ref: event.google_event_id || null,
        participants: names ? names.split(', ') : [],
        contact_ids: event.ghl_contact_ids || [],
        project_code: event.detected_project_code || null,
        importance: 'low',
        recorded_at: event.start_time,
      })

    if (insertError) {
      errors.push(`${event.title}: ${insertError.message}`)
      continue
    }

    created++

    // Send brief notification
    for (const chatId of chatIds) {
      try {
        await sendNotification(chatId, `Auto-logged "${event.title}" — send notes anytime to enrich it.`)
      } catch (err) {
        errors.push(`Chat ${chatId}: ${(err as Error).message}`)
      }
    }
  }

  return { created, errors }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RELATIONSHIP NUDGES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function checkRelationshipNudges(): Promise<{ sent: number; nudges: string[] }> {
  const chatIds = getNotifyChatIds()
  const nudges: string[] = []
  const now = getBrisbaneNow()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()

  // Find important contacts not contacted in 14+ days
  const { data: staleContacts } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, company_name, last_contact_date, tags')
    .in('engagement_status', ['active', 'prospect'])
    .lt('last_contact_date', fourteenDaysAgo)
    .or('tags.cs.{"partner"},tags.cs.{"funder"},tags.cs.{"key-relationship"},tags.cs.{"responsive"}')
    .not('full_name', 'is', null)
    .order('last_contact_date', { ascending: true })
    .limit(3)

  if (!staleContacts || staleContacts.length === 0) return { sent: 0, nudges: [] }

  for (const contact of staleContacts) {
    const daysSince = Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)

    // Get last communication topic
    const { data: lastComm } = await supabase
      .from('communications_history')
      .select('subject, communication_date')
      .eq('contact_id', contact.id)
      .order('communication_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get open pipeline value
    const { data: deals } = await supabase
      .from('ghl_opportunities')
      .select('monetary_value')
      .eq('contact_id', contact.ghl_id)
      .eq('status', 'open')

    const pipelineValue = (deals || []).reduce((sum, d) => sum + (d.monetary_value || 0), 0)

    const parts = [`Haven't spoken with ${contact.full_name} in ${daysSince} days.`]
    if (lastComm?.subject) parts.push(`Last topic: ${lastComm.subject.substring(0, 50)}`)
    if (pipelineValue > 0) parts.push(`Open pipeline: $${pipelineValue.toLocaleString('en-AU')}`)

    nudges.push(parts.join(' '))
  }

  if (nudges.length === 0) return { sent: 0, nudges: [] }

  const message = `RELATIONSHIP NUDGES\n\n${nudges.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
  let sent = 0

  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, message)
      sent++
    } catch (err) {
      console.error(`Nudge to ${chatId}:`, (err as Error).message)
    }
  }

  return { sent, nudges }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEEKLY FINANCE SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendWeeklyFinanceSummary(): Promise<{ sent: number; errors: string[] }> {
  const chatIds = getNotifyChatIds()
  const errors: string[] = []
  let sent = 0
  const now = getBrisbaneNow()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const today = getBrisbaneDate()
  const fyStart = '2025-07-01'

  const [
    transactions,
    bankAccounts,
    overdueInvoices,
    upcomingBills,
    billsTotal,
    billsWithReceipt,
    billsUntagged,
    pendingReceipts,
  ] = await Promise.all([
    supabase
      .from('xero_transactions')
      .select('amount, type')
      .gte('date', sevenDaysAgo.split('T')[0])
      .lte('date', today),
    // Real bank balance from Xero
    supabase
      .from('xero_bank_accounts')
      .select('name, current_balance')
      .eq('status', 'ACTIVE')
      .not('current_balance', 'is', null),
    supabase
      .from('xero_invoices')
      .select('contact_name, amount_due, due_date')
      .eq('type', 'ACCREC')
      .in('status', ['AUTHORISED', 'SUBMITTED'])
      .gt('amount_due', 0)
      .lt('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('xero_invoices')
      .select('contact_name, amount_due, due_date')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'SUBMITTED'])
      .gt('amount_due', 0)
      .gte('due_date', today)
      .lte('due_date', getBrisbaneDateOffset(14))
      .order('due_date', { ascending: true })
      .limit(5),
    // FY26 bill receipt coverage
    supabase
      .from('xero_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'ACCPAY')
      .gte('date', fyStart),
    supabase
      .from('xero_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'ACCPAY')
      .gte('date', fyStart)
      .eq('has_attachments', true),
    supabase
      .from('xero_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'ACCPAY')
      .gte('date', fyStart)
      .is('project_code', null),
    // Pending receipt matches
    supabase
      .from('receipt_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const txns = transactions.data || []
  const income = txns.filter((t) => t.type === 'RECEIVE').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  const spend = txns.filter((t) => t.type === 'SPEND').reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
  const net = income - spend

  // Real cash from bank accounts
  const accounts = bankAccounts.data || []
  const cashInBank = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0)

  const overdueItems = overdueInvoices.data || []
  const overdueTotal = overdueItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)
  const upcomingItems = upcomingBills.data || []
  const upcomingTotal = upcomingItems.reduce((sum, inv) => sum + (parseFloat(String(inv.amount_due)) || 0), 0)

  // Receipt coverage
  const totalBills = billsTotal.count || 0
  const withReceipt = billsWithReceipt.count || 0
  const receiptPct = totalBills > 0 ? Math.round((withReceipt / totalBills) * 100) : 0
  const missingReceipts = totalBills - withReceipt
  const untaggedBills = billsUntagged.count || 0
  const pendingCount = pendingReceipts.count || 0

  // BAS deadline check (Australian quarters)
  const basDeadlines = [
    { label: 'Q1 (Jul-Sep)', due: new Date(2025, 9, 28) },   // Oct 28 2025
    { label: 'Q2 (Oct-Dec)', due: new Date(2026, 1, 28) },   // Feb 28 2026
    { label: 'Q3 (Jan-Mar)', due: new Date(2026, 3, 28) },   // Apr 28 2026
    { label: 'Q4 (Apr-Jun)', due: new Date(2026, 6, 28) },   // Jul 28 2026
  ]
  const nextBas = basDeadlines.find(b => b.due.getTime() > now.getTime())
  const basWeeksAway = nextBas
    ? Math.ceil((nextBas.due.getTime() - now.getTime()) / (7 * 86400000))
    : null

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  // Build message — nuanced, only flag what needs attention
  const sections: string[] = [
    '\u{1F4B0} WEEKLY FINANCE DIGEST',
    '',
    `This week: ${fmt(income)} in \u{2022} ${fmt(spend)} out \u{2022} net ${net >= 0 ? '+' : ''}${fmt(net)}`,
    `Cash in bank: ${fmt(cashInBank)}`,
  ]

  // Receipt coverage — celebrate good coverage, flag gaps
  if (receiptPct >= 99 && untaggedBills === 0) {
    sections.push('', `\u{2705} Receipts: ${receiptPct}% coverage (${withReceipt}/${totalBills} bills)`)
  } else {
    sections.push('', `\u{1F4CB} RECEIPTS`)
    sections.push(`  Coverage: ${receiptPct}% (${withReceipt}/${totalBills} FY26 bills)`)
    if (missingReceipts > 0) {
      sections.push(`  \u{26A0}\u{FE0F} ${missingReceipts} bills missing receipts`)
    }
    if (untaggedBills > 0) {
      sections.push(`  \u{1F3F7}\u{FE0F} ${untaggedBills} bills need project tags`)
    }
    if (pendingCount > 0) {
      sections.push(`  \u{1F50D} ${pendingCount} receipt matches pending review`)
    }
  }

  // Overdue invoices — only if there are any
  if (overdueItems.length > 0) {
    sections.push('', `\u{1F6A8} OVERDUE (${overdueItems.length} invoices, ${fmt(overdueTotal)})`)
    for (const inv of overdueItems.slice(0, 3)) {
      const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000)
      sections.push(`  ${inv.contact_name} \u{2014} ${fmt(parseFloat(String(inv.amount_due)))} \u{2014} ${days}d`)
    }
  }

  // Upcoming bills — only if significant
  if (upcomingItems.length > 0) {
    sections.push('', `\u{1F4C5} DUE NEXT 2 WEEKS (${fmt(upcomingTotal)})`)
    for (const inv of upcomingItems.slice(0, 3)) {
      sections.push(`  ${inv.contact_name} \u{2014} ${fmt(parseFloat(String(inv.amount_due)))} \u{2014} ${inv.due_date}`)
    }
  }

  // BAS deadline — only if < 8 weeks away
  if (nextBas && basWeeksAway !== null && basWeeksAway <= 8) {
    const urgency = basWeeksAway <= 2 ? '\u{1F534}' : basWeeksAway <= 4 ? '\u{1F7E1}' : '\u{1F7E2}'
    sections.push('', `${urgency} BAS ${nextBas.label} due in ${basWeeksAway} weeks (${nextBas.due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})`)
  }

  const message = sections.join('\n')

  for (const chatId of chatIds) {
    try {
      await sendNotification(chatId, message)
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
