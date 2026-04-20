#!/usr/bin/env node
/**
 * narrative-ingest.mjs — read external content and produce a digest
 *                       for the narrative store
 *
 * Pattern: extract structured signals (stats, named quotes, argument
 * patterns) from any source — files, folders, JSON, scrape outputs —
 * and write a digest to wiki/output/narrative-ingest/. The digest
 * tells the next /wiki narrative process step which claim files to
 * update or create. The LLM (you, in Claude Code) reviews the digest
 * and applies the changes via the existing log / refresh scripts.
 *
 * The script does NOT call an LLM API. The extraction is heuristic.
 * The point is to give the human + Claude a structured handoff so the
 * narrative store learns from new content with one command.
 *
 * Usage:
 *   node scripts/narrative-ingest.mjs <path> [--project <slug>] [--source-type <type>]
 *
 * Path can be:
 *   - A single .md file       (extract from one document)
 *   - A folder of .md files   (extract from all, walk recursively)
 *   - A .json file            (handled if it looks like LinkedIn engagement)
 *
 * Options:
 *   --project <slug>     Tag all proposals with this project (e.g. contained, goods-on-country)
 *   --source-type <type> Hint for the kind of source: essay | post | email | pitch | linkedin | el-story | website
 *   --since <date>       Only ingest files modified on/after this date
 *   --inbox <path>       Override the default inbox folder
 *
 * Examples:
 *   # Ingest a single new essay
 *   node scripts/narrative-ingest.mjs JusticeHub/output/sydney-contained-event-may1.md \
 *     --project contained --source-type essay
 *
 *   # Ingest the Goods on Country output folder
 *   node scripts/narrative-ingest.mjs JusticeHub/output/goods-on-country/ \
 *     --project goods-on-country --source-type pitch
 *
 *   # Ingest all the JusticeHub launch material as one batch
 *   node scripts/narrative-ingest.mjs JusticeHub/compendium/ \
 *     --project contained --source-type pitch
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, basename, relative, extname } from 'path'

const ROOT = process.cwd()
const NARRATIVE_ROOT = join(ROOT, 'wiki', 'narrative')
const DEFAULT_INBOX = join(ROOT, 'wiki', 'output', 'narrative-ingest')

// ---- Args -----------------------------------------------------------

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: narrative-ingest.mjs <path> [--project <slug>] [--source-type <type>] [--since <date>] [--inbox <path>]')
  process.exit(1)
}

const inputPath = args[0]
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}

const project = flag('project') || 'unassigned'
const sourceType = flag('source-type') || 'unknown'
const since = flag('since')
const inbox = flag('inbox') || DEFAULT_INBOX

if (!existsSync(inputPath)) {
  console.error(`[narrative-ingest] path does not exist: ${inputPath}`)
  process.exit(1)
}

// ---- File walking --------------------------------------------------

function walk(p) {
  const st = statSync(p)
  if (st.isFile()) return [p]
  const out = []
  for (const entry of readdirSync(p)) {
    const full = join(p, entry)
    const s = statSync(full)
    if (s.isDirectory()) {
      out.push(...walk(full))
    } else if (s.isFile() && (entry.endsWith('.md') || entry.endsWith('.json'))) {
      out.push(full)
    }
  }
  return out
}

let files = walk(inputPath)

if (since) {
  const cutoff = new Date(since).getTime()
  files = files.filter((f) => statSync(f).mtime.getTime() >= cutoff)
}

console.log(`[narrative-ingest] ${files.length} file(s) to scan from ${inputPath}`)

// ---- Existing claims (so we can suggest matches) --------------------

function loadExistingClaims() {
  if (!existsSync(NARRATIVE_ROOT)) return []
  const claims = []
  for (const proj of readdirSync(NARRATIVE_ROOT)) {
    const dir = join(NARRATIVE_ROOT, proj)
    if (!statSync(dir).isDirectory()) continue
    for (const f of readdirSync(dir)) {
      if (!f.startsWith('claim-') || !f.endsWith('.md')) continue
      const content = readFileSync(join(dir, f), 'utf8')
      const id = (content.match(/^id:\s*(.+)$/m) || [])[1] || basename(f, '.md')
      const title = (content.match(/^# (.+)/m) || [])[1] || id
      const argument = (content.match(/\*\*The argument:\*\* (.+?)(?=\n\n|\n##)/s) || [])[1] || ''
      claims.push({ project: proj, id, title, argument, path: join(dir, f) })
    }
  }
  return claims
}

const existingClaims = loadExistingClaims()

// ---- Extraction heuristics ------------------------------------------

const STAT_PATTERNS = [
  /\$[\d,.]+(?:\.\d+)?\s*(?:million|billion|M|K|per child|per year|per day|\/day|\/year)/gi,
  /\d+(?:\.\d+)?%/g,
  /\d+x (?:more|less|cheaper|expensive|likely)/gi,
  /\d+\s*(?:beds|programs|interventions|kids|children|young people|stops|venues|cities|days|years|inquiries|recommendations)/gi,
]

const QUOTE_PATTERN = /(?:["“])(.{15,300}?)(?:["”])\s*[—–-]\s*([A-Z][A-Za-z'.\- ]{3,40})/g

const ARGUMENT_TRIGGERS = [
  /^\s*\*\*[A-Z][^*]+:\*\*/m,
  /\bThe argument is\b/i,
  /\bThe point is\b/i,
  /\bThe whole argument\b/i,
  /\bWhat we['']re saying\b/i,
  /\bThe critical rule\b/i,
  /\bThe decision rule\b/i,
  /\bThe trigger rule\b/i,
  /\bDecision band\b/i,
  /\bThe question is\b/i,
  /\bHere is what we know\b/i,
]

function extractFromMarkdown(content, filename) {
  const lines = content.split('\n')
  const stats = new Set()
  const quotes = []
  const argumentBlocks = []

  // Stats
  for (const re of STAT_PATTERNS) {
    const matches = content.match(re)
    if (matches) for (const m of matches) stats.add(m)
  }

  // Named quotes (Pattern: "..." — Name)
  let qm
  const qre = new RegExp(QUOTE_PATTERN.source, 'g')
  while ((qm = qre.exec(content)) !== null) {
    quotes.push({ quote: qm[1].trim(), attribution: qm[2].trim() })
  }

  // Argument paragraphs — paragraphs that contain a trigger phrase
  const paragraphs = content.split(/\n\s*\n/)
  for (const p of paragraphs) {
    if (p.length < 30 || p.length > 600) continue
    for (const trigger of ARGUMENT_TRIGGERS) {
      if (trigger.test(p)) {
        argumentBlocks.push(p.trim().slice(0, 500))
        break
      }
    }
  }

  // Headings — proxies for sections that might be claims
  const headings = lines
    .filter((l) => /^#{2,4} /.test(l))
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .slice(0, 30)

  return { stats: [...stats], quotes, argumentBlocks, headings }
}

function extractFromJson(content) {
  // Naive: walk JSON looking for likely "engagement" shapes
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    return { stats: [], quotes: [], argumentBlocks: [], headings: [] }
  }
  const reactions = []
  const walk = (node, path = '') => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach((n, i) => walk(n, `${path}[${i}]`))
      return
    }
    // LinkedIn-ish: { author: { name: ... }, text: ... }
    if (node.text && (node.author || node.actor || node.commenter)) {
      const author = node.author?.name || node.actor?.name || node.commenter || 'unknown'
      reactions.push({ quote: String(node.text).slice(0, 300), attribution: author, path })
    }
    if (node.comment && node.author) {
      reactions.push({ quote: String(node.comment).slice(0, 300), attribution: node.author, path })
    }
    for (const k of Object.keys(node)) walk(node[k], `${path}.${k}`)
  }
  walk(parsed)
  return { stats: [], quotes: reactions, argumentBlocks: [], headings: [] }
}

// ---- Match candidates against existing claims ----------------------

function findClaimMatches(text, projectFilter) {
  const lower = text.toLowerCase()
  const matches = []
  for (const c of existingClaims) {
    if (projectFilter && projectFilter !== 'unassigned' && c.project !== projectFilter) continue
    // Score by simple keyword overlap on the argument
    const words = (c.argument || c.title)
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4)
    let hits = 0
    for (const w of words) {
      if (lower.includes(w)) hits++
    }
    if (hits >= 3) {
      matches.push({ id: c.id, project: c.project, hits })
    }
  }
  return matches.sort((a, b) => b.hits - a.hits).slice(0, 3)
}

// ---- Process all files ---------------------------------------------

const today = new Date().toISOString().slice(0, 10)
const digestLines = []
const allCandidates = []

digestLines.push(`# Narrative ingest digest — ${project} · ${today}`)
digestLines.push('')
digestLines.push(`> Generated by \`scripts/narrative-ingest.mjs\` on ${today}`)
digestLines.push(`> Source path: \`${inputPath}\``)
digestLines.push(`> Source type hint: \`${sourceType}\``)
digestLines.push(`> Files scanned: ${files.length}`)
digestLines.push('')
digestLines.push('---')
digestLines.push('')
digestLines.push('## How to process this digest')
digestLines.push('')
digestLines.push('Open this file in Claude Code and run `/wiki narrative process <this-file>` — Claude will read each finding, decide whether it is a new claim, a variant of an existing claim, an audience reaction, or noise, and apply the change via `narrative-log-deployment.mjs` or by writing a new claim file. Then run `narrative-refresh` to regenerate the index.')
digestLines.push('')
digestLines.push('Or process by hand: read the proposed actions under each file, copy the relevant ones, run the log/refresh scripts manually.')
digestLines.push('')
digestLines.push('---')
digestLines.push('')

for (const file of files) {
  const ext = extname(file)
  const content = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file)

  let extracted
  if (ext === '.json') {
    extracted = extractFromJson(content)
  } else {
    extracted = extractFromMarkdown(content, basename(file))
  }

  const matches = findClaimMatches(content, project)
  const fileSize = content.length

  const totalSignals =
    extracted.stats.length + extracted.quotes.length + extracted.argumentBlocks.length

  if (totalSignals === 0 && matches.length === 0) continue

  digestLines.push(`## \`${rel}\``)
  digestLines.push('')
  digestLines.push(`*${fileSize.toLocaleString()} chars · ${totalSignals} signals · ${matches.length} candidate matches*`)
  digestLines.push('')

  if (matches.length > 0) {
    digestLines.push('### Likely matches against existing claims')
    digestLines.push('')
    for (const m of matches) {
      digestLines.push(`- **${m.id}** (${m.project}) — overlap score ${m.hits}`)
    }
    digestLines.push('')
    digestLines.push(`**Suggested action:** if this file deploys one of these claims, log it:`)
    digestLines.push('')
    digestLines.push('```bash')
    for (const m of matches.slice(0, 1)) {
      digestLines.push(`node scripts/narrative-log-deployment.mjs ${m.id} <channel> \\`)
      digestLines.push(`  --source ${rel} \\`)
      digestLines.push(`  --variant "<copy a representative line from this file>"`)
    }
    digestLines.push('```')
    digestLines.push('')
  }

  if (extracted.stats.length > 0) {
    digestLines.push('### Stats found')
    digestLines.push('')
    for (const s of extracted.stats.slice(0, 15)) {
      digestLines.push(`- \`${s}\``)
    }
    digestLines.push('')
    digestLines.push('**Verify against `wiki/narrative/<project>/STAT-CONFLICTS.md` before using any of these in a draft.**')
    digestLines.push('')
  }

  if (extracted.quotes.length > 0) {
    digestLines.push('### Named quotes found')
    digestLines.push('')
    for (const q of extracted.quotes.slice(0, 10)) {
      digestLines.push(`- *"${q.quote}"* — **${q.attribution}**`)
    }
    digestLines.push('')
    digestLines.push('**Suggested action:** these are candidate audience reactions or testimonial variants. If the speaker is responding to one of our claims, log them via `narrative-log-deployment` with `--variant`. If they ARE the source of a new claim, file as a new claim file.')
    digestLines.push('')
  }

  if (extracted.argumentBlocks.length > 0) {
    digestLines.push('### Argument-shaped paragraphs')
    digestLines.push('')
    for (const a of extracted.argumentBlocks.slice(0, 8)) {
      digestLines.push('> ' + a.replace(/\n/g, '\n> '))
      digestLines.push('')
    }
    digestLines.push('**Suggested action:** these are candidate new claims. For each one, decide:')
    digestLines.push('- (a) does it match an existing claim? → log as a variant')
    digestLines.push('- (b) is it a new public argument? → create a new claim file in the relevant project folder')
    digestLines.push('- (c) is it an *internal* operating principle, not a public argument? → file in `wiki/decisions/` instead')
    digestLines.push('')
  }

  if (extracted.headings.length > 0) {
    digestLines.push('<details><summary>Headings (for context)</summary>')
    digestLines.push('')
    for (const h of extracted.headings) digestLines.push(`- ${h}`)
    digestLines.push('')
    digestLines.push('</details>')
    digestLines.push('')
  }

  digestLines.push('---')
  digestLines.push('')

  allCandidates.push({ file: rel, matches, signals: totalSignals })
}

// Summary
digestLines.push('## Summary')
digestLines.push('')
digestLines.push(`- Files scanned: ${files.length}`)
digestLines.push(`- Files with signals: ${allCandidates.length}`)
digestLines.push(`- Total candidate matches against existing claims: ${allCandidates.reduce((s, c) => s + c.matches.length, 0)}`)
digestLines.push('')

const newClaimCandidates = allCandidates.filter((c) => c.matches.length === 0 && c.signals > 0)
if (newClaimCandidates.length > 0) {
  digestLines.push(`### Files with no existing claim match (candidates for **new claims**):`)
  digestLines.push('')
  for (const c of newClaimCandidates.slice(0, 10)) {
    digestLines.push(`- \`${c.file}\` — ${c.signals} signals`)
  }
  digestLines.push('')
}

// ---- Write digest --------------------------------------------------

mkdirSync(inbox, { recursive: true })
const slug = `${today}-${project}-${basename(inputPath).replace(/[^a-z0-9]+/gi, '-')}.md`
const outPath = join(inbox, slug)
writeFileSync(outPath, digestLines.join('\n'))

console.log(`[narrative-ingest] wrote ${outPath}`)
console.log(`[narrative-ingest] ${files.length} file(s) scanned · ${allCandidates.length} with signals · ${newClaimCandidates.length} new-claim candidates`)
console.log('')
console.log('Next:')
console.log(`  /wiki narrative process ${relative(ROOT, outPath)}`)
console.log(`  (or open in your editor and apply the suggested actions by hand)`)
