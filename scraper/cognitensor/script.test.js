import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPANY,
  FIRST_PARTY_ROOT_URL,
  SOURCE,
  createCogniTensorScraper,
  run,
} from './script.js'

test('CogniTensor first-party sentinel fails closed with no public listings', async () => {
  assert.equal(SOURCE, 'cognitensor')
  assert.equal(COMPANY, 'CogniTensor')
  assert.equal(FIRST_PARTY_ROOT_URL, 'https://www.cognitensor.com/')
  assert.deepEqual(await createCogniTensorScraper().run(), [])
  assert.deepEqual(await run(), [])
})
