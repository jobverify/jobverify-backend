import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const eazyDinerModulePath = path.resolve(currentDir, '../../scraper/eazydiner/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/eazydiner/catalog.js')
  } catch {
    assert.fail('Expected EazyDiner catalog module at ../../scraper/eazydiner/catalog.js')
  }
}

test('EazyDiner local catalog captures the verified first-party career mailto surface and no-public-jobs contract', async () => {
  const {
    EAZY_DINER_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
  } = await loadCatalogModule()

  assert.equal(EAZY_DINER_CATALOG.source, 'eazydiner')
  assert.equal(EAZY_DINER_CATALOG.companyName, 'EazyDiner')
  assert.equal(EAZY_DINER_CATALOG.officialBrandName, 'EazyDiner')
  assert.equal(EAZY_DINER_CATALOG.adapter, 'script')
  assert.equal(EAZY_DINER_CATALOG.modulePath, eazyDinerModulePath)
  assert.equal(EAZY_DINER_CATALOG.dryRunFile, 'eazydiner/jobs.json')
  assert.equal(EAZY_DINER_CATALOG.rootUrl, 'https://www.eazydiner.com/')
  assert.equal(EAZY_DINER_CATALOG.companyCareerPage, 'https://www.eazydiner.com/career')
  assert.equal(EAZY_DINER_CATALOG.companyDomain, 'eazydiner.com')
  assert.equal(EAZY_DINER_CATALOG.robotsTxtUrl, 'https://www.eazydiner.com/robots.txt')
  assert.equal(EAZY_DINER_CATALOG.sitemapUrl, 'https://www.eazydiner.com/sitemap.xml')
  assert.equal(EAZY_DINER_CATALOG.otherRoutesSitemapUrl, 'https://www.eazydiner.com/sitemap/others.xml')
  assert.equal(EAZY_DINER_CATALOG.verifiedResumeDropEmail, 'career@eazydiner.com')
  assert.equal(EAZY_DINER_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(EAZY_DINER_CATALOG.countryFilter, 'India')
  assert.equal(
    EAZY_DINER_CATALOG.paginationStrategy,
    'verified-homepage-plus-career-page-plus-robots-sitemap-plus-missing-job-routes',
  )
  assert.equal(
    EAZY_DINER_CATALOG.extractionStrategy,
    'verified-homepage-career-link+verified-resume-drop-career-page+verified-robots-sitemap-with-single-career-url+verified-missing-job-routes-return-empty',
  )
  assert.equal(EAZY_DINER_CATALOG.parser, 'custom-script')
  assert.equal(EAZY_DINER_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(EAZY_DINER_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(EAZY_DINER_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.eazydiner\.com\/career/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.eazydiner\.com\/robots\.txt/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.eazydiner\.com\/sitemap\.xml/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.eazydiner\.com\/sitemap\/others\.xml/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /career@eazydiner\.com/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
})

test('EazyDiner local catalog hydrates into coverage without needing an alias entry', async () => {
  const { EAZY_DINER_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EAZY_DINER_CATALOG)

  assert.equal(provider.companyName, 'EazyDiner')
  assert.equal(provider.companyDomain, 'eazydiner.com')
  assert.match(provider.modulePath, /eazydiner[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /eazydiner[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'EazyDiner\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['EazyDiner', 'eazydiner', 'EazyDiner']],
  )
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'EazyDiner'), false)
})
