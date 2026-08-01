import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchJsonWithRetry, fetchTextWithRetry, parseRetryAfterHeader } from '../utils/fetch.js'
import { withRetry } from '../utils/retry.js'

test('fetchJsonWithRetry retries transient fetch failures before returning JSON', async () => {
  let attempts = 0

  const result = await fetchJsonWithRetry('https://example.com/jobs', {
    attempts: 2,
    baseDelayMs: 1,
    timeoutMs: 50,
    label: 'test-json',
    fetchImpl: async () => {
      attempts += 1
      if (attempts === 1) {
        throw new TypeError('fetch failed')
      }

      return {
        ok: true,
        json: async () => ({ jobs: 3 }),
      }
    },
  })

  assert.deepEqual(result, { jobs: 3 })
  assert.equal(attempts, 2)
})

test('fetchTextWithRetry throws an HTTP error after exhausting retries', async () => {
  await assert.rejects(
    fetchTextWithRetry('https://example.com/careers', {
      attempts: 2,
      baseDelayMs: 1,
      timeoutMs: 50,
      label: 'test-text',
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        text: async () => 'service unavailable',
      }),
    }),
    /All 2 attempts failed\. Last error: HTTP 503 for https:\/\/example\.com\/careers/,
  )
})

test('fetchTextWithRetry aborts outer scraper retries after exhausting its own retry budget', async () => {
  let fetchAttempts = 0

  await assert.rejects(
    withRetry(
      () => fetchTextWithRetry('https://example.com/careers', {
        attempts: 3,
        baseDelayMs: 1,
        timeoutMs: 50,
        label: 'inner-fetch',
        fetchImpl: async () => {
          fetchAttempts += 1
          throw new TypeError('fetch failed')
        },
      }),
      {
        attempts: 2,
        baseDelayMs: 1,
        label: 'outer-scraper',
      },
    ),
    (error) => {
      assert.match(
        error.message,
        /\[outer-scraper\] Retry aborted after attempt 1\/2\. Last error: \[inner-fetch\] All 3 attempts failed\. Last error: fetch failed/,
      )
      assert.equal(error.abortRetries, true)
      return true
    },
  )

  assert.equal(fetchAttempts, 3)
})

test('fetchJsonWithRetry reports forbidden HTML bodies without JSON parser noise', async () => {
  await assert.rejects(
    fetchJsonWithRetry('https://example.com/jobs.json', {
      attempts: 1,
      baseDelayMs: 1,
      timeoutMs: 50,
      label: 'test-json-html',
      fetchImpl: async () => ({
        ok: true,
        headers: {
          get: () => 'text/html; charset=utf-8',
        },
        text: async () => '<html><head><title>Forbidden Access</title></head><body>Forbidden</body></html>',
      }),
    }),
    /Forbidden HTML response for https:\/\/example\.com\/jobs\.json/,
  )
})

test('fetchTextWithRetry composes caller cancellation with its local request deadline', async () => {
  const controller = new AbortController()
  const abortReason = new Error('source budget expired')
  abortReason.abortRetries = true
  let attempts = 0

  const request = fetchTextWithRetry('https://example.com/careers', {
    attempts: 3,
    timeoutMs: 1000,
    signal: controller.signal,
    fetchImpl: async (_url, options = {}) => {
      attempts += 1
      return new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(options.signal.reason)
        }, { once: true })
      })
    },
  })
  controller.abort(abortReason)

  await assert.rejects(
    Promise.race([
      request,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('caller cancellation was not propagated')), 100)
      }),
    ]),
    (error) => (
      error === abortReason
      || (
        error?.abortRetries === true
        && String(error?.message || '').includes('source budget expired')
      )
    ),
  )
  assert.equal(attempts, 1)
})

test('fetchTextWithRetry aborts Retry-After backoff promptly with the exact caller reason', async () => {
  const controller = new AbortController()
  const abortReason = new Error('source budget expired during retry backoff')
  let attempts = 0
  let watchdog

  const startedAt = Date.now()
  const request = fetchTextWithRetry('https://example.com/rate-limited', {
    attempts: 3,
    baseDelayMs: 1,
    timeoutMs: 1000,
    signal: controller.signal,
    fetchImpl: async () => {
      attempts += 1
      return {
        ok: false,
        status: 429,
        headers: {
          get: (name) => (
            String(name).toLowerCase() === 'retry-after'
              ? '0.5'
              : null
          ),
        },
      }
    },
  })

  setTimeout(() => controller.abort(abortReason), 10)

  try {
    await assert.rejects(
      Promise.race([
        request,
        new Promise((_, reject) => {
          watchdog = setTimeout(
            () => reject(new Error('retry backoff ignored caller cancellation')),
            150,
          )
        }),
      ]),
      (error) => error === abortReason,
    )
  } finally {
    clearTimeout(watchdog)
  }

  assert.equal(attempts, 1)
  assert.ok(
    Date.now() - startedAt < 150,
    'Expected caller cancellation to clear the Retry-After timer promptly',
  )
})

test('parseRetryAfterHeader supports delta-seconds and HTTP-date values', async () => {
  assert.equal(parseRetryAfterHeader('1', 0), 1000)
  assert.equal(
    parseRetryAfterHeader('Fri, 24 Jul 2026 00:00:01 GMT', Date.parse('Fri, 24 Jul 2026 00:00:00 GMT')),
    1000,
  )
  assert.equal(parseRetryAfterHeader('not-a-date', 0), null)
})
