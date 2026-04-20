#!/usr/bin/env node
/**
 * Bootstrap source summaries in wiki/sources/ from existing raw files.
 *
 * Modes:
 * - curated presets for high-value ACT sources
 * - auto-generated summaries for the older published article corpus
 * - auto-generated summaries for high-priority non-article raw sources
 *
 * Usage:
 *   node scripts/wiki-bootstrap-source-summaries.mjs
 *   node scripts/wiki-bootstrap-source-summaries.mjs --dry-run
 *   node scripts/wiki-bootstrap-source-summaries.mjs --auto-supabase-articles
 *   node scripts/wiki-bootstrap-source-summaries.mjs --auto-supabase-articles --limit 10
 *   node scripts/wiki-bootstrap-source-summaries.mjs --auto-priority-raw
 *   node scripts/wiki-bootstrap-source-summaries.mjs --auto-priority-raw --limit 12
 *   node scripts/wiki-bootstrap-source-summaries.mjs 2026-04-07-scrape-act-place-about
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { logWikiEvent } from './wiki-log.mjs'
import { parseFrontmatter, writeSourcesIndex } from './lib/wiki-sources.mjs'
import {
  buildRawSourcePriorityRecord,
  classifyRawSourceKind,
  inferConnectedPages,
} from './lib/wiki-source-bridge.mjs'

const ROOT = process.cwd()
const WIKI_ROOT = join(ROOT, 'wiki')
const RAW_DIR = join(WIKI_ROOT, 'raw')
const SOURCES_DIR = join(WIKI_ROOT, 'sources')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const autoSupabaseArticles = args.includes('--auto-supabase-articles')
const autoPriorityRaw = args.includes('--auto-priority-raw')
const limitFlagIndex = args.indexOf('--limit')
const limit =
  limitFlagIndex !== -1 && args[limitFlagIndex + 1]
    ? Number.parseInt(args[limitFlagIndex + 1], 10)
    : null
const requestedKeys = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false
  if (limitFlagIndex !== -1 && index === limitFlagIndex + 1) return false
  return true
})

const PRESET_SUMMARIES = {
  '2026-04-07-scrape-act-place-about': {
    title: 'Source Summary — ACT About / Farm Ecosystem',
    summary:
      'Public ACT about-page capture that defines the farm ecosystem metaphor, founder framing, innovation philosophy, and origin-story language.',
    sourceSystem: 'Website',
    sourceKind: 'public_site_scrape',
    keyFacts: [
      'Defines the public glossary of ACT metaphor terms: Soil, Seeds, Seed House, Forest, Campfire, Fields, Lab, Warehouse, Tools, Road Stall, Tractor, and Water Tank.',
      'Frames ACT as a place where innovation, connection, and real human experience matter more than generic impact language.',
      'Shows the early public voice around raucousness, tractor symbolism, and founders-as-farmers.',
      'Captures testimonial language from justice, storytelling, and founder-support relationships that shaped the public shell.',
    ],
    whyItMatters: [
      'This is one of the clearest public sources for ACT’s original metaphor system.',
      'It helps explain how ACT moved from a broad farm/ecosystem language into the sharper wiki-first model now being built.',
      'It is useful for tracing continuity between early brand language and the current LCAA / ecosystem framing.',
    ],
    connectedPages: [
      '[[act-identity|ACT Identity]]',
      '[[act-ecosystem|ACT Ecosystem]]',
      '[[act-studio|ACT Regenerative Studio]]',
      '[[act-farm|ACT Farm]]',
      '[[beautiful-obsolescence|Beautiful Obsolescence]]',
    ],
  },
  '2026-04-07-scrape-act-place-empathy-ledger': {
    title: 'Source Summary — ACT Project Page / Empathy Ledger',
    summary:
      'Public ACT project-page capture for Empathy Ledger covering storyteller sovereignty, reciprocity, community ownership, and the traditional-versus-transformative framing.',
    sourceSystem: 'Website',
    sourceKind: 'public_site_scrape',
    keyFacts: [
      'Contrasts extractive impact methodology with Empathy Ledger’s storyteller-sovereign, reciprocity-based model.',
      'States the four-step public flow: share your story, maintain control, create value, benefit fairly.',
      'Names community ownership, privacy by design, purpose-driven use, and fair value sharing as system principles.',
      'Positions EL as infrastructure built to honor community-set rules rather than tech-company defaults.',
    ],
    whyItMatters: [
      'This is a stable public framing source for Empathy Ledger before live editorial/media syndication.',
      'It helps the wiki keep the philosophical frame of EL distinct from later product or content-layer descriptions.',
      'It is useful for website alignment because the current public shell still needs to preserve this sovereignty language.',
    ],
    connectedPages: [
      '[[empathy-ledger|Empathy Ledger]]',
      '[[consent-as-infrastructure|Consent as Infrastructure]]',
      '[[governance-consent|Governance & Consent]]',
      '[[indigenous-data-sovereignty|Indigenous Data Sovereignty]]',
      '[[transcript-analysis-method|Transcript Analysis Method]]',
    ],
  },
  '2026-04-07-scrape-act-place-2024-review': {
    title: 'Source Summary — ACT 2024 In Review',
    summary:
      'Public 2024 review capture mapping the seasonal arc of ACT’s year across Mount Isa, DAD.LAB, Diagrama, Goods, Harvest, SMART, Gold.Phone, and justice work.',
    sourceSystem: 'Website',
    sourceKind: 'public_site_scrape',
    keyFacts: [
      'Provides a month-by-month timeline linking studio, justice, Harvest, Goods, and fellowship work across 2024.',
      'Marks pivotal moments: DAD.LAB start, Diagrama visit, Gold.Phone launch, Goods trips, CAMPFIRE start, and inquiry tooling.',
      'Shows how ACT publicly framed 2024 as a weaving of innovation, tradition, art, and action.',
      'Captures the ecosystem view that different projects are one evolving field, not disconnected outputs.',
    ],
    whyItMatters: [
      'This is a high-value bridge source for cross-project chronology.',
      'It can feed project pages, founder memory, and later synthesis articles about how ACT evolved across 2024.',
      'It gives the website a durable reference for public milestones without relying on memory or social posts.',
    ],
    connectedPages: [
      '[[act-ecosystem|ACT Ecosystem]]',
      '[[gold-phone|Gold.Phone]]',
      '[[dad-lab-25|Dad.Lab.25]]',
      '[[the-harvest|The Harvest]]',
      '[[goods-on-country|Goods on Country]]',
      '[[campfire|CAMPFIRE]]',
      '[[justicehub|JusticeHub]]',
    ],
  },
  '2026-04-07-scrape-justicehub-proof': {
    title: 'Source Summary — JusticeHub Proof Wall',
    summary:
      'JusticeHub proof-page capture summarising the ALMA proof wall, evidence tiers, cost comparison, and the central argument that alternatives already exist.',
    sourceSystem: 'JusticeHub website',
    sourceKind: 'public_site_scrape',
    keyFacts: [
      'Claims 1,387 verified models, 57 proven/effective, average cost around $15K per young person, and an 86x detention cost contrast.',
      'Breaks the model base down by evidence level, state, and intervention category.',
      'Centers Indigenous-led models as having legitimacy beyond Western evidence frameworks.',
      'Ends with the core political argument: the alternative exists, works, costs less, and is underfunded.',
    ],
    whyItMatters: [
      'This is a load-bearing proof source for JusticeHub’s public argument.',
      'It is useful for checking drift between platform claims, wiki framing, and downstream narrative drafting.',
      'It should inform synthesis and stat-conflict review rather than be treated as unquestionable truth.',
    ],
    connectedPages: [
      '[[justicehub|JusticeHub]]',
      '[[alma|ALMA]]',
      '[[youth-justice-reform|Youth Justice Reform]]',
      '[[justice-funding-landscape|Justice Funding Landscape]]',
      '[[alma-intervention-portfolio|ALMA Intervention Portfolio]]',
    ],
  },
  '2026-04-07-jh-contained-tour-intelligence': {
    title: 'Source Summary — CONTAINED Tour Intelligence Model',
    summary:
      'Operational intelligence capture for CONTAINED’s tour demand, hosting interest, CRM status, political/funder relevance, and location-specific opportunity.',
    sourceSystem: 'ACT operational synthesis',
    sourceKind: 'tour_intelligence',
    keyFacts: [
      'Maps original October-November 2025 demand across Queensland, NSW, Tasmania, Victoria, South Australia, WA, NT, and international interest.',
      'Combines original request signals with LinkedIn engagement analysis, venue/host offers, and high-value political or institutional advocates.',
      'Shows Queensland, Tasmania, Melbourne, Adelaide, and Canberra as especially strategic tour environments.',
      'Frames CONTAINED as both artwork and public-education infrastructure, not only an exhibition object.',
    ],
    whyItMatters: [
      'This is a live strategic source for CONTAINED’s touring and advocacy logic.',
      'It links art, movement-building, stakeholder strategy, and on-the-ground hosting demand in one source.',
      'It is exactly the kind of material that should compound into both project memory and future tour decision-making.',
    ],
    connectedPages: [
      '[[contained|CONTAINED]]',
      '[[justicehub|JusticeHub]]',
      '[[the-brave-ones|The Brave Ones]]',
      '[[minderoo-pitch-package|Minderoo Pitch Package]]',
      '[[funding-transparency|Funding Transparency]]',
    ],
  },
  '2026-04-07-cc-the-farm-index': {
    title: 'Source Summary — ACT Farm Index Page',
    summary:
      'Public index-style capture for ACT Farm describing the farm as living laboratory, studio heart, prototype ground, and training base.',
    sourceSystem: 'Command-center content snapshot',
    sourceKind: 'website_content_export',
    keyFacts: [
      'Frames ACT Farm as the operational heart where methodology becomes action.',
      'Defines the farm metaphor as daily operating logic, not just branding.',
      'Links retreats, workshops, land practice, studio innovation, and AI/Farmhand into one loop.',
      'States the enterprise-funds-the-commons logic and quiet-systems philosophy.',
    ],
    whyItMatters: [
      'This source helps bridge the ACT Farm wrapper, Black Cockatoo Valley, Harvest, and studio infrastructure language.',
      'It is a useful public-facing statement of how land practice and innovation connect.',
      'It supports the current website repositioning of Farm/BCV as more than hospitality pages.',
    ],
    connectedPages: [
      '[[act-farm|ACT Farm]]',
      '[[black-cockatoo-valley|Black Cockatoo Valley]]',
      '[[the-harvest|The Harvest]]',
      '[[lcaa-method|LCAA Method]]',
      '[[ways-of-working|Ways of Working]]',
    ],
  },
  '2026-04-07-cc-act-ways-of-working': {
    title: 'Source Summary — Ways of Working',
    summary:
      'Internal ways-of-working capture covering daily practice, voice, calls to action, meeting practice, media governance, data hygiene, and infrastructure philosophy.',
    sourceSystem: 'Command-center content snapshot',
    sourceKind: 'internal_guidance_capture',
    keyFacts: [
      'Makes listening, LCAA, ALMA, grounded language, and nuance handling explicit as daily practice.',
      'Defines the desired ACT voice: warm, grounded, humble, visionary, professional yet rebellious.',
      'Names Empathy Ledger as the source of truth for media plus consent verification and scope checks.',
      'States the infrastructure philosophy that quiet systems should create room for people rather than noise.',
    ],
    whyItMatters: [
      'This is a core operational philosophy source for the wiki and website voice system.',
      'It helps keep internal practice linked to the same public and technical model rather than drifting into ad hoc habits.',
      'It is one of the best bridge files for LCAA, ALMA, voice, and media governance in one place.',
    ],
    connectedPages: [
      '[[ways-of-working|Ways of Working]]',
      '[[lcaa-method|LCAA Method]]',
      '[[alma|ALMA]]',
      '[[empathy-ledger|Empathy Ledger]]',
      '[[voice-guide|Voice Guide]]',
    ],
  },
  '2026-04-07-jh-first-nations-oped': {
    title: 'Source Summary — The Cure Already Exists',
    summary:
      'Long-form op-ed draft arguing that alternatives to youth detention already exist, using CONTAINED, Diagrama, Oonchiumpa, PICC, Mounty Yarns, and Goods as the proof line.',
    sourceSystem: 'JusticeHub long-form draft',
    sourceKind: 'op_ed_draft',
    keyFacts: [
      'Uses the three-room CONTAINED structure to move from detention experience to evidence and then to community-led alternatives.',
      'Pairs the Diagrama visit with local Australian models to show that the “alternative” is already working in multiple places.',
      'Connects youth justice reform to material conditions through Goods, beds, washing, health, and school attendance.',
      'Builds a strong argument that the real issue is not missing evidence but political will and funding alignment.',
    ],
    whyItMatters: [
      'This is a high-value synthesis source connecting justice, art, Goods, and community-led alternatives into one narrative.',
      'It should inform future op-eds, project pages, and narrative drafting rather than sit as an isolated raw draft.',
      'It demonstrates how ACT philosophy can be spoken through art, evidence, and enterprise at once.',
    ],
    connectedPages: [
      '[[justicehub|JusticeHub]]',
      '[[contained|CONTAINED]]',
      '[[oonchiumpa|Oonchiumpa]]',
      '[[picc|Palm Island Community Company]]',
      '[[mounty-yarns|Mounty Yarns]]',
      '[[goods-on-country|Goods on Country]]',
      '[[youth-justice-reform|Youth Justice Reform]]',
    ],
  },
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function yamlSafe(value) {
  return String(value ?? '').replace(/"/g, '\\"')
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function stripFrontmatter(content) {
  if (!content.startsWith('---\n')) return content
  const endIndex = content.indexOf('\n---\n', 4)
  if (endIndex === -1) return content
  return content.slice(endIndex + 5)
}

function extractHeadings(body) {
  const matches = [...body.matchAll(/^##+\s+(.+)$/gm)]
  return [...new Set(matches.map((match) => match[1].trim()))].slice(0, 3)
}

function extractParagraphs(body) {
  const cleaned = body
    .replace(/^# .+$/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^[-*] /gm, '')
    .replace(/^\|.+\|$/gm, '')
    .replace(/^\s*---\s*$/gm, '')
    .replace(/<[^>]+>/g, ' ')
  return cleaned
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.replace(/\n+/g, ' ').trim())
    .filter((chunk) => chunk.length > 60)
}

function truncateText(text, max = 210) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trimEnd()}...`
}

function listRawArticleKeys() {
  return readdirSync(RAW_DIR)
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => entry.includes('article-'))
    .map((entry) => basename(entry, '.md'))
    .sort((a, b) => a.localeCompare(b))
}

function listMissingPriorityRawKeys() {
  return readdirSync(RAW_DIR)
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => !entry.includes('article-'))
    .map((entry) => basename(entry, '.md'))
    .filter((key) => !existsSync(join(SOURCES_DIR, `${key}.md`)))
    .map((key) => {
      const rawPath = join(RAW_DIR, `${key}.md`)
      const raw = readFileSync(rawPath, 'utf8')
      const frontmatter = parseFrontmatter(raw) || {}
      const record = buildRawSourcePriorityRecord(`raw/${key}.md`, frontmatter, raw)
      return { key, ...record }
    })
    .sort((a, b) => b.priority_score - a.priority_score || a.key.localeCompare(b.key))
    .map(({ key }) => key)
}

function buildAutoArticleEntry(key) {
  const rawPath = join(RAW_DIR, `${key}.md`)
  const raw = readFileSync(rawPath, 'utf8')
  const frontmatter = parseFrontmatter(raw) || {}
  const body = stripFrontmatter(raw)
  const title = frontmatter.title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || key
  const paragraphs = extractParagraphs(body)
  const leadParagraph = paragraphs[0] || ''
  const headings = extractHeadings(body)
  const connectedPages = inferConnectedPages(`${title}\n${body}`)
  const created = frontmatter.created || frontmatter.captured_at || ''
  const updated = frontmatter.updated || frontmatter.last_updated || ''
  const source = frontmatter.source || 'raw article capture'

  const keyFacts = [
    `Published article capture from \`${source}\`${created ? ` created ${created}` : ''}${updated ? ` and updated ${updated}` : ''}.`,
    leadParagraph ? `Lead frame: ${truncateText(leadParagraph, 220)}` : null,
    headings.length ? `Structured around: ${headings.join('; ')}.` : `Filed under slug \`${frontmatter.slug || key}\`.`,
    connectedPages.length
      ? `Most relevant canonical pages: ${connectedPages
          .map((link) => link.replace(/^\[\[|\]\]$/g, '').split('|').pop())
          .join(', ')}.`
      : null,
  ].filter(Boolean)

  return {
    title: `Source Summary — Article / ${title}`,
    summary: truncateText(
      leadParagraph || `Published article capture for ${title}, preserved in the wiki bridge layer for future synthesis and project memory.`,
      200,
    ),
    sourceSystem: 'Supabase articles',
    sourceKind: 'published_article_capture',
    keyFacts,
    whyItMatters: [
      'It keeps the published article layer visible to Tractorpedia instead of leaving it stranded as website copy or a database row.',
      'It supports future synthesis, project memory, and narrative drafting by making the article traceable inside the source bridge.',
      connectedPages.length
        ? `It is especially useful for keeping ${connectedPages
            .map((link) => link.replace(/^\[\[|\]\]$/g, '').split('|').pop())
            .join(', ')} connected to their published narrative material.`
        : 'It helps the older article corpus become part of the compounding ACT knowledge loop.',
    ],
    connectedPages: connectedPages.length
      ? connectedPages
      : ['[[act-knowledge-ops-loop|ACT Knowledge Ops Loop]]', '[[llm-knowledge-base|LLM Knowledge Base]]'],
  }
}

function humanizeKey(key) {
  return key
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function inferSourceSystemForRaw(kind, frontmatter = {}) {
  const explicitSource = String(frontmatter.source || '').trim()
  if (explicitSource) {
    if (explicitSource === 'supabase/articles') return 'Supabase articles'
    return explicitSource
  }

  if (frontmatter.site) return `${frontmatter.site} scrape`
  if (frontmatter.source_url) return 'Website scrape'

  switch (kind) {
    case 'website_scrape':
      return 'Website scrape'
    case 'database_snapshot':
      return 'Supabase snapshot'
    case 'database_export':
      return 'Operational export'
    case 'transcript_capture':
      return 'Transcript capture'
    default:
      return 'ACT raw capture'
  }
}

function whyItMattersForRaw(kind, connectedPages) {
  const base = [
    'It turns a captured raw file into a navigable bridge note so the wiki can actually use it.',
    connectedPages.length
      ? `It helps keep ${connectedPages
          .map((link) => link.replace(/^\[\[|\]\]$/g, '').split('|').pop())
          .join(', ')} connected to the source layer instead of relying on memory.`
      : 'It gives the compiled wiki a traceable source layer instead of leaving this material stranded in raw capture.',
  ]

  switch (kind) {
    case 'website_scrape':
      return [
        'It preserves public language, structure, and framing from live websites before those surfaces drift.',
        ...base,
      ]
    case 'database_snapshot':
    case 'database_export':
      return [
        'It makes operational state and system snapshots legible inside Tractorpedia rather than leaving them as backend-only artifacts.',
        ...base,
      ]
    case 'transcript_capture':
      return [
        'It keeps transcript and workflow intelligence available for synthesis without treating the raw file itself as the only memory.',
        ...base,
      ]
    default:
      return [
        'It keeps command-center and strategy capture material inside the compounding wiki loop rather than as a dead archive.',
        ...base,
      ]
  }
}

function buildAutoRawEntry(key) {
  const rawPath = join(RAW_DIR, `${key}.md`)
  const raw = readFileSync(rawPath, 'utf8')
  const frontmatter = parseFrontmatter(raw) || {}
  const body = stripFrontmatter(raw)
  const title =
    frontmatter.title ||
    body.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    humanizeKey(key)
  const paragraphs = extractParagraphs(body)
  const leadParagraph = paragraphs[0] || ''
  const headings = extractHeadings(body)
  const kind = classifyRawSourceKind(`raw/${key}.md`, frontmatter, body)
  const connectedPages = inferConnectedPages(`${title}\n${body}`)
  const sourceSystem = inferSourceSystemForRaw(kind, frontmatter)
  const capturedAt = frontmatter.captured_at || frontmatter.created || frontmatter.ingested || ''
  const updated = frontmatter.updated || frontmatter.last_updated || ''
  const sourceUrl = frontmatter.source_url || ''

  const keyFacts = [
    `Captured from \`${sourceSystem}\`${capturedAt ? ` on ${capturedAt}` : ''}${updated ? ` and last updated ${updated}` : ''}.`,
    sourceUrl ? `Source URL: ${sourceUrl}.` : null,
    leadParagraph ? `Lead frame: ${truncateText(leadParagraph, 220)}` : null,
    headings.length ? `Structured around: ${headings.join('; ')}.` : `Filed under raw key \`${key}\`.`,
    connectedPages.length
      ? `Most relevant canonical pages: ${connectedPages
          .map((link) => link.replace(/^\[\[|\]\]$/g, '').split('|').pop())
          .join(', ')}.`
      : null,
  ].filter(Boolean)

  return {
    title: `Source Summary — ${title}`,
    summary: truncateText(
      leadParagraph ||
        `${title} captured into the ACT source bridge so it can inform canonical project, concept, and website knowledge.`,
      200,
    ),
    sourceSystem,
    sourceKind: kind,
    keyFacts,
    whyItMatters: whyItMattersForRaw(kind, connectedPages),
    connectedPages: connectedPages.length
      ? connectedPages
      : ['[[act-knowledge-ops-loop|ACT Knowledge Ops Loop]]', '[[llm-knowledge-base|LLM Knowledge Base]]'],
  }
}

function renderSummary(entry, basenameKey) {
  const rawFile = `${basenameKey}.md`
  const verificationStatus = entry.verificationStatus || 'inferred'
  const lines = [
    '---',
    `title: "${yamlSafe(entry.title)}"`,
    'status: Active',
    `date: ${todayIso()}`,
    'type: source',
    'tags:',
    '  - source',
    `  - ${entry.sourceSystem.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    `  - ${entry.sourceKind}`,
    `raw_source: raw/${rawFile}`,
    `source_system: ${entry.sourceSystem}`,
    `source_kind: ${entry.sourceKind}`,
    `summary: "${yamlSafe(entry.summary)}"`,
    `verification_status: ${verificationStatus}`,
    '---',
    '',
    `# ${entry.title}`,
    '',
    `> ${entry.summary}`,
    '',
    '## What This Source Contains',
    '',
    ...entry.keyFacts.map((fact) => `- ${fact}`),
    '',
    '## Why It Matters',
    '',
    ...entry.whyItMatters.map((item) => `- ${item}`),
    '',
    '## Raw Source',
    '',
    `- [[../raw/${basenameKey}|${basenameKey}]]`,
    '',
    '## Connected Canonical Pages',
    '',
    ...entry.connectedPages.map((link) => `- ${link}`),
    '',
    '## Key Claims And Verification',
    '',
    `- Verified: Raw source exists at \`wiki/raw/${rawFile}\`.`,
    `- Verified: This bridge note is derived from \`${entry.sourceSystem}\` as \`${entry.sourceKind}\`.`,
    '- Inferred: The summary, why-it-matters framing, and connected canonical pages are bridge-note synthesis and should be reviewed when public meaning changes.',
    '',
    '## Backlinks',
    '',
    '- [[sources/index|Sources Index]]',
    '- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]]',
    '- [[llm-knowledge-base|LLM Knowledge Base]]',
    '',
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  ensureDir(SOURCES_DIR)

  let selectedKeys = []
  let entryMode = 'preset'

  if (autoSupabaseArticles) {
    entryMode = 'auto-article'
    const availableArticleKeys = listRawArticleKeys().filter(
      (key) => !existsSync(join(SOURCES_DIR, `${key}.md`)),
    )
    selectedKeys = requestedKeys.length
      ? requestedKeys
      : limit && Number.isFinite(limit)
        ? availableArticleKeys.slice(0, limit)
        : availableArticleKeys
  } else if (autoPriorityRaw) {
    entryMode = 'auto-priority-raw'
    const availableRawKeys = listMissingPriorityRawKeys()
    selectedKeys = requestedKeys.length
      ? requestedKeys
      : limit && Number.isFinite(limit)
        ? availableRawKeys.slice(0, limit)
        : availableRawKeys
  } else {
    selectedKeys = requestedKeys.length ? requestedKeys : Object.keys(PRESET_SUMMARIES)
    const missing = selectedKeys.filter((key) => !PRESET_SUMMARIES[key])
    if (missing.length) {
      console.error(`Unknown source preset(s): ${missing.join(', ')}`)
      process.exit(1)
    }
  }

  if (!selectedKeys.length) {
    console.log('No source summaries to write.')
    return
  }

  const written = []
  for (const key of selectedKeys) {
    const rawPath = join(RAW_DIR, `${key}.md`)
    if (!existsSync(rawPath)) {
      console.error(`Missing raw source: ${rawPath}`)
      process.exit(1)
    }

    const sourcePath = join(SOURCES_DIR, `${key}.md`)
    const entry =
      entryMode === 'auto-article'
        ? buildAutoArticleEntry(key)
        : entryMode === 'auto-priority-raw'
          ? buildAutoRawEntry(key)
          : PRESET_SUMMARIES[key]
    const content = renderSummary(entry, key)

    if (dryRun) {
      console.log(`Would write ${sourcePath}`)
      written.push(`wiki/sources/${key}.md`)
      continue
    }

    writeFileSync(sourcePath, content, 'utf8')
    if (!existsSync(sourcePath) || statSync(sourcePath).size === 0) {
      console.error(`Failed to verify written source summary: ${sourcePath}`)
      process.exit(1)
    }
    written.push(`wiki/sources/${key}.md`)
    console.log(`✓ wrote wiki/sources/${key}.md`)
  }

  if (dryRun) return

  writeSourcesIndex({ wikiRoot: WIKI_ROOT })
  written.push('wiki/sources/index.md')

  logWikiEvent(
    'bootstrap',
    entryMode === 'auto-article'
      ? `Bootstrapped ${selectedKeys.length} article source summaries`
      : entryMode === 'auto-priority-raw'
        ? `Bootstrapped ${selectedKeys.length} priority raw source summaries`
      : `Bootstrapped ${selectedKeys.length} high-value source summaries`,
    written,
  )

  console.log(`✓ refreshed wiki/sources/index.md`)
  console.log(`✓ logged bootstrap (${selectedKeys.length} source summaries)`)
}

main().catch((error) => {
  console.error('Source summary bootstrap failed:', error.message)
  process.exit(1)
})
