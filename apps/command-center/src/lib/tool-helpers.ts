import { supabase } from './supabase'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helper: load project codes from the projects table
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _projectCodesCache: Record<string, any> | null = null
export async function loadProjectCodes(): Promise<Record<string, any>> {
  if (_projectCodesCache) return _projectCodesCache

  try {
    const { data } = await supabase
      .from('projects')
      .select('*')

    const projects: Record<string, any> = {}
    for (const row of data || []) {
      projects[row.code] = row
    }
    _projectCodesCache = projects
    return projects
  } catch {
    _projectCodesCache = {}
    return {}
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED: Google Service Account Auth
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getGoogleAccessToken(
  credentials: { client_email: string; private_key: string },
  subject: string,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    sub: subject,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const signInput = `${header}.${payload}`

  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(credentials.private_key, 'base64url')

  const jwt = `${signInput}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    throw new Error(`Google auth error: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COST TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
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
