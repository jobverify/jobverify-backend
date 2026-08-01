import assert from 'node:assert/strict'
import test from 'node:test'

import { CAREERS_URL, DISPOSITION, run } from '../../scraper/wati/script.js'

test('WATI keeps its verified non-listing careers surface explicit', async () => {
  assert.equal(CAREERS_URL, 'https://www.wati.io/career/')
  assert.equal(DISPOSITION, 'verified-non-listing-careers-surface')
  assert.deepEqual(await run(), [])
})
