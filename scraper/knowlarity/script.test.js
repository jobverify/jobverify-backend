import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  defaultFetchPage,
} from './script.js'

test('Knowlarity default fetch is bounded by a timeout signal', async () => {
  let capturedInit = null

  const page = await defaultFetchPage(CAREERS_URL, {
    timeoutMs: 25,
    fetchImpl: async (url, init) => {
      capturedInit = init
      return {
        status: 200,
        url,
        text: async () => '<html><body>Knowlarity careers</body></html>',
      }
    },
  })

  assert.equal(page.status, 200)
  assert.equal(page.url, CAREERS_URL)
  assert.equal(capturedInit.redirect, 'follow')
  assert.equal(capturedInit.signal instanceof AbortSignal, true)
})
