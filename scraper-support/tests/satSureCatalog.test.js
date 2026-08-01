import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/satsure/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/satsure/catalog.js')
  } catch {
    assert.fail('Expected SatSure catalog module at ../../scraper/satsure/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/satsure/script.js')
  } catch {
    assert.fail('Expected SatSure scraper module at ../../scraper/satsure/script.js')
  }
}

test('SatSure local catalog captures the verified fail-closed first-party careers plus Keka handoff state', async () => {
  const { SATSURE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const satSure = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SATSURE_CATALOG)

  assert.equal(defaultCatalog, SATSURE_CATALOG)
  assert.equal(provider.source, 'satsure')
  assert.equal(provider.companyName, 'SatSure')
  assert.equal(provider.officialBrandName, 'SatSure Analytics India Pvt Ltd')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.satsure.co/careers/')
  assert.equal(provider.officialCareersPageUrl, 'https://www.satsure.co/careers/')
  assert.equal(provider.companyDomain, 'satsure.co')
  assert.equal(provider.officialCareersHandoffUrl, 'https://satsure.keka.com/careers')
  assert.equal(provider.verifiedSampleJobUrl, 'https://satsure.keka.com/careers/jobdetails/30263')
  assert.equal(provider.atsPlatform, 'keka-handoff-unverifiable')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'first-party-careers-page-plus-external-keka-handoff-no-verifiable-public-board',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-keka-handoff+historical-public-jobdetail+fail-closed-sentinel',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /satsure[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.satsure\.co\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/satsure\.keka\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /30263/)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'SatSure'), false)

  assert.equal(satSure.PROVIDER_METADATA.source, SATSURE_CATALOG.source)
  assert.equal(satSure.PROVIDER_METADATA.companyName, SATSURE_CATALOG.companyName)
})

test('SatSure exact backlog row matches directly from local provider metadata', async () => {
  const { SATSURE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'SatSure\n',
    catalog: [hydrateProviderCatalogEntry(SATSURE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['SatSure', 'satsure', 'SatSure']],
  )
})

test('SatSure hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { SATSURE_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SATSURE_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'SatSure')
  assert.equal(provider.companyCareerPage, 'https://www.satsure.co/careers/')
  assert.equal(provider.companyDomain, 'satsure.co')
  assert.equal(provider.atsPlatform, 'keka-handoff-unverifiable')
  assert.match(provider.modulePath, /satsure[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /satsure[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
