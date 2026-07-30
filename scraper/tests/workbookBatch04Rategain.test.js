import assert from 'node:assert/strict'
import test from 'node:test'

const rategainModule = await import('../workbookbatch04/rategain.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = rategainModule

test('Rategain exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Rategain exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'rategain')
  assert.equal(COMPANY, 'Rategain')
  assert.equal(OFFICIAL_BRAND, 'RateGain')
  assert.equal(CAREERS_URL, 'https://rategain.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name RateGain public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable public jobs contract/i,
  )
})
