import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/current-native-20261024.json.gz', import.meta.url))))
test('Affirm accepts a London label with its explicit UK office while retaining conservative city-only inventory evidence', async () => {
  const job = { ...fixture.inventory.jobs[0], location: { name: 'London' }, offices: [{ name: 'Remote UK' }] }
  const jobs = await run({ fetchJson: async () => ({ jobs: [job], meta: { total: 1 } }) })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.match(readInventoryEvidence(jobs).reason, /native-location-scope-unresolved/)
})
test('Affirm requires explicit consistent native office scope for city-only London', async () => {
  for (const offices of [[], [{ name: 'Remote' }], [{ name: 'Remote UK' }, { name: 'India' }]]) {
    const job = { ...fixture.inventory.jobs[0], location: { name: 'London' }, offices }
    await assert.rejects(run({ fetchJson: async () => ({ jobs: [job], meta: { total: 1 } }) }), /country scope/)
  }
})
