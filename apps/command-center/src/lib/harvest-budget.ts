/**
 * The Harvest (ACT-HV) — stage/zone budget config.
 *
 * Budgets here are DRAFT — edit them freely; they're the only thing you need to
 * touch to change the budget side. Actuals are computed live from Xero by mapping
 * each supplier to a zone via HARVEST_VENDOR_ZONES (see /api/finance/projects/ACT-HV).
 *
 * Scope: Harvest spend from 1 Jan 2026 (project start). "Garden area" = the zones
 * flagged garden:true (grow + paths + garden labour + the stage-2 grow structures).
 */

export interface HarvestZone {
  id: string
  label: string
  stage: 1 | 2
  /** Part of the garden area (pinned + highlighted on the page). */
  garden: boolean
  /** DRAFT annual budget — edit me. */
  budget: number
}

// Stage 1 = active build/garden (2026). Stage 2 = next (art space, tool shed, poly tunnel).
export const HARVEST_ZONES: HarvestZone[] = [
  { id: 'garden',           label: 'Garden & beds',              stage: 1, garden: true,  budget: 40000 },
  { id: 'paths-structures', label: 'Paths & structures (timber)', stage: 1, garden: true,  budget: 28000 },
  { id: 'labour',           label: 'Labour (Joey, 50% to Harvest)', stage: 1, garden: true,  budget: 10000 },
  { id: 'pavilion',         label: 'Milk Crate Pavilion',        stage: 1, garden: false, budget: 10000 },
  { id: 'tools-equipment',  label: 'Tools & equipment',          stage: 1, garden: false, budget: 12000 },
  { id: 'materials',        label: 'Materials & hardware',       stage: 1, garden: false, budget: 9000 },
  { id: 'design',           label: 'Design & branding',          stage: 1, garden: false, budget: 15000 },
  { id: 'hospitality',      label: 'Hospitality & meals',        stage: 1, garden: false, budget: 3000 },
  { id: 'fuel-travel',      label: 'Fuel & travel',              stage: 1, garden: false, budget: 1500 },
  { id: 'other',            label: 'Other',                      stage: 1, garden: false, budget: 1000 },
  { id: 'art-space',        label: 'Art Space',                  stage: 2, garden: false, budget: 5000 },
  { id: 'tool-shed',        label: 'Tool shed',                  stage: 2, garden: true,  budget: 3000 },
  { id: 'poly-tunnel',      label: 'Poly tunnel',                stage: 2, garden: true,  budget: 5000 },
]

/**
 * Supplier → zone map. Keys are lower-cased substrings matched against the Xero
 * contact name (so "maleny hardware" catches all the "… Maleny Hardware & Rural"
 * variants). First matching zone wins. Unmapped suppliers fall to "unallocated".
 */
export const HARVEST_VENDOR_ZONES: Record<string, string[]> = {
  garden:           ['sophie', 'maleny landscaping', 'savage landscape', 'savage transport'],
  'paths-structures': ['kennedy', 'smartwood'],
  labour:           ['joseph kirmos'],
  pavilion:         ['longara'],
  'tools-equipment': ['total tools', 'diggermate', 'hydraulink', 'salin appliance', 'supercheap'],
  materials:        ['bunnings', 'maleny hardware', 'bussell rural', 'auscot rural', 'nest in witta', 'bcf'],
  design:           ['thais pupio'],
  hospitality:      ['mapleton public house', "fisher's oyster", 'sukhothai', 'iga', 'woolworths', 'maleny hotel', 'light years', '7-eleven', 'frank food', "cj's pastries", 'alsahwa', 'art museum', 'maleny bakery'],
  'fuel-travel':    ['liberty maleny', 'avis'],
  other:            ['brisbane city council'],
}

/** Resolve a Xero contact name to a zone id, or null if unmapped. */
export function zoneForVendor(contact: string | null | undefined): string | null {
  if (!contact) return null
  const c = contact.toLowerCase()
  for (const [zone, keys] of Object.entries(HARVEST_VENDOR_ZONES)) {
    if (keys.some((k) => c.includes(k))) return zone
  }
  return null
}
