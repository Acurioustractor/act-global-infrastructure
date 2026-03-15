/**
 * Tests for scripts/lib/contact-enricher.mjs
 *
 * Run: node --test tests/unit/test-contact-enricher.mjs
 */

import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

// We test the module import and class structure without hitting external APIs
describe('ContactEnricher', () => {
  it('exports ContactEnricher class', async () => {
    const mod = await import('../../scripts/lib/contact-enricher.mjs')
    assert.equal(typeof mod.ContactEnricher, 'function')
    assert.equal(typeof mod.default, 'function')
  })

  it('can instantiate with options', async () => {
    const { ContactEnricher } = await import('../../scripts/lib/contact-enricher.mjs')
    const enricher = new ContactEnricher({
      verbose: true,
      dryRun: true,
      supabase: {}, // mock
    })
    assert.equal(enricher.verbose, true)
    assert.equal(enricher.dryRun, true)
    assert.deepEqual(enricher.stats, { enriched: 0, skipped: 0, errors: 0, total: 0 })
  })

  it('tracks stats correctly', async () => {
    const { ContactEnricher } = await import('../../scripts/lib/contact-enricher.mjs')
    const enricher = new ContactEnricher({ dryRun: true, supabase: {} })
    assert.equal(enricher.stats.enriched, 0)
    assert.equal(enricher.stats.total, 0)
  })

  it('handles missing contact gracefully', async () => {
    const { ContactEnricher } = await import('../../scripts/lib/contact-enricher.mjs')

    // Mock supabase that returns no contact
    const mockSupabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            limit: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }

    const enricher = new ContactEnricher({ supabase: mockSupabase })
    const result = await enricher.enrichContact('nonexistent-id')
    assert.equal(result.error, 'Contact not found')
    assert.equal(enricher.stats.skipped, 1)
  })

  it('skips recently enriched contacts', async () => {
    const { ContactEnricher } = await import('../../scripts/lib/contact-enricher.mjs')

    const recentDate = new Date(Date.now() - 5 * 86400000).toISOString() // 5 days ago
    const mockSupabase = {
      from: () => ({
        select: () => ({
          or: () => ({
            limit: () => ({
              single: async () => ({
                data: {
                  id: 'test-1',
                  email: 'test@example.com',
                  enrichment_status: 'enriched',
                  enriched_at: recentDate,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    const enricher = new ContactEnricher({ supabase: mockSupabase, verbose: false })
    const result = await enricher.enrichContact('test-1')
    assert.equal(result.status, 'skipped')
    assert.equal(result.reason, 'recently_enriched')
  })

  it('_buildContext formats correctly', async () => {
    const { ContactEnricher } = await import('../../scripts/lib/contact-enricher.mjs')
    const enricher = new ContactEnricher({ supabase: {} })

    const context = enricher._buildContext(
      { full_name: 'Test User', email: 'test@example.com', tags: ['partner'] },
      {
        tavily: { answer: 'Test answer', results: [{ title: 'Result', url: 'https://example.com', content: 'Content' }] },
        website: { url: 'https://example.com', title: 'Example', description: 'A test site', text: 'Site text' },
        linkedIn: null,
        gitHub: { login: 'testuser', name: 'Test', bio: 'Developer', company: 'TestCo', public_repos: 10, followers: 5 },
      }
    )

    assert.ok(context.includes('Test User'))
    assert.ok(context.includes('test@example.com'))
    assert.ok(context.includes('Web Search Results'))
    assert.ok(context.includes('Test answer'))
    assert.ok(context.includes('Company Website'))
    assert.ok(context.includes('GitHub Profile'))
    assert.ok(context.includes('testuser'))
    assert.ok(!context.includes('LinkedIn')) // null source should be omitted
  })
})
