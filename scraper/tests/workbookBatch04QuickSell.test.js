import assert from 'node:assert/strict'
import test from 'node:test'

const quickSellModule = await import('../workbookbatch04/quicksell.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} = quickSellModule

test('QuickSell exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.equal(typeof run, 'function')
  assert.deepEqual(await run(), [])
})

test('QuickSell exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'quicksell')
  assert.equal(COMPANY, 'QuickSell')
  assert.equal(OFFICIAL_BRAND, 'QuickSell')
  assert.equal(CAREERS_URL, 'https://quicksell.co/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*exact-name QuickSell public company surface/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable first-party jobs contract/i,
  )
})
