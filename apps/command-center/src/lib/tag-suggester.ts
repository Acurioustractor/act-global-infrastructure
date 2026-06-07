// Tag suggester — runs the same rule engine as scripts/suggest-from-line-desc.mjs
// Reads from config/tag-suggester-rules.json so both surfaces stay in sync.

import rulesJson from '../../../../config/tag-suggester-rules.json'

type VendorRule = { code: string; tier: string; note: string }
type Rules = {
  _meta: { harvest_cutoff: string }
  vendor_rules: Record<string, VendorRule>
  special_vendors: Record<string, VendorRule>
  witta_vendors: string[]
  ambiguous_vendors: string[]
}

const rules = rulesJson as Rules
const HARVEST_CUTOFF = rules._meta.harvest_cutoff
const wittaSet = new Set(rules.witta_vendors)
const ambiguousSet = new Set(rules.ambiguous_vendors)

export type Suggestion = {
  code: string
  tier: 'A' | 'A*' | 'B' | 'C' | 'D'
  confidence: 'high' | 'medium' | 'manual'
  reason: string
}

export type SuggesterInput = {
  contact: string
  date: string
  description: string
}

function extractCode(text: string): string | null {
  if (!text) return null
  const m = text.match(/ACT-[A-Z]{2,4}/)
  return m ? m[0] : null
}

export function suggest(row: SuggesterInput): Suggestion | null {
  const vendor = (row.contact || '').trim()
  const desc = row.description || ''

  // Tier A — Dext line desc explicit code, with cutoff override for pre-Jan-26 ACT-HV
  const fromDesc = extractCode(desc)
  if (fromDesc) {
    if (fromDesc === 'ACT-HV' && row.date < HARVEST_CUTOFF) {
      return {
        code: 'ACT-FM',
        tier: 'A*',
        confidence: 'medium',
        reason: `Dext said ACT-HV but pre-${HARVEST_CUTOFF} cutoff → demoted to ACT-FM`,
      }
    }
    return { code: fromDesc, tier: 'A', confidence: 'high', reason: `Dext line desc: "${desc.slice(0, 60)}"` }
  }

  // Tier B — vendor whitelist
  if (rules.vendor_rules[vendor]) {
    const r = rules.vendor_rules[vendor]
    return { code: r.code, tier: 'B', confidence: 'high', reason: r.note }
  }
  if (rules.special_vendors[vendor]) {
    const r = rules.special_vendors[vendor]
    return { code: r.code, tier: 'B', confidence: 'high', reason: r.note }
  }

  // Tier C — Witta vendor + date split
  if (wittaSet.has(vendor)) {
    if (row.date >= HARVEST_CUTOFF) {
      return { code: 'ACT-HV', tier: 'C', confidence: 'high', reason: `Witta vendor on/after ${HARVEST_CUTOFF}` }
    }
    return { code: 'ACT-FM', tier: 'C', confidence: 'medium', reason: `Witta vendor before ${HARVEST_CUTOFF} — farm general` }
  }

  // Tier D — known-ambiguous, needs manual review
  if (ambiguousSet.has(vendor)) {
    return { code: 'MANUAL', tier: 'D', confidence: 'manual', reason: 'Known-ambiguous vendor — decide by context' }
  }

  return null
}
