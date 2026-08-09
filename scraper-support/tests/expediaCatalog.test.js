import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const expediaModulePath = path.resolve(currentDir, '../../scraper/expedia/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/expedia/catalog.js')
  } catch {
    assert.fail('Expected Expedia catalog module at ../../scraper/expedia/catalog.js')
  }
}

const loadExpediaModule = async () => {
  try {
    return await import('../../scraper/expedia/script.js')
  } catch {
    assert.fail('Expected Expedia scraper module at ../../scraper/expedia/script.js')
  }
}

test('Expedia local catalog captures the verified first-party careers homepage, jobs pagination, and Workday apply handoff surface', async () => {
  const { EXPEDIA_CATALOG } = await loadCatalogModule()
  const expedia = await loadExpediaModule()

  assert.equal(EXPEDIA_CATALOG.source, 'expedia')
  assert.equal(EXPEDIA_CATALOG.companyName, 'Expedia')
  assert.equal(EXPEDIA_CATALOG.officialBrandName, 'Expedia Group')
  assert.equal(EXPEDIA_CATALOG.adapter, 'script')
  assert.equal(EXPEDIA_CATALOG.homepageUrl, 'https://careers.expediagroup.com/')
  assert.equal(EXPEDIA_CATALOG.companyCareerPage, 'https://careers.expediagroup.com/')
  assert.equal(EXPEDIA_CATALOG.jobsPageUrl, 'https://careers.expediagroup.com/jobs/')
  assert.equal(
    EXPEDIA_CATALOG.verifiedNextPageUrl,
    'https://careers.expediagroup.com/jobs/?&mypage=1',
  )
  assert.equal(
    EXPEDIA_CATALOG.sampleIndiaJobDetailUrl,
    'https://careers.expediagroup.com/job/machine-learning-engineer-ii/gurgaon-hary-na/R-108134/',
  )
  assert.equal(
    EXPEDIA_CATALOG.sampleIndiaApplyUrl,
    'https://expedia.wd108.myworkdayjobs.com/search/job/India---Gurgaon/Machine-Learning-Engineer-II_R-108134/apply?',
  )
  assert.equal(EXPEDIA_CATALOG.companyDomain, 'expediagroup.com')
  assert.equal(EXPEDIA_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(EXPEDIA_CATALOG.countryFilter, 'India')
  assert.equal(
    EXPEDIA_CATALOG.paginationStrategy,
    'verified-first-party-jobs-page-plus-rel-next-pagination',
  )
  assert.equal(
    EXPEDIA_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+verified-first-party-jobs-pages+india-card-filter+first-party-detail-pages+workday-apply-handoff',
  )
  assert.equal(EXPEDIA_CATALOG.parser, 'custom-script')
  assert.equal(EXPEDIA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(EXPEDIA_CATALOG.verifiedOn, '2026-08-02')
  assert.equal(EXPEDIA_CATALOG.dryRunFile, 'expedia/jobs.json')
  assert.equal(EXPEDIA_CATALOG.modulePath, expediaModulePath)
  assert.match(EXPEDIA_CATALOG.verifiedSurfaceSummary, /https:\/\/careers\.expediagroup\.com\/jobs\//i)
  assert.match(EXPEDIA_CATALOG.verifiedSurfaceSummary, /mypage=1/i)
  assert.match(EXPEDIA_CATALOG.verifiedSurfaceSummary, /India - Haryana - Gurgaon/i)
  assert.match(EXPEDIA_CATALOG.verifiedSurfaceSummary, /R-108134/i)
  assert.match(
    EXPEDIA_CATALOG.verifiedSurfaceSummary,
    /https:\/\/expedia\.wd108\.myworkdayjobs\.com/i,
  )

  assert.equal(expedia.PROVIDER_METADATA.source, EXPEDIA_CATALOG.source)
  assert.equal(expedia.PROVIDER_METADATA.companyName, EXPEDIA_CATALOG.companyName)
  assert.equal(expedia.PROVIDER_METADATA.jobsPageUrl, EXPEDIA_CATALOG.jobsPageUrl)
  assert.equal(
    expedia.PROVIDER_METADATA.sampleIndiaJobDetailUrl,
    EXPEDIA_CATALOG.sampleIndiaJobDetailUrl,
  )
})

test('Expedia exact backlog row resolves directly from local provider metadata without aliases', async () => {
  const { EXPEDIA_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Expedia\n',
    catalog: [EXPEDIA_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Expedia', 'expedia', 'Expedia']],
  )
})
