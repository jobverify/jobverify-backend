import assert from 'node:assert/strict'
import test from 'node:test'

import { getCompanyAliasMap, generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/snyk.workday/catalog.js')
  } catch {
    assert.fail('Expected Snyk catalog module at ../../scraper/snyk.workday/catalog.js')
  }
}

test('Snyk local catalog captures the verified first-party careers pages and Workday jobs API wrapper', async () => {
  const { SNYK_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SNYK_CATALOG)

  assert.equal(defaultCatalog, SNYK_CATALOG)
  assert.equal(provider.source, 'snyk')
  assert.equal(provider.companyName, 'Snyk')
  assert.equal(provider.officialBrandName, 'Snyk')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.officialCareersLandingUrl, 'https://snyk.io/careers/')
  assert.equal(provider.companyCareerPage, 'https://snyk.io/careers/all-jobs/')
  assert.equal(provider.firstPartyJobsApiUrl, 'https://snyk.io/api/next/jobs')
  assert.equal(provider.workdayTenantUrl, 'https://snyk.wd103.myworkdayjobs.com/External')
  assert.equal(provider.atsPlatform, 'workday')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-next-jobs-api-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-pages+first-party-next-jobs-api+workday-detail-urls+return-empty-when-no-india-locations',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'snyk.io')
  assert.equal(provider.verifiedOn, '2026-08-13')
  assert.match(provider.modulePath, /snyk\.workday[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /snyk.workday[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Thursday, August 13, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/snyk\.io\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/snyk\.io\/careers\/all-jobs\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/snyk\.io\/api\/next\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /24 public roles/i)
  assert.match(provider.verifiedSurfaceSummary, /0 India roles/i)
})

test('getScraperCatalog includes Snyk as a runnable script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'snyk')

  assert.ok(provider, 'Expected Snyk provider to be registered in customProviders.json')
  assert.equal(provider.companyName, 'Snyk')
  assert.equal(provider.companyCareerPage, 'https://snyk.io/careers/all-jobs/')
  assert.equal(provider.atsPlatform, 'workday')
  assert.match(provider.modulePath, /snyk\.workday[\\/]script\.js$/i)
})

test('Snyk India resolves through the dedicated alias extension to the broader Snyk provider', () => {
  const aliases = getCompanyAliasMap()
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nSnyk India\nSnyk\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(aliases['Snyk India'], 'snyk')
  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Snyk India', 'snyk', 'Snyk'],
      ['Snyk', 'snyk', 'Snyk'],
    ],
  )
})

test('buildScrapers exposes a runnable Snyk scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'snyk')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'snyk')
  assert.match(scraper.dryRunFile, /snyk.workday[\\/]jobs\.json$/i)
})
