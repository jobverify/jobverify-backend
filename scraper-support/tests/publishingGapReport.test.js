import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyProviderImplementation } from '../../scripts/reportScriptCatalogTopology.js'
import { buildPublishingGapReport, publishingGapCsv } from '../../scripts/analyzeCoverageJobGaps.js'

const now = new Date('2026-10-20T06:00:00Z')
const provider = (source, companyName = source) => ({ source, companyName, adapter: 'workday' })
const attempt = (result = {}) => ({ attemptedAt: '2026-10-20T05:00:00Z', completedAt: '2026-10-20T05:01:00Z', success: true, rawRecords: 3, jobs: 2, eligibleJobs: 1, ...result })
const evidence = { status: 'verified-empty', surface: 'https://example.com/careers', firstParty: true, listingComplete: true, pagesFetched: 1, reportedTotal: 0, indiaFacetCount: 0, verifiedAt: '2026-10-20T05:00:00Z' }

test('topology detects a sentinel inside a dedicated script directory', () => {
  const result = classifyProviderImplementation({ adapter: 'script', modulePath: '/scraper/acme/script.js' }, {
    exists: () => true, read: () => "import { createFailClosedSentinelScraper } from './failClosedSentinel.js'; export const run = () => createFailClosedSentinelScraper().run()",
  })
  assert.equal(result.type, 'sentinel')
})

test('topology inspects executable code before obsolete sentinel metadata', () => {
  const result = classifyProviderImplementation({ adapter: 'script', atsPlatform: 'workbook-exact-name-sentinel', modulePath: '/script.js' }, {
    exists: () => true, read: () => 'export async function run() { return await fetchJobs() }',
  })
  assert.equal(result.type, 'script')
  assert.equal(classifyProviderImplementation({ adapter: 'script', modulePath: '/missing.js' }, { exists: () => false }).type, 'missing-module')
  assert.equal(classifyProviderImplementation({ adapter: 'script', modulePath: '/script.js' }, {
    exists: () => true, read: () => 'export const scraper = { async run() { /* no public feed */ return [] } }',
  }).type, 'static-empty')
})

test('missing runtime evidence stays unknown, even when catalog claims zero verified jobs', () => {
  const report = buildPublishingGapReport({ catalog: [{ ...provider('a'), verifiedIndiaJobCount: 0, verifiedOn: '2026-07-01' }], now })
  assert.equal(report.rows.length, 1)
  assert.equal(report.rows[0].runtimeOutcome, 'not-observed')
  assert.equal(report.rows[0].savedJobs, null)
  assert.equal(report.rows[0].rawJobs, null)
  assert.equal(report.summary.runtimeReconciliationComplete, false)
  assert.equal(report.summary.verifiedZeroInventories, 0)
})

test('latest failure does not borrow historic successful counts or masquerade as success', () => {
  const report = buildPublishingGapReport({ catalog: [provider('a')], now, runtime: {
    databaseAvailable: true, generatedAt: now.toISOString(), publicCompanyNames: [], inventory: [],
    statuses: [{ source: 'a', lastSuccess: true, softFailure: true, lastJobsFound: 500, latestAttempt: attempt({ success: false, softFailure: true, failureKind: 'network_or_timeout', rawRecords: null, jobs: null, eligibleJobs: null }) }],
  } })
  assert.equal(report.rows[0].runtimeOutcome, 'failed')
  assert.equal(report.rows[0].rawJobs, null)
  assert.equal(report.rows[0].indiaJobs, null)
  assert.equal(report.rows[0].savedJobs, 0)
  assert.equal(report.summary.completeSuccessfulChecks, 0)
})

test('partial results and stale verified-empty evidence cannot prove a complete current zero', () => {
  const report = buildPublishingGapReport({ catalog: [provider('partial'), provider('stale'), provider('zero'), provider('unverified')], now, runtime: {
    databaseAvailable: true, generatedAt: now.toISOString(), publicCompanyNames: [], inventory: [], statuses: [
      { source: 'partial', latestAttempt: attempt({ staleCheckSkipped: true }) },
      { source: 'stale', latestAttempt: attempt({ rawRecords: 0, jobs: 0, eligibleJobs: 0, inventoryEvidence: { ...evidence, verifiedAt: '2026-07-01T00:00:00Z' } }) },
      { source: 'zero', latestAttempt: attempt({ rawRecords: 0, jobs: 0, eligibleJobs: 0, inventoryEvidence: evidence }) },
      { source: 'unverified', latestAttempt: attempt({ rawRecords: 0, jobs: 0, eligibleJobs: 0, zeroJobEvidence: 'verified-empty' }) },
    ],
  } })
  assert.deepEqual(report.rows.map(x => [x.source, x.runtimeOutcome]), [['partial', 'partial'], ['stale', 'unverified-zero'], ['unverified', 'unverified-zero'], ['zero', 'verified-zero']])
  assert.equal(report.summary.verifiedZeroInventories, 1)
  assert.equal(report.summary.completeSuccessfulChecks, 1)
})

test('sources reconcile to distinct public names without adding aliases as extra companies', () => {
  const report = buildPublishingGapReport({ catalog: [provider('acme', 'Acme Ltd'), provider('acme.workday', 'ACME')], now, runtime: {
    databaseAvailable: true, generatedAt: now.toISOString(), publicCompanyNames: ['Acme', ' Other '],
    statuses: [], inventory: [
      { source: 'acme', savedJobs: 8, visibleJobs: 2, visibleCompanies: ['Acme'] },
      { source: 'acme.workday', savedJobs: 3, visibleJobs: 1, visibleCompanies: ['ACME'] },
      { source: 'retired', savedJobs: 1, visibleJobs: 1, visibleCompanies: ['Other'] },
    ],
  } })
  assert.equal(report.summary.sourcesWithVisibleJobs, 2)
  assert.equal(report.summary.distinctVisibleCompanies, 2)
  assert.equal(report.summary.distinctVisibleCompaniesFromCatalog, 1)
  assert.deepEqual(report.reconciliation.untrackedSources, ['retired'])
  assert.deepEqual(report.reconciliation.sharedPublicCompanyNames, [{ company: 'acme', sources: ['acme', 'acme.workday'] }])
  assert.equal(report.rows[0].runtimeOutcome, 'not-observed')
  assert.equal(report.rows[0].publicationOutcome, 'published')
})

test('newer checkpoint failure supersedes database attempt; pending checkpoints invalidate success', () => {
  const report = buildPublishingGapReport({ catalog: [provider('a'), provider('b')], now,
    runtime: { databaseAvailable: true, generatedAt: now.toISOString(), publicCompanyNames: [], inventory: [], statuses: [
      { source: 'a', latestAttempt: attempt() }, { source: 'b', latestAttempt: attempt() },
    ] },
    runState: { updatedAt: '2026-10-20T05:40:00Z', inProgress: { b: { startedAt: '2026-10-20T05:30:00Z' } }, completed: {
      a: { completedAt: '2026-10-20T05:45:00Z', result: { success: false, failureKind: 'parser_or_contract_error' } },
    } },
  })
  assert.equal(report.rows[0].runtimeOutcome, 'failed')
  assert.equal(report.rows[0].rawJobs, null)
  assert.equal(report.rows[1].runtimeOutcome, 'in-progress')
})

test('CSV quotes fields and keeps unknown values blank', () => {
  const report = buildPublishingGapReport({ catalog: [provider('a', 'Acme, "India"')], now })
  const csv = publishingGapCsv(report.rows)
  assert.ok(csv.includes('"Acme, ""India"""'))
  assert.ok(csv.startsWith('source,companyName,'))
  assert.ok(!csv.includes('undefined'))
})

test('fresh complete inventory still requires a real surface and fetched pages', () => {
  for (const overrides of [{ surface: null }, { surface: 'file:///jobs' }, { pagesFetched: 0 }, { verifiedAt: '2026-10-21T00:00:00Z' }]) {
    const report = buildPublishingGapReport({ catalog: [provider('a')], now, runtime: { databaseAvailable: true, generatedAt: now.toISOString(), inventory: [], publicCompanyNames: [],
      statuses: [{ source: 'a', latestAttempt: attempt({ jobs: 0, eligibleJobs: 0, inventoryEvidence: { ...evidence, status: 'complete-inventory', ...overrides } }) }],
    } })
    assert.equal(report.summary.completeSuccessfulChecks, 0)
    assert.equal(report.rows[0].runtimeOutcome, 'unverified-zero')
  }
})

test('a newer legacy failure supersedes diagnostics written by an earlier deployment', () => {
  const report = buildPublishingGapReport({ catalog: [provider('a')], now, runtime: { databaseAvailable: true, generatedAt: now.toISOString(), inventory: [], publicCompanyNames: [],
    statuses: [{ source: 'a', lastRanAt: '2026-10-20T05:30:00Z', lastSuccess: false, failureKind: 'network_or_timeout', latestAttempt: attempt() }],
  } })
  assert.equal(report.rows[0].runtimeOutcome, 'failed')
  assert.equal(report.rows[0].rawJobs, null)
  assert.equal(report.rows[0].eligibleJobs, null)
})
