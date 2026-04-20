#!/usr/bin/env node

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { logWikiEvent } from './wiki-log.mjs'

const ROOT = process.cwd()
const CANONICAL_WIKI = join(ROOT, 'wiki')
const SNAPSHOT_ROOT = join(ROOT, 'apps', 'command-center', 'public', 'wiki')
const GENERATED_AT = new Date().toISOString()

const DIRECT_MAPPINGS = [
  ['wiki/concepts/act-identity.md', 'act/index.md'],
  ['wiki/concepts/lcaa-method.md', 'act/lcaa.md'],
  ['wiki/concepts/lcaa-method.md', 'act/identity/lcaa-methodology.md'],
  ['wiki/concepts/voice-guide.md', 'act/identity/voice-guide.md'],
  ['wiki/concepts/governance-consent.md', 'act/governance.md'],
  ['wiki/concepts/ways-of-working.md', 'act/ways-of-working.md'],
  ['wiki/concepts/beautiful-obsolescence.md', 'act/beautiful-obsolescence.md'],
  ['wiki/concepts/ai-ethics.md', 'act/ai-ethics.md'],
  ['wiki/concepts/alma.md', 'act/alma.md'],
  ['wiki/concepts/glossary.md', 'act/appendices/glossary.md'],
  ['wiki/concepts/visual-system.md', 'act/appendices/visual-system.md'],
  ['wiki/technical/act-architecture.md', 'act/appendices/tech-architecture.md'],
  ['wiki/technical/transcription-workflow.md', 'act/appendices/transcription-workflow.md'],
  ['wiki/technical/vignette-workflows.md', 'act/appendices/vignette-workflows.md'],
  ['wiki/decisions/roadmap-2026.md', 'act/appendices/roadmap-2026.md'],
  ['wiki/concepts/place-land-practice.md', 'place/index.md'],
  ['wiki/projects/act-farm/black-cockatoo-valley.md', 'place/black-cockatoo-valley.md'],
  ['wiki/projects/empathy-ledger.md', 'empathy-ledger/index.md'],
  ['wiki/projects/goods-on-country.md', 'goods/index.md'],
  ['wiki/projects/justicehub/justicehub.md', 'justicehub/index.md'],
  ['wiki/projects/the-harvest/the-harvest.md', 'the-harvest/index.md'],
  ['wiki/projects/act-farm/act-farm.md', 'the-farm/index.md'],
  ['wiki/projects/act-studio/act-studio.md', 'the-studio/index.md'],
]

const WRAPPERS = [
  {
    dest: 'act/identity/mission.md',
    title: 'Mission',
    canonical: 'wiki/concepts/act-identity.md',
    body: [
      'This legacy command-center route is preserved for compatibility.',
      '',
      'The canonical ACT mission and organisational framing now live in [[act-identity|ACT Identity]].',
    ],
  },
  {
    dest: 'act/identity/principles.md',
    title: 'Principles of Practice',
    canonical: 'wiki/concepts/act-identity.md',
    body: [
      'This legacy route is preserved for compatibility.',
      '',
      'The current principles now sit across [[act-identity|ACT Identity]], [[beautiful-obsolescence|Beautiful Obsolescence]], and [[ways-of-working|Ways of Working]].',
    ],
  },
  {
    dest: 'act/appendices/alma-template.md',
    title: 'ALMA Template',
    canonical: 'wiki/concepts/alma.md',
    body: [
      'This legacy appendix route now points back to the canonical ALMA concept page.',
      '',
      'See [[alma|ALMA]] for the framework and use [[vignette-workflows|Vignette Workflows]] for supporting operational detail.',
    ],
  },
  {
    dest: 'stories/vignette-template.md',
    title: 'Vignette Template',
    canonical: 'wiki/technical/vignette-workflows.md',
    body: [
      'This legacy story-template route is kept for compatibility.',
      '',
      'The canonical workflow now lives in [[vignette-workflows|Vignette Workflows]].',
    ],
  },
]

function ensureParent(filePath) {
  mkdirSync(dirname(filePath), { recursive: true })
}

function injectBanner(content, sourcePath) {
  const banner = [
    `> Generated legacy mirror for command-center.`,
    `> Source of truth: \`${sourcePath}\`.`,
    `> Regenerated: \`${GENERATED_AT}\` via \`node scripts/wiki-sync-command-center-snapshot.mjs\`.`,
    '',
  ].join('\n')

  if (!content.startsWith('---\n')) return `${banner}${content}`

  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return `${banner}${content}`

  const frontmatter = content.slice(0, end + 5)
  const body = content.slice(end + 5)
  return `${frontmatter}\n${banner}${body}`
}

function copyCanonicalToSnapshot(sourceRel, destRel) {
  const sourcePath = join(ROOT, sourceRel)
  const destPath = join(SNAPSHOT_ROOT, destRel)
  const content = readFileSync(sourcePath, 'utf8')
  ensureParent(destPath)
  writeFileSync(destPath, injectBanner(content, sourceRel))
}

function writeWrapper(destRel, title, canonical, bodyLines) {
  const destPath = join(SNAPSHOT_ROOT, destRel)
  ensureParent(destPath)

  const content = [
    '---',
    'status: generated',
    `generated_at: ${GENERATED_AT}`,
    `canonical_source: ${canonical}`,
    '---',
    '',
    `# ${title}`,
    '',
    `> Generated legacy route. Canonical source: \`${canonical}\`.`,
    '',
    ...bodyLines,
    '',
    `See the canonical article in the repo-root wiki.`,
    '',
  ].join('\n')

  writeFileSync(destPath, content)
}

function syncStories() {
  const storiesDir = join(CANONICAL_WIKI, 'stories')
  for (const entry of readdirSync(storiesDir)) {
    const full = join(storiesDir, entry)
    if (!statSync(full).isFile() || !entry.endsWith('.md')) continue
    copyCanonicalToSnapshot(`wiki/stories/${entry}`, `stories/${entry}`)
  }
}

rmSync(SNAPSHOT_ROOT, { recursive: true, force: true })
mkdirSync(SNAPSHOT_ROOT, { recursive: true })

for (const [sourceRel, destRel] of DIRECT_MAPPINGS) {
  copyCanonicalToSnapshot(sourceRel, destRel)
}

syncStories()

for (const wrapper of WRAPPERS) {
  writeWrapper(wrapper.dest, wrapper.title, wrapper.canonical, wrapper.body)
}

writeFileSync(
  join(SNAPSHOT_ROOT, 'README.md'),
  [
    '# Command-Center Wiki Snapshot',
    '',
    `This folder is a generated legacy mirror of the canonical repo-root wiki at \`/wiki\`.`,
    '',
    `- Generated: \`${GENERATED_AT}\``,
    '- Use `node scripts/wiki-sync-command-center-snapshot.mjs` to regenerate it.',
    '- Do not edit these files as the source of truth.',
    '',
  ].join('\n'),
)

writeFileSync(
  join(SNAPSHOT_ROOT, 'snapshot-meta.json'),
  JSON.stringify(
    {
      generated_at: GENERATED_AT,
      canonical_root: 'wiki/',
      direct_mappings: DIRECT_MAPPINGS.length,
      wrapper_pages: WRAPPERS.length,
      notes: 'Legacy mirror for command-center compatibility only.',
    },
    null,
    2,
  ),
)

const storyCount = readdirSync(join(SNAPSHOT_ROOT, 'stories')).filter((entry) => entry.endsWith('.md')).length

try {
  logWikiEvent(
    'snapshot-sync',
    `${DIRECT_MAPPINGS.length} direct mirrors · ${storyCount} stories · ${WRAPPERS.length} wrappers`,
    ['apps/command-center/public/wiki/README.md', 'apps/command-center/public/wiki/snapshot-meta.json'],
  )
} catch (e) {
  console.error('⚠ wiki-log append failed:', e.message)
}

console.log(
  JSON.stringify(
    {
      snapshot_root: 'apps/command-center/public/wiki',
      generated_at: GENERATED_AT,
      direct_mappings: DIRECT_MAPPINGS.length,
      stories: storyCount,
      wrapper_pages: WRAPPERS.length,
    },
    null,
    2,
  ),
)
