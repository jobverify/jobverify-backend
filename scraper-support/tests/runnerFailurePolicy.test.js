import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyScraperError,
  isFailureCountedForAbort,
  isLatePuppeteerTargetClose,
  isLatePuppeteerWaitTimeout,
  resolveFailureAbortThreshold,
  shouldAbortPipelineAfterFailures,
} from '../runner.js'

test('isLatePuppeteerTargetClose recognizes a Puppeteer session-close rejection', () => {
  const error = new Error('Protocol error (Network.setUserAgentOverride): Session closed. Most likely the page has been closed.')
  error.name = 'TargetCloseError'
  error.stack = 'TargetCloseError: Protocol error\n    at CdpCDPSession.send (puppeteer-core/lib/puppeteer/cdp/CdpSession.js:69:35)'

  assert.equal(isLatePuppeteerTargetClose(error), true)
})

test('isLatePuppeteerWaitTimeout recognizes a detached Puppeteer wait-task timeout', () => {
  const error = new Error('Timed out after waiting 10000ms')
  error.name = 'TimeoutError'
  error.stack = [
    'TimeoutError: Timed out after waiting 10000ms',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/puppeteer/common/util.js:232:19',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/third_party/rxjs/rxjs.js:1944:31',
  ].join('\n')

  assert.equal(isLatePuppeteerWaitTimeout(error), true)
  assert.equal(isLatePuppeteerWaitTimeout(new Error('Timed out after waiting 10000ms')), false)
})

test('isLatePuppeteerWaitTimeout still recognizes the Puppeteer timeout from the stack when the error name drifts', () => {
  const error = new Error('Timed out after waiting 10000ms')
  error.name = 'Error'
  error.stack = [
    'TimeoutError: Timed out after waiting 10000ms',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/puppeteer/common/util.js:232:19',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/third_party/rxjs/rxjs.js:1944:31',
  ].join('\n')

  assert.equal(isLatePuppeteerWaitTimeout(error), true)
})

test('isLatePuppeteerWaitTimeout recognizes a nested Puppeteer timeout cause under a generic wrapper', () => {
  const cause = new Error('Timed out after waiting 10000ms')
  cause.name = 'TimeoutError'
  cause.stack = [
    'TimeoutError: Timed out after waiting 10000ms',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/puppeteer/common/util.js:232:19',
    '    at file:///repo/jobverify-backend/node_modules/puppeteer-core/lib/third_party/rxjs/rxjs.js:1944:31',
  ].join('\n')

  const error = new Error('Browser worker shutdown failed')
  error.cause = cause

  assert.equal(isLatePuppeteerWaitTimeout(error), true)
})

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

test('classifyScraperError recognizes remaining external and transient failure signatures', () => {
  assert.deepEqual(
    classifyScraperError(new Error('HTTP 406 for https://www.bfil.co.in/apply-for-job.php')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'blocked_or_access_denied',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error('Execution context was destroyed, most likely because of a navigation.')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error('net::ERR_FAILED at https://www.aindra.in/')),
    {
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
    },
  )

  assert.deepEqual(
    classifyScraperError(new Error(
      'OdNest Company canonical first-party hosts now resolve; re-verify the official careers surface before trusting []',
    )),
    {
      softFailure: true,
      upstreamOutage: false,
      failureKind: 'surface_drift_or_fail_closed',
    },
  )
})

test('classifyScraperError keeps runner-enforced source timeouts as local hard failures', () => {
  const timeoutError = new Error('[abb] timed out after 300000ms')
  timeoutError.localTimeout = true
  timeoutError.abortRetries = true
  timeoutError.failureKind = 'runner_timeout'

  assert.deepEqual(
    classifyScraperError(timeoutError),
    {
      softFailure: false,
      upstreamOutage: false,
      failureKind: 'runner_timeout',
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
