import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HANDOFF_CTA,
  LINKEDIN_HOST,
  run,
} from '../workbookbatch05/synup.js'

test('Synup external-handoff scraper stays fail-closed', async () => {
  assert.deepEqual(await run(), [])
})

test('Synup documents its first-party-to-LinkedIn handoff contract', () => {
  assert.equal(CAREERS_URL, 'https://www.synup.com/en/careers')
  assert.equal(HANDOFF_CTA, 'SEE OPEN POSITIONS')
  assert.equal(LINKEDIN_HOST, 'www.linkedin.com')
})
