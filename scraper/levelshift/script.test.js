import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HOMEPAGE_URL,
  buildIndiaListingUrl,
  defaultFetchJson,
  defaultFetchText,
} from './script.js'

test('LevelShift default text fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const html = await defaultFetchText(HOMEPAGE_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        ok: true,
        status: 200,
        url,
        text: async () => '<html><body>LevelShift</body></html>',
      }
    },
  })

  assert.equal(html, '<html><body>LevelShift</body></html>')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})

test('LevelShift default JSON fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const payload = await defaultFetchJson(buildIndiaListingUrl(), {
    method: 'POST',
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        ok: true,
        status: 200,
        url,
        json: async () => ({ jobs: { requirements: [] } }),
      }
    },
  })

  assert.deepEqual(payload, { jobs: { requirements: [] } })
  assert.equal(capturedInit.method, 'POST')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})
