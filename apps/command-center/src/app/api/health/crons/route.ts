import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface CronRow {
  name: string
  status: string
  restarts: number
  memory_bytes: number
  uptime_ms: number
  frequency: string
  recent_errors: string[]
  updated_at: string
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('pm2_cron_status')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to query pm2_cron_status', detail: error.message },
        { status: 500 }
      )
    }

    const rows: CronRow[] = data || []

    const scripts = rows.map(r => ({
      name: r.name,
      status: r.status as 'online' | 'stopped' | 'errored',
      restarts: r.restarts,
      memory_mb: Math.round((r.memory_bytes || 0) / 1024 / 1024),
      uptime_ms: r.uptime_ms,
      unstable: r.restarts > 10,
      recent_errors: r.recent_errors || [],
      frequency: r.frequency,
    }))

    const summary = {
      running: scripts.filter(s => s.status === 'online').length,
      stopped: scripts.filter(s => s.status === 'stopped').length,
      errored: scripts.filter(s => s.status === 'errored').length,
      total: scripts.length,
    }

    const groupOrder = ['high-freq', 'daily', 'weekly', 'monthly']
    const groupLabels: Record<string, string> = {
      'high-freq': 'High Frequency (5-30 min)',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
    }

    const groups = groupOrder
      .map(key => ({
        label: groupLabels[key] || key,
        frequency: key,
        scripts: scripts.filter(s => s.frequency === key),
      }))
      .filter(g => g.scripts.length > 0)

    // Include last sync time so the UI can show staleness
    const lastSync = rows.length > 0
      ? rows.reduce((latest, r) => r.updated_at > latest ? r.updated_at : latest, rows[0].updated_at)
      : null

    return NextResponse.json({ summary, groups, last_sync: lastSync })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to query cron status', detail: String(err) },
      { status: 500 }
    )
  }
}
