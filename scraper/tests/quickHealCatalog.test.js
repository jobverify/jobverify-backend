import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../quickheal/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../quickheal/catalog.js')
  } catch {
    assert.fail('Expected Quick Heal catalog module at ../quickheal/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../quickheal/script.js')
  } catch {
    assert.fail('Expected Quick Heal scraper module at ../quickheal/script.js')
  }
}

test('Quick Heal local catalog captures the verified first-party careers page and Darwinbox handoff', async () => {
  const { QUICK_HEAL_CATALOG } = await loadCatalogModule()
  const quickHeal = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(QUICK_HEAL_CATALOG)

  assert.equal(provider.source, 'quickheal')
  assert.equal(provider.companyName, 'Quick Heal')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.quickheal.com/jobs-careers-at-quick-heal')
  assert.equal(provider.companyDomain, 'quickheal.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(provider.extractionStrategy, 'official-careers-page+darwinbox-listing-api')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(provider.darwinboxOrigin, 'https://lifecycleqhtl.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /quickheal[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.quickheal\.com\/jobs-careers-at-quick-heal/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/lifecycleqhtl\.darwinbox\.in\/ms\/candidate\/careers/i,
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Quick Heal'), false)

  assert.equal(quickHeal.PROVIDER_METADATA.source, QUICK_HEAL_CATALOG.source)
  assert.equal(quickHeal.PROVIDER_METADATA.companyName, QUICK_HEAL_CATALOG.companyName)
  assert.equal(
    quickHeal.PROVIDER_METADATA.officialCareersHandoffUrl,
    QUICK_HEAL_CATALOG.officialCareersHandoffUrl,
  )
})

test('Quick Heal exact backlog row resolves directly from local provider metadata', async () => {
  const { QUICK_HEAL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Quick Heal\n',
    catalog: [hydrateProviderCatalogEntry(QUICK_HEAL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Quick Heal', 'quickheal', 'Quick Heal']],
  )
})

test('getScraperCatalog exposes Quick Heal as a runnable shared provider without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'quickheal')
  const scraper = buildScrapers().find((item) => item.name === 'quickheal')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Quick Heal')
  assert.equal(provider.companyCareerPage, 'https://www.quickheal.com/jobs-careers-at-quick-heal')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Quick Heal'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Quick Heal\n',
    catalog: getScraperCatalog(),
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Quick Heal', 'quickheal', 'Quick Heal']],
  )
})

test('Quick Heal hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { QUICK_HEAL_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(QUICK_HEAL_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.match(provider.modulePath, /quickheal[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /quickheal[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
