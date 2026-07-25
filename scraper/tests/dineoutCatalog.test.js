import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../dineout/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../dineout/catalog.js')
  } catch {
    assert.fail('Expected Dineout catalog module at ../dineout/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../dineout/script.js')
  } catch {
    assert.fail('Expected Dineout scraper module at ../dineout/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Dineout local catalog captures the verified consumer-surface handoff and no-public-jobs contract', async () => {
  const { DINEOUT_CATALOG } = await loadCatalogModule()
  const dineout = await loadScraperModule()
  const provider = buildCatalogReadyProvider(DINEOUT_CATALOG)

  assert.equal(provider.source, 'dineout')
  assert.equal(provider.companyName, 'Dineout')
  assert.equal(provider.officialBrandName, 'Swiggy Dineout')
  assert.equal(provider.parentCompanyName, 'Swiggy')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.dineout.co.in/')
  assert.equal(provider.canonicalConsumerSurfaceUrl, 'https://www.swiggy.com/dineout')
  assert.equal(provider.companyCareerPage, 'https://careers.swiggy.com/')
  assert.equal(
    provider.careersIntegrationScriptUrl,
    'https://careers.swiggy.com/assets/js/careers-integration.js',
  )
  assert.equal(provider.jobsBoardUrl, 'https://swiggy.mynexthire.com/employer/jobs/careers')
  assert.equal(
    provider.jobsBoardDetailsUrl,
    'https://swiggy.mynexthire.com/employer/jobboard/details_by_shortname/get/swiggy/',
  )
  assert.equal(provider.redirectedNoTrustRouteUrl, 'https://www.swiggy.com/restaurants-near-me')
  assert.equal(provider.companyDomain, 'dineout.co.in')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-dineout-consumer-homepage-plus-parent-careers-surface-check',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-dineout-homepage-canonicalized-to-swiggy-dineout+verified-dineout-career-routes-redirect-away+verified-parent-swiggy-careers-surface-without-dineout-attributable-public-roles',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dineout\.co\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.swiggy\.com\/dineout/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.swiggy\.com\//i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/swiggy\.mynexthire\.com\/employer\/jobs\/careers/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/swiggy\.mynexthire\.com\/employer\/jobboard\/details_by_shortname\/get\/swiggy\//i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/www\.swiggy\.com\/restaurants-near-me/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /no trustworthy public jobs surface attributable to Dineout/i,
  )
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /dineout[\\/]jobs\.json$/i)

  assert.equal(dineout.PROVIDER_METADATA.source, provider.source)
  assert.equal(dineout.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(dineout.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(dineout.PROVIDER_METADATA.jobsBoardUrl, provider.jobsBoardUrl)
})

test('Dineout exact backlog name matches from the local provider contract without aliases', async () => {
  const { DINEOUT_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Dineout\n',
    catalog: [buildCatalogReadyProvider(DINEOUT_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dineout', 'dineout', 'Dineout']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Dineout'), false)
})

test('buildScrapers and company coverage resolve Dineout from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'dineout')
  const scraper = buildScrapers().find((item) => item.name === 'dineout')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Dineout')
  assert.equal(provider.companyCareerPage, 'https://careers.swiggy.com/')
  assert.match(scraper.dryRunFile, /dineout[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Dineout\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dineout', 'dineout', 'Dineout']],
  )
})
