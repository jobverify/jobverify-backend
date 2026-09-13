import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertLiveMongoUriConfigured,
  getZeroJobEvidence,
  isAuthoritativeEmptyScrape,
  MissingMongoUriError,
  resolveLivePublicExperienceEnabled,
  resolveScraperRetryAttempts,
  resolveScraperTimeoutMs,
  resolveSourceLifecycleTimeoutMs,
  ScraperSourceLifecycleTimeoutError,
  runScraperWithTimeout,
  selectScrapersForRun,
  shouldClearExistingJobsBeforeRun,
  withSourceLifecycleTimeout,
} from '../runner.js'
import { buildScrapers } from '../providers/index.js'
import { attachInventoryEvidence } from '../utils/inventoryEvidence.js'

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

test('shouldClearExistingJobsBeforeRun clears only a full live run', () => {
  assert.equal(shouldClearExistingJobsBeforeRun({}), true)
  assert.equal(
    shouldClearExistingJobsBeforeRun({ onlySources: 'alpha, zeta' }),
    false,
  )
  assert.equal(shouldClearExistingJobsBeforeRun({ startAt: 'elgi' }), false)
  assert.equal(shouldClearExistingJobsBeforeRun({ startAfter: 'danfoss' }), false)
})

test('assertLiveMongoUriConfigured fails fast for live runs without Mongo credentials', () => {
  assert.throws(
    () => assertLiveMongoUriConfigured({ dryRun: false, value: '' }),
    (error) => {
      assert.ok(error instanceof MissingMongoUriError)
      assert.match(error.message, /MONGO_URI environment variable is required/)
      assert.equal(error.abortPipeline, true)
      return true
    },
  )
  assert.throws(
    () => assertLiveMongoUriConfigured({ dryRun: false, value: '   ' }),
    MissingMongoUriError,
  )
})

test('assertLiveMongoUriConfigured allows dry runs and configured live runs', () => {
  assert.doesNotThrow(() => assertLiveMongoUriConfigured({ dryRun: true, value: '' }))
  assert.doesNotThrow(() => assertLiveMongoUriConfigured({ dryRun: false, value: 'mongodb://localhost/test' }))
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

test('resolveScraperTimeoutMs honors provider timeout overrides before falling back to the Workday default', () => {
  const workdayScraper = {
    name: 'accenture',
    provider: {
      adapter: 'workday',
      scraperTimeoutMs: 300000,
    },
  }

  assert.equal(resolveScraperTimeoutMs(null, workdayScraper, null), 300000)
  assert.equal(resolveScraperTimeoutMs(undefined, workdayScraper, '180000'), 300000)
})

test('resolveScraperTimeoutMs uses extended catalog budgets for high-volume Workday sources', () => {
  const scrapersByName = new Map(
    buildScrapers().map((scraper) => [scraper.name, scraper]),
  )

  assert.deepEqual(
    Object.fromEntries(
      [
        'accenture',
        'cadence',
        'mastercard',
        'nvidia',
        'northerntrust',
        'nxp',
        'paloalto',
        'roche',
        'salesforce',
        'target',
        'valeo',
        'visa',
      ].map((source) => {
        const scraper = scrapersByName.get(source)
        assert.ok(scraper, `${source} scraper should exist`)
        return [source, resolveScraperTimeoutMs(null, scraper, null)]
      }),
    ),
    {
      accenture: 1200000,
      cadence: 1200000,
      mastercard: 1200000,
      nvidia: 1200000,
      northerntrust: 1200000,
      nxp: 1200000,
      paloalto: 1200000,
      roche: 1200000,
      salesforce: 1200000,
      target: 1200000,
      valeo: 1200000,
      visa: 1200000,
    },
  )
})

test('resolveSourceLifecycleTimeoutMs bounds the full per-source lifecycle by default', () => {
  assert.equal(resolveSourceLifecycleTimeoutMs(null), 1800000)
  assert.equal(resolveSourceLifecycleTimeoutMs('0'), 0)
  assert.equal(resolveSourceLifecycleTimeoutMs('45000'), 45000)
  assert.equal(resolveSourceLifecycleTimeoutMs('not-a-number'), 1800000)
  assert.equal(resolveSourceLifecycleTimeoutMs('-1'), 1800000)
  assert.equal(
    resolveSourceLifecycleTimeoutMs(null, {
      name: 'long-source',
      provider: { sourceLifecycleTimeoutMs: 900000 },
    }),
    900000,
  )
})

test('resolveLivePublicExperienceEnabled honors provider opt-outs for live persistence', () => {
  assert.equal(resolveLivePublicExperienceEnabled(null, ''), true)
  assert.equal(resolveLivePublicExperienceEnabled(null, 'true'), false)
  assert.equal(resolveLivePublicExperienceEnabled({ provider: { enrichPublicExperience: false } }, ''), false)
  assert.equal(resolveLivePublicExperienceEnabled({ provider: { enrichPublicExperience: true } }, 'true'), true)
})

test('retired AMNS provider stays out of the active runner catalog', () => {
  assert.equal(buildScrapers().some((candidate) => candidate.name === 'arcelormittalnipponsteelindia'), false)
})

test('resolveLivePublicExperienceEnabled skips redundant enrichment for high-volume API sources', () => {
  for (const source of ['ibm', 'pwc']) {
    const scraper = buildScrapers().find((candidate) => candidate.name === source)

    assert.ok(scraper, `missing ${source} scraper`)
    assert.equal(resolveLivePublicExperienceEnabled(scraper, ''), false, source)
  }
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
    4,
  )
})

test('isAuthoritativeEmptyScrape trusts only valid structured verified-empty evidence', () => {
  const confirmedEmpty = attachInventoryEvidence([], {
    status: 'verified-empty',
    surface: 'https://example.test/jobs',
    firstParty: true,
    listingComplete: true,
    pagesFetched: 1,
    reportedTotal: 0,
    indiaFacetCount: 0,
    verifiedAt: '2026-09-13T00:00:00.000Z',
    reason: 'validated-test-empty',
  })
  const legacyEmpty = []
  Object.defineProperty(legacyEmpty, Symbol.for('jobverify.workday.authoritative-empty'), { value: true })

  assert.equal(
    isAuthoritativeEmptyScrape(
      { provider: { adapter: 'workday', atsPlatform: 'workday' } },
      [],
    ),
    false,
  )
  assert.equal(
    isAuthoritativeEmptyScrape({ provider: {} }, confirmedEmpty),
    true,
  )
  assert.equal(
    isAuthoritativeEmptyScrape({ provider: { adapter: 'workday' } }, legacyEmpty),
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

test('getZeroJobEvidence does not treat an ordinary empty array as a verified empty career page', () => {
  const confirmedEmpty = attachInventoryEvidence([], {
    status: 'verified-empty',
    surface: 'https://example.test/jobs',
    firstParty: true,
    listingComplete: true,
    pagesFetched: 1,
    reportedTotal: 0,
    indiaFacetCount: 0,
    verifiedAt: '2026-09-13T00:00:00.000Z',
    reason: 'validated-test-empty',
  })

  assert.equal(
    getZeroJobEvidence({ provider: { adapter: 'script', atsPlatform: 'custom' } }, [], []),
    'unverified-zero',
  )
  assert.equal(
    getZeroJobEvidence({ provider: { adapter: 'workday', atsPlatform: 'workday' } }, confirmedEmpty, []),
    'verified-empty',
  )
  assert.equal(
    getZeroJobEvidence({ provider: { adapter: 'workday', atsPlatform: 'workday' } }, confirmedEmpty, [{ title: 'Engineer' }]),
    null,
  )
})

test('withSourceLifecycleTimeout aborts hung lifecycle work with the source label', async () => {
  let abortSeen = false

  await assert.rejects(
    withSourceLifecycleTimeout(
      { name: 'hung-lifecycle' },
      ({ signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          abortSeen = true
          reject(signal.reason)
        }, { once: true })
      }),
      5,
      { abortGraceMs: 50 },
    ),
    (error) => {
      assert.ok(error instanceof ScraperSourceLifecycleTimeoutError)
      assert.match(error.message, /\[hung-lifecycle\] lifecycle timed out after 5ms/)
      assert.equal(error.localTimeout, true)
      assert.equal(error.abortRetries, true)
      assert.equal(error.failureKind, 'runner_lifecycle_timeout')
      return true
    },
  )

  assert.equal(abortSeen, true)
})

test('withSourceLifecycleTimeout preserves the timeout outcome when work resolves after abort', async () => {
  let abortSeen = false

  await assert.rejects(
    withSourceLifecycleTimeout(
      { name: 'late-success-lifecycle' },
      ({ signal }) => new Promise((resolve) => {
        signal.addEventListener('abort', () => {
          abortSeen = true
          setTimeout(() => {
            resolve({ success: true, ignoredAbort: true })
          }, 10)
        }, { once: true })
      }),
      5,
      { abortGraceMs: 50 },
    ),
    (error) => {
      assert.ok(error instanceof ScraperSourceLifecycleTimeoutError)
      assert.match(error.message, /\[late-success-lifecycle\] lifecycle timed out after 5ms/)
      assert.equal(error.failureKind, 'runner_lifecycle_timeout')
      return true
    },
  )

  assert.equal(abortSeen, true)
})
