import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import dedicatedProviders from '../providers/providerExtensions/zz-dedicated-scraper-folder-backfill.json' with { type: 'json' }
import { generateCompanyCoverageReport, getCompanyAliasMap } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = fileURLToPath(new URL('.', import.meta.url))
const BATCH_04_PROVIDER_SOURCES = [
  'nectarbits',
  'netmeds',
  'neuralgarage',
  'neuropixel',
  'nomuraindia',
  'openprise',
  'orbo',
  'optymyzeindia',
  'outgrow',
  'panasonicindiadigital',
  'paramai',
  'pebble',
  'photomathindia',
  'piramaleswasthya',
  'piramalpharmadigital',
  'qburstindia',
  'quicko',
  'quiklyz',
  'quicksell',
  'rategain',
  'redcliffelabs',
  'revv',
  'sahamati',
  'sastasundar',
  'securonixindia',
  'selfscribe',
  'simpliwork',
  'skitai',
  'slanglabs',
  'smartshift',
]
const manifest = {
  companies: [
    ...BATCH_04_PROVIDER_SOURCES.map(
      (source) => dedicatedProviders.find((provider) => provider.source === source)?.companyName ?? source,
    ),
    'Plum',
    'Saarthi AI',
    'Sattva',
  ],
}
const ALIAS_ONLY_SOURCES = new Set(['plumhq', 'saarthi', 'sattvamedia'])
const LIVE_DRIFT_SENSITIVE_PROVIDER_SOURCES = new Set([
  'nectarbits',
  'netmeds',
  'neuropixel',
  'orbo',
  'panasonicindiadigital',
  'pebble',
  'photomathindia',
  'piramalpharmadigital',
  'qburstindia',
  'selfscribe',
  'skitai',
  'smartshift',
])

const loadBatch04Providers = () => {
  const report = generateCompanyCoverageReport({
    csvText: `${manifest.companies.join('\n')}\n`,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  return report.matched
    .filter(({ source }) => !ALIAS_ONLY_SOURCES.has(source))
    .map(({ source }) => dedicatedProviders.find((provider) => provider.source === source))
}

test('workbook batch 04 company-local providers are registered in the dedicated manifest', () => {
  const providers = loadBatch04Providers()

  assert.equal(Array.isArray(providers), true)
  assert.equal(providers.length, BATCH_04_PROVIDER_SOURCES.length)
  assert.ok(providers.every(Boolean))
})

test('historical unregistered Nomura snapshot helper retains its compatibility empty result', async () => {
  const modulePath = path.resolve(currentDir, '../../scraper/nomuraindia/verifiedCareersEmptyState.js')
  const module = await import(pathToFileURL(modulePath).href)

  assert.deepEqual(await module.run(), [])
  assert.deepEqual(await module.createVerifiedCareersEmptyStateScraper().run(), [])
})

test('workbook batch 04 scripts stay fail-closed and never fabricate jobs', async () => {
  const scrapers = buildScrapers()

  for (const provider of loadBatch04Providers()) {
    const hydratedProvider = hydrateProviderCatalogEntry(provider)
    const modulePath = path.isAbsolute(hydratedProvider.modulePath)
      ? hydratedProvider.modulePath
      : path.resolve(currentDir, hydratedProvider.modulePath)
    const module = await import(pathToFileURL(modulePath).href)
    const scraper = scrapers.find((item) => item.name === hydratedProvider.source)

    assert.ok(scraper, `Expected scraper registration for ${hydratedProvider.source}`)
    assert.equal(scraper.provider.companyName, hydratedProvider.companyName)
    if (hydratedProvider.source === 'nomuraindia') {
      // The genuine 298-response registered-source fixture exercises this live
      // reader. The old manifest remains historical compatibility input here.
      assert.equal(scraper.provider.verifiedPublicJobCount, null)
      assert.equal(scraper.provider.sourceScopeComplete, false)
      assert.equal(scraper.provider.lifecycleCleanupAllowed, false)
      continue
    }
    assert.equal(scraper.provider.verifiedPublicJobCount, 0)
    if (LIVE_DRIFT_SENSITIVE_PROVIDER_SOURCES.has(hydratedProvider.source)) continue

    assert.deepEqual(
      await module.run(),
      [],
      `Expected ${hydratedProvider.source} module to return []`,
    )
    assert.deepEqual(
      await scraper.run(),
      [],
      `Expected ${hydratedProvider.source} registered scraper to return []`,
    )
  }
})
