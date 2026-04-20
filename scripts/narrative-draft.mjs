#!/usr/bin/env node
/**
 * narrative-draft.mjs — assemble a draft post or op-ed from the narrative store
 *
 * Reads the project's claim files, picks the right ones for the requested
 * frame and channel, and writes a draft to wiki/output/narrative-drafts/.
 * The draft is a *prompt brief*, not a finished piece — it shows the LLM
 * (or you) which claims to build on, what we have already said, and what
 * the gaps are. This is the op-ed engine.
 *
 * Usage:
 *   node scripts/narrative-draft.mjs <project> [options]
 *
 * Options:
 *   --frame <frame>           moral | confrontational | testimonial | structural | ...
 *                              default: pick the most under-deployed frame
 *   --channel <channel>       linkedin | instagram | twitter | oped | email | ...
 *                              default: oped
 *   --length <short|medium|long>  default: medium
 *   --gap                     pick claims by gap size (under-deployed first) — default
 *   --recent                  pick claims that were recently deployed (build on momentum)
 *   --claim <id>              draft against a specific claim id
 *   --audience <list>         comma-separated audiences to target
 *   --news-hook "..."         attach a current-event hook to anchor the piece
 *   --funder <slug>           target a specific funder from wiki/narrative/funders.json
 *                              (overrides --frame: pulls the funder's claims_to_lead_with)
 *   --cycle <phase>           filter to claims tagged for this campaign cycle
 *                              (e.g. launch, budget-week, funder-pitch, term-sheet)
 *
 * Examples:
 *   # The "what's the next post" workflow
 *   node scripts/narrative-draft.mjs contained --channel linkedin --frame moral
 *
 *   # An op-ed against the most under-deployed claims
 *   node scripts/narrative-draft.mjs contained --channel oped --length long
 *
 *   # A targeted post against one claim with a news hook
 *   node scripts/narrative-draft.mjs contained \
 *     --claim claim-they-looked-like-children \
 *     --channel linkedin \
 *     --news-hook "QLD adult-time laws passed second reading 2026-04-08"
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'

const ROOT = process.cwd()
const NARRATIVE_ROOT = join(ROOT, 'wiki', 'narrative')
const OUTPUT_ROOT = join(ROOT, 'wiki', 'output', 'narrative-drafts')
const FUNDERS_PATH = join(NARRATIVE_ROOT, 'funders.json')

// ---- Args -----------------------------------------------------------

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: narrative-draft.mjs <project> [--frame ...] [--channel ...] [--length ...] [--claim ...] [--news-hook "..."]')
  process.exit(1)
}

const project = args[0]
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const has = (name) => args.includes(`--${name}`)

const frameArg = flag('frame')
const channel = flag('channel') || 'oped'
const length = flag('length') || 'medium'
const claimArg = flag('claim')
const audienceArg = flag('audience')
const newsHook = flag('news-hook')
const useRecent = has('recent')
const funderSlug = flag('funder')
const cycleFilter = flag('cycle')

// ---- Load claims ---------------------------------------------------

const projectDir = join(NARRATIVE_ROOT, project)
if (!existsSync(projectDir)) {
  console.error(`[narrative-draft] no narrative folder for project: ${project}`)
  process.exit(1)
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: content }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) continue
    const v = kv[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) {
      meta[kv[1]] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      meta[kv[1]] = v
    }
  }
  return { meta, body: m[2] }
}

// Load all claims for ALL projects (so cross-project funder picks work)
function loadClaimsForProject(projDir, projSlug) {
  return readdirSync(projDir)
    .filter((f) => f.startsWith('claim-') && f.endsWith('.md'))
    .map((f) => {
      const path = join(projDir, f)
      const content = readFileSync(path, 'utf8')
      const { meta, body } = parseFrontmatter(content)
      const title = (body.match(/^# (.+)/m) || [null, meta.id || f])[1]
      const argument = (body.match(/\*\*The argument:\*\* (.+?)(?=\n\n|\n##)/s) || [null, ''])[1].trim()
      return { file: f, path, meta, body, title, argument, projectSlug: projSlug }
    })
}

const claims = loadClaimsForProject(projectDir, project)

// If a funder is specified, ALSO load other projects' claims so cross-project picks work
let allProjectClaims = claims
if (funderSlug) {
  allProjectClaims = []
  for (const projEntry of readdirSync(NARRATIVE_ROOT)) {
    const dir = join(NARRATIVE_ROOT, projEntry)
    try {
      const stat = readdirSync(dir)
      allProjectClaims.push(...loadClaimsForProject(dir, projEntry))
    } catch {
      // not a directory or empty
    }
  }
}

// ---- Load funder config (if --funder) ------------------------------

let funder = null
if (funderSlug) {
  if (!existsSync(FUNDERS_PATH)) {
    console.error('[narrative-draft] funders.json not found')
    process.exit(1)
  }
  const allFunders = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8')).funders
  funder = allFunders[funderSlug]
  if (!funder) {
    console.error(`[narrative-draft] unknown funder: ${funderSlug}`)
    console.error(`  available: ${Object.keys(allFunders).join(', ')}`)
    process.exit(1)
  }
  console.log(`[narrative-draft] funder: ${funder.name} (${funder.stage})`)
}

// ---- Pick claims ----------------------------------------------------

function pickClaims() {
  if (claimArg) {
    const c = claims.find((x) => x.meta.id === claimArg || x.file.includes(claimArg))
    if (!c) {
      console.error(`[narrative-draft] claim not found: ${claimArg}`)
      process.exit(1)
    }
    return [c]
  }

  // Funder mode — pick exactly the claims listed in funders.json
  if (funder) {
    const wanted = funder.claims_to_lead_with || []
    const avoid = new Set(funder.claims_to_avoid || [])
    const picked = []
    for (const ref of wanted) {
      // ref is "project:claim-id" or just "claim-id"
      const [projPart, idPart] = ref.includes(':') ? ref.split(':') : [project, ref]
      const c = allProjectClaims.find(
        (x) => x.projectSlug === projPart && (x.meta.id === idPart || x.file.includes(idPart))
      )
      if (c && !avoid.has(`${projPart}:${c.meta.id}`)) {
        picked.push(c)
      } else if (!c) {
        console.warn(`[narrative-draft] funder claim not found: ${ref}`)
      }
    }
    if (picked.length === 0) {
      console.error('[narrative-draft] no funder claims resolved')
      process.exit(1)
    }
    return picked
  }

  let pool = claims

  // Filter by cycle
  if (cycleFilter) {
    pool = pool.filter((c) => (c.meta.cycle || []).includes(cycleFilter))
    console.log(`[narrative-draft] cycle filter '${cycleFilter}' → ${pool.length} claims`)
  }

  // Filter by frame
  if (frameArg) {
    pool = pool.filter((c) => c.meta.frame === frameArg || c.meta.secondary_frame === frameArg)
  } else {
    // Auto-pick: find the most starved frame
    const frameDeployments = {}
    for (const c of claims) {
      const f = c.meta.frame
      frameDeployments[f] = (frameDeployments[f] || 0) + parseInt(c.meta.times_deployed || '0', 10)
    }
    const starved = Object.entries(frameDeployments).sort((a, b) => a[1] - b[1])[0]
    if (starved) {
      console.log(`[narrative-draft] auto-picked starved frame: ${starved[0]} (${starved[1]} total deployments)`)
      pool = pool.filter((c) => c.meta.frame === starved[0])
    }
  }

  // Audience filter
  if (audienceArg) {
    const wanted = audienceArg.split(',').map((s) => s.trim())
    pool = pool.filter((c) => (c.meta.audiences || []).some((a) => wanted.includes(a)))
  }

  // Sort
  if (useRecent) {
    pool.sort((a, b) => new Date(b.meta.last_used || 0) - new Date(a.meta.last_used || 0))
  } else {
    // Default: by gap (least deployed first)
    pool.sort((a, b) => parseInt(a.meta.times_deployed || '0', 10) - parseInt(b.meta.times_deployed || '0', 10))
  }

  // Length → number of claims
  const counts = { short: 1, medium: 3, long: 5 }
  return pool.slice(0, counts[length] || 3)
}

const picked = pickClaims()
if (picked.length === 0) {
  console.error('[narrative-draft] no claims matched the filters')
  process.exit(1)
}

// ---- Assemble the brief --------------------------------------------

function extractGaps(body) {
  const m = body.match(/## What we haven't said yet([\s\S]*?)(?=\n##|$)/)
  if (!m) return []
  return m[1]
    .split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .map((l) => l.trim().slice(2))
}

function extractVariants(body) {
  const m = body.match(/## Variants used([\s\S]*?)(?=\n##|$)/)
  if (!m) return []
  return m[1]
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !l.includes('---'))
    .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean))
    .filter((row) => row.length >= 1)
    .slice(1) // header row
}

function extractReactions(body) {
  const m = body.match(/## Audience reactions logged([\s\S]*?)(?=\n##|$)/)
  if (!m) return ''
  return m[1].trim()
}

const today = new Date().toISOString().slice(0, 10)
const draftLines = []

const briefTitle = funder
  ? `Funder pitch brief — ${funder.name} · ${channel}`
  : `Draft brief — ${project} · ${channel} · ${frameArg || 'auto'}`

draftLines.push(`# ${briefTitle}`)
draftLines.push('')
draftLines.push(`> Generated by \`scripts/narrative-draft.mjs\` on ${today}.`)
draftLines.push(`> This is a **brief**, not a finished piece. It tells you (or the model writing the next post) which claims to build on, what we have already said, and what the gaps are.`)
draftLines.push('')

if (funder) {
  draftLines.push('## Funder context')
  draftLines.push('')
  draftLines.push(`- **Funder:** ${funder.name}`)
  draftLines.push(`- **Stage:** ${funder.stage}`)
  if (funder.ask_amount_aud) draftLines.push(`- **Ask amount:** AUD ${funder.ask_amount_aud.toLocaleString()}`)
  if (funder.deadline) draftLines.push(`- **Deadline:** ${funder.deadline}`)
  if (funder.primary_contact) draftLines.push(`- **Contact:** ${funder.primary_contact}`)
  draftLines.push(`- **Themes:** ${(funder.themes || []).join(', ')}`)
  draftLines.push(`- **Tone:** ${funder.tone}`)
  draftLines.push('')
  if (funder.framing_notes) {
    draftLines.push('### Framing notes')
    draftLines.push('')
    draftLines.push(funder.framing_notes)
    draftLines.push('')
  }
  if ((funder.claims_to_avoid || []).length > 0) {
    draftLines.push('### Claims to AVOID for this funder')
    draftLines.push('')
    for (const a of funder.claims_to_avoid) draftLines.push(`- ❌ \`${a}\``)
    draftLines.push('')
  }
}

if (newsHook) {
  draftLines.push('## News hook')
  draftLines.push('')
  draftLines.push(`> ${newsHook}`)
  draftLines.push('')
}

draftLines.push('## Brief')
draftLines.push('')
draftLines.push(`- **Project:** ${project}`)
draftLines.push(`- **Channel:** ${channel}`)
draftLines.push(`- **Frame:** ${frameArg || (funder ? 'funder-targeted' : '(auto: most starved)')}`)
if (cycleFilter) draftLines.push(`- **Cycle:** ${cycleFilter}`)
draftLines.push(`- **Length:** ${length}`)
if (audienceArg) draftLines.push(`- **Target audience:** ${audienceArg}`)
const mode = funder
  ? 'funder (claims_to_lead_with from funders.json)'
  : useRecent
  ? 'recent (build on momentum)'
  : 'gap (least deployed first)'
draftLines.push(`- **Selection mode:** ${mode}`)
draftLines.push('')

draftLines.push(`## Build the post on these ${picked.length} claim${picked.length > 1 ? 's' : ''}`)
draftLines.push('')

picked.forEach((c, i) => {
  draftLines.push(`### ${i + 1}. ${c.title}`)
  draftLines.push('')
  draftLines.push(`*File:* [\`${c.file}\`](../../narrative/${project}/${c.file}) · *Frame:* ${c.meta.frame} · *Times deployed:* ${c.meta.times_deployed || 0}`)
  draftLines.push('')
  draftLines.push(`**The argument:** ${c.argument}`)
  draftLines.push('')

  const variants = extractVariants(c.body)
  if (variants.length > 0) {
    draftLines.push('**What we have already said (do NOT repeat verbatim):**')
    draftLines.push('')
    for (const v of variants.slice(0, 5)) {
      draftLines.push(`- ${v[0]}`)
    }
    draftLines.push('')
  }

  const gaps = extractGaps(c.body)
  if (gaps.length > 0) {
    draftLines.push('**What we have NOT said (build the post here):**')
    draftLines.push('')
    for (const g of gaps.slice(0, 6)) {
      draftLines.push(`- ${g}`)
    }
    draftLines.push('')
  }

  const reactions = extractReactions(c.body)
  if (reactions) {
    draftLines.push('**Audience reactions on file (use as social proof if relevant):**')
    draftLines.push('')
    draftLines.push(reactions)
    draftLines.push('')
  }
})

draftLines.push('## Drafting instructions')
draftLines.push('')
draftLines.push(`Build a ${length} ${channel} post that:`)
draftLines.push('')
draftLines.push(`1. **Leads with a frame the campaign has not been leading with.** Default frame for this draft: \`${frameArg || 'auto'}\`. Do not open with a statistic unless the brief explicitly says so.`)
draftLines.push(`2. **Pulls from the "What we have NOT said" sections above.** Each gap is an explicit instruction. Build one of them. Don't repeat the variants.`)
draftLines.push(`3. **Cites the source.** If you use a number, name where it came from in one short clause (Productivity Commission, ROGS year, Diagrama evaluation).`)
draftLines.push(`4. **Verify against \`STAT-CONFLICTS.md\` first.** If the number you want to use is on the conflict list, do not use it until it has been reconciled.`)
draftLines.push(`5. **Ends with one ask.** Not three. One. Match the channel: oped → "do this with us" or "ask your minister"; LinkedIn → "share / nominate / book"; Twitter → one link.`)
if (newsHook) {
  draftLines.push(`6. **Anchor to the news hook** in the first or second sentence. The hook is the reason the post lands today and not last month.`)
}
draftLines.push('')

draftLines.push('## After publishing — log the deployment')
draftLines.push('')
draftLines.push('```bash')
picked.forEach((c) => {
  draftLines.push(`node scripts/narrative-log-deployment.mjs ${c.meta.id} ${channel} \\`)
  draftLines.push(`  --source <url-or-path> \\`)
  draftLines.push(`  --variant "<the actual line we used>"`)
})
draftLines.push('```')
draftLines.push('')
draftLines.push('Logging the deployment increments `times_deployed`, updates `last_used`, and prevents the next draft from picking the same gap.')
draftLines.push('')

// ---- Write the brief -----------------------------------------------

mkdirSync(OUTPUT_ROOT, { recursive: true })
const slug = `${today}-${project}-${channel}-${frameArg || 'auto'}.md`
const outPath = join(OUTPUT_ROOT, slug)
writeFileSync(outPath, draftLines.join('\n'))

console.log(`[narrative-draft] wrote ${outPath}`)
console.log(`[narrative-draft] ${picked.length} claim${picked.length > 1 ? 's' : ''} pulled · frame: ${frameArg || 'auto'} · channel: ${channel}`)
console.log('')
console.log('Open the brief and feed it to the model writing the next post:')
console.log(`  cat ${outPath.replace(ROOT + '/', '')}`)
