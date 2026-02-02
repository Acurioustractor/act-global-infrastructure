import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface FreshnessConfig {
  warn: number    // hours
  critical: number // hours
  column: string
  label: string
}

interface FreshnessResult {
  table: string
  label: string
  status: 'ok' | 'warn' | 'critical'
  age_hours: number | null
  row_count: number | null
  note: string
}

const THRESHOLDS: Record<string, FreshnessConfig> = {
  ghl_contacts:       { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Contacts' },
  ghl_opportunities:  { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Opportunities' },
  communications_history: { warn: 24, critical: 72,  column: 'occurred_at', label: 'Communications' },
  project_knowledge:  { warn: 48, critical: 168, column: 'recorded_at', label: 'Project Knowledge' },
  knowledge_chunks:   { warn: 48, critical: 168, column: 'created_at', label: 'Knowledge Chunks' },
  api_usage:          { warn: 24, critical: 72,  column: 'created_at', label: 'API Usage' },
}

export async function GET() {
  const now = new Date()
  const results: FreshnessResult[] = []

  for (const [table, config] of Object.entries(THRESHOLDS)) {
    const result: FreshnessResult = {
      table,
      label: config.label,
      status: 'ok',
      age_hours: null,
      row_count: null,
      note: '',
    }

    try {
      const { data, count } = await supabase
        .from(table)
        .select(config.column, { count: 'exact' })
        .order(config.column, { ascending: false })
        .limit(1)

      result.row_count = count

      if (!data || data.length === 0) {
        result.status = 'warn'
        result.note = 'empty'
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lastDate = new Date((data[0] as any)[config.column])
        const ageHours = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60))
        result.age_hours = ageHours

        if (ageHours >= config.critical) {
          result.status = 'critical'
          result.note = `stale (>${config.critical}h)`
        } else if (ageHours >= config.warn) {
          result.status = 'warn'
          result.note = `aging (>${config.warn}h)`
        }
      }
    } catch {
      result.status = 'warn'
      result.note = 'query failed'
    }

    results.push(result)
  }

  // Embedding completeness
  const { count: missingEmbeddings } = await supabase
    .from('project_knowledge')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)

  results.push({
    table: 'embeddings',
    label: 'Embedding Completeness',
    status: (missingEmbeddings || 0) > 50 ? 'critical' : (missingEmbeddings || 0) > 10 ? 'warn' : 'ok',
    age_hours: null,
    row_count: missingEmbeddings || 0,
    note: `${missingEmbeddings || 0} missing`,
  })

  const critical = results.filter(r => r.status === 'critical').length
  const warning = results.filter(r => r.status === 'warn').length
  const healthy = results.filter(r => r.status === 'ok').length

  return NextResponse.json({
    generated_at: now.toISOString(),
    summary: { healthy, warning, critical, total: results.length },
    sources: results,
  })
}
