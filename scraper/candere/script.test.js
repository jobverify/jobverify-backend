import assert from 'node:assert/strict'
import test from 'node:test'

import { CANDERE_CATALOG } from './catalog.js'
import { run } from './script.js'

test('Candere catalog identifies the verified Jobsoid careers surface', () => {
  assert.equal(CANDERE_CATALOG.source, 'candere')
  assert.equal(CANDERE_CATALOG.companyName, 'Candere')
  assert.equal(CANDERE_CATALOG.companyCareerPage, 'https://candere.jobsoid.com/')
  assert.equal(CANDERE_CATALOG.verifiedIndiaJobCount, 0)
})

test('Candere fails closed when the public board has no current openings', async () => {
  assert.deepEqual(await run(), [])
})
