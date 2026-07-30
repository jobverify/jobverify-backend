import assert from 'node:assert/strict'
import test from 'node:test'

const piramalESwasthyaModule = await import('../workbookbatch04/piramaleswasthya.js').catch(
  () => ({}),
)

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = piramalESwasthyaModule

test('Piramal eSwasthya exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Piramal eSwasthya exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'piramaleswasthya')
  assert.equal(COMPANY, 'Piramal eSwasthya')
  assert.equal(OFFICIAL_BRAND, 'Piramal Swasthya')
  assert.equal(CAREERS_URL, 'https://www.piramalswasthya.org/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name Piramal Swasthya public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
