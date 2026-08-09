import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const loadAculifeCatalog = async () => {
  try {
    return await import('../../scraper/aculife/catalog.js')
  } catch {
    assert.fail('Expected Aculife catalog module at ../../scraper/aculife/catalog.js')
  }
}

test('Aculife provider metadata captures the verified first-party no-public-jobs surface without aliases', async () => {
  const { ACULIFE_PROVIDER } = await loadAculifeCatalog()
  const provider = hydrateProviderCatalogEntry(ACULIFE_PROVIDER)

  assert.equal(provider.source, 'aculife')
  assert.equal(provider.companyName, 'Aculife')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.aculife.co.in/resource/career.aspx')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-career-form-plus-missing-public-jobs-routes')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-first-party-career-form-without-public-job-listings+verified-missing-public-jobs-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'aculife.co.in')
  assert.match(provider.modulePath, /aculife[\\/]script\.js$/i)
  assert.match(provider.verifiedSurfaceSummary, /July 14, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.aculife\.co\.in\/resource\/career\.aspx/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Aculife'), false)
})

test('Aculife backlog row matches directly from provider metadata without alias churn', async () => {
  const { ACULIFE_PROVIDER } = await loadAculifeCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'Aculife\n',
    catalog: [hydrateProviderCatalogEntry(ACULIFE_PROVIDER)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aculife', 'aculife', 'Aculife']],
  )
})

test('buildScrapers and company coverage resolve Aculife from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'aculife')
  const scraper = buildScrapers().find((item) => item.name === 'aculife')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Aculife')
  assert.equal(provider.companyCareerPage, 'https://www.aculife.co.in/resource/career.aspx')
  assert.match(scraper.dryRunFile, /aculife[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Aculife\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aculife', 'aculife', 'Aculife']],
  )
})
