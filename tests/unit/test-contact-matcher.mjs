/**
 * Tests for scripts/lib/contact-matcher.mjs
 *
 * Run: node --test tests/unit/test-contact-matcher.mjs
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ContactMatcher } from '../../scripts/lib/contact-matcher.mjs'

const SAMPLE_CONTACTS = [
  {
    id: '1',
    name: 'Benjamin Knight',
    email: 'ben@act.place',
    first_name: 'Benjamin',
    last_name: 'Knight',
    ghl_contact_id: 'ghl-001',
    organization: 'ACT',
  },
  {
    id: '2',
    name: 'Nicholas Marchesi',
    email: 'nic@act.place',
    emails: ['nicholas@act.place'],
    first_name: 'Nicholas',
    last_name: 'Marchesi',
    organization: 'Orange Sky',
  },
  {
    id: '3',
    name: 'Test User',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  },
]

describe('ContactMatcher', () => {
  const matcher = new ContactMatcher(SAMPLE_CONTACTS)

  describe('findByEmail', () => {
    it('finds exact email match', () => {
      const result = matcher.findByEmail('ben@act.place')
      assert.equal(result.id, '1')
    })

    it('is case-insensitive', () => {
      const result = matcher.findByEmail('BEN@ACT.PLACE')
      assert.equal(result.id, '1')
    })

    it('finds secondary emails', () => {
      const result = matcher.findByEmail('nicholas@act.place')
      assert.equal(result.id, '2')
    })

    it('returns null for unknown email', () => {
      assert.equal(matcher.findByEmail('unknown@test.com'), null)
    })

    it('handles null input', () => {
      assert.equal(matcher.findByEmail(null), null)
    })
  })

  describe('findById', () => {
    it('finds by internal ID', () => {
      const result = matcher.findById('1')
      assert.equal(result.name, 'Benjamin Knight')
    })

    it('finds by GHL ID', () => {
      const result = matcher.findById('ghl-001')
      assert.equal(result.name, 'Benjamin Knight')
    })

    it('returns null for unknown ID', () => {
      assert.equal(matcher.findById('unknown'), null)
    })
  })

  describe('findByName', () => {
    it('finds exact normalised name', () => {
      const result = matcher.findByName('Benjamin Knight')
      assert.equal(result.id, '1')
    })

    it('is case-insensitive', () => {
      const result = matcher.findByName('benjamin knight')
      assert.equal(result.id, '1')
    })

    it('handles partial names', () => {
      const result = matcher.findByName('Benjamin')
      assert.ok(result !== null)
    })

    it('returns null for unknown names', () => {
      assert.equal(matcher.findByName('Nobody Here'), null)
    })
  })

  describe('findBestMatch', () => {
    it('prefers ID over email', () => {
      const result = matcher.findBestMatch({ id: '1', email: 'nic@act.place' })
      assert.equal(result.contact.id, '1')
      assert.equal(result.matchedOn, 'id')
      assert.equal(result.confidence, 1.0)
    })

    it('prefers email over name', () => {
      const result = matcher.findBestMatch({ email: 'ben@act.place', name: 'Nicholas Marchesi' })
      assert.equal(result.contact.id, '1')
      assert.equal(result.matchedOn, 'email')
    })

    it('falls back to name', () => {
      const result = matcher.findBestMatch({ name: 'Benjamin Knight' })
      assert.equal(result.contact.id, '1')
      assert.equal(result.matchedOn, 'name')
    })

    it('returns null for no match', () => {
      const result = matcher.findBestMatch({ name: 'Nobody', email: 'unknown@test.com' })
      assert.equal(result.contact, null)
      assert.equal(result.confidence, 0)
    })
  })

  describe('batchMatch', () => {
    it('matches multiple records', () => {
      const records = [
        { email: 'ben@act.place', name: 'Ben' },
        { email: 'unknown@test.com', name: 'Unknown' },
      ]
      const results = matcher.batchMatch(records)
      assert.equal(results.length, 2)
      assert.ok(results[0].contact !== null)
      assert.equal(results[1].contact, null)
    })
  })

  describe('stats', () => {
    it('returns correct counts', () => {
      const stats = matcher.stats
      assert.equal(stats.totalContacts, 3)
      assert.ok(stats.emailIndex >= 3) // at least primary emails
      assert.ok(stats.nameIndex >= 3) // at least full names
    })
  })
})
