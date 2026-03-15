/**
 * Tests for scripts/lib/date-utils.mjs
 *
 * Run: node --test tests/unit/test-date-utils.mjs
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseXeroDate,
  formatRelative,
  toISODate,
  daysBetween,
  isWithinHours,
  parseNotionDate,
} from '../../scripts/lib/date-utils.mjs'

describe('parseXeroDate', () => {
  it('parses a standard Xero date', () => {
    const date = parseXeroDate('/Date(1709251200000+0000)/')
    assert.ok(date instanceof Date)
    assert.equal(date.getTime(), 1709251200000)
  })

  it('parses a Xero date with timezone offset', () => {
    const date = parseXeroDate('/Date(1709251200000+1100)/')
    assert.ok(date instanceof Date)
    assert.equal(date.getTime(), 1709251200000)
  })

  it('returns null for invalid input', () => {
    assert.equal(parseXeroDate(null), null)
    assert.equal(parseXeroDate(''), null)
    assert.equal(parseXeroDate('not a date'), null)
  })
})

describe('formatRelative', () => {
  it('shows "just now" for recent dates', () => {
    assert.equal(formatRelative(new Date()), 'just now')
  })

  it('shows minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    assert.equal(formatRelative(fiveMinAgo), '5 minutes ago')
  })

  it('shows hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000)
    assert.equal(formatRelative(threeHoursAgo), '3 hours ago')
  })

  it('shows days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000)
    assert.equal(formatRelative(twoDaysAgo), '2 days ago')
  })

  it('shows future dates', () => {
    const tomorrow = new Date(Date.now() + 86400 * 1000)
    assert.ok(formatRelative(tomorrow).startsWith('in '))
  })

  it('accepts string dates', () => {
    const result = formatRelative(new Date(Date.now() - 3600 * 1000).toISOString())
    assert.equal(result, '1 hour ago')
  })
})

describe('toISODate', () => {
  it('converts Date to YYYY-MM-DD', () => {
    const result = toISODate(new Date('2026-03-15T10:30:00Z'))
    assert.equal(result, '2026-03-15')
  })

  it('accepts string input', () => {
    const result = toISODate('2026-01-01T00:00:00Z')
    assert.equal(result, '2026-01-01')
  })
})

describe('daysBetween', () => {
  it('returns positive for forward dates', () => {
    assert.equal(daysBetween('2026-03-01', '2026-03-15'), 14)
  })

  it('returns negative for backward dates', () => {
    assert.equal(daysBetween('2026-03-15', '2026-03-01'), -14)
  })

  it('returns 0 for same date', () => {
    assert.equal(daysBetween('2026-03-15', '2026-03-15'), 0)
  })
})

describe('isWithinHours', () => {
  it('returns true for recent dates', () => {
    assert.equal(isWithinHours(new Date(), 1), true)
  })

  it('returns false for old dates', () => {
    const old = new Date(Date.now() - 48 * 3600 * 1000)
    assert.equal(isWithinHours(old, 24), false)
  })
})

describe('parseNotionDate', () => {
  it('parses a string date', () => {
    const result = parseNotionDate('2026-03-15')
    assert.ok(result.start instanceof Date)
    assert.equal(result.end, null)
  })

  it('parses a Notion date object', () => {
    const result = parseNotionDate({ start: '2026-03-15', end: '2026-03-20' })
    assert.ok(result.start instanceof Date)
    assert.ok(result.end instanceof Date)
  })

  it('returns nulls for null input', () => {
    const result = parseNotionDate(null)
    assert.equal(result.start, null)
    assert.equal(result.end, null)
  })
})
