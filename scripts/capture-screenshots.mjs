#!/usr/bin/env node
/**
 * Capture homepage screenshots for the Development Dashboard.
 * Uses Playwright to take 1200x630 screenshots of each site.
 *
 * Usage:
 *   node scripts/capture-screenshots.mjs           # All sites
 *   node scripts/capture-screenshots.mjs --force    # Re-capture even if exists
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const OUT_DIR = resolve(
  import.meta.dirname,
  '../apps/command-center/public/screenshots'
)

const SITES = [
  // Core ecosystem
  { slug: 'empathy-ledger', url: 'https://empathy-ledger-v2.vercel.app', name: 'Empathy Ledger' },
  { slug: 'justicehub', url: 'https://justicehub.com.au', name: 'JusticeHub' },
  { slug: 'goods-on-country', url: 'https://v2-rho-ochre.vercel.app', name: 'Goods on Country' },
  { slug: 'the-harvest', url: 'https://theharvestwitta.com.au', name: 'The Harvest' },
  { slug: 'act-studio', url: 'https://act.place', name: 'ACT Regenerative Studio' },
  // Satellite / partner sites
  { slug: 'barkly-research', url: 'https://barkly-research-platform-jjan.vercel.app', name: 'Barkly Research' },
  { slug: 'oonchiumpa', url: 'https://oonchiumpa.vercel.app', name: 'Oonchiumpa' },
  { slug: 'act-farm', url: 'https://act-farm.vercel.app', name: 'ACT Farm' },
  { slug: 'campfire', url: 'https://campfire.wiki', name: 'Campfire' },
  { slug: 'palm-island', url: 'https://palm-island-repository.vercel.app', name: 'Palm Island' },
  { slug: 'diagrama', url: 'https://diagramaaustralia.org', name: 'Diagrama' },
  { slug: 'picc-station', url: 'https://picc-station-map.vercel.app', name: 'PICC Station' },
  { slug: 'custodian-economy', url: 'https://custodian-economy-platform.vercel.app', name: 'Custodian Economy' },
  { slug: 'mount-isa-services', url: 'https://mount-isa-service-map.vercel.app', name: 'Mount Isa Services' },
  { slug: 'bail-program', url: 'https://bail-program-cms.vercel.app', name: 'Bail Program' },
  { slug: 'youth-justice', url: 'https://qld-youth-justice-tracker.vercel.app', name: 'Youth Justice Tracker' },
  { slug: 'great-palm-island-picc', url: 'https://great-palm-island-picc.vercel.app', name: 'Great Palm Island PICC' },
  { slug: 'mounty-yarns', url: 'https://mounty-yarns.vercel.app', name: 'Mounty Yarns' },
]

const force = process.argv.includes('--force')

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  console.log(`Capturing ${SITES.length} site screenshots → ${OUT_DIR}`)
  console.log(`Mode: ${force ? 'force re-capture all' : 'skip existing'}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2, // retina-quality
  })

  let captured = 0
  let skipped = 0
  let failed = 0

  for (const site of SITES) {
    const outPath = resolve(OUT_DIR, `${site.slug}.png`)

    if (!force && existsSync(outPath)) {
      console.log(`  ⏭  ${site.name} (exists)`)
      skipped++
      continue
    }

    try {
      const page = await context.newPage()
      console.log(`  📸 ${site.name} → ${site.url}`)

      await page.goto(site.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })

      // Wait a bit for any lazy-loaded hero images/animations
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: outPath,
        type: 'png',
        clip: { x: 0, y: 0, width: 1200, height: 630 },
      })

      await page.close()
      captured++
      console.log(`       ✓ saved`)
    } catch (err) {
      console.log(`       ✗ failed: ${err.message}`)
      failed++
    }
  }

  await browser.close()

  console.log(`\nDone: ${captured} captured, ${skipped} skipped, ${failed} failed`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
