/**
 * Lightweight GHL API client for Next.js server-side use.
 * Mirrors the patterns from scripts/lib/ghl-api-service.mjs but in TypeScript.
 */

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface GHLContactUpdate {
  firstName?: string
  lastName?: string
  companyName?: string
  website?: string
  tags?: string[]
}

interface GHLContactCreate extends GHLContactUpdate {
  email: string
}

async function ghlRequest(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID

  if (!apiKey || !locationId) {
    throw new Error('Missing GHL_API_KEY or GHL_LOCATION_ID')
  }

  const res = await fetch(`${GHL_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': GHL_API_VERSION,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL API ${res.status}: ${text}`)
  }

  return res.json()
}

export async function ghlUpdateContact(ghlId: string, updates: GHLContactUpdate) {
  const data = await ghlRequest(`/contacts/${ghlId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.contact
}

export async function ghlCreateContact(contactData: GHLContactCreate) {
  const locationId = process.env.GHL_LOCATION_ID
  const data = await ghlRequest('/contacts/', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      ...contactData,
      source: 'ACT Dashboard',
    }),
  })
  return data.contact
}

export async function ghlAddTag(ghlId: string, tag: string) {
  await ghlRequest(`/contacts/${ghlId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags: [tag] }),
  })
}

export async function ghlRemoveTag(ghlId: string, tag: string) {
  await ghlRequest(`/contacts/${ghlId}/tags`, {
    method: 'DELETE',
    body: JSON.stringify({ tags: [tag] }),
  })
}
