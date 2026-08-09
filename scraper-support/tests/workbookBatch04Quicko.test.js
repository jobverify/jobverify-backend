import assert from 'node:assert/strict'
import test from 'node:test'

const quickoModule = await import('../../scraper/quicko/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = quickoModule

test('Quicko exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Quicko exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'quicko')
  assert.equal(COMPANY, 'Quicko')
  assert.equal(OFFICIAL_BRAND, 'Quicko')
  assert.equal(CAREERS_URL, 'https://quicko.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Quicko public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
