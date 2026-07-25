import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../godrejproperties/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../godrejproperties/catalog.js')
  } catch {
    assert.fail('Expected Godrej Properties catalog module at ../godrejproperties/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../godrejproperties/script.js')
  } catch {
    assert.fail('Expected Godrej Properties scraper module at ../godrejproperties/script.js')
  }
}

test('Godrej Properties local catalog captures the verified first-party handoff and shared-parent sentinel surface without alias churn', async () => {
  const { GODREJ_PROPERTIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const godrejProperties = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(GODREJ_PROPERTIES_CATALOG)

  assert.equal(defaultCatalog, GODREJ_PROPERTIES_CATALOG)
  assert.equal(provider.source, 'godrejproperties')
  assert.equal(provider.companyName, 'Godrej Properties')
  assert.equal(provider.officialBrandName, 'Godrej Properties')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.godrejindustries.com/in/en/godrejproperties')
  assert.equal(provider.homepageUrl, 'https://www.godrejproperties.com/')
  assert.equal(provider.aboutUsUrl, 'https://www.godrejproperties.com/know-us/about')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://careers.godrejindustries.com/in/en/godrejproperties',
  )
  assert.equal(provider.companyDomain, 'godrejproperties.com')
  assert.equal(provider.atsPlatform, 'shared-parent-careers-non-enumerable-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-work-with-us-handoff-plus-shared-parent-non-enumerable-shell',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-homepage+verified-first-party-about-page+verified-shared-parent-godrej-properties-shell+fail-closed-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /godrejproperties[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.godrejproperties\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.godrejproperties\.com\/know-us\/about/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/careers\.godrejindustries\.com\/in\/en\/godrejproperties/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Godrej Properties'), false)

  assert.equal(
    godrejProperties.PROVIDER_METADATA.source,
    GODREJ_PROPERTIES_CATALOG.source,
  )
  assert.equal(
    godrejProperties.PROVIDER_METADATA.companyName,
    GODREJ_PROPERTIES_CATALOG.companyName,
  )
})

test('Godrej Properties exact backlog row matches directly from the local provider metadata', async () => {
  const { GODREJ_PROPERTIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Godrej Properties\n',
    catalog: [hydrateProviderCatalogEntry(GODREJ_PROPERTIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Godrej Properties', 'godrejproperties', 'Godrej Properties']],
  )
})

test('Godrej Properties hydrated local catalog stays script-runner compatible for later registry integration', async () => {
  const { GODREJ_PROPERTIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(GODREJ_PROPERTIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Godrej Properties')
  assert.equal(
    provider.companyCareerPage,
    'https://careers.godrejindustries.com/in/en/godrejproperties',
  )
  assert.equal(provider.companyDomain, 'godrejproperties.com')
  assert.equal(provider.atsPlatform, 'shared-parent-careers-non-enumerable-shell')
  assert.match(provider.modulePath, /godrejproperties[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /godrejproperties[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
