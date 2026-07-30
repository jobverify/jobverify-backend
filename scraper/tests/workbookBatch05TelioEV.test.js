import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  run,
} from '../workbookbatch05/telioev.js'

test('TelioEV exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.deepEqual(await run(), [])
})

test('TelioEV exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'telioev')
  assert.equal(COMPANY, 'TelioEV')
  assert.equal(CAREERS_URL, 'https://telioev.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
})
