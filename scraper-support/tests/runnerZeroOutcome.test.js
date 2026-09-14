import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCoverageGapResult,
  isFailureCountedForAbort,
  resolveZeroJobOutcome,
} from '../runner.js'
import adpushupProviderMetadata from '../../scraper/adpushup/catalog.js'
import { run as runAdpushup } from '../../scraper/adpushup/script.js'
import {
  decorateJobsWithProviderMetadata,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../utils/inventoryEvidence.js'

const attach = (jobs, status, overrides = {}) => attachInventoryEvidence(jobs, {
  status,
  surface: 'https://example.test/jobs',
  firstParty: true,
  listingComplete: true,
  pagesFetched: 1,
  reportedTotal: jobs.length,
  indiaFacetCount: 0,
  verifiedAt: '2026-09-13T00:00:00.000Z',
  reason: 'runner-zero-outcome-test',
  ...overrides,
})

test('coverage-gap provider is completed as a non-aborting coverage result', () => {
  const outcome = resolveZeroJobOutcome(
    { provider: { zeroResultPolicy: 'coverage-gap' } },
    [],
    [],
  )

  assert.equal(outcome, 'coverage-gap')
  assert.deepEqual(buildCoverageGapResult('sentinel', outcome), {
    success: false,
    softFailure: true,
    upstreamOutage: false,
    failureKind: 'coverage_gap',
    zeroJobEvidence: 'coverage-gap',
  })
  assert.equal(isFailureCountedForAbort(buildCoverageGapResult('sentinel', outcome)), false)
})

test('valid first-party verified-empty evidence authorizes a verified zero', () => {
  const jobs = attach([], 'verified-empty', { reportedTotal: 0 })

  assert.equal(resolveZeroJobOutcome({ provider: {} }, jobs, []), 'verified-empty')
})

test('generated verified-empty workbook scrapers attach authoritative zero evidence', async () => {
  const provider = hydrateProviderCatalogEntry(adpushupProviderMetadata)
  const jobs = decorateJobsWithProviderMetadata(await runAdpushup(), provider)

  assert.deepEqual(jobs, [])
  assert.equal(readInventoryEvidence(jobs)?.status, 'verified-empty')
  assert.equal(resolveZeroJobOutcome({ provider }, jobs, []), 'verified-empty')
})

test('verified no-current-openings providers attach authoritative zero evidence', () => {
  const provider = hydrateProviderCatalogEntry({
    source: 'official-empty-source',
    companyName: 'Official Empty Source',
    adapter: 'script',
    companyCareerPage: 'https://example.test/careers',
    atsPlatform: 'official-first-party-careers-site-no-current-openings',
    extractionStrategy: 'verified-first-party-careers-site-without-current-openings+return-empty',
    paginationStrategy: 'verified-first-party-careers-sentinel',
    verifiedOn: '2026-09-13',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
  })
  const jobs = decorateJobsWithProviderMetadata([], provider)

  assert.equal(readInventoryEvidence(jobs)?.status, 'verified-empty')
  assert.equal(resolveZeroJobOutcome({ provider }, jobs, []), 'verified-empty')
})

test('verified no-enumerable-listings providers attach discovery-only zero evidence', () => {
  const provider = hydrateProviderCatalogEntry({
    source: 'public-surface-without-feed',
    companyName: 'Public Surface Without Feed',
    adapter: 'script',
    companyCareerPage: 'https://example.test/careers',
    atsPlatform: 'official-first-party-careers-no-enumerable-public-listings',
    extractionStrategy: 'verified-first-party-careers-page-without-enumerable-india-listings+return-empty',
    paginationStrategy: 'verified-first-party-careers-page-sentinel',
    verifiedOn: '2026-09-13',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
  })
  const jobs = decorateJobsWithProviderMetadata([], provider)

  assert.equal(readInventoryEvidence(jobs)?.status, 'discovery-only')
  assert.equal(resolveZeroJobOutcome({ provider }, jobs, []), 'blocked-zero')
})

test('complete raw inventory filtered to zero India jobs is fetched-zero', () => {
  const jobs = attach([{ title: 'Engineer in Berlin' }], 'complete-inventory', {
    reportedTotal: 1,
  })

  assert.equal(resolveZeroJobOutcome({ provider: {} }, jobs, []), 'fetched-zero')
})

test('complete empty inventory is fetched-zero', () => {
  const jobs = attach([], 'complete-inventory', {
    reportedTotal: 0,
  })

  assert.equal(resolveZeroJobOutcome({ provider: {} }, jobs, []), 'fetched-zero')
})

test('third-party discovery zero is blocked rather than verified', () => {
  const jobs = attach([], 'discovery-only', {
    firstParty: false,
    reportedTotal: 0,
    verifiedAt: null,
  })

  assert.equal(resolveZeroJobOutcome({ provider: {} }, jobs, []), 'blocked-zero')
})

test('zero with missing evidence remains unverified', () => {
  assert.equal(resolveZeroJobOutcome({ provider: {} }, [], []), 'unverified-zero')
  assert.equal(resolveZeroJobOutcome({ provider: {} }, [], [{ title: 'India job' }]), null)
})
