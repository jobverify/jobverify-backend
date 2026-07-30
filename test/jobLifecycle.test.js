import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJobPostedAtCutoff,
  resolveJobMissesBeforeExpiry,
  resolveJobPostedAt,
  resolveJobRetentionDays,
  startOfUtcDay,
} from '../src/utils/jobLifecycle.js'

test('resolveJobPostedAt prefers a valid postingDate and falls back from an invalid one', () => {
  const postedAt = '2026-07-20T00:00:00.000Z'

  assert.equal(
    resolveJobPostedAt({
      postingDate: '2026-07-22T00:00:00.000Z',
      postedAt,
    }).toISOString(),
    '2026-07-22T00:00:00.000Z',
  )
  assert.equal(
    resolveJobPostedAt({ postingDate: 'not-a-date', postedAt }).toISOString(),
    postedAt,
  )
})

test('resolveJobPostedAt uses the scrape date when the posting date is missing or NA', () => {
  const scrapedAt = '2026-07-26T09:30:00.000Z'

  assert.equal(
    resolveJobPostedAt({ postingDate: null, scrapedAt }).toISOString(),
    scrapedAt,
  )
  assert.equal(
    resolveJobPostedAt({ postingDate: 'NA', scrapedTimestamp: scrapedAt }).toISOString(),
    scrapedAt,
  )
})

test('job lifecycle configuration rejects unsafe or invalid values', () => {
  assert.equal(resolveJobRetentionDays('14'), 14)
  assert.equal(resolveJobRetentionDays('0'), 10)
  assert.equal(resolveJobRetentionDays('invalid'), 10)
  assert.equal(resolveJobMissesBeforeExpiry('3'), 3)
  assert.equal(resolveJobMissesBeforeExpiry('1'), 2)
  assert.equal(resolveJobMissesBeforeExpiry('invalid'), 2)
})

test('job lifecycle boundaries use UTC days and keep the exact cutoff day', () => {
  const now = new Date('2026-07-25T23:30:00.000Z')

  assert.equal(startOfUtcDay(now).toISOString(), '2026-07-25T00:00:00.000Z')
  assert.equal(
    buildJobPostedAtCutoff(now, 10).toISOString(),
    '2026-07-15T00:00:00.000Z',
  )
})
