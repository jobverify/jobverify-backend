import assert from 'node:assert/strict'
import test from 'node:test'

const outgrowModule = await import('../../scraper/outgrow/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = outgrowModule

test('Outgrow exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Outgrow exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'outgrow')
  assert.equal(COMPANY, 'Outgrow')
  assert.equal(OFFICIAL_BRAND, 'Outgrow')
  assert.equal(CAREERS_URL, 'https://outgrow.co/about-us/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Outgrow public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
