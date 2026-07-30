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
} from '../workbookbatch04/paramai.js'

test('Param.ai exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.deepEqual(await run(), [])
})

test('Param.ai exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'paramai')
  assert.equal(COMPANY, 'Param.ai')
  assert.equal(OFFICIAL_BRAND, 'Param.ai')
  assert.equal(CAREERS_URL, 'https://param.ai/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Param\.ai public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
