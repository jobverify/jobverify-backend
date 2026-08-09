import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/bookmyshow/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/bookmyshow/catalog.js')
  } catch {
    assert.fail('Expected BookMyShow catalog module at ../../scraper/bookmyshow/catalog.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('BookMyShow local catalog captures the verified first-party careers shell and empty-or-blocked job listing state', async () => {
  const { BOOK_MY_SHOW_CATALOG } = await loadCatalogModule()
  const provider = buildCatalogReadyProvider(BOOK_MY_SHOW_CATALOG)

  assert.equal(provider.source, 'bookmyshow')
  assert.equal(provider.companyName, 'BookMyShow')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://in.bookmyshow.com/careers')
  assert.equal(provider.homepageUrl, 'https://in.bookmyshow.com/')
  assert.equal(provider.jobListingUrl, 'https://in.bookmyshow.com/careers/job-listing')
  assert.equal(provider.companyDomain, 'in.bookmyshow.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-first-party-careers-shell-plus-empty-job-listing-shell-or-cloudflare-block',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-empty-job-listing-shell-or-cloudflare-block-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /bookmyshow[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 15, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/in\.bookmyshow\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/in\.bookmyshow\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/in\.bookmyshow\.com\/careers\/job-listing/i)
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare 403 blocked pages/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'BookMyShow'), false)
})

test('BookMyShow backlog row matches directly from the local provider metadata without alias churn', async () => {
  const { BOOK_MY_SHOW_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'BookMyShow\n',
    catalog: [buildCatalogReadyProvider(BOOK_MY_SHOW_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['BookMyShow', 'bookmyshow', 'BookMyShow']],
  )
})
