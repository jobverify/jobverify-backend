import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/schoolnetindia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/schoolnetindia/catalog.js')
  } catch {
    assert.fail('Expected Schoolnet India catalog module at ../../scraper/schoolnetindia/catalog.js')
  }
}

test('Schoolnet India local catalog captures the verified first-party careers and recruitment surfaces', async () => {
  const {
    SCHOOLNET_INDIA_CATALOG,
    VERIFIED_SURFACE_SUMMARY,
    default: defaultCatalog,
  } = await loadCatalogModule()

  assert.equal(defaultCatalog, SCHOOLNET_INDIA_CATALOG)
  assert.equal(SCHOOLNET_INDIA_CATALOG.source, 'schoolnetindia')
  assert.equal(SCHOOLNET_INDIA_CATALOG.companyName, 'Schoolnet India')
  assert.equal(SCHOOLNET_INDIA_CATALOG.officialBrandName, 'Schoolnet India Ltd.')
  assert.equal(SCHOOLNET_INDIA_CATALOG.adapter, 'script')
  assert.equal(SCHOOLNET_INDIA_CATALOG.modulePath, modulePath)
  assert.equal(SCHOOLNET_INDIA_CATALOG.dryRunFile, 'schoolnetindia/jobs.json')
  assert.equal(SCHOOLNET_INDIA_CATALOG.homepageUrl, 'https://www.schoolnetindia.com/')
  assert.equal(SCHOOLNET_INDIA_CATALOG.companyCareerPage, 'https://www.schoolnetindia.com/careers/')
  assert.equal(SCHOOLNET_INDIA_CATALOG.recruitmentPortalUrl, 'https://hms.schoolnetindia.com/login')
  assert.equal(SCHOOLNET_INDIA_CATALOG.companyDomain, 'schoolnetindia.com')
  assert.equal(SCHOOLNET_INDIA_CATALOG.atsPlatform, 'official-company-site-public-careers-page')
  assert.equal(SCHOOLNET_INDIA_CATALOG.countryFilter, 'India')
  assert.equal(
    SCHOOLNET_INDIA_CATALOG.paginationStrategy,
    'single-official-careers-page-no-pagination-plus-official-recruitment-portal-verification',
  )
  assert.equal(
    SCHOOLNET_INDIA_CATALOG.extractionStrategy,
    'verified-official-careers-page+verified-official-recruitment-portal+role-card-text-extraction',
  )
  assert.equal(SCHOOLNET_INDIA_CATALOG.parser, 'custom-script')
  assert.equal(SCHOOLNET_INDIA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(SCHOOLNET_INDIA_CATALOG.verifiedSampleRoleTitle, 'Senior Full Stack Developer')
  assert.equal(
    SCHOOLNET_INDIA_CATALOG.verifiedRecruitmentPortalRoleTitle,
    'Computer Training Facilitator (ICT Educator)',
  )
  assert.equal(SCHOOLNET_INDIA_CATALOG.verifiedOn, '2026-07-17')
  assert.equal(SCHOOLNET_INDIA_CATALOG.verifiedSurfaceSummary, VERIFIED_SURFACE_SUMMARY)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Friday, July 17, 2026/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.schoolnetindia\.com\/careers\//i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /https:\/\/hms\.schoolnetindia\.com\/login/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Senior Full Stack Developer/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /Computer Training Facilitator \(ICT Educator\)/i)
})

test('Schoolnet India backlog row matches directly from local provider metadata without alias churn', async () => {
  const { SCHOOLNET_INDIA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Schoolnet India\n',
    catalog: [{ ...SCHOOLNET_INDIA_CATALOG, modulePath }],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Schoolnet India', 'schoolnetindia', 'Schoolnet India']],
  )
})
