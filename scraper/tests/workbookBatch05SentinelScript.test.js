import assert from 'node:assert/strict'
import test from 'node:test'

import batchProviders from '../providers/providerExtensions/workbook-batch-05.json' with { type: 'json' }
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const EXPECTED_PROVIDER_SOURCES = [
  'smarterai',
  'snapmint',
  'socialpilot',
  'spheraindia',
  'sporjo',
  'stackbox',
  'starhealthdigital',
  'sukoon',
  'sumupindia',
  'supergaming',
  'suprdaily',
  'suryoday',
  'synup',
  'techjockey',
  'technovert',
  'telioev',
  'thirdeyedata',
  'trell',
  'trigyn',
  'tricog',
  'truecallerindia',
  'trukkerindia',
  'twimbit',
  'unbxd',
  'uniqus',
  'uolo',
  'urbanpiper',
  'vakilsearch',
  'varthana',
  'verygoodsecurityindia',
  'vervotech',
  'wati',
  'wealthy',
]

const NON_GENERIC_PROVIDER_SOURCES = new Set([
  'smarterai',
  'snapmint',
  'socialpilot',
  'spheraindia',
  'sporjo',
  'stackbox',
  'starhealthdigital',
  'sukoon',
  'sumupindia',
  'supergaming',
  'suprdaily',
  'suryoday',
  'synup',
  'techjockey',
  'technovert',
  'telioev',
  'thirdeyedata',
  'trell',
  'tricog',
  'trigyn',
  'truecallerindia',
  'trukkerindia',
  'twimbit',
  'unbxd',
  'uniqus',
  'uolo',
  'urbanpiper',
  'vakilsearch',
  'varthana',
  'verygoodsecurityindia',
  'vervotech',
  'wati',
  'wealthy',
])

test('workbook batch 05 provider extension registers specialized and generic fail-closed providers', () => {
  assert.equal(batchProviders.length, EXPECTED_PROVIDER_SOURCES.length)
  assert.deepEqual(
    batchProviders.map((provider) => provider.source),
    EXPECTED_PROVIDER_SOURCES,
  )

  const catalog = getScraperCatalog()
  for (const source of EXPECTED_PROVIDER_SOURCES) {
    const provider = catalog.find((item) => item.source === source)
    assert.ok(provider, `Expected ${source} in hydrated scraper catalog`)
    assert.equal(provider.adapter, 'script')
    assert.equal(provider.verifiedOn, '2026-07-25')
    assert.equal(
      provider.modulePath.includes('failClosedSentinel'),
      !NON_GENERIC_PROVIDER_SOURCES.has(source),
    )
  }
})

test('workbook batch 05 unresolved providers stay fail-closed', async () => {
  const scrapers = buildScrapers()

  for (const source of EXPECTED_PROVIDER_SOURCES) {
    if (NON_GENERIC_PROVIDER_SOURCES.has(source)) continue
    const scraper = scrapers.find((item) => item.name === source)
    assert.ok(scraper, `Expected scraper for ${source}`)
    assert.deepEqual(await scraper.run(), [], `Expected ${source} to stay fail-closed`)
  }
})
