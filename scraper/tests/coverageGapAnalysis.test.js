import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bucketFailure,
  bucketPipelineFailure,
  bucketSoftFailure,
  collectFailureContinuation,
  parsePipelineRowsFromLogGroups,
} from '../../scripts/analyzeCoverageJobGaps.js'

test('collectFailureContinuation stops before persistence warnings from other workers', () => {
  const lines = [
    '  ✗ [dineshchandraragrawalinfracon] FAILED: fetch failed',
    '  ✗ [directshifts] Failed to save status to DB: connect ETIMEDOUT 159.41.206.100:27017',
    '  ✗ [683/3158] [discord] Failed to verify active status from DB: connect ETIMEDOUT 159.41.206.100:27017',
  ]

  assert.equal(collectFailureContinuation(lines, 0), '')
})

test('parsePipelineRowsFromLogGroups recognizes upstream soft-failure lines', () => {
  const { latestBySource } = parsePipelineRowsFromLogGroups([
    {
      runOrder: 1,
      logName: 'pipeline.out.log',
      text: [
        '▶ [1/2] Starting [blinkit]...',
        '  ⚠ [blinkit] UPSTREAM: Blinkit official careers page is access denied by the upstream site',
      ].join('\n'),
    },
  ])

  assert.deepEqual(latestBySource.get('blinkit'), {
    source: 'blinkit',
    status: 'Upstream',
    jobs: 0,
    error: 'Blinkit official careers page is access denied by the upstream site',
    runOrder: 1,
    logName: 'pipeline.out.log',
  })
})

test('bucketFailure keeps parser errors hard but buckets expected external failures separately', () => {
  assert.equal(
    bucketFailure('Verified first-party surface changed materially'),
    'failed_surface_drift_or_fail_closed',
  )
  assert.equal(
    bucketFailure('HTTP 307 for https://www.winjit.com/'),
    'failed_surface_drift_or_fail_closed',
  )
  assert.equal(
    bucketFailure('Aress official careers page exposes no structured public job cards'),
    'failed_surface_drift_or_fail_closed',
  )
  assert.equal(
    bucketFailure('Unable to find Cornerstone OnDemand CSOD context in career page HTML'),
    'failed_surface_drift_or_fail_closed',
  )
  assert.equal(
    bucketFailure('Qbss first-party careers surface is now publicly enumerable and needs a structured scraper'),
    'failed_surface_drift_or_fail_closed',
  )
  assert.equal(
    bucketFailure('HTTP 403 for https://example.com/careers'),
    'failed_blocked_or_access_denied',
  )
  assert.equal(
    bucketFailure('Workday jobs API returned HTTP_500 at https://example.com/jobs'),
    'failed_network_or_timeout',
  )
  assert.equal(
    bucketFailure('Cannot read properties of undefined'),
    'failed_parser_or_contract_error',
  )
})

test('bucketSoftFailure reports external failures without failed prefixes', () => {
  assert.equal(
    bucketSoftFailure('HTTP 403 for https://example.com/careers'),
    'pipeline_soft_blocked_or_access_denied',
  )
  assert.equal(
    bucketSoftFailure('fetch failed'),
    'pipeline_soft_network_or_timeout',
  )
  assert.equal(
    bucketSoftFailure('Verified first-party surface changed materially'),
    'pipeline_soft_surface_drift_or_fail_closed',
  )
})

test('bucketPipelineFailure applies soft policy to legacy failed external rows', () => {
  assert.equal(
    bucketPipelineFailure({
      status: 'Fail',
      error: 'HTTP 403 for https://example.com/careers',
    }),
    'pipeline_soft_blocked_or_access_denied',
  )

  assert.equal(
    bucketPipelineFailure({
      status: 'Fail',
      error: 'Cannot read properties of undefined',
    }),
    'failed_parser_or_contract_error',
  )

  assert.equal(
    bucketPipelineFailure({
      status: 'Upstream',
      error: 'fetch failed',
    }),
    'pipeline_soft_network_or_timeout',
  )
})
