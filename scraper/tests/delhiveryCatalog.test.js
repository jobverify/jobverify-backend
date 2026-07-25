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
const delhiveryModulePath = path.resolve(currentDir, '../delhivery/script.js')

const loadDelhiveryCatalog = async () => {
  try {
    return await import('../delhivery/catalog.js')
  } catch {
    assert.fail('Expected Delhivery catalog module at ../delhivery/catalog.js')
  }
}

test('Delhivery catalog captures the verified first-party careers page and Darwinbox corporate jobs surface', async () => {
  const { DELHIVERY_CATALOG } = await loadDelhiveryCatalog()
  const provider = hydrateProviderCatalogEntry(DELHIVERY_CATALOG)

  assert.equal(provider.source, 'delhivery')
  assert.equal(provider.companyName, 'Delhivery')
  assert.equal(provider.officialBrandName, 'Delhivery Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.delhivery.com/careers')
  assert.equal(provider.homepageUrl, 'https://www.delhivery.com/')
  assert.equal(
    provider.officialCareersHandoffUrl,
    'https://delhivery.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(provider.darwinboxJobsUrl, 'https://delhivery.darwinbox.in/jobs')
  assert.equal(
    provider.publicPortalHomeUrl,
    'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  )
  assert.equal(
    provider.publicAllJobsUrl,
    'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    provider.listingApiUrl,
    'https://delhivery.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(provider.darwinboxOrigin, 'https://delhivery.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.companyDomain, 'delhivery.com')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+darwinbox-browser-session-listing-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.equal(provider.modulePath, delhiveryModulePath)
  assert.match(provider.dryRunFile, /delhivery[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.delhivery\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.delhivery\.com\/careers/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/delhivery\.darwinbox\.in\/ms\/candidate\/careers/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/delhivery\.darwinbox\.in\/jobs/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/delhivery\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/home/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/delhivery\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/delhivery\.darwinbox\.in\/ms\/candidateapi\/job\/alljobs\?companyId=main/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /\b10 open jobs\b/i)
  assert.match(provider.verifiedSurfaceSummary, /\bCloudflare 403\b/i)
})

test('Delhivery backlog row matches directly from local provider metadata without alias churn', async () => {
  const { DELHIVERY_CATALOG } = await loadDelhiveryCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Delhivery\n',
    catalog: [hydrateProviderCatalogEntry(DELHIVERY_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Delhivery', 'delhivery', 'Delhivery']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Delhivery'), false)
})

test('buildScrapers and company coverage resolve Delhivery from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'delhivery')
  const scraper = buildScrapers().find((item) => item.name === 'delhivery')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Delhivery')
  assert.equal(provider.companyCareerPage, 'https://www.delhivery.com/careers')
  assert.match(scraper.dryRunFile, /delhivery[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Delhivery\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Delhivery', 'delhivery', 'Delhivery']],
  )
})
