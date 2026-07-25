import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  defaultFetchText,
} from './script.js'

test('Sanghvi Movers default text fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const html = await defaultFetchText(CAREERS_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        ok: true,
        status: 200,
        url,
        text: async () => '<html><body>Sanghvi Movers careers</body></html>',
      }
    },
  })

  assert.equal(html, '<html><body>Sanghvi Movers careers</body></html>')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})
