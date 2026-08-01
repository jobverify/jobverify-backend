import assert from 'node:assert/strict'
import test from 'node:test'

const quiklyzModule = await import('../../scraper/quiklyz/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = quiklyzModule

test('Quiklyz exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Quiklyz exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'quiklyz')
  assert.equal(COMPANY, 'Quiklyz')
  assert.equal(OFFICIAL_BRAND, 'Quiklyz')
  assert.equal(CAREERS_URL, 'https://www.quiklyz.com/about-us')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Quiklyz public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
