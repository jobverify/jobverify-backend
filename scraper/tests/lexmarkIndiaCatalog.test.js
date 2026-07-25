import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../lexmarkindia/catalog.js')
  } catch {
    assert.fail('Expected Lexmark India catalog module at ../lexmarkindia/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../lexmarkindia/script.js')
  } catch {
    assert.fail('Expected Lexmark India scraper module at ../lexmarkindia/script.js')
  }
}

test('Lexmark India local catalog captures the verified first-party careers pages and job detail archive', async () => {
  const { LEXMARK_INDIA_CATALOG } = await loadCatalogModule()
  const lexmarkIndia = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(LEXMARK_INDIA_CATALOG)

  assert.equal(provider.source, 'lexmarkindia')
  assert.equal(provider.companyName, 'Lexmark India')
  assert.equal(provider.officialBrandName, 'Lexmark India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://origin-www.lexmark.com/en_in/careers.html')
  assert.equal(provider.jobSearchUrl, 'https://origin-www.lexmark.com/en_in/careers/job-search.html')
  assert.equal(
    provider.verifiedSampleJobUrl,
    'https://origin-www.lexmark.com/en_in/careers/job-description.143497.html',
  )
  assert.equal(provider.verifiedSampleJobTitle, 'Azure Data Integration Developer')
  assert.equal(provider.companyDomain, 'lexmark.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.verifiedPublicJobCount, 15)
  assert.equal(
    provider.paginationStrategy,
    'first-party-careers-landing-page-plus-job-search-table-and-linked-job-detail-pages',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+job-search-table+linked-job-detail-pages+people-soft-apply-links',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/origin-www\.lexmark\.com\/en_in\/careers\.html/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/origin-www\.lexmark\.com\/en_in\/careers\/job-search\.html/i)
  assert.match(provider.verifiedSurfaceSummary, /15 public jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Azure Data Integration Developer/i)
  assert.match(provider.modulePath, /lexmarkindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /lexmarkindia[\\/]jobs\.json$/i)

  assert.equal(lexmarkIndia.PROVIDER_METADATA.source, provider.source)
  assert.equal(lexmarkIndia.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(lexmarkIndia.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
  assert.equal(lexmarkIndia.PROVIDER_METADATA.jobSearchUrl, provider.jobSearchUrl)
})

test('Lexmark India exact backlog row matches from the local provider contract without aliases', async () => {
  const { LEXMARK_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Lexmark India\n',
    catalog: [hydrateProviderCatalogEntry(LEXMARK_INDIA_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lexmark India', 'lexmarkindia', 'Lexmark India']],
  )
})
