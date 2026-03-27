#!/usr/bin/env node
/**
 * Import ATO DGR (Deductible Gift Recipient) Register
 *
 * The ATO publishes a downloadable register of all DGR-endorsed entities.
 * This script downloads and cross-references against our foundation list
 * to identify grant-makers we might be missing.
 *
 * Data source: https://data.gov.au/dataset/dgr-endorsed-organisations
 * Also: ATO's ABN Lookup bulk extract at data.gov.au
 *
 * Usage:
 *   node scripts/import-ato-dgr-register.mjs [--file path/to/dgr.csv] [--dry-run]
 *
 * If no --file is provided, attempts to download from data.gov.au
 */
import './lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'
import { createReadStream, existsSync } from 'fs'
import { createInterface } from 'readline'

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileArg = args.find((_, i, a) => a[i - 1] === '--file')

// DGR data URL from data.gov.au (ABN bulk extract with DGR endorsement)
const DGR_DATA_URL = 'https://data.gov.au/data/dataset/5905e926-5c7a-4d31-be3e-eeaeab81a42c/resource/6ceb2038-9a02-4f33-bd83-51ec03fba871/download'

async function downloadDGRData() {
  console.log('Downloading DGR data from data.gov.au...')
  try {
    const res = await fetch(DGR_DATA_URL)
    if (!res.ok) {
      console.error(`Download failed: ${res.status} ${res.statusText}`)
      console.error('Fallback: Download manually from https://data.gov.au and use --file flag')
      return null
    }
    return await res.text()
  } catch (err) {
    console.error(`Download error: ${err.message}`)
    console.error('Fallback: Download manually from https://data.gov.au and use --file flag')
    return null
  }
}

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

async function processCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim())
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'))

  console.log(`CSV columns: ${header.join(', ')}`)
  console.log(`Total rows: ${lines.length - 1}`)

  const abnIdx = header.findIndex(h => h.includes('abn'))
  const nameIdx = header.findIndex(h => h.includes('name') || h.includes('entity'))
  const dgrIdx = header.findIndex(h => h.includes('dgr'))
  const typeIdx = header.findIndex(h => h.includes('type') || h.includes('entity_type'))

  if (abnIdx === -1) {
    console.error('Could not find ABN column in CSV')
    return
  }

  // Collect all DGR-endorsed ABNs
  const dgrEntities = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    const abn = (fields[abnIdx] || '').replace(/\s/g, '')
    if (!abn || abn.length < 9) continue

    // If there's a DGR column, check it; otherwise assume all rows are DGR-endorsed
    if (dgrIdx >= 0) {
      const dgrVal = (fields[dgrIdx] || '').toLowerCase()
      if (!dgrVal.includes('y') && !dgrVal.includes('true') && !dgrVal.includes('1')) continue
    }

    dgrEntities.push({
      abn,
      name: fields[nameIdx] || '',
      entity_type: typeIdx >= 0 ? fields[typeIdx] : null,
    })
  }

  console.log(`Found ${dgrEntities.length} DGR-endorsed entities`)

  // Cross-reference against our foundations
  const { data: foundations } = await supabase
    .from('foundations')
    .select('id, name, acnc_abn, has_dgr')
    .not('acnc_abn', 'is', null)

  const foundationABNs = new Set((foundations || []).map(f => f.acnc_abn?.replace(/\s/g, '')))
  const dgrABNs = new Set(dgrEntities.map(e => e.abn))

  // Foundations in our DB that are DGR-endorsed
  const matchedDGR = (foundations || []).filter(f => dgrABNs.has(f.abn?.replace(/\s/g, '')))
  const alreadyTagged = matchedDGR.filter(f => f.has_dgr === true)
  const needsTagging = matchedDGR.filter(f => f.has_dgr !== true)

  // DGR entities NOT in our foundation list (potential new foundations to add)
  const missingFromDB = dgrEntities.filter(e => !foundationABNs.has(e.abn))

  console.log(`\nCross-reference results:`)
  console.log(`  Foundations with DGR match: ${matchedDGR.length}`)
  console.log(`  Already tagged as DGR: ${alreadyTagged.length}`)
  console.log(`  Need DGR tagging: ${needsTagging.length}`)
  console.log(`  DGR entities NOT in our DB: ${missingFromDB.length}`)

  if (!dryRun && needsTagging.length > 0) {
    console.log(`\nTagging ${needsTagging.length} foundations as DGR...`)
    let updated = 0
    for (const f of needsTagging) {
      const { error } = await supabase
        .from('foundations')
        .update({ has_dgr: true, updated_at: new Date().toISOString() })
        .eq('id', f.id)
      if (!error) updated++
    }
    console.log(`  Updated: ${updated}`)
  }

  // Log potential new foundations (top 20 by name)
  if (missingFromDB.length > 0) {
    console.log(`\nTop potential new foundations (DGR-endorsed, not in our DB):`)
    missingFromDB.slice(0, 20).forEach(e => {
      console.log(`  ABN ${e.abn}: ${e.name}`)
    })
    if (missingFromDB.length > 20) {
      console.log(`  ... and ${missingFromDB.length - 20} more`)
    }
  }
}

async function main() {
  console.log(`ATO DGR Register Import (dry-run: ${dryRun})`)

  let csvText
  if (fileArg && existsSync(fileArg)) {
    console.log(`Reading from file: ${fileArg}`)
    const { readFileSync } = await import('fs')
    csvText = readFileSync(fileArg, 'utf-8')
  } else {
    csvText = await downloadDGRData()
  }

  if (!csvText) {
    console.error('No data to process. Use --file or check download URL.')
    process.exit(1)
  }

  await processCSV(csvText)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
