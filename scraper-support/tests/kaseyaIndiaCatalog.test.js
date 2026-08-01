import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/kaseyaindia/catalog.js')
  } catch {
    assert.fail('Expected Kaseya India catalog module at ../../scraper/kaseyaindia/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/kaseyaindia/script.js')
  } catch {
    assert.fail('Expected Kaseya India scraper module at ../../scraper/kaseyaindia/script.js')
  }
}

test('Kaseya India local catalog captures the verified first-party careers page plus jobs sitemap contract', async () => {
  const { KASEYA_INDIA_CATALOG } = await loadCatalogModule()
  const kaseyaIndia = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(KASEYA_INDIA_CATALOG)

  assert.equal(KASEYA_INDIA_CATALOG.source, 'kaseyaindia')
  assert.equal(KASEYA_INDIA_CATALOG.companyName, 'Kaseya India')
  assert.equal(KASEYA_INDIA_CATALOG.officialBrandName, 'Kaseya')
  assert.equal(KASEYA_INDIA_CATALOG.adapter, 'script')
  assert.equal(KASEYA_INDIA_CATALOG.modulePath, '../../scraper/kaseyaindia/script.js')
  assert.equal(KASEYA_INDIA_CATALOG.dryRunFile, 'kaseyaindia/jobs.json')
  assert.equal(KASEYA_INDIA_CATALOG.homepageUrl, 'https://www.kaseya.com/careers/')
  assert.equal(KASEYA_INDIA_CATALOG.companyCareerPage, 'https://www.kaseya.com/careers/jobs/')
  assert.equal(KASEYA_INDIA_CATALOG.jobsSitemapUrl, 'https://www.kaseya.com/jobs-sitemap.xml')
  assert.equal(
    KASEYA_INDIA_CATALOG.verifiedSampleJobUrl,
    'https://www.kaseya.com/careers/jobs/id/6015830004/',
  )
  assert.equal(KASEYA_INDIA_CATALOG.companyDomain, 'kaseya.com')
  assert.equal(KASEYA_INDIA_CATALOG.atsPlatform, 'official-company-careers-sitemap')
  assert.equal(KASEYA_INDIA_CATALOG.countryFilter, 'India')
  assert.equal(
    KASEYA_INDIA_CATALOG.paginationStrategy,
    'verified-first-party-careers-page-plus-jobs-sitemap',
  )
  assert.equal(
    KASEYA_INDIA_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+jobs-sitemap+india-detail-pages',
  )
  assert.equal(KASEYA_INDIA_CATALOG.parser, 'custom-script')
  assert.equal(KASEYA_INDIA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(KASEYA_INDIA_CATALOG.verifiedOn, '2026-07-16')
  assert.match(KASEYA_INDIA_CATALOG.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(KASEYA_INDIA_CATALOG.verifiedSurfaceSummary, /kaseya\.com\/careers\/jobs/i)
  assert.match(KASEYA_INDIA_CATALOG.verifiedSurfaceSummary, /kaseya\.com\/jobs-sitemap\.xml/i)
  assert.match(KASEYA_INDIA_CATALOG.verifiedSurfaceSummary, /Pune, India/i)

  assert.equal(provider.source, 'kaseyaindia')
  assert.equal(provider.companyName, 'Kaseya India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.kaseya.com/careers/jobs/')
  assert.equal(provider.companyDomain, 'kaseya.com')
  assert.match(provider.modulePath, /kaseyaindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /kaseyaindia[\\/]jobs\.json$/i)

  assert.equal(kaseyaIndia.PROVIDER_METADATA.source, provider.source)
  assert.equal(kaseyaIndia.CAREERS_URL, provider.companyCareerPage)
  assert.equal(kaseyaIndia.JOBS_SITEMAP_URL, provider.jobsSitemapUrl)
})

test('Kaseya India exact-name backlog rows resolve directly from local metadata without a shared alias', async () => {
  const { KASEYA_INDIA_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Kaseya India\n',
    catalog: [hydrateProviderCatalogEntry(KASEYA_INDIA_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kaseya India', 'kaseyaindia', 'Kaseya India']],
  )
})
