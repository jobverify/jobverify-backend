import assert from 'node:assert/strict'
import test from 'node:test'

const revvModule = await import('../../scraper/revv/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = revvModule

test('Revv exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Revv exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'revv')
  assert.equal(COMPANY, 'Revv')
  assert.equal(OFFICIAL_BRAND, 'Revv')
  assert.equal(CAREERS_URL, 'https://www.revv.co.in/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Revv public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
