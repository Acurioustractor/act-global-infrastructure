// Project-code inference for untagged transactions — the location/vendor rules
// proven in /api/finance/vendor-rules-suggest, extracted as a pure (client-safe)
// function so the Mirror can suggest a project inline with an explainable reason.
// Heuristic, instant, free. An LLM pass can layer on top for the ambiguous tail.

export type SuggestConfidence = 'high' | 'medium' | 'low'
export interface ProjectSuggestion {
  code: string
  reason: string
  confidence: SuggestConfidence
}

export function suggestProject(vendor: string | null | undefined, description?: string | null): ProjectSuggestion {
  const context = `${(vendor || '').toLowerCase()} ${(description || '').toLowerCase()}`

  // Strongest signal: an explicit project code already in the text (common in
  // Dext-imported line descriptions, e.g. "Vendor — Materials — ACT-GD").
  const explicit = context.match(/\bact-[a-z0-9]{2}\b/)
  if (explicit) return { code: explicit[0].toUpperCase(), reason: 'Project code in description', confidence: 'high' }

  // Location signals are the strongest (high confidence)
  if (/\b(alice springs|yulara|erldunda|ti tree|tennant|mparntwe|darwin|larrakeyah|territory|\bnt\b)/.test(context))
    return { code: 'ACT-GD', reason: 'NT location → Goods', confidence: 'high' }
  if (/\b(maleny|witta|beerwah|kenilworth|conondale|glass house|landsborough)/.test(context))
    return { code: 'ACT-FM', reason: 'Sunshine Coast hinterland → Farm', confidence: 'high' }
  if (/\boonchiumpa\b/.test(context))
    return { code: 'ACT-OO', reason: 'Oonchiumpa → ACT-OO', confidence: 'high' }
  if (/\b(woodford|woodfordia|folk festival)/.test(context))
    return { code: 'ACT-HV', reason: 'Woodford → Harvest', confidence: 'high' }

  // Vendor/trade + trip signals (medium)
  if (/\b(carbatec|total tools|kennards|stratco|bunnings|hardware|tools|steel|carpentry|plastering|manufacturing|landscaping|trailer|kallega|canvas|electrical|plumbing|cnc)/.test(context))
    return { code: 'ACT-HV', reason: 'Equipment/trade vendor → Harvest', confidence: 'medium' }
  if (/\b(bundanon|illaroo|old bar|kempsey|mittagong|cronulla)/.test(context))
    return { code: 'ACT-IN', reason: 'NSW trip → Infrastructure', confidence: 'medium' }
  if (/\b(ljubljana|berlin|budapest|amsterdam|schiphol|kranjska|bled|vecses|bauhaus|mol nyrt)/.test(context))
    return { code: 'ACT-IN', reason: 'Europe trip → Infrastructure', confidence: 'medium' }

  // Fallback (low — just a default, surfaced muted so it's clearly a guess)
  return { code: 'ACT-IN', reason: 'Default → Infrastructure', confidence: 'low' }
}
