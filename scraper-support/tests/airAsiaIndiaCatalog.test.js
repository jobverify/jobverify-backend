import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/airasiaindia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/airasiaindia/catalog.js')
  } catch {
    assert.fail('Expected AirAsia India catalog module at ../../scraper/airasiaindia/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/airasiaindia/script.js')
  } catch {
    assert.fail('Expected AirAsia India scraper module at ../../scraper/airasiaindia/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('AirAsia India local catalog captures the verified legacy-brand redirect and merged-brand careers surface', async () => {
  const { AIRASIA_INDIA_CATALOG } = await loadCatalogModule()
  const airAsiaIndia = await loadScraperModule()
  const provider = buildCatalogReadyProvider(AIRASIA_INDIA_CATALOG)

  assert.equal(provider.source, 'airasiaindia')
  assert.equal(provider.companyName, 'AirAsia India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.airasia.com/in/en/careers')
  assert.equal(provider.companyDomain, 'airasia.com')
  assert.equal(provider.atsPlatform, 'legacy-brand-redirect-to-air-india-express-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'legacy-airasia-india-redirect-plus-aix-connect-parked-pages-plus-air-india-express-careers-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-airasia-move-redirect+verified-aix-connect-parked-pages+verified-air-india-express-careers-brand-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.legacyHomepageUrl, 'https://www.airasia.com/in/en')
  assert.equal(provider.legacyMoveUrl, 'https://www.airasia.com/en/gb')
  assert.equal(provider.parkedRebrandUrl, 'https://aixconnect.in/')
  assert.equal(provider.parkedRebrandCareersUrl, 'https://aixconnect.in/careers')
  assert.equal(provider.mergedCarrierHomepageUrl, 'https://www.airindiaexpress.com/home')
  assert.equal(provider.mergedCarrierCareersUrl, 'https://www.airindiaexpress.com/careers')
  assert.equal(provider.verifiedOn, '2026-10-03')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.airasia\.com\/in\/en/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/aixconnect\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.airindiaexpress\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy AirAsia India-branded public jobs surface/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /airasiaindia[\\/]jobs\.json$/i)

  assert.equal(airAsiaIndia.PROVIDER_METADATA.source, provider.source)
  assert.equal(airAsiaIndia.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(airAsiaIndia.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(airAsiaIndia.PROVIDER_METADATA.mergedCarrierCareersUrl, provider.mergedCarrierCareersUrl)
})

test('AirAsia India exact backlog name matches from the local provider contract without aliases', async () => {
  const { AIRASIA_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'AirAsia India\n',
    catalog: [buildCatalogReadyProvider(AIRASIA_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AirAsia India', 'airasiaindia', 'AirAsia India']],
  )
})

test('buildScrapers and company coverage resolve AirAsia India from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'airasiaindia')
  const scraper = buildScrapers().find((item) => item.name === 'airasiaindia')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'AirAsia India')
  assert.equal(provider.companyCareerPage, 'https://www.airasia.com/in/en/careers')
  assert.match(scraper.dryRunFile, /airasiaindia[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'AirAsia India\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AirAsia India', 'airasiaindia', 'AirAsia India']],
  )
})
