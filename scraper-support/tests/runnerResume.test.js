import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isAuthoritativeEmptyScrape,
  resolveScraperRetryAttempts,
  resolveScraperTimeoutMs,
  runScraperWithTimeout,
  selectScrapersForRun,
  shouldClearExistingJobsBeforeRun,
} from '../runner.js'

const sampleScrapers = [
  { name: 'alpha' },
  { name: 'danfoss' },
  { name: 'elgi' },
  { name: 'zeta' },
]

const historicalAliasScrapers = [
  {
    name: 'applied-intuition.wellfoundDirectory',
    provider: {
      adapter: 'wellfoundDirectory',
      companyName: 'Applied Intuition',
    },
  },
  {
    name: 'asana.himalayas.app',
    provider: {
      adapter: 'himalayasDirectory',
      companyName: 'Asana',
      himalayasCompanySlug: 'asana',
    },
  },
  {
    name: 'workiva.himalayas.app',
    provider: {
      adapter: 'himalayasDirectory',
      companyName: 'Workiva',
      himalayasCompanySlug: 'workiva',
    },
  },
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

test('selectScrapersForRun resolves historical source aliases for SCRAPER_ONLY', () => {
  const result = selectScrapersForRun(
    historicalAliasScrapers,
    { onlySources: 'wfappliedintuition, hmasana, hmworkiva' },
  )

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), [
    'applied-intuition.wellfoundDirectory',
    'asana.himalayas.app',
    'workiva.himalayas.app',
  ])
})

test('selectScrapersForRun resolves historical source aliases for resume pointers', () => {
  const result = selectScrapersForRun(historicalAliasScrapers, { startAt: 'hmasana' })

  assert.deepEqual(result.scrapers.map((scraper) => scraper.name), [
    'asana.himalayas.app',
    'workiva.himalayas.app',
  ])
  assert.match(result.resumeMessage, /Resuming at asana\.himalayas\.app \(2\/3 scrapers selected\)/)
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

test('shouldClearExistingJobsBeforeRun preserves the existing dataset for selective runs', () => {
  assert.equal(shouldClearExistingJobsBeforeRun({}), true)
  assert.equal(
    shouldClearExistingJobsBeforeRun({ onlySources: 'alpha, zeta' }),
    false,
  )
  assert.equal(shouldClearExistingJobsBeforeRun({ startAt: 'elgi' }), false)
  assert.equal(shouldClearExistingJobsBeforeRun({ startAfter: 'danfoss' }), false)
})

test('resolveScraperTimeoutMs keeps a bounded default and accepts explicit values', () => {
  assert.equal(resolveScraperTimeoutMs(), 300000)
  assert.equal(resolveScraperTimeoutMs('0'), 0)
  assert.equal(resolveScraperTimeoutMs('45000'), 45000)
  assert.equal(resolveScraperTimeoutMs('not-a-number'), 300000)
  assert.equal(resolveScraperTimeoutMs('-1'), 300000)
})

test('resolveScraperTimeoutMs gives Workday adapters a shorter default budget', () => {
  const workdayScraper = {
    name: 'airbus',
    provider: { adapter: 'workday' },
  }

  assert.equal(resolveScraperTimeoutMs(null, workdayScraper, null), 210000)
  assert.equal(
    resolveScraperTimeoutMs(
      null,
      {
        name: 'cerence',
        provider: { adapter: 'script', atsPlatform: 'workday' },
      },
      null,
    ),
    210000,
  )
  assert.equal(resolveScraperTimeoutMs('45000', workdayScraper, null), 45000)
})

test('resolveScraperRetryAttempts avoids multiplying the Workday source budget', () => {
  assert.equal(
    resolveScraperRetryAttempts({
      provider: { adapter: 'workday', atsPlatform: 'workday' },
    }),
    1,
  )
  assert.equal(
    resolveScraperRetryAttempts({
      provider: { adapter: 'script', atsPlatform: 'workday' },
    }),
    1,
  )
  assert.equal(
    resolveScraperRetryAttempts({
      provider: { adapter: 'script', atsPlatform: 'custom' },
    }),
    3,
  )
})

test('isAuthoritativeEmptyScrape trusts only confirmed empty Workday results', () => {
  const confirmedEmpty = []
  Object.defineProperty(
    confirmedEmpty,
    Symbol.for('jobify.workday.authoritative-empty'),
    { value: true },
  )

  assert.equal(
    isAuthoritativeEmptyScrape(
      { provider: { adapter: 'workday', atsPlatform: 'workday' } },
      [],
    ),
    false,
  )
  assert.equal(
    isAuthoritativeEmptyScrape(
      { provider: { adapter: 'script', atsPlatform: 'workday' } },
      confirmedEmpty,
    ),
    true,
  )
  assert.equal(
    isAuthoritativeEmptyScrape(
      { provider: { adapter: 'script', atsPlatform: 'custom' } },
      [],
    ),
    false,
  )
  assert.equal(
    isAuthoritativeEmptyScrape(
      { provider: { adapter: 'workday', atsPlatform: 'workday' } },
      [{ title: 'Engineer' }],
    ),
    false,
  )
})

test('runScraperWithTimeout rejects hung source runs with the configured source label', async () => {
  await assert.rejects(
    runScraperWithTimeout({
      name: 'hung-source',
      run: () => new Promise(() => {}),
    }, 5, { abortGraceMs: 0 }),
    (error) => {
      assert.match(error.message, /\[hung-source\] timed out after 5ms/)
      assert.equal(error.localTimeout, true)
      assert.equal(error.abortRetries, true)
      assert.equal(error.failureKind, 'runner_timeout')
      return true
    },
  )
})

test('runScraperWithTimeout waits for cooperative abort cleanup before rejecting', async () => {
  let cleanupFinished = false

  await assert.rejects(
    runScraperWithTimeout({
      name: 'cooperative-source',
      run: ({ signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          setTimeout(() => {
            cleanupFinished = true
            reject(signal.reason)
          }, 10)
        }, { once: true })
      }),
    }, 5, { abortGraceMs: 100 }),
    /\[cooperative-source\] timed out after 5ms/,
  )

  assert.equal(cleanupFinished, true)
})

test('runScraperWithTimeout can be disabled for explicitly unbounded local probes', async () => {
  const jobs = await runScraperWithTimeout({
    name: 'instant-source',
    run: async () => [{ title: 'Role' }],
  }, 0)

  assert.deepEqual(jobs, [{ title: 'Role' }])
})
