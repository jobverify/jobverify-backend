import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  CONTACT_EMAIL,
  run,
} from '../workbookbatch05/techjockey.js'

test('Techjockey authoritative careers surface is currently empty', async () => {
  assert.equal(CAREERS_URL, 'https://www.techjockey.com/company/careers')
  assert.equal(CONTACT_EMAIL, 'career@techjockey.com')
  assert.deepEqual(await run(), [])
})
