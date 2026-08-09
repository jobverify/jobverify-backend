import assert from 'node:assert/strict'
import test from 'node:test'

const sahamatiModule = await import('../../scraper/sahamati/script.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = sahamatiModule

test('Sahamati scraper stays fail-closed without a verified public openings flow', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('Sahamati scraper documents the verified public company surface it guards', () => {
  assert.equal(SOURCE, 'sahamati')
  assert.equal(COMPANY, 'Sahamati')
  assert.equal(OFFICIAL_BRAND, 'Sahamati')
  assert.equal(CAREERS_URL, 'https://sahamati.org.in/aboutus/')
  assert.equal(DISPOSITION, 'verified-public-surface-fail-closed-sentinel')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Verified on Saturday, July 25, 2026 that https:\/\/sahamati\.org\.in\/aboutus\/ was the live first-party public surface reviewed for Sahamati\./i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /no batch-04 company-specific openings parser has been promoted yet, so the provider remains fail-closed and returns no jobs until a verifiable public openings flow is implemented\./i,
  )
})
