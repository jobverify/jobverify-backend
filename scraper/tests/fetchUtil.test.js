import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

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
