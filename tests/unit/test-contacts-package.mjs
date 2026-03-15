/**
 * Tests for @act/contacts package
 *
 * Run: node --test tests/unit/test-contacts-package.mjs
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('@act/contacts', () => {
  it('exports all modules from barrel', async () => {
    const mod = await import('../../packages/contacts/src/index.mjs')
    assert.equal(typeof mod.ContactMatcher, 'function')
    assert.equal(typeof mod.ContactEnricher, 'function')
    assert.equal(typeof mod.SupabaseContactRepository, 'function')
    assert.equal(typeof mod.RelationshipAnalyzer, 'function')
    assert.ok(Array.isArray(mod.SECTORS))
    assert.ok(mod.MATCH_CONFIDENCE.ID === 1.0)
  })
})

describe('@act/contacts/matching', () => {
  const CONTACTS = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', ghl_id: 'ghl-1' },
    { id: '2', name: 'Bob Jones', email: 'bob@test.org', emails: ['bobby@test.org'] },
    { id: '3', first_name: 'Charlie', last_name: 'Brown', email: 'charlie@school.edu' },
  ]

  it('constructs from array', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    assert.equal(matcher.stats.totalContacts, 3)
    assert.ok(matcher.stats.emailIndex >= 3)
  })

  it('findByEmail is case-insensitive', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    assert.equal(matcher.findByEmail('ALICE@EXAMPLE.COM')?.id, '1')
  })

  it('findById checks ghl_id', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    assert.equal(matcher.findById('ghl-1')?.id, '1')
  })

  it('findByName fuzzy matches', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    assert.equal(matcher.findByName('alice smith')?.id, '1')
    assert.equal(matcher.findByName('Charlie Brown')?.id, '3')
  })

  it('findBestMatch priorities: id > email > name', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)

    const byId = matcher.findBestMatch({ id: '1', email: 'bob@test.org' })
    assert.equal(byId.matchedOn, 'id')
    assert.equal(byId.confidence, 1.0)

    const byEmail = matcher.findBestMatch({ email: 'alice@example.com', name: 'Bob Jones' })
    assert.equal(byEmail.matchedOn, 'email')

    const byName = matcher.findBestMatch({ name: 'Charlie Brown' })
    assert.equal(byName.matchedOn, 'name')
  })

  it('batchMatch returns results for all records', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    const results = matcher.batchMatch([
      { email: 'alice@example.com' },
      { email: 'unknown@nowhere.com' },
    ])
    assert.equal(results.length, 2)
    assert.ok(results[0].contact !== null)
    assert.equal(results[1].contact, null)
  })

  it('findUnmatched returns only unmatched', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    const unmatched = matcher.findUnmatched([
      { email: 'alice@example.com' },
      { email: 'unknown@nowhere.com' },
    ])
    assert.equal(unmatched.length, 1)
    assert.equal(unmatched[0].email, 'unknown@nowhere.com')
  })

  it('merge combines two matchers', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const m1 = new ContactMatcher([CONTACTS[0]])
    const m2 = new ContactMatcher([CONTACTS[1]])
    const merged = m1.merge(m2)
    assert.equal(merged.stats.totalContacts, 2)
    assert.ok(merged.findByEmail('alice@example.com'))
    assert.ok(merged.findByEmail('bob@test.org'))
  })

  it('finds secondary emails', async () => {
    const { ContactMatcher } = await import('../../packages/contacts/src/matching/index.mjs')
    const matcher = new ContactMatcher(CONTACTS)
    assert.equal(matcher.findByEmail('bobby@test.org')?.id, '2')
  })
})

describe('@act/contacts/enrichment', () => {
  it('exports ContactEnricher class', async () => {
    const mod = await import('../../packages/contacts/src/enrichment/index.mjs')
    assert.equal(typeof mod.ContactEnricher, 'function')
    assert.equal(typeof mod.searchTavily, 'function')
    assert.equal(typeof mod.fetchWebsite, 'function')
    assert.equal(typeof mod.lookupGitHub, 'function')
    assert.equal(typeof mod.isPersonalEmail, 'function')
  })

  it('isPersonalEmail detects common providers', async () => {
    const { isPersonalEmail } = await import('../../packages/contacts/src/enrichment/index.mjs')
    assert.equal(isPersonalEmail('user@gmail.com'), true)
    assert.equal(isPersonalEmail('user@outlook.com'), true)
    assert.equal(isPersonalEmail('user@company.com'), false)
    assert.equal(isPersonalEmail('user@act.place'), false)
  })

  it('requires supabase client', async () => {
    const { ContactEnricher } = await import('../../packages/contacts/src/enrichment/index.mjs')
    assert.throws(() => new ContactEnricher(), /supabase client is required/)
  })

  it('works without AI when llmFn not provided', async () => {
    const { ContactEnricher } = await import('../../packages/contacts/src/enrichment/index.mjs')
    const enricher = new ContactEnricher({ supabase: {} })
    assert.equal(enricher.llmFn, null) // No AI
    assert.equal(enricher.projectMatchFn, null) // No project matching
  })
})

describe('@act/contacts/repository', () => {
  it('exports SupabaseContactRepository', async () => {
    const mod = await import('../../packages/contacts/src/repository/index.mjs')
    assert.equal(typeof mod.SupabaseContactRepository, 'function')
  })

  it('requires supabase client', async () => {
    const { SupabaseContactRepository } = await import('../../packages/contacts/src/repository/index.mjs')
    assert.throws(() => new SupabaseContactRepository(), /supabase client is required/)
  })
})

describe('@act/contacts/relationships', () => {
  it('exports RelationshipAnalyzer', async () => {
    const mod = await import('../../packages/contacts/src/relationships/index.mjs')
    assert.equal(typeof mod.RelationshipAnalyzer, 'function')
  })

  it('requires supabase client', async () => {
    const { RelationshipAnalyzer } = await import('../../packages/contacts/src/relationships/index.mjs')
    assert.throws(() => new RelationshipAnalyzer(), /supabase client is required/)
  })
})

describe('@act/contacts/types', () => {
  it('exports constants', async () => {
    const { SECTORS, ENRICHMENT_STATUSES, MATCH_CONFIDENCE } = await import('../../packages/contacts/src/types.mjs')
    assert.ok(SECTORS.includes('technology'))
    assert.ok(SECTORS.includes('indigenous'))
    assert.ok(ENRICHMENT_STATUSES.includes('pending'))
    assert.equal(MATCH_CONFIDENCE.EMAIL, 0.95)
  })
})
