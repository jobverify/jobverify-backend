import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCoverageGapResult,
  isFailureCountedForAbort,
  resolveZeroJobOutcome,
} from '../runner.js'
import { attachInventoryEvidence } from '../utils/inventoryEvidence.js'

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

test('complete raw inventory filtered to zero India jobs is fetched-zero', () => {
  const jobs = attach([{ title: 'Engineer in Berlin' }], 'complete-inventory', {
    reportedTotal: 1,
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
