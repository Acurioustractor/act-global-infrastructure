import { Bot } from 'grammy'
import { supabase } from '@/lib/supabase'

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
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [calendar, overdue, followUps, staleContacts, grants] = await Promise.all([
    // Today's calendar
    supabase
      .from('calendar_events')
      .select('title, start_time, end_time, location')
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

  // Calendar
  const events = calendar.data || []
  if (events.length > 0) {
    lines.push(`CALENDAR (${events.length} events)`)
    for (const e of events) {
      const time = new Date(e.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
      lines.push(`  ${time} — ${e.title}${e.location ? ` (${e.location})` : ''}`)
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
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  // New grants discovered in last 24h
  const { data: newGrants } = await supabase
    .from('grant_opportunities')
    .select('name, provider, amount_max, closes_at, fit_score')
    .gte('discovered_at', yesterday)
    .order('fit_score', { ascending: false })
    .limit(5)

  if (newGrants && newGrants.length > 0) {
    const lines = [`NEW GRANTS DISCOVERED (${newGrants.length})`]
    for (const g of newGrants) {
      const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : ''
      const fit = g.fit_score ? ` — fit: ${g.fit_score}%` : ''
      lines.push(`  ${g.name} — ${g.provider}${amount}${fit}`)
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
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

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
