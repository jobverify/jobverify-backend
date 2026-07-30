import assert from 'node:assert/strict'
import test from 'node:test'

import { createFailClosedSentinelScraper, run } from './failClosedSentinel.js'

test('shared workbook batch 01 fail-closed sentinel always returns an empty job list', async () => {
  const scraper = createFailClosedSentinelScraper()

  assert.equal(typeof scraper.run, 'function')
  assert.deepEqual(await scraper.run(), [])
  assert.deepEqual(await scraper.run({ jobs: [{ title: 'Unverified job' }] }), [])
  assert.deepEqual(await run(), [])
})
