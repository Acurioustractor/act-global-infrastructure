#!/usr/bin/env node
/**
 * Build /minderoo-gallery.json from Empathy Ledger v2.
 * Paginates through all media_assets, storyteller portraits, and story images
 * for the 5 anchor communities. Deduplicates by URL. Emits a flat item list
 * with consent metadata for the pitch-page gallery modal.
 */
import 'dotenv/config'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const OUT = join(REPO_ROOT, 'apps', 'command-center', 'public', 'minderoo-gallery.json')
const OUT_TOOLS = join(REPO_ROOT, 'tools', 'minderoo-gallery.json')

const URL = process.env.EL_SUPABASE_URL
const KEY = process.env.EL_SUPABASE_SERVICE_KEY
if (!URL || !KEY) { console.error('[fatal] EL_SUPABASE_URL / EL_SUPABASE_SERVICE_KEY missing'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const ANCHOR_SLUGS = ['oonchiumpa', 'bg-fit', 'mounty-yarns', 'mmeic', 'palm-island-community-company']

async function getJson(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`)
  return r.json()
}

async function getAll(pathNoRange, pageSize = 1000) {
  const out = []
  let offset = 0
  while (true) {
    const sep = pathNoRange.includes('?') ? '&' : '?'
    const page = await getJson(`${pathNoRange}${sep}limit=${pageSize}&offset=${offset}`)
    if (!Array.isArray(page)) throw new Error('expected array')
    out.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return out
}

async function main() {
  console.log('→ Fetching anchor organisations...')
  const slugFilter = ANCHOR_SLUGS.map((s) => `"${s}"`).join(',')
  const orgs = await getJson(`organizations?select=id,name,slug&slug=in.(${slugFilter})`)
  console.log(`  ${orgs.length} orgs: ${orgs.map((o) => o.slug).join(', ')}`)
  const orgById = Object.fromEntries(orgs.map((o) => [o.id, o]))
  const inOrgs = orgs.map((o) => `"${o.id}"`).join(',')

  console.log('→ Fetching storytellers...')
  const sts = await getAll(`storytellers?select=id,display_name,bio,is_elder,organization_id,profile_image_url,public_avatar_url&organization_id=in.(${inOrgs})`)
  console.log(`  ${sts.length} storytellers`)
  const stById = Object.fromEntries(sts.map((s) => [s.id, s]))

  console.log('→ Fetching stories...')
  const stories = await getAll(`stories?select=id,title,excerpt,content,story_image_url,media_urls,video_link,storyteller_id,organization_id,updated_at,cultural_permission_level,cultural_sensitivity_flag,consent_withdrawn_at,syndication_enabled&organization_id=in.(${inOrgs})&consent_withdrawn_at=is.null`)
  console.log(`  ${stories.length} stories`)

  console.log('→ Fetching media_assets (paginated)...')
  const ma = await getAll(`media_assets?select=id,url,media_type,caption,organization_id,storyteller_id,consent_obtained,elder_approved,cultural_sensitivity,visibility,project_code,created_at&organization_id=in.(${inOrgs})&url=not.is.null`)
  console.log(`  ${ma.length} media assets`)

  const items = []

  for (const s of stories) {
    if (!s.story_image_url) continue
    const org = orgById[s.organization_id]
    const st = s.storyteller_id ? stById[s.storyteller_id] : null
    items.push({
      id: `story-hero-${s.id}`,
      type: 'image',
      source: 'story_hero',
      url: s.story_image_url,
      title: s.title,
      caption: s.excerpt ? s.excerpt.slice(0, 160) : null,
      organisation: org?.name,
      organisation_slug: org?.slug,
      storyteller: st?.display_name,
      storyteller_is_elder: !!st?.is_elder,
      story_id: s.id,
      consent_status: s.syndication_enabled ? 'active' : 'awaiting_elder',
      sensitivity: s.cultural_sensitivity_flag ? 'medium' : 'standard',
      created_at: s.updated_at,
    })
  }

  for (const s of stories) {
    if (!Array.isArray(s.media_urls)) continue
    const org = orgById[s.organization_id]
    const st = s.storyteller_id ? stById[s.storyteller_id] : null
    for (const [i, url] of s.media_urls.entries()) {
      if (!url || url === s.story_image_url) continue
      items.push({
        id: `story-media-${s.id}-${i}`,
        type: 'image',
        source: 'story_media',
        url,
        title: `${s.title} · media #${i + 1}`,
        caption: null,
        organisation: org?.name,
        organisation_slug: org?.slug,
        storyteller: st?.display_name,
        storyteller_is_elder: !!st?.is_elder,
        story_id: s.id,
        consent_status: s.syndication_enabled ? 'active' : 'awaiting_elder',
        sensitivity: s.cultural_sensitivity_flag ? 'medium' : 'standard',
        created_at: s.updated_at,
      })
    }
  }

  for (const s of stories) {
    if (!s.video_link) continue
    const org = orgById[s.organization_id]
    const st = s.storyteller_id ? stById[s.storyteller_id] : null
    items.push({
      id: `story-video-${s.id}`,
      type: 'video',
      source: 'story_video',
      url: s.video_link,
      title: s.title,
      caption: null,
      organisation: org?.name,
      organisation_slug: org?.slug,
      storyteller: st?.display_name,
      storyteller_is_elder: !!st?.is_elder,
      story_id: s.id,
      consent_status: s.syndication_enabled ? 'active' : 'awaiting_elder',
      sensitivity: s.cultural_sensitivity_flag ? 'medium' : 'standard',
      created_at: s.updated_at,
    })
  }

  for (const st of sts) {
    const portrait = st.profile_image_url || st.public_avatar_url
    if (!portrait) continue
    if (portrait.includes('/avatars/generated/')) continue
    const org = orgById[st.organization_id]
    items.push({
      id: `portrait-${st.id}`,
      type: 'portrait',
      source: 'storyteller_portrait',
      url: portrait,
      title: st.display_name,
      caption: st.bio ? st.bio.slice(0, 160) : null,
      organisation: org?.name,
      organisation_slug: org?.slug,
      storyteller: st.display_name,
      storyteller_is_elder: !!st.is_elder,
      story_id: null,
      consent_status: 'active',
      sensitivity: 'standard',
      created_at: null,
    })
  }

  for (const m of ma) {
    if (!m.url) continue
    const org = orgById[m.organization_id]
    const st = m.storyteller_id ? stById[m.storyteller_id] : null
    items.push({
      id: `asset-${m.id}`,
      type: m.media_type === 'video' ? 'video' : 'image',
      source: 'media_asset',
      url: m.url,
      title: m.caption || st?.display_name || 'Untitled asset',
      caption: m.caption,
      organisation: org?.name,
      organisation_slug: org?.slug,
      storyteller: st?.display_name,
      storyteller_is_elder: !!st?.is_elder,
      story_id: null,
      consent_status: (m.consent_obtained && m.elder_approved) ? 'active' : 'awaiting_elder',
      sensitivity: m.cultural_sensitivity || 'standard',
      project_code: m.project_code,
      created_at: m.created_at,
    })
  }

  // Dedupe by URL
  const byUrl = new Map()
  for (const it of items) if (!byUrl.has(it.url)) byUrl.set(it.url, it)
  const deduped = [...byUrl.values()]

  // Sort: portraits first, then story heroes, then media assets newest-first
  deduped.sort((a, b) => {
    const rank = (s) => s === 'storyteller_portrait' ? 0 : s === 'story_hero' ? 1 : s === 'story_media' ? 2 : s === 'story_video' ? 3 : 4
    const ra = rank(a.source), rb = rank(b.source)
    if (ra !== rb) return ra - rb
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const stats = {
    portraits: deduped.filter((i) => i.source === 'storyteller_portrait').length,
    story_heroes: deduped.filter((i) => i.source === 'story_hero').length,
    story_media: deduped.filter((i) => i.source === 'story_media').length,
    story_videos: deduped.filter((i) => i.source === 'story_video').length,
    media_asset_images: deduped.filter((i) => i.source === 'media_asset' && i.type === 'image').length,
    media_asset_videos: deduped.filter((i) => i.source === 'media_asset' && i.type === 'video').length,
  }

  const doc = {
    generated_at: new Date().toISOString(),
    source: 'Empathy Ledger v2 · Supabase yvnuayzslukamizrlhwb · multi-source paginated pull',
    organisations: orgs.map((o) => ({ slug: o.slug, name: o.name })),
    total_items: deduped.length,
    stats,
    items: deduped,
  }

  writeFileSync(OUT, JSON.stringify(doc, null, 2))
  writeFileSync(OUT_TOOLS, JSON.stringify(doc, null, 2))
  console.log(`\n✓ Wrote ${deduped.length} items → ${OUT.replace(REPO_ROOT + '/', '')}`)
  console.log(`  + mirrored to tools/`)
  for (const [k, v] of Object.entries(stats)) console.log(`  · ${k.padEnd(20)} ${v}`)
  const byOrg = {}
  for (const i of deduped) byOrg[i.organisation_slug] = (byOrg[i.organisation_slug] || 0) + 1
  console.log('\nBy organisation:')
  for (const [o, n] of Object.entries(byOrg).sort((a, b) => b[1] - a[1])) console.log(`  ${o.padEnd(35)} ${n}`)
}

main().catch((e) => { console.error('[fatal]', e.message); process.exit(1) })
