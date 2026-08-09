import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/shopclues/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/shopclues/catalog.js')
  } catch {
    assert.fail('Expected ShopClues catalog module at ../../scraper/shopclues/catalog.js')
  }
}

test('ShopClues local catalog captures the verified first-party careers landing and current openings page', async () => {
  const {
    SHOPCLUES_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
    default: defaultCatalog,
  } = await loadCatalogModule()

  assert.equal(defaultCatalog, SHOPCLUES_CATALOG)
  assert.equal(SHOPCLUES_CATALOG.source, 'shopclues')
  assert.equal(SHOPCLUES_CATALOG.companyName, 'ShopClues')
  assert.equal(SHOPCLUES_CATALOG.officialBrandName, 'ShopClues')
  assert.equal(SHOPCLUES_CATALOG.adapter, 'script')
  assert.equal(SHOPCLUES_CATALOG.modulePath, modulePath)
  assert.equal(SHOPCLUES_CATALOG.dryRunFile, 'shopclues/jobs.json')
  assert.equal(SHOPCLUES_CATALOG.homepageUrl, 'https://www.shopclues.com/')
  assert.equal(SHOPCLUES_CATALOG.companyCareerPage, 'https://www.shopclues.com/career.html')
  assert.equal(SHOPCLUES_CATALOG.currentOpeningsUrl, 'https://www.shopclues.com/current-opening.html')
  assert.equal(SHOPCLUES_CATALOG.companyDomain, 'shopclues.com')
  assert.equal(SHOPCLUES_CATALOG.atsPlatform, 'official-company-site-static-current-openings-page')
  assert.equal(SHOPCLUES_CATALOG.countryFilter, 'India')
  assert.equal(SHOPCLUES_CATALOG.paginationStrategy, 'single-official-current-openings-page-no-pagination')
  assert.equal(
    SHOPCLUES_CATALOG.extractionStrategy,
    'verified-careers-landing+verified-current-openings-page+static-position-block-parsing',
  )
  assert.equal(SHOPCLUES_CATALOG.parser, 'custom-script')
  assert.equal(SHOPCLUES_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(SHOPCLUES_CATALOG.verifiedSampleRoleTitle, 'Software Engineer (PHP, MYSQL)')
  assert.equal(SHOPCLUES_CATALOG.verifiedSampleDepartment, 'Technology')
  assert.equal(SHOPCLUES_CATALOG.verifiedOn, '2026-07-17')
  assert.equal(SHOPCLUES_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Friday, July 17, 2026/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.shopclues\.com\/career\.html/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.shopclues\.com\/current-opening\.html/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Software Engineer \(PHP, MYSQL\)/i)
})

test('ShopClues backlog row matches directly from local provider metadata without alias churn', async () => {
  const { SHOPCLUES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'ShopClues\n',
    catalog: [{ ...SHOPCLUES_CATALOG, modulePath }],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ShopClues', 'shopclues', 'ShopClues']],
  )
})
