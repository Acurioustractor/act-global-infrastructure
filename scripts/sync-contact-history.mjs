#!/usr/bin/env node
/**
 * Sync Contact History from Communications
 *
 * This script enriches contacts by:
 * 1. Setting last_contact_at from communications_history
 * 2. Auto-tagging contacts with project codes from their communications
 * 3. Calculating days_since_contact accurately
 *
 * Run: node scripts/sync-contact-history.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function syncContactHistory() {
  console.log('🔄 Syncing contact history from communications...\n')

  // Step 1: Get all communications grouped by contact (paginated)
  console.log('📧 Fetching communications history...')
  const communications = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('communications_history')
      .select('ghl_contact_id, occurred_at, channel, project_code, subject')
      .order('occurred_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Error fetching communications:', error)
      return
    }

    communications.push(...data)
    hasMore = data.length === pageSize
    page++
    process.stdout.write(`   Fetched ${communications.length} records...\r`)
  }

  console.log(`   Found ${communications.length} communication records     `)

  // Step 2: Group by contact and find latest + project codes
  const contactStats = {}

  for (const comm of communications) {
    const contactId = comm.ghl_contact_id
    if (!contactId) continue

    if (!contactStats[contactId]) {
      contactStats[contactId] = {
        lastContact: null,
        projectCodes: new Set(),
        totalComms: 0,
        channels: new Set()
      }
    }

    // Track latest communication
    if (comm.occurred_at) {
      const commDate = new Date(comm.occurred_at)
      if (!contactStats[contactId].lastContact || commDate > contactStats[contactId].lastContact) {
        contactStats[contactId].lastContact = commDate
      }
    }

    // Track project codes
    if (comm.project_code) {
      contactStats[contactId].projectCodes.add(comm.project_code.toLowerCase())
    }

    // Track channels and count
    contactStats[contactId].totalComms++
    if (comm.channel) {
      contactStats[contactId].channels.add(comm.channel)
    }
  }

  console.log(`   Grouped into ${Object.keys(contactStats).length} unique contacts\n`)

  // Step 3: Update relationship_health table
  console.log('📊 Updating relationship_health records...')
  let updated = 0
  let errors = 0

  for (const [ghlContactId, stats] of Object.entries(contactStats)) {
    try {
      // Calculate days since contact
      const daysSinceContact = stats.lastContact
        ? Math.floor((Date.now() - stats.lastContact.getTime()) / (1000 * 60 * 60 * 24))
        : 365

      const { error } = await supabase
        .from('relationship_health')
        .update({
          last_contact_at: stats.lastContact?.toISOString() || null,
          days_since_contact: daysSinceContact,
          total_touchpoints: stats.totalComms,
          updated_at: new Date().toISOString()
        })
        .eq('ghl_contact_id', ghlContactId)

      if (error) {
        errors++
      } else {
        updated++
      }
    } catch (e) {
      errors++
    }
  }

  console.log(`   Updated: ${updated} contacts`)
  console.log(`   Errors: ${errors}\n`)

  // Step 4: Update GHL contacts with project tags
  console.log('🏷️  Updating project tags on contacts...')
  let taggedCount = 0

  for (const [ghlContactId, stats] of Object.entries(contactStats)) {
    if (stats.projectCodes.size === 0) continue

    try {
      // Get current tags
      const { data: contact } = await supabase
        .from('ghl_contacts')
        .select('tags')
        .eq('ghl_id', ghlContactId)
        .single()

      if (!contact) continue

      const currentTags = contact.tags || []
      const newTags = [...stats.projectCodes]

      // Add project codes that aren't already in tags
      let tagsChanged = false
      for (const code of newTags) {
        if (!currentTags.some(t => t.toLowerCase() === code)) {
          currentTags.push(code)
          tagsChanged = true
        }
      }

      if (tagsChanged) {
        await supabase
          .from('ghl_contacts')
          .update({ tags: currentTags })
          .eq('ghl_id', ghlContactId)
        taggedCount++
      }
    } catch (e) {
      // Skip individual errors
    }
  }

  console.log(`   Tagged ${taggedCount} contacts with project codes\n`)

  // Step 5: Summary stats
  console.log('📈 Summary:')

  const withRecentContact = Object.values(contactStats).filter(s => {
    if (!s.lastContact) return false
    const daysSince = Math.floor((Date.now() - s.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    return daysSince < 30
  }).length

  const withOldContact = Object.values(contactStats).filter(s => {
    if (!s.lastContact) return false
    const daysSince = Math.floor((Date.now() - s.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    return daysSince >= 30 && daysSince < 90
  }).length

  const stale = Object.values(contactStats).filter(s => {
    if (!s.lastContact) return true
    const daysSince = Math.floor((Date.now() - s.lastContact.getTime()) / (1000 * 60 * 60 * 24))
    return daysSince >= 90
  }).length

  console.log(`   Contacted < 30 days ago: ${withRecentContact}`)
  console.log(`   Contacted 30-90 days ago: ${withOldContact}`)
  console.log(`   Stale (90+ days): ${stale}`)

  // Project code breakdown
  const allProjectCodes = new Set()
  Object.values(contactStats).forEach(s => {
    s.projectCodes.forEach(code => allProjectCodes.add(code))
  })

  console.log(`\n   Project codes found: ${[...allProjectCodes].join(', ') || 'none'}`)

  console.log('\n✅ Sync complete!')
}

// Run
syncContactHistory().catch(console.error)
