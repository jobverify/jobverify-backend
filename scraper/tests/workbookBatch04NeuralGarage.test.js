import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  run,
} from '../workbookbatch04/neuralgarage.js'

test('NeuralGarage exact-name scraper stays fail-closed without a verified jobs surface', async () => {
  assert.deepEqual(await run(), [])
})

test('NeuralGarage exact-name scraper documents the verified public surface it guards', () => {
  assert.equal(SOURCE, 'neuralgarage')
  assert.equal(COMPANY, 'NeuralGarage')
  assert.equal(OFFICIAL_BRAND, 'NeuralGarage')
  assert.equal(CAREERS_URL, 'https://visualdub.ai/')
  assert.equal(DISPOSITION, 'verified-exact-name-public-surface-fail-closed')
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /Saturday, July 25, 2026.*https:\/\/visualdub\.ai\/.*NeuralGarage/i,
  )
  assert.match(
    VERIFIED_SURFACE_SUMMARY,
    /does not establish a stable enumerable public jobs contract/i,
  )
})
