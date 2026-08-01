import assert from 'node:assert/strict'
import test from 'node:test'

const sastasundarModule = await import('../../scraper/sastasundar/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = sastasundarModule

test('Sastasundar scraper stays fail-closed without a verified jobs contract', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Sastasundar scraper documents the verified public company surface it guards', () => {
  assert.equal(SOURCE, 'sastasundar')
  assert.equal(COMPANY, 'Sastasundar')
  assert.equal(OFFICIAL_BRAND, 'Sastasundar')
  assert.equal(CAREERS_URL, 'https://sastasundar.com/pages/view/about-us')
  assert.equal(DISPOSITION, 'verified-public-surface-fail-closed-sentinel')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*live first-party public surface reviewed for Sastasundar/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /no batch-04 company-specific openings parser has been promoted yet/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /returns no jobs until a verifiable public openings flow is implemented/i,
  )
})
