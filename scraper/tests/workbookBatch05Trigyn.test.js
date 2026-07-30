import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BLOCKED_LISTING_CONTRACT,
  CAREERS_URL,
  COMPANY,
  SOURCE,
  createTrigynScraper,
  run,
} from '../workbookbatch05/trigyn.js'

test('batch 05 Trigyn remains fail-closed without an enumerable official listing contract', async () => {
  assert.equal(SOURCE, 'trigyn')
  assert.equal(COMPANY, 'Trigyn')
  assert.equal(CAREERS_URL, 'https://www.trigyn.com/careers')
  assert.match(BLOCKED_LISTING_CONTRACT, /no enumerable first-party jobs response/i)
  assert.match(BLOCKED_LISTING_CONTRACT, /unlinked \/job\/ detail pages/i)

  assert.deepEqual(await createTrigynScraper().run(), [])
  assert.deepEqual(await run(), [])
})
