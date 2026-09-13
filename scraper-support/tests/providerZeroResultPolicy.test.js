import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decorateJobsWithProviderMetadata,
  hydrateProviderCatalogEntry,
  resolveZeroResultPolicy,
} from '../providers/index.js'
import { attachInventoryEvidence, readInventoryEvidence } from '../utils/inventoryEvidence.js'

test('provider policy classifies placeholder zeros as coverage gaps', () => {
  const provider = hydrateProviderCatalogEntry({
    source: 'placeholder-source',
    companyName: 'Placeholder Source',
    adapter: 'script',
    atsPlatform: 'workbook-exact-name-sentinel',
  })

  assert.equal(provider.zeroResultPolicy, 'coverage-gap')
})

test('provider policy requires runtime evidence for normal ATS and company scripts', () => {
  assert.equal(resolveZeroResultPolicy({ adapter: 'workday', atsPlatform: 'workday' }), 'evidence-required')
  assert.equal(resolveZeroResultPolicy({ adapter: 'script', atsPlatform: 'greenhouse' }), 'evidence-required')
})

test('an explicit zero policy overrides inferred metadata', () => {
  const provider = hydrateProviderCatalogEntry({
    source: 'migrated-source',
    companyName: 'Migrated Source',
    adapter: 'script',
    atsPlatform: 'workbook-exact-name-sentinel',
    zeroResultPolicy: 'evidence-required',
  })

  assert.equal(provider.zeroResultPolicy, 'evidence-required')
})

test('provider adapters preserve non-enumerable inventory evidence while decorating jobs', async () => {
  const jobs = attachInventoryEvidence([], {
    status: 'discovery-only',
    surface: 'https://example.test/jobs',
    firstParty: false,
    listingComplete: true,
    pagesFetched: 1,
    reportedTotal: 0,
    indiaFacetCount: 0,
    verifiedAt: '2026-09-13T00:00:00.000Z',
    reason: 'test-directory-evidence',
  })
  const decoratedJobs = decorateJobsWithProviderMetadata(jobs, {
    source: 'test-source',
    companyName: 'Test Source',
    countryFilter: 'India',
    companyCareerPage: 'https://example.test/jobs',
    companyDomain: 'example.test',
    atsPlatform: 'directory',
  })

  assert.equal(readInventoryEvidence(decoratedJobs)?.status, 'discovery-only')
})
