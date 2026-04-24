import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Suggestion {
  vendor_name: string
  receipt_count: number
  total_amount: number
  first_seen: string | null
  last_seen: string | null
  // Inferred defaults
  project_code: string
  category: string
  xero_account_code: string
  xero_tax_type: string
  xero_currency: string
  rd_eligible: boolean
  reason: string
  sample_subjects: string[]
}

// Category → account code defaults
const CATEGORY_ACCOUNT: Record<string, string> = {
  'Software & Subscriptions': '485',
  'Travel': '493',
  'Accommodation': '493',
  'Meals & Entertainment': '421',
  'Fuel': '449',
  'Hardware & Equipment': '446',
  'Telecommunications': '489',
  'Professional Services': '400',
  'Insurance': '433',
  'Contractor': '400',
  'Printing': '425',
  'Storage': '452',
  'Rent': '469',
  'Other': '429',
}

const R_D_CATEGORIES = new Set(['Software & Subscriptions', 'Professional Services'])

function inferRule(vendor: string, subject: string): Omit<Suggestion, 'vendor_name' | 'receipt_count' | 'total_amount' | 'sample_subjects'> {
  const v = (vendor || '').toLowerCase()
  const s = (subject || '').toLowerCase()
  const context = v + ' ' + s
  const reasons: string[] = []

  // --- Project code inference (location + context) ---
  let project_code = 'ACT-IN'
  if (/\b(alice springs|yulara|erldunda|ti tree|tennant|mparntwe|darwin|larrakeyah|territory|nt\b)/i.test(context)) {
    project_code = 'ACT-GD'; reasons.push('NT location → Goods')
  } else if (/\b(maleny|witta|beerwah|kenilworth|conondale|glass house|landsborough)/i.test(context)) {
    project_code = 'ACT-FM'; reasons.push('Sunshine Coast hinterland → Farm')
  } else if (/\b(carbatec|total tools|kennards|stratco|bunnings|hardware|tools|steel|carpentry|plastering|manufacturing|landscaping|trailer|kallega|canvas|electrical|plumbing|cnc)/i.test(context)) {
    project_code = 'ACT-HV'; reasons.push('Equipment/trade vendor → Harvest')
  } else if (/\b(bundanon|illaroo|old bar|kempsey|mittagong|cronulla)/i.test(context)) {
    project_code = 'ACT-IN'; reasons.push('NSW trip → Infrastructure')
  } else if (/\b(ljubljana|berlin|budapest|amsterdam|schiphol|kranjska|bled|vecses|bauhaus|gusto pizzeria|al fresco|strelec|mol nyrt)/i.test(context)) {
    project_code = 'ACT-IN'; reasons.push('Europe trip → Infrastructure')
  } else if (/\boonchiumpa/i.test(context)) {
    project_code = 'ACT-OO'; reasons.push('Oonchiumpa → ACT-OO')
  } else if (/\b(woodford|woodfordia|folk festival)/i.test(context)) {
    project_code = 'ACT-HV'; reasons.push('Woodford → Harvest')
  } else if (/\b(empathy|storyteller|bgfit|mounty|picc|goods)/i.test(context)) {
    // Specific project keywords — leave as default ACT-IN unless clearer signal
    project_code = 'ACT-IN'
  } else {
    reasons.push('Default Infrastructure')
  }

  // --- Category inference ---
  let category = 'Other'
  if (/\b(airways|airlines|qantas|virgin|qatar|airnorth|jetstar|flight|hinterland aviation)/i.test(context)) category = 'Travel'
  else if (/\b(hotel|motel|resort|airbnb|accommodation|bnb|lodge|stay|inn|hostel|glamping)/i.test(context)) category = 'Accommodation'
  else if (/\b(rental|avis|hertz|budget|sixt|car hire|green motion|smarte carte|uber)/i.test(context)) category = 'Travel'
  else if (/\b(ampol|shell|bp|7 eleven|liberty|fuel|petrol|caltex|united)/i.test(context)) category = 'Fuel'
  else if (/\b(restaurant|cafe|coffee|bar\b|pizza|eat|kitchen|ristorante|tavern|pub|sushi|bakery|gastronomia|pocky|casino)/i.test(context)) category = 'Meals & Entertainment'
  else if (/\b(bunnings|kennards|stratco|hardware|tools|carbatec|total tools|mitre|masters)/i.test(context)) category = 'Hardware & Equipment'
  else if (/\b(carpentry|plastering|electrical|plumbing|engineering|steel|welding|manufactur|fabricat)/i.test(context)) category = 'Contractor'
  else if (/\b(canvas|furnishers|furniture|upholstery|retro outdoor)/i.test(context)) category = 'Hardware & Equipment'
  else if (/\b(aami|insurance|allianz|nrma|suncorp|qbe)/i.test(context)) category = 'Insurance'
  else if (/\b(storage|self storage|bionic)/i.test(context)) category = 'Storage'
  else if (/\b(rent connect|housing|leasehold|tenancies)/i.test(context)) category = 'Rent'
  else if (/\b(eprint|printing|imaging centre|tj's imaging|defy design)/i.test(context)) category = 'Printing'
  else if (/\b(consultancy|consulting|legal|accountant|advisor)/i.test(context)) category = 'Professional Services'
  else if (/\b(\.com|\.io|\.ai|vercel|stripe|openai|anthropic|github|dialpad|cloudflare|notion|zapier|firecrawl|railway|humanitix|paddle|squarespace|linktree|ideogram|mighty networks|replit|supabase)/i.test(context)) category = 'Software & Subscriptions'

  reasons.push(`Category: ${category}`)

  // --- Currency inference ---
  let xero_currency = 'AUD'
  if (/\b(inc\b|llc\b|pty ltd singapore|singapore private|essex|london|kft\.?|s\.r\.o\.|nyrt|\.com\/help|san francisco|usa|united states|\bus\b|ny,|california)/i.test(context)) xero_currency = 'USD'
  if (xero_currency === 'AUD' && /\b(ljubljana|berlin|budapest|amsterdam|slovenia|hungary|germany|netherlands)/i.test(context)) xero_currency = 'EUR'

  // --- Tax type ---
  const xero_tax_type = xero_currency === 'AUD' ? 'INPUT' : 'BASEXCLUDED'

  return {
    project_code,
    category,
    xero_account_code: CATEGORY_ACCOUNT[category] || '429',
    xero_tax_type,
    xero_currency,
    rd_eligible: R_D_CATEGORIES.has(category),
    reason: reasons.join('; '),
  }
}

export async function GET() {
  const { data: rules } = await supabase.from('vendor_project_rules').select('vendor_name, aliases')
  const knownLower = new Set<string>()
  ;(rules || []).forEach((r: any) => {
    if (r.vendor_name) knownLower.add(r.vendor_name.toLowerCase().trim())
    ;(r.aliases || []).forEach((a: string) => a && knownLower.add(a.toLowerCase().trim()))
  })

  // Get unique vendors from receipt_emails with counts + samples
  const { data: vendors, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        vendor_name,
        COUNT(*)::int AS receipt_count,
        COALESCE(SUM(amount_detected), 0)::numeric AS total_amount,
        MIN(received_at)::date::text AS first_seen,
        MAX(received_at)::date::text AS last_seen,
        array_agg(DISTINCT subject ORDER BY subject) FILTER (WHERE subject IS NOT NULL) AS sample_subjects
      FROM receipt_emails
      WHERE vendor_name IS NOT NULL
        AND vendor_name NOT ILIKE '%unknown%'
        AND length(vendor_name) > 1
      GROUP BY vendor_name
      HAVING COUNT(*) > 0
      ORDER BY COALESCE(SUM(amount_detected), 0) DESC NULLS LAST
      LIMIT 200
    `,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const suggestions: Suggestion[] = []
  for (const v of vendors || []) {
    const lc = v.vendor_name.toLowerCase().trim()
    // Skip if already in rules (case-insensitive)
    if (knownLower.has(lc)) continue
    // Skip fuzzy match: any known rule name that's contained in this vendor
    let isKnown = false
    for (const known of knownLower) {
      if (lc.includes(known) || known.includes(lc)) { isKnown = true; break }
    }
    if (isKnown) continue

    const samples = (v.sample_subjects || []).slice(0, 2)
    const inferred = inferRule(v.vendor_name, samples.join(' '))
    suggestions.push({
      vendor_name: v.vendor_name,
      receipt_count: v.receipt_count,
      total_amount: Number(v.total_amount) || 0,
      first_seen: v.first_seen || null,
      last_seen: v.last_seen || null,
      sample_subjects: samples,
      ...inferred,
    })
  }

  return NextResponse.json({ total: suggestions.length, suggestions })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rules = Array.isArray(body.rules) ? body.rules : [body]
    const inserts = rules.map((r: any) => ({
      vendor_name: r.vendor_name,
      aliases: r.aliases || [],
      project_code: r.project_code,
      category: r.category,
      rd_eligible: r.rd_eligible ?? false,
      auto_apply: r.auto_apply ?? true,
      xero_account_code: r.xero_account_code,
      xero_tax_type: r.xero_tax_type || 'INPUT',
      xero_currency: r.xero_currency || 'AUD',
      xero_business_division: r.xero_business_division || 'A Curious Tractor',
    }))

    const { data, error } = await supabase.from('vendor_project_rules').insert(inserts).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inserted: data?.length || 0, data })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
