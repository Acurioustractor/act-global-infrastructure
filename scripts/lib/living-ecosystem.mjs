import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const CANON_PATH = path.resolve(ROOT, 'config/living-ecosystem-canon.json')

let canonCache = null

export function loadLivingEcosystemCanon() {
  if (canonCache) return canonCache

  try {
    const raw = readFileSync(CANON_PATH, 'utf8')
    canonCache = JSON.parse(raw)
  } catch {
    canonCache = { systems: {}, surfaces: {} }
  }

  return canonCache
}

function notePathToWikiLink(notePath, displayName) {
  if (!notePath || !displayName) return null

  const stem = path.basename(notePath, path.extname(notePath))
  if (!stem) return null
  return `[[${stem}|${displayName}]]`
}

export function getCanonLinkBySurfaceId(surfaceId, fallbackLink = null) {
  const canon = loadLivingEcosystemCanon()
  const surface = canon.surfaces?.[surfaceId]
  if (!surface) return fallbackLink

  return notePathToWikiLink(surface.canonical_note_path, surface.display_name) || fallbackLink
}

export function getCanonPrimaryAndSpokeLinks() {
  const canon = loadLivingEcosystemCanon()
  const result = new Map()

  for (const [id, surface] of Object.entries(canon.surfaces || {})) {
    if (!['primary', 'spoke'].includes(surface.classification)) continue

    const link = notePathToWikiLink(surface.canonical_note_path, surface.display_name)
    if (link) result.set(id, link)
  }

  return result
}
