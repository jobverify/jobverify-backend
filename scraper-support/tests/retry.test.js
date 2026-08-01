import assert from 'node:assert/strict'
import test from 'node:test'

import { withRetry } from '../utils/retry.js'

test('withRetry stops after the first local runner timeout instead of multiplying overlapping attempts', async () => {
  let attempts = 0

  await assert.rejects(
    withRetry(() => {
      attempts += 1

      const error = new Error('[hung-source] timed out after 5ms')
      error.localTimeout = true
      error.abortRetries = true
      error.failureKind = 'runner_timeout'
      throw error
    }, {
      attempts: 3,
      baseDelayMs: 0,
      label: 'hung-source',
    }),
    (error) => {
      assert.match(error.message, /\[hung-source\] Retry aborted after attempt 1\/3\. Last error: \[hung-source\] timed out after 5ms/)
      assert.equal(error.localTimeout, true)
      assert.equal(error.abortRetries, true)
      assert.equal(error.failureKind, 'runner_timeout')
      return true
    },
  )

  assert.equal(attempts, 1)
})

test('withRetry preserves nested network cause details in the final retry error message and code', async () => {
  const rootCause = new Error('getaddrinfo ENOTFOUND unitedalliancetechnology.com')
  rootCause.code = 'ENOTFOUND'

  const transportError = new TypeError('fetch failed')
  transportError.cause = rootCause

  await assert.rejects(
    withRetry(() => {
      throw transportError
    }, {
      attempts: 2,
      baseDelayMs: 0,
      label: 'network-sentinel',
    }),
    (error) => {
      assert.match(error.message, /\[network-sentinel\] All 2 attempts failed\./)
      assert.match(error.message, /ENOTFOUND/i)
      assert.match(error.message, /unitedalliancetechnology\.com/i)
      assert.equal(error.code, 'ENOTFOUND')
      return true
    },
  )
})

test('withRetry honors a longer retryDelayMs hint from rate-limited upstream errors', async () => {
  let attempts = 0
  const startedAt = Date.now()

  const result = await withRetry(() => {
    attempts += 1

    if (attempts === 1) {
      const error = new Error('HTTP 429 for https://example.com/jobs')
      error.retryDelayMs = 35
      throw error
    }

    return 'ok'
  }, {
    attempts: 2,
    baseDelayMs: 0,
    label: 'rate-limited-task',
  })

  assert.equal(result, 'ok')
  assert.equal(attempts, 2)
  assert.ok(
    Date.now() - startedAt >= 25,
    'Expected retry delay hint to be honored before the second attempt',
  )
})
