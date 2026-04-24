#!/usr/bin/env node
/**
 * bitwarden-bootstrap.mjs
 *
 * Creates the ACT folder hierarchy + stub login items for missing
 * credentials, per wiki/decisions/operational-reference.md.
 *
 * Idempotent: if a folder/item with the target name already exists, skip.
 * Dry-run by default; --apply to write.
 *
 * Pre-requisites:
 *   1. bw installed + logged in as the ACT primary user
 *   2. BW_SESSION exported (`bw unlock --raw`)
 *
 * Usage:
 *   node scripts/bitwarden-bootstrap.mjs              # dry-run (show plan)
 *   node scripts/bitwarden-bootstrap.mjs --apply      # write to vault
 *   node scripts/bitwarden-bootstrap.mjs --folders    # only folders
 *   node scripts/bitwarden-bootstrap.mjs --stubs      # only stub items
 */
import { execSync } from 'node:child_process'

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const ONLY_FOLDERS = argv.includes('--folders')
const ONLY_STUBS = argv.includes('--stubs')

// Folder hierarchy. Nesting via "/" — Bitwarden displays as tree in desktop.
const FOLDERS = [
  // ACT Pty
  'ACT Pty/Banking + finance',
  'ACT Pty/Tax + regulatory portals',
  'ACT Pty/Service providers',
  'ACT Pty/Insurance policies',

  // Cloud + APIs (shared across Pty + projects)
  'ACT Cloud/APIs (LLM)',
  'ACT Cloud/APIs (other)',
  'ACT Cloud/Supabase',
  'ACT Cloud/Vercel',
  'ACT Cloud/GitHub',
  'ACT Cloud/Notion',
  'ACT Cloud/DNS + CDN',
  'ACT Cloud/Telegram',

  // Domains
  'ACT Domains',

  // Per-project
  'ACT Projects/Goods',
  'ACT Projects/JusticeHub',
  'ACT Projects/Empathy Ledger',
  'ACT Projects/Harvest',
  'ACT Projects/Farm',
  'ACT Projects/PICC',
  'ACT Projects/Oonchiumpa',
  'ACT Projects/CivicGraph',
  'ACT Projects/CAMPFIRE',
  'ACT Projects/BG Fit',

  // A Kind Tractor (charity)
  'A Kind Tractor/ACNC + tax',
  'A Kind Tractor/Banking',

  // Sole trader archive (fills up post-cutover)
  'ACT Sole Trader Archive',
]

// Stub login items for credentials that should exist but don't yet.
// Each becomes an empty login item with placeholder URI + notes; you fill in
// username + password the next time you actually log in to that portal.
const STUBS = [
  {
    name: 'ASIC portal (Pty)',
    folder: 'ACT Pty/Tax + regulatory portals',
    uri: 'https://asicconnect.asic.gov.au/',
    notes: 'For managing A Curious Tractor Pty Ltd ACN 697 347 676. Annual review ~April 2027. Login via myGovID typically.',
  },
  {
    name: 'ABRS portal — Director ID',
    folder: 'ACT Pty/Tax + regulatory portals',
    uri: 'https://www.abrs.gov.au/',
    notes: 'Director IDs for Ben + Nic. Login via myGovID. Both directors must register before ABN application can complete.',
  },
  {
    name: 'ATO Online Services (Pty)',
    folder: 'ACT Pty/Tax + regulatory portals',
    uri: 'https://onlineservices.ato.gov.au/business',
    notes: 'For Pty ABN tax / BAS / PAYG. Login via myGovID. Set up after ABN issues (Week 1-2).',
  },
  {
    name: 'AusIndustry R&D Tax Incentive',
    folder: 'ACT Pty/Tax + regulatory portals',
    uri: 'https://business.gov.au/grants-and-programs/research-and-development-tax-incentive',
    notes: 'FY26 R&D claim under sole trader (current). FY27 re-register under Pty post-cutover.',
  },
  {
    name: 'Standard Ledger client portal',
    folder: 'ACT Pty/Service providers',
    uri: '',
    notes: 'Engaged accountant. Confirm portal URL on first invoice. Handles ABN/GST filing, BAS, tax returns, lawyer referral, R&D coordination.',
  },
  {
    name: 'Insurance broker (TBD selection)',
    folder: 'ACT Pty/Service providers',
    uri: '',
    notes: 'Week 1 CEO action: select 3 brokers, get quotes for D&O + PL $20M, pick one. D&O bound by 2026-05-24 (within 30 days of Pty registration).',
  },
  {
    name: 'NAB Pty business banking',
    folder: 'ACT Pty/Banking + finance',
    uri: 'https://www.nab.com.au/',
    notes: 'Pty business account application in flight. 2-week onboarding. Will receive all Pty revenue from 1 July. PayID / Osko set up here.',
  },
  {
    name: 'Stripe (Pty) — to create',
    folder: 'ACT Pty/Banking + finance',
    uri: 'https://dashboard.stripe.com/',
    notes: 'NEW account required (Stripe does not transfer between ABNs). Create when Pty ABN issues. 30+ day customer notice for re-auth of subscriptions per CEO-review TODO #3.',
  },
  {
    name: 'ACNC charity portal (A Kind Tractor)',
    folder: 'A Kind Tractor/ACNC + tax',
    uri: 'https://www.acnc.gov.au/charity',
    notes: 'A Kind Tractor Ltd ACN 669 029 341, ABN 73 669 029 341. ACNC-registered 2023-12-11. Annual information statement obligation. NOT DGR-endorsed (application parked).',
  },
]

function bw(args, stdin) {
  try {
    return execSync(`bw ${args}`, {
      encoding: 'utf8',
      env: process.env,
      input: stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (err) {
    const msg = err.stderr?.toString() || err.message
    throw new Error(`bw ${args}: ${msg.slice(0, 300)}`)
  }
}

function precheck() {
  try {
    execSync('which bw', { stdio: 'pipe' })
  } catch {
    console.error('bw (Bitwarden CLI) not installed.')
    process.exit(2)
  }
  if (!process.env.BW_SESSION) {
    console.error('BW_SESSION not set.')
    console.error('Run: export BW_SESSION="$(bw unlock --raw)"')
    process.exit(3)
  }
}

function listFolders() {
  return JSON.parse(bw('list folders'))
}

function listItems() {
  return JSON.parse(bw('list items'))
}

function createFolder(name) {
  const payload = JSON.stringify({ name })
  const encoded = bw('encode', payload).trim()
  return JSON.parse(bw(`create folder ${encoded}`))
}

function createLoginItem({ name, folderId, uri, notes }) {
  // Build item from template structure
  const item = {
    type: 1, // login
    name,
    folderId,
    notes,
    favorite: false,
    fields: [],
    login: {
      uris: uri ? [{ uri, match: null }] : [],
      username: '',
      password: '',
      totp: null,
    },
    secureNote: null,
    card: null,
    identity: null,
    reprompt: 0,
  }
  const encoded = bw('encode', JSON.stringify(item)).trim()
  return JSON.parse(bw(`create item ${encoded}`))
}

function planFolders(existing) {
  const have = new Set(existing.map(f => f.name))
  const missing = FOLDERS.filter(name => !have.has(name))
  return { missing, existing }
}

function planStubs(existingItems, folderMap) {
  const haveNames = new Set(existingItems.map(i => i.name.toLowerCase()))
  const missing = STUBS.filter(s => !haveNames.has(s.name.toLowerCase()))
  // Verify each missing stub's target folder exists (or will exist post-folders run)
  const folderNamesAfter = new Set([...folderMap.keys(), ...FOLDERS])
  for (const s of missing) {
    if (!folderNamesAfter.has(s.folder)) {
      console.error(`WARNING: stub "${s.name}" targets folder "${s.folder}" which does not exist and is not in FOLDERS list. Skipping.`)
    }
  }
  return missing.filter(s => folderNamesAfter.has(s.folder))
}

function main() {
  precheck()

  console.log(`[bitwarden-bootstrap] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log('[bitwarden-bootstrap] reading vault state…')

  const existingFolders = listFolders()
  const folderMap = new Map(existingFolders.map(f => [f.name, f.id]))
  const existingItems = listItems()

  console.log(`  → ${existingFolders.length} folders, ${existingItems.length} items currently in vault\n`)

  // === FOLDERS ===
  const { missing: missingFolders } = planFolders(existingFolders)

  if (!ONLY_STUBS) {
    console.log(`FOLDERS — ${missingFolders.length} to create:`)
    for (const name of missingFolders) {
      console.log(`  [+] ${name}`)
    }
    if (missingFolders.length === 0) console.log('  (none — all already exist)')
    console.log('')

    if (APPLY) {
      console.log('[bitwarden-bootstrap] creating folders…')
      for (const name of missingFolders) {
        try {
          const f = createFolder(name)
          folderMap.set(f.name, f.id)
          console.log(`  ✓ ${name}`)
        } catch (err) {
          console.error(`  ✗ ${name} — ${err.message}`)
        }
      }
      console.log('')
    }
  }

  // === STUBS ===
  if (!ONLY_FOLDERS) {
    const missingStubs = planStubs(existingItems, folderMap)
    console.log(`STUB ITEMS — ${missingStubs.length} to create:`)
    for (const s of missingStubs) {
      console.log(`  [+] "${s.name}" → folder "${s.folder}"`)
    }
    if (missingStubs.length === 0) console.log('  (none — all already exist)')
    console.log('')

    if (APPLY) {
      console.log('[bitwarden-bootstrap] creating stub items…')
      for (const s of missingStubs) {
        const folderId = folderMap.get(s.folder)
        if (!folderId) {
          console.error(`  ✗ "${s.name}" — folder "${s.folder}" not found (run --folders first or run without --stubs)`)
          continue
        }
        try {
          createLoginItem({
            name: s.name,
            folderId,
            uri: s.uri,
            notes: s.notes,
          })
          console.log(`  ✓ ${s.name}`)
        } catch (err) {
          console.error(`  ✗ ${s.name} — ${err.message}`)
        }
      }
      console.log('')
    }
  }

  // === SUMMARY ===
  if (!APPLY) {
    console.log('DRY-RUN complete. Re-run with --apply to write changes to vault.')
    console.log('Recommended: run --folders first, verify in Bitwarden desktop, then --stubs.')
  } else {
    console.log('Done. Run `bw sync` then check Bitwarden desktop to see new structure.')
  }
}

main()
