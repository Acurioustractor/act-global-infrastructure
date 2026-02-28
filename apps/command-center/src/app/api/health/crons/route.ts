import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface PM2Process {
  pm_id: number
  name: string
  pm2_env: {
    status: string
    restart_time: number
    pm_uptime: number
    cron_restart_time?: string
  }
  monit: {
    memory: number
    cpu: number
  }
}

interface CronScript {
  name: string
  status: 'online' | 'stopped' | 'errored'
  restarts: number
  memory_mb: number
  uptime_ms: number
  unstable: boolean
  recent_errors: string[]
  frequency: string
  pm2_id: number
}

// Dev servers to exclude from cron list
const DEV_SERVERS = new Set(['act-api', 'act-frontend', 'command-center', 'website'])

function categorizeFrequency(cronExpr: string): string {
  if (/^\*\/[5-9]\s/.test(cronExpr) || /^\*\/1[0-5]\s/.test(cronExpr)) return 'high-freq'
  if (/^\*\/30\s/.test(cronExpr)) return 'high-freq'
  if (/\s\*\/[2-6]\s/.test(cronExpr)) return 'daily' // */2h, */6h treated as daily-ish
  if (/\s\d+\/\d+\s/.test(cronExpr)) return 'daily'
  if (/\s\*\s\*\s[0-1]$/.test(cronExpr)) return 'weekly' // day 0 or 1
  if (/\s\*\s\*\s[5-6]$/.test(cronExpr)) return 'weekly' // Friday/Saturday
  if (/\s1\s\*\s\*$/.test(cronExpr)) return 'monthly' // day 1
  if (/^\d+\s\d+\s\*\s\*\s\*$/.test(cronExpr)) return 'daily'
  if (/^\d+\s\d+(,\d+)*\s\*\s\*\s\*$/.test(cronExpr)) return 'daily' // multiple hours
  return 'daily'
}

function loadCronExpressions(): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const configPath = join(process.cwd(), '..', '..', 'ecosystem.config.cjs')
    const altPath = join(process.env.HOME || '/Users/benknight', 'Code', 'act-global-infrastructure', 'ecosystem.config.cjs')
    const path = existsSync(configPath) ? configPath : altPath
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      // Parse cron_restart patterns from the file
      const regex = /name:\s*'([^']+)'[\s\S]*?cron_restart:\s*'([^']+)'/g
      let match
      while ((match = regex.exec(content)) !== null) {
        map.set(match[1], match[2])
      }
    }
  } catch {
    // Fallback — no cron expressions available
  }
  return map
}

function getRecentErrors(name: string): string[] {
  try {
    const logPath = `/tmp/${name}-error.log`
    if (!existsSync(logPath)) return []
    const content = readFileSync(logPath, 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())
    return lines.slice(-3)
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const raw = execSync('pm2 jlist', { timeout: 10000, encoding: 'utf-8' })
    const processes: PM2Process[] = JSON.parse(raw)
    const cronExprs = loadCronExpressions()

    const scripts: CronScript[] = processes
      .filter(p => !DEV_SERVERS.has(p.name))
      .map(p => {
        const status = p.pm2_env.status === 'online' ? 'online'
          : p.pm2_env.status === 'errored' ? 'errored'
          : 'stopped'

        const cronExpr = cronExprs.get(p.name) || ''
        const frequency = cronExpr ? categorizeFrequency(cronExpr) : 'daily'

        return {
          name: p.name,
          status,
          restarts: p.pm2_env.restart_time || 0,
          memory_mb: Math.round((p.monit?.memory || 0) / 1024 / 1024),
          uptime_ms: p.pm2_env.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
          unstable: (p.pm2_env.restart_time || 0) > 10,
          recent_errors: status === 'errored' ? getRecentErrors(p.name) : [],
          frequency,
          pm2_id: p.pm_id,
        }
      })

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

    return NextResponse.json({ summary, groups })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to query PM2', detail: String(err) },
      { status: 500 }
    )
  }
}
