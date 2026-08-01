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
} from '../../scraper/workindia/script.js'

test('WorkIndia exact-name scraper stays fail-closed without a verified company jobs contract', async () => {
  assert.deepEqual(await run(), [])
})

test('WorkIndia exact-name scraper documents the verified official public surface it guards', () => {
  assert.equal(SOURCE, 'workindia')
  assert.equal(COMPANY, 'WorkIndia')
  assert.equal(OFFICIAL_BRAND, 'WorkIndia')
  assert.equal(CAREERS_URL, 'https://www.workindia.in/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*https:\/\/www\.workindia\.in\//i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /job marketplace/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable public jobs contract/i,
  )
})
