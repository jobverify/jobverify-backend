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
const modulePath = path.resolve(currentDir, '../../scraper/dineout/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/dineout/catalog.js')
  } catch {
    assert.fail('Expected Dineout catalog module at ../../scraper/dineout/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/dineout/script.js')
  } catch {
    assert.fail('Expected Dineout scraper module at ../../scraper/dineout/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Dineout local catalog captures the verified parent careers migration and attributed public jobs', async () => {
  const { DINEOUT_CATALOG } = await loadCatalogModule()
  const dineout = await loadScraperModule()
  const provider = buildCatalogReadyProvider(DINEOUT_CATALOG)
  assert.equal(provider.source, 'dineout')
  assert.equal(provider.companyName, 'Dineout')
  assert.equal(provider.officialBrandName, 'Swiggy Dineout')
  assert.equal(provider.parentCompanyName, 'Swiggy')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.swiggy.in/')
  assert.equal(provider.legacyCareersUrl, 'https://careers.swiggy.com/')
  assert.equal(provider.jobsFeedUrl, 'https://careers.swiggy.in/api/jobs.json')
  assert.equal(provider.jobsApiUrl, 'https://api.smartrecruiters.com/v1/companies/SWIGGY/postings')
  assert.equal(provider.jobsBoardUrl, 'https://jobs.smartrecruiters.com/SWIGGY')
  assert.equal(provider.companyDomain, 'dineout.co.in')
  assert.equal(provider.atsPlatform, 'smartrecruiters')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'offset-paginated-parent-ats-with-count-checked-first-party-inventory')
  assert.equal(provider.extractionStrategy, 'verified-parent-careers-migration+reconciled-public-inventories+dine-out-business-unit+india-country-filter+job-details')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-10-08')
  assert.match(provider.verifiedSurfaceSummary, /careers\.swiggy\.com/)
  assert.match(provider.verifiedSurfaceSummary, /careers\.swiggy\.in/)
  assert.match(provider.verifiedSurfaceSummary, /SmartRecruiters/)
  assert.match(provider.verifiedSurfaceSummary, /Dine Out/)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /dineout[\\/]jobs\.json$/i)
  assert.equal(dineout.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
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
  assert.equal(provider.companyCareerPage, 'https://careers.swiggy.in/')
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
