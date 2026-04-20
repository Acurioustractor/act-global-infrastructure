import { basename } from 'path'
import { getCanonLinkBySurfaceId } from './living-ecosystem.mjs'

export const SOURCE_SIGNAL_RULES = [
  {
    pattern: /\bjusticehub\b|\byouth justice\b|\bdetention\b|\balma\b/,
    label: 'JusticeHub',
    link: getCanonLinkBySurfaceId('justicehub', '[[justicehub|JusticeHub]]'),
  },
  { pattern: /\bdiagrama\b|\bspain\b/, label: 'Diagrama', link: '[[diagrama|Diagrama]]' },
  {
    pattern: /\bcontained\b|\bshipping container\b/,
    label: 'CONTAINED',
    link: '[[contained|CONTAINED]]',
  },
  {
    pattern: /\bgoods\b|\bpakkimjalki\b|\bwashing machine\b|\bbed\b/,
    label: 'Goods on Country',
    link: getCanonLinkBySurfaceId('goods-on-country', '[[goods-on-country|Goods on Country]]'),
  },
  {
    pattern: /\bharvest\b|\bwitta\b/,
    label: 'The Harvest',
    link: getCanonLinkBySurfaceId('the-harvest', '[[the-harvest|The Harvest]]'),
  },
  {
    pattern: /\bempathy ledger\b|\bstorytelling\b/,
    label: 'Empathy Ledger',
    link: getCanonLinkBySurfaceId('empathy-ledger', '[[empathy-ledger|Empathy Ledger]]'),
  },
  {
    pattern: /\bblack cockatoo valley\b|\bjinibara\b/,
    label: 'Black Cockatoo Valley',
    link: getCanonLinkBySurfaceId(
      'black-cockatoo-valley',
      '[[black-cockatoo-valley|Black Cockatoo Valley]]',
    ),
  },
  { pattern: /\bact farm\b|\bfarm\b/, label: 'ACT Farm', link: '[[act-farm|ACT Farm]]' },
  { pattern: /\bgold phone\b|\bgold\.phone\b/, label: 'Gold.Phone', link: '[[gold-phone|Gold.Phone]]' },
  {
    pattern: /\bthe confessional\b/,
    label: 'The Confessional',
    link: '[[the-confessional|The Confessional]]',
  },
  {
    pattern: /\bpalm island\b|\bbwgcolman\b|\bpicc\b/,
    label: 'PICC',
    link: '[[picc|Palm Island Community Company]]',
  },
  {
    pattern: /\boonchiumpa\b|\batnarpa\b|\bmparntwe\b|\balice springs\b/,
    label: 'Oonchiumpa',
    link: '[[oonchiumpa|Oonchiumpa]]',
  },
  {
    pattern: /\bcommunity capital\b/,
    label: 'Community Capital',
    link: '[[community-capital|Community Capital]]',
  },
  { pattern: /\bcampfire\b/, label: 'CAMPFIRE', link: '[[campfire|CAMPFIRE]]' },
  {
    pattern: /\bconfit\b|\bjoe kwon\b/,
    label: 'ConFit Pathways',
    link: '[[confit-pathways|ConFit Pathways]]',
  },
  {
    pattern: /\bresoleution\b|\bbimberi\b|\bshoe\b/,
    label: 'ReSOLEution',
    link: '[[resoleution|ReSOLEution]]',
  },
  {
    pattern: /\bdeadlylabs\b|\bdeadly science\b/,
    label: 'DeadlyLabs',
    link: '[[deadlylabs|DeadlyLabs]]',
  },
  {
    pattern: /\bbg fit\b|\bbrodie\b|\bmount isa\b|\bnaidoc\b/,
    label: 'BG Fit',
    link: '[[bg-fit|BG Fit]]',
  },
  {
    pattern: /\bmounty\b/,
    label: 'Mounty Yarns',
    link: '[[mounty-yarns|Mounty Yarns]]',
  },
  {
    pattern: /\bsmart\b/,
    label: 'SMART Connect',
    link: '[[smart-connect|SMART Connect]]',
  },
  {
    pattern: /\bart\b|\bstudio\b/,
    label: 'ACT Regenerative Studio',
    link: getCanonLinkBySurfaceId('act-regenerative-studio', '[[act-studio|ACT Regenerative Studio]]'),
  },
  {
    pattern: /\bfirst nations\b|\bindigenous\b/,
    label: 'Indigenous Data Sovereignty',
    link: '[[indigenous-data-sovereignty|Indigenous Data Sovereignty]]',
  },
]

export function inferConnectedPages(text = '') {
  const haystack = String(text || '').toLowerCase()
  const links = []

  for (const { pattern, link } of SOURCE_SIGNAL_RULES) {
    if (pattern.test(haystack) && !links.includes(link)) {
      links.push(link)
    }
  }

  return links.slice(0, 7)
}

export function inferSourceFocus(rawPath = '', frontmatter = {}, content = '') {
  const haystack = `${rawPath}\n${frontmatter.title || ''}\n${frontmatter.source || ''}\n${content}`
    .toLowerCase()
    .slice(0, 10000)
  const labels = []

  for (const { pattern, label } of SOURCE_SIGNAL_RULES) {
    if (pattern.test(haystack) && !labels.includes(label)) {
      labels.push(label)
    }
  }

  return labels.slice(0, 4)
}

export function classifyRawSourceKind(rawPath, frontmatter = {}, content = '') {
  const basenameLower = basename(rawPath).toLowerCase()
  const source = String(frontmatter.source || '').toLowerCase()
  const body = String(content || '').toLowerCase()

  if (basenameLower.includes('article-')) return 'published_article_capture'
  if (basenameLower.includes('scrape-')) return 'website_scrape'
  if (basenameLower.includes('snapshot')) return 'database_snapshot'
  if (basenameLower.includes('transcript') || body.includes('speaker:')) return 'transcript_capture'
  if (source.includes('supabase')) return 'database_export'
  if (source.includes('website') || source.includes('webflow')) return 'website_capture'
  return 'raw_capture'
}

export function scoreRawSourcePriority(rawPath, kind, focusLabels, frontmatter = {}) {
  let score = 0

  if (focusLabels.length) score += 40

  switch (kind) {
    case 'published_article_capture':
      score += 35
      break
    case 'website_scrape':
      score += 30
      break
    case 'database_snapshot':
    case 'database_export':
      score += 25
      break
    case 'transcript_capture':
      score += 20
      break
    default:
      score += 10
  }

  const relativeLower = String(rawPath || '').toLowerCase()
  if (
    relativeLower.includes('justicehub') ||
    relativeLower.includes('goods') ||
    relativeLower.includes('harvest') ||
    relativeLower.includes('empathy-ledger') ||
    relativeLower.includes('black-cockatoo-valley') ||
    relativeLower.includes('act-place') ||
    relativeLower.includes('contained')
  ) {
    score += 15
  }

  const source = String(frontmatter.source || '').toLowerCase()
  if (source.includes('supabase/articles')) score += 10

  return score
}

export function sourcePriorityLabel(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function buildRawSourcePriorityRecord(rawPath, frontmatter = {}, content = '') {
  const kind = classifyRawSourceKind(rawPath, frontmatter, content)
  const focus = inferSourceFocus(rawPath, frontmatter, content)
  const priorityScore = scoreRawSourcePriority(rawPath, kind, focus, frontmatter)

  return {
    raw_path: rawPath,
    kind,
    focus,
    priority_score: priorityScore,
    priority_label: sourcePriorityLabel(priorityScore),
  }
}
