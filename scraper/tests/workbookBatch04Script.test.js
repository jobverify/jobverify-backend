import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { buildScrapers, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const providerExtensionPath = path.resolve(
  currentDir,
  '../providers/providerExtensions/workbook-batch-04.json',
)

const providerExtensions = JSON.parse(readFileSync(providerExtensionPath, 'utf8'))
const LIVE_DRIFT_SENSITIVE_PROVIDER_SOURCES = new Set([
  'nectarbits',
  'netmeds',
  'neuropixel',
  'orbo',
  'panasonicindiadigital',
  'pebble',
  'photomathindia',
  'piramalpharmadigital',
  'puresoftware',
  'qburstindia',
  'scapic',
  'selfscribe',
  'smartshift',
])

test('workbook batch 04 sentinel providers are registered in the batch extension file', () => {
  assert.equal(Array.isArray(providerExtensions), true)
  assert.equal(providerExtensions.length, 32)
})

test('workbook batch 04 verified careers snapshot module returns only the authoritative empty result', async () => {
  const modulePath = path.resolve(currentDir, '../workbookbatch04/verifiedCareersEmptyState.js')
  const module = await import(pathToFileURL(modulePath).href)

  assert.deepEqual(await module.run(), [])
  assert.deepEqual(await module.createVerifiedCareersEmptyStateScraper().run(), [])
})

test('workbook batch 04 scripts stay fail-closed and never fabricate jobs', async () => {
  const scrapers = buildScrapers()

  for (const provider of providerExtensions) {
    const hydratedProvider = hydrateProviderCatalogEntry(provider)
    const modulePath = path.isAbsolute(hydratedProvider.modulePath)
      ? hydratedProvider.modulePath
      : path.resolve(currentDir, hydratedProvider.modulePath)
    const module = await import(pathToFileURL(modulePath).href)
    const scraper = scrapers.find((item) => item.name === hydratedProvider.source)

    assert.ok(scraper, `Expected scraper registration for ${hydratedProvider.source}`)
    assert.equal(scraper.provider.companyName, hydratedProvider.companyName)
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
