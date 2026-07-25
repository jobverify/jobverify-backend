import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyScraperError,
  isFailureCountedForAbort,
  resolveFailureAbortThreshold,
  shouldAbortPipelineAfterFailures,
} from '../runner.js'

test('isFailureCountedForAbort ignores upstream soft failures', () => {
  assert.equal(
    isFailureCountedForAbort({
      success: false,
      softFailure: true,
      upstreamOutage: true,
    }),
    false,
  )
})

test('classifyScraperError treats external drift and access errors as soft failures', () => {
  assert.deepEqual(
    classifyScraperError(new Error('Verified first-party surface changed materially')),
    {
      softFailure: true,
      upstreamOutage: false,
      failureKind: 'surface_drift_or_fail_closed',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error('HTTP 403 for https://example.com/jobs')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'blocked_or_access_denied',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error('Workday jobs API returned HTTP_500 at https://example.com/jobs')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error('fetch failed')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
    },
  )

  for (const message of [
    'HTTP 307 for https://www.winjit.com/',
    'Aress official careers page exposes no structured public job cards',
    'Unable to find Cornerstone OnDemand CSOD context in career page HTML',
    'Qbss first-party careers surface is now publicly enumerable and needs a structured scraper',
  ]) {
    assert.deepEqual(
      classifyScraperError(new Error(message)),
      {
        softFailure: true,
        upstreamOutage: false,
        failureKind: 'surface_drift_or_fail_closed',
      },
    )
  }
})

test('classifyScraperError keeps parser and contract errors hard', () => {
  assert.deepEqual(
    classifyScraperError(new TypeError('Cannot read properties of undefined')),
    {
      softFailure: false,
      upstreamOutage: false,
      failureKind: 'parser_or_contract_error',
    },
  )
})

test('isFailureCountedForAbort still counts ordinary hard failures', () => {
  assert.equal(
    isFailureCountedForAbort({
      success: false,
      softFailure: false,
    }),
    true,
  )
})

test('isFailureCountedForAbort ignores successful and skipped runs', () => {
  assert.equal(isFailureCountedForAbort({ success: true }), false)
  assert.equal(isFailureCountedForAbort({ success: false, skipped: true }), false)
})

test('resolveFailureAbortThreshold disables aborting when the env value is missing or non-positive', () => {
  assert.equal(resolveFailureAbortThreshold(undefined), Number.POSITIVE_INFINITY)
  assert.equal(resolveFailureAbortThreshold(''), Number.POSITIVE_INFINITY)
  assert.equal(resolveFailureAbortThreshold('0'), Number.POSITIVE_INFINITY)
  assert.equal(resolveFailureAbortThreshold('-1'), Number.POSITIVE_INFINITY)
})

test('resolveFailureAbortThreshold keeps explicit positive abort thresholds', () => {
  assert.equal(resolveFailureAbortThreshold('3'), 3)
  assert.equal(resolveFailureAbortThreshold(5), 5)
})

test('shouldAbortPipelineAfterFailures only aborts once an explicit threshold is reached', () => {
  assert.equal(shouldAbortPipelineAfterFailures(3), false)
  assert.equal(shouldAbortPipelineAfterFailures(2, 3), false)
  assert.equal(shouldAbortPipelineAfterFailures(3, 3), true)
  assert.equal(shouldAbortPipelineAfterFailures(4, 3), true)
})
