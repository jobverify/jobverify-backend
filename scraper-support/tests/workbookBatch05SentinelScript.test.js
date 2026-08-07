import assert from 'node:assert/strict'
import test from 'node:test'

import dedicatedProviders from '../providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
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

const EXPECTED_VERIFIED_ON_BY_SOURCE = {
  sukoon: '2026-08-04',
  suprdaily: '2026-08-04',
  urbanpiper: '2026-08-01',
}

const batchProviders = dedicatedProviders.filter((provider) => EXPECTED_PROVIDER_SOURCES.includes(provider.source))

test('workbook batch 05 provider extension registers specialized and generic fail-closed providers', () => {
  assert.equal(batchProviders.length, EXPECTED_PROVIDER_SOURCES.length)
  assert.deepEqual(
    batchProviders.map((provider) => provider.source).sort((left, right) => left.localeCompare(right)),
    [...EXPECTED_PROVIDER_SOURCES].sort((left, right) => left.localeCompare(right)),
  )

  const catalog = getScraperCatalog()
  for (const source of EXPECTED_PROVIDER_SOURCES) {
    const provider = catalog.find((item) => item.source === source)
    assert.ok(provider, `Expected ${source} in hydrated scraper catalog`)
    assert.equal(provider.adapter, 'script')
    assert.equal(provider.verifiedOn, EXPECTED_VERIFIED_ON_BY_SOURCE[source] || '2026-07-25')
    assert.equal(
      String(provider.originalModulePath || '').includes('failClosedSentinel'),
      !NON_GENERIC_PROVIDER_SOURCES.has(source),
    )
    assert.match(provider.modulePath, new RegExp(`${source}[\\\\/]script\\.js$`, 'i'))
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
