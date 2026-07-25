import assert from 'node:assert/strict'
import test from 'node:test'

import { withRetry } from '../utils/retry.js'

test('withRetry preserves soft-failure metadata from the last error', async () => {
  const upstreamError = new Error('Workday is currently unavailable upstream')
  upstreamError.softFailure = true
  upstreamError.upstreamOutage = true

  await assert.rejects(
    withRetry(
      async () => {
        throw upstreamError
      },
      {
        attempts: 2,
        baseDelayMs: 0,
        label: 'workday-tenant',
      },
    ),
    (error) => {
      assert.equal(error.softFailure, true)
      assert.equal(error.upstreamOutage, true)
      assert.equal(error.cause, upstreamError)
      assert.match(error.message, /\[workday-tenant\] All 2 attempts failed/i)
      return true
    },
  )
})
