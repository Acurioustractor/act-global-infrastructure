import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL DEFINITIONS (Anthropic tool_use format)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_supabase',
    description:
      'Run a read-only SQL query against the ACT database. Use this to answer questions about contacts, projects, communications, knowledge, subscriptions, and other data. Only SELECT queries are allowed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string',
          description: 'A SELECT SQL query to run against the database.',
        },
        description: {
          type: 'string',
          description: 'Brief description of what this query is looking for.',
        },
      },
      required: ['sql', 'description'],
    },
  },
  {
    name: 'get_daily_briefing',
    description:
      'Get the daily briefing summary including overdue actions, upcoming follow-ups, relationship alerts, financial pipeline, and active project summaries. Use this when the user asks about what needs attention, priorities, or a general status update.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lookback_days: {
          type: 'number',
          description: 'Number of days to look back for recent activity. Default 7.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_financial_summary',
    description:
      'Get financial summary including pipeline totals, recent transactions, pending receipts, and subscription costs. Use this when the user asks about money, spending, cash flow, receipts, or subscriptions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back for transactions. Default 30.',
        },
      },
      required: [],
    },
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case 'query_supabase':
      return await executeQuerySupabase(input as { sql: string; description: string })
    case 'get_daily_briefing':
      return await executeGetDailyBriefing(input as { lookback_days?: number })
    case 'get_financial_summary':
      return await executeGetFinancialSummary(input as { days?: number })
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: query_supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeQuerySupabase(input: {
  sql: string
  description: string
}): Promise<string> {
  const { sql, description } = input

  // Read-only guard
  const normalised = sql.trim().toUpperCase()
  if (!normalised.startsWith('SELECT') && !normalised.startsWith('WITH')) {
    return JSON.stringify({
      error: 'Only SELECT queries are allowed. Cannot run INSERT, UPDATE, DELETE, or DDL.',
    })
  }

  // Block dangerous patterns
  const blocked = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'DELETE', 'GRANT', 'REVOKE']
  for (const keyword of blocked) {
    // Check for keyword as a standalone word (not part of column names)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(sql) && !normalised.startsWith('SELECT') && !normalised.startsWith('WITH')) {
      return JSON.stringify({ error: `Blocked keyword detected: ${keyword}` })
    }
  }

  try {
    // Use Supabase's rpc to execute raw SQL via a database function
    // If the function doesn't exist, fall back to a simpler approach
    const { data, error } = await supabase.rpc('exec_read_only_sql', {
      query_text: sql,
    })

    if (error) {
      // If the RPC function doesn't exist, try common table queries
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return await fallbackQuery(sql, description)
      }
      return JSON.stringify({ error: error.message, hint: 'Check table/column names.' })
    }

    const rows = Array.isArray(data) ? data : [data]
    return JSON.stringify({
      description,
      row_count: rows.length,
      data: rows.slice(0, 50), // Limit to 50 rows
      truncated: rows.length > 50,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

async function fallbackQuery(sql: string, description: string): Promise<string> {
  // Parse simple queries and use Supabase client methods
  const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i)
  if (!tableMatch) {
    return JSON.stringify({
      error: 'Could not parse table name. The exec_read_only_sql database function is not available. Try asking about specific tables like contacts, projects, communications.',
    })
  }

  const table = tableMatch[1]
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  const limit = limitMatch ? parseInt(limitMatch[1]) : 20

  try {
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    if (error) {
      return JSON.stringify({ error: error.message })
    }
    return JSON.stringify({
      description,
      table,
      row_count: (data || []).length,
      data: (data || []).slice(0, 50),
      note: 'Fallback query - returned all columns with limit. For complex queries, the exec_read_only_sql function needs to be created.',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_daily_briefing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDailyBriefing(input: {
  lookback_days?: number
}): Promise<string> {
  const days = input.lookback_days || 7
  const now = new Date()
  const lookback = new Date(now.getTime() - days * 86400000).toISOString()
  const today = now.toISOString().split('T')[0]
  const futureDate = new Date(now.getTime() + days * 86400000).toISOString().split('T')[0]

  // Run all queries in parallel
  const [overdue, upcoming, meetings, relationships, projects] = await Promise.all([
    // Overdue actions
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date, importance')
      .eq('action_required', true)
      .lt('follow_up_date', today)
      .order('follow_up_date', { ascending: true })
      .limit(20),

    // Upcoming follow-ups
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date, importance')
      .eq('action_required', true)
      .gte('follow_up_date', today)
      .lte('follow_up_date', futureDate)
      .order('follow_up_date', { ascending: true })
      .limit(20),

    // Recent meetings
    supabase
      .from('project_knowledge')
      .select('project_code, title, summary, recorded_at, participants')
      .eq('knowledge_type', 'meeting')
      .gte('recorded_at', lookback)
      .order('recorded_at', { ascending: false })
      .limit(10),

    // Stale relationships (active/prospect contacts not contacted in 30+ days)
    supabase
      .from('ghl_contacts')
      .select('full_name, email, company_name, engagement_status, last_contact_date')
      .in('engagement_status', ['active', 'prospect'])
      .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
      .order('last_contact_date', { ascending: true })
      .limit(10),

    // Active projects (last 30 days activity count)
    supabase
      .from('project_knowledge')
      .select('project_code')
      .gte('recorded_at', new Date(now.getTime() - 30 * 86400000).toISOString()),
  ])

  // Count project activity
  const projectCounts: Record<string, number> = {}
  for (const row of projects.data || []) {
    const code = row.project_code
    projectCounts[code] = (projectCounts[code] || 0) + 1
  }

  return JSON.stringify({
    generated_at: now.toISOString(),
    lookback_days: days,
    overdue_actions: {
      count: (overdue.data || []).length,
      items: overdue.data || [],
    },
    upcoming_followups: {
      count: (upcoming.data || []).length,
      items: upcoming.data || [],
    },
    recent_meetings: {
      count: (meetings.data || []).length,
      items: meetings.data || [],
    },
    stale_relationships: {
      count: (relationships.data || []).length,
      items: (relationships.data || []).map((r) => ({
        name: r.full_name || r.email || 'Unknown',
        company: r.company_name,
        status: r.engagement_status,
        last_contact: r.last_contact_date,
      })),
    },
    active_projects: Object.entries(projectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([code, count]) => ({ code, activity_count: count })),
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_financial_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetFinancialSummary(input: {
  days?: number
}): Promise<string> {
  const days = input.days || 30

  const [pipeline, apiCosts, subscriptions] = await Promise.all([
    // Pipeline totals from opportunities
    supabase
      .from('ghl_opportunities')
      .select('status, monetary_value, pipeline_name, stage_name'),

    // API costs (last N days)
    supabase
      .from('api_usage')
      .select('provider, model, estimated_cost, created_at')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100),

    // Active subscriptions
    supabase
      .from('subscriptions')
      .select('vendor, amount_aud, billing_cycle, category, status')
      .eq('status', 'active')
      .order('amount_aud', { ascending: false })
      .limit(30),
  ])

  // Aggregate pipeline
  let openValue = 0
  let wonValue = 0
  let lostValue = 0
  const pipelineData = pipeline.data || []
  for (const row of pipelineData) {
    const val = parseFloat(row.monetary_value) || 0
    if (row.status === 'open') openValue += val
    else if (row.status === 'won') wonValue += val
    else if (row.status === 'lost') lostValue += val
  }

  // Aggregate API costs
  let totalApiCost = 0
  const costsByModel: Record<string, number> = {}
  for (const row of apiCosts.data || []) {
    const cost = parseFloat(row.estimated_cost) || 0
    totalApiCost += cost
    const key = `${row.provider}/${row.model}`
    costsByModel[key] = (costsByModel[key] || 0) + cost
  }

  // Aggregate subscriptions
  let monthlySubscriptionTotal = 0
  for (const sub of subscriptions.data || []) {
    const amount = parseFloat(sub.amount_aud) || 0
    if (sub.billing_cycle === 'monthly') monthlySubscriptionTotal += amount
    else if (sub.billing_cycle === 'yearly') monthlySubscriptionTotal += amount / 12
  }

  return JSON.stringify({
    period_days: days,
    pipeline: {
      total_opportunities: pipelineData.length,
      open_value: openValue,
      won_value: wonValue,
      lost_value: lostValue,
      total_value: openValue + wonValue + lostValue,
    },
    api_costs: {
      total_usd: Math.round(totalApiCost * 100) / 100,
      by_model: costsByModel,
      call_count: (apiCosts.data || []).length,
    },
    subscriptions: {
      active_count: (subscriptions.data || []).length,
      monthly_total_aud: Math.round(monthlySubscriptionTotal * 100) / 100,
      items: (subscriptions.data || []).slice(0, 15),
    },
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COST TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 },
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000
  )
}

export async function logAgentUsage(params: {
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  toolCalls: number
}) {
  const cost = calculateCost(params.model, params.inputTokens, params.outputTokens)
  const pricing = PRICING[params.model]

  try {
    await supabase.from('api_usage').insert({
      provider: 'anthropic',
      model: params.model,
      endpoint: 'chat',
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost: cost,
      input_cost: pricing
        ? (params.inputTokens * pricing.input) / 1_000_000
        : 0,
      output_cost: pricing
        ? (params.outputTokens * pricing.output) / 1_000_000
        : 0,
      script_name: 'agent-chat',
      agent_id: 'agent-chat',
      operation: 'chat',
      latency_ms: params.latencyMs,
      response_status: 200,
    })
  } catch (err) {
    console.error('Failed to log agent usage:', (err as Error).message)
  }

  return cost
}
