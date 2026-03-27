#!/usr/bin/env node
/**
 * Enrich foundations with DGR (Deductible Gift Recipient) status via ABR API
 *
 * DGR status is the #1 signal for identifying grant-making foundations.
 * Entities with DGR endorsement can receive tax-deductible donations,
 * which strongly correlates with active grant-making.
 *
 * Usage:
 *   node scripts/enrich-dgr-status.mjs [--limit 100] [--dry-run]
 *
 * Requires: ABR_GUID env var (get free from abr.business.gov.au)
 */
import './lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ABR_GUID = process.env.ABR_GUID

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!ABR_GUID) {
  console.error('Missing ABR_GUID — register free at https://abr.business.gov.au/Tools/WebServices')
  console.error('Set ABR_GUID in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limit = Number(args.find((_, i, a) => a[i - 1] === '--limit') || 100)

const ABR_BASE = 'https://abr.business.gov.au/json'

async function lookupABN(abn) {
  const url = `${ABR_BASE}/AbnDetails.aspx?abn=${abn}&callback=callback&guid=${ABR_GUID}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    // Response is JSONP: callback({...})
    const json = JSON.parse(text.replace(/^callback\(/, '').replace(/\)$/, ''))
    return json
  } catch (err) {
    console.error(`  ABR lookup failed for ${abn}: ${err.message}`)
    return null
  }
}

function extractDGR(abrData) {
  if (!abrData || !abrData.Abn) return null

  const dgr = abrData.Dgr || []
  const hasDgr = dgr.length > 0 && dgr.some(d => !d.EndDt || new Date(d.EndDt) > new Date())
  const entityType = abrData.EntityType?.EntityDescription || null
  const gstStatus = abrData.Gst ? 'registered' : 'not_registered'

  return {
    has_dgr: hasDgr,
    dgr_items: dgr.filter(d => !d.EndDt || new Date(d.EndDt) > new Date()),
    entity_type_abr: entityType,
    gst_status: gstStatus,
    abr_status: abrData.EntityStatus?.EntityStatusCode || null,
  }
}

async function main() {
  console.log(`Enriching DGR status via ABR API (limit: ${limit}, dry-run: ${dryRun})`)

  // Get foundations without DGR status that have an ABN
  const { data: foundations, error } = await supabase
    .from('foundations')
    .select('id, name, acnc_abn')
    .not('acnc_abn', 'is', null)
    .is('has_dgr', null)
    .limit(limit)

  if (error) {
    console.error('Failed to fetch foundations:', error.message)
    process.exit(1)
  }

  console.log(`Found ${foundations.length} foundations without DGR status`)

  let enriched = 0
  let dgrCount = 0
  let errors = 0

  for (const foundation of foundations) {
    const abn = foundation.acnc_abn.replace(/\s/g, '')
    process.stdout.write(`  ${foundation.name} (${abn})...`)

    const abrData = await lookupABN(abn)
    const dgr = extractDGR(abrData)

    if (!dgr) {
      console.log(' ABR error')
      errors++
      continue
    }

    if (dryRun) {
      console.log(` DGR=${dgr.has_dgr} (dry-run)`)
    } else {
      const { error: updateError } = await supabase
        .from('foundations')
        .update({
          has_dgr: dgr.has_dgr,
          metadata: {
            abr_entity_type: dgr.entity_type_abr,
            abr_status: dgr.abr_status,
            gst_status: dgr.gst_status,
            dgr_items: dgr.dgr_items,
            dgr_enriched_at: new Date().toISOString(),
          },
        })
        .eq('id', foundation.id)

      if (updateError) {
        console.log(` update failed: ${updateError.message}`)
        errors++
      } else {
        console.log(` DGR=${dgr.has_dgr}`)
        enriched++
        if (dgr.has_dgr) dgrCount++
      }
    }

    // Rate limit: ABR allows ~2 req/sec
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone: ${enriched} enriched, ${dgrCount} with DGR, ${errors} errors`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
