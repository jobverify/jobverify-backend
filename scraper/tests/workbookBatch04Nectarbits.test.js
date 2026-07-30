import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} from '../workbookbatch04/nectarbits.js'

test('Nectarbits exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.deepEqual(await run(), [])
})

test('Nectarbits exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'nectarbits')
  assert.equal(COMPANY, 'Nectarbits')
  assert.equal(OFFICIAL_BRAND, 'NectarBits')
  assert.equal(CAREERS_URL, 'https://nectarbits.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name NectarBits public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
