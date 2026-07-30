import assert from 'node:assert/strict'
import test from 'node:test'

const optymyzeIndiaModule = await import('../workbookbatch04/optymyzeindia.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = optymyzeIndiaModule

test('Optymyze India exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Optymyze India exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'optymyzeindia')
  assert.equal(COMPANY, 'Optymyze India')
  assert.equal(OFFICIAL_BRAND, 'Optymyze')
  assert.equal(CAREERS_URL, 'https://optymyze.com/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Optymyze public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
