import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  CONTACT_EMAIL,
  run,
} from '../workbookbatch05/supergaming.js'

test('SuperGaming careers surface is an email handoff with no public jobs', async () => {
  assert.equal(CAREERS_URL, 'https://www.supergaming.com/careers')
  assert.equal(CONTACT_EMAIL, 'hiring@supergaming.com')
  assert.deepEqual(await run(), [])
})
