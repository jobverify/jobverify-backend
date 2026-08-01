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
const modulePath = path.resolve(currentDir, '../../scraper/bajajfinance/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/bajajfinance/catalog.js')
  } catch {
    assert.fail('Expected Bajaj Finance catalog module at ../../scraper/bajajfinance/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/bajajfinance/script.js')
  } catch {
    assert.fail('Expected Bajaj Finance scraper module at ../../scraper/bajajfinance/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Bajaj Finance local catalog captures the verified first-party PeopleStrong handoff surface', async () => {
  const { BAJAJ_FINANCE_CATALOG } = await loadCatalogModule()
  const bajajFinance = await loadScraperModule()
  const provider = buildCatalogReadyProvider(BAJAJ_FINANCE_CATALOG)

  assert.equal(provider.source, 'bajajfinance')
  assert.equal(provider.companyName, 'Bajaj Finance')
  assert.equal(provider.officialBrandName, 'Bajaj Finance Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.aboutbajajfinserv.com/finance-about-us')
  assert.equal(provider.homepageUrl, 'https://www.bajajfinance.com/')
  assert.equal(provider.portalOrigin, 'https://bflcareers.peoplestrong.com')
  assert.equal(provider.jobListingsUrl, 'https://bflcareers.peoplestrong.com/')
  assert.equal(
    provider.jobsApiUrl,
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  )
  assert.equal(provider.companyDomain, 'bflcareers.peoplestrong.com')
  assert.equal(provider.atsPlatform, 'peoplestrong')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-bajaj-finance-page-plus-peoplestrong-offset-limit-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'official-bajaj-finance-page+direct-peoplestrong-handoff+peoplestrong-jobs-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.aboutbajajfinserv\.com\/finance-about-us/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/bflcareers\.peoplestrong\.com\//i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/bflcareers\.peoplestrong\.com\/api\/cp\/rest\/altone\/cp\/jobs\/v1\?offset=0&limit=20/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /PeopleStrong/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /bajajfinance[\\/]jobs\.json$/i)

  assert.equal(bajajFinance.PROVIDER_METADATA.source, provider.source)
  assert.equal(bajajFinance.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(bajajFinance.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(bajajFinance.PROVIDER_METADATA.portalOrigin, provider.portalOrigin)
  assert.equal(bajajFinance.PROVIDER_METADATA.jobsApiUrl, provider.jobsApiUrl)
})

test('Bajaj Finance exact backlog name matches from the local provider contract without aliases', async () => {
  const { BAJAJ_FINANCE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Finance\n',
    catalog: [buildCatalogReadyProvider(BAJAJ_FINANCE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Finance', 'bajajfinance', 'Bajaj Finance']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Bajaj Finance'), false)
})

test('buildScrapers and company coverage resolve Bajaj Finance from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bajajfinance')
  const scraper = buildScrapers().find((item) => item.name === 'bajajfinance')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Bajaj Finance')
  assert.equal(provider.companyCareerPage, 'https://www.aboutbajajfinserv.com/finance-about-us')
  assert.match(scraper.dryRunFile, /bajajfinance[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Bajaj Finance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Bajaj Finance', 'bajajfinance', 'Bajaj Finance']],
  )
})
