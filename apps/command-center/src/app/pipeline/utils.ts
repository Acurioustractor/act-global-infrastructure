export interface RelationshipItem {
  id: string
  entity_type: string
  entity_id: string
  entity_name: string
  stage: string
  love_score: number
  money_score: number
  strategic_score: number
  urgency_score: number
  color: string | null
  notes: string | null
  next_action: string | null
  next_action_date: string | null
  last_contact_date: string | null
  key_contact: string | null
  value_low: number | null
  value_high: number | null
  subtitle: string | null
  project_codes: string[] | null
  notion_page_id: string | null
  created_at: string
  updated_at: string
}

export function entityColor(type: string): string {
  switch (type) {
    case 'grant': return 'bg-blue-400'
    case 'foundation': return 'bg-yellow-400'
    case 'business': return 'bg-green-400'
    case 'person': return 'bg-purple-400'
    case 'opportunity': return 'bg-cyan-400'
    default: return 'bg-white/40'
  }
}

export function entityTextColor(type: string): string {
  switch (type) {
    case 'grant': return 'text-blue-400'
    case 'foundation': return 'text-yellow-400'
    case 'business': return 'text-green-400'
    case 'person': return 'text-purple-400'
    case 'opportunity': return 'text-cyan-400'
    default: return 'text-white/40'
  }
}

export function formatValue(low: number | null, high: number | null): string {
  if (!low && !high) return ''
  if (low && high && low !== high) {
    return `$${fmt(low)} – $${fmt(high)}`
  }
  return `$${fmt(high || low || 0)}`
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toFixed(0)
}
