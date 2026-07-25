import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveScraperTimeoutMs, runScraperWithTimeout, selectScrapersForRun } from '../runner.js'

const sampleScrapers = [
  { name: 'alpha' },
  { name: 'danfoss' },
  { name: 'elgi' },
  { name: 'zeta' },
]

test('selectScrapersForRun returns the full catalog when no resume source is set', () => {
  const result = selectScrapersForRun(sampleScrapers, {})

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), [
    'alpha',
    'danfoss',
    'elgi',
    'zeta',
  ])
  assert.equal(result.resumeMessage, null)
})

test('selectScrapersForRun resumes inclusively from SCRAPER_START_AT', () => {
  const result = selectScrapersForRun(sampleScrapers, { startAt: 'ELGI' })

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), ['elgi', 'zeta'])
  assert.match(result.resumeMessage, /Resuming at elgi \(2\/4 scrapers selected\)/)
})

test('selectScrapersForRun resumes exclusively after SCRAPER_START_AFTER', () => {
  const result = selectScrapersForRun(sampleScrapers, { startAfter: 'danfoss' })

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), ['elgi', 'zeta'])
  assert.match(result.resumeMessage, /Resuming at elgi \(2\/4 scrapers selected\)/)
})

test('selectScrapersForRun runs an explicit SCRAPER_ONLY list', () => {
  const result = selectScrapersForRun(sampleScrapers, { onlySources: 'zeta, danfoss, zeta' })

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), ['zeta', 'danfoss'])
  assert.match(result.resumeMessage, /Running selected sources \(2\/4 scrapers selected\): zeta, danfoss\./)
})

test('selectScrapersForRun rejects ambiguous or missing resume sources', () => {
  assert.throws(
    () => selectScrapersForRun(sampleScrapers, { startAt: 'danfoss', startAfter: 'elgi' }),
    /Use only one/,
  )
  assert.throws(
    () => selectScrapersForRun(sampleScrapers, { startAt: 'missing' }),
    /not found/,
  )
  assert.throws(
    () => selectScrapersForRun(sampleScrapers, { onlySources: 'alpha,missing' }),
    /SCRAPER_ONLY source\(s\) not found/,
  )
  assert.throws(
    () => selectScrapersForRun(sampleScrapers, { onlySources: 'alpha', startAfter: 'danfoss' }),
    /SCRAPER_ONLY by itself/,
  )
})

test('resolveScraperTimeoutMs keeps a bounded default and accepts explicit values', () => {
  assert.equal(resolveScraperTimeoutMs(), 300000)
  assert.equal(resolveScraperTimeoutMs('0'), 0)
  assert.equal(resolveScraperTimeoutMs('45000'), 45000)
  assert.equal(resolveScraperTimeoutMs('not-a-number'), 300000)
  assert.equal(resolveScraperTimeoutMs('-1'), 300000)
})

test('runScraperWithTimeout rejects hung source runs with the configured source label', async () => {
  await assert.rejects(
    runScraperWithTimeout({
      name: 'hung-source',
      run: () => new Promise(() => {}),
    }, 5),
    /\[hung-source\] timed out after 5ms/,
  )
})

test('runScraperWithTimeout can be disabled for explicitly unbounded local probes', async () => {
  const jobs = await runScraperWithTimeout({
    name: 'instant-source',
    run: async () => [{ title: 'Role' }],
  }, 0)

  assert.deepEqual(jobs, [{ title: 'Role' }])
})
