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
const modulePath = path.resolve(currentDir, '../../scraper/avanse/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/avanse/catalog.js')
  } catch {
    assert.fail('Expected Avanse catalog module at ../../scraper/avanse/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/avanse/script.js')
  } catch {
    assert.fail('Expected Avanse scraper module at ../../scraper/avanse/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Avanse local catalog captures the verified first-party careers shell and fail-closed API timeout contract', async () => {
  const { AVANSE_CATALOG } = await loadCatalogModule()
  const avanse = await loadScraperModule()
  const provider = buildCatalogReadyProvider(AVANSE_CATALOG)

  assert.equal(provider.source, 'avanse')
  assert.equal(provider.companyName, 'Avanse')
  assert.equal(provider.officialBrandName, 'Avanse Financial Services')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.avanse.com/career')
  assert.equal(provider.homepageUrl, 'https://www.avanse.com/')
  assert.equal(provider.companyDomain, 'avanse.com')
  assert.equal(
    provider.jobsApiUrl,
    'https://www.avanse.com/public/api/getAllJobs?city=mumbai',
  )
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-homepage-plus-career-jobs-shell-plus-504-api-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-career-jobs-shell-with-non-actionable-cards+verified-first-party-jobs-api-504+verified-missing-alternate-job-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.avanse\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.avanse\.com\/career/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/www\.avanse\.com\/public\/api\/getAllJobs\?city=mumbai/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /\b504 Gateway Time-out\b/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /avanse[\\/]jobs\.json$/i)

  assert.equal(avanse.PROVIDER_METADATA.source, provider.source)
  assert.equal(avanse.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(avanse.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(avanse.PROVIDER_METADATA.jobsApiUrl, provider.jobsApiUrl)
})

test('Avanse exact backlog name matches from the local provider contract without aliases', async () => {
  const { AVANSE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Avanse\n',
    catalog: [buildCatalogReadyProvider(AVANSE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Avanse', 'avanse', 'Avanse']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Avanse'), false)
})

test('buildScrapers and company coverage resolve Avanse from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'avanse')
  const scraper = buildScrapers().find((item) => item.name === 'avanse')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Avanse')
  assert.equal(provider.companyCareerPage, 'https://www.avanse.com/career')
  assert.match(scraper.dryRunFile, /avanse[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Avanse\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Avanse', 'avanse', 'Avanse']],
  )
})
