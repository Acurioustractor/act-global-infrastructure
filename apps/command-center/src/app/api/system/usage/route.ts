import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch raw usage rows
  const { data: rows, error } = await supabase
    .from('api_usage')
    .select('model, input_tokens, output_tokens, estimated_cost, input_cost, output_cost, latency_ms, created_at, script_name')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const all = rows || []

  // Aggregate by model
  const byModel: Record<string, { calls: number; inputTokens: number; outputTokens: number; cost: number; avgLatency: number }> = {}
  for (const r of all) {
    const m = r.model || 'unknown'
    if (!byModel[m]) byModel[m] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, avgLatency: 0 }
    byModel[m].calls++
    byModel[m].inputTokens += r.input_tokens || 0
    byModel[m].outputTokens += r.output_tokens || 0
    byModel[m].cost += r.estimated_cost || 0
    byModel[m].avgLatency += r.latency_ms || 0
  }
  for (const m of Object.keys(byModel)) {
    if (byModel[m].calls > 0) byModel[m].avgLatency = Math.round(byModel[m].avgLatency / byModel[m].calls)
  }

  // Aggregate by day
  const byDay: Record<string, { calls: number; cost: number; tokens: number }> = {}
  for (const r of all) {
    const day = (r.created_at || '').slice(0, 10)
    if (!day) continue
    if (!byDay[day]) byDay[day] = { calls: 0, cost: 0, tokens: 0 }
    byDay[day].calls++
    byDay[day].cost += r.estimated_cost || 0
    byDay[day].tokens += (r.input_tokens || 0) + (r.output_tokens || 0)
  }

  // Aggregate by script/source
  const byScript: Record<string, { calls: number; cost: number }> = {}
  for (const r of all) {
    const s = r.script_name || 'unknown'
    if (!byScript[s]) byScript[s] = { calls: 0, cost: 0 }
    byScript[s].calls++
    byScript[s].cost += r.estimated_cost || 0
  }

  // Summary
  const totalCost = all.reduce((s, r) => s + (r.estimated_cost || 0), 0)
  const totalCalls = all.length
  const totalTokens = all.reduce((s, r) => s + (r.input_tokens || 0) + (r.output_tokens || 0), 0)

  return NextResponse.json({
    summary: {
      totalCalls,
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      days,
      periodStart: since.toISOString(),
    },
    byModel: Object.entries(byModel)
      .map(([model, stats]) => ({ model, ...stats, cost: Math.round(stats.cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost),
    byDay: Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats, cost: Math.round(stats.cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byScript: Object.entries(byScript)
      .map(([script, stats]) => ({ script, ...stats, cost: Math.round(stats.cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost),
    recentCalls: all.slice(0, 20).map(r => ({
      model: r.model,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      cost: Math.round((r.estimated_cost || 0) * 1000) / 1000,
      latencyMs: r.latency_ms,
      source: r.script_name,
      time: r.created_at,
    })),
  })
}
