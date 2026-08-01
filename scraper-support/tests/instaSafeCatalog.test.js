import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/instasafe/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/instasafe/catalog.js')
  } catch {
    assert.fail('Expected InstaSafe catalog module at ../../scraper/instasafe/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/instasafe/script.js')
  } catch {
    assert.fail('Expected InstaSafe scraper module at ../../scraper/instasafe/script.js')
  }
}

test('InstaSafe local catalog captures the verified first-party careers page and Zoho Recruit API surface', async () => {
  const { INSTASAFE_CATALOG } = await loadCatalogModule()
  const instasafe = await loadScraperModule()

  assert.equal(INSTASAFE_CATALOG.source, 'instasafe')
  assert.equal(INSTASAFE_CATALOG.companyName, 'InstaSafe')
  assert.equal(INSTASAFE_CATALOG.officialBrandName, 'Instasafe Technologies Pvt Ltd')
  assert.equal(INSTASAFE_CATALOG.adapter, 'script')
  assert.equal(INSTASAFE_CATALOG.companyCareerPage, 'https://instasafe.com/careers/')
  assert.equal(INSTASAFE_CATALOG.homepageUrl, 'https://instasafe.com/')
  assert.equal(INSTASAFE_CATALOG.careersPageUrl, 'https://instasafe.com/careers/')
  assert.equal(INSTASAFE_CATALOG.careersPortalUrl, 'https://instasafe.zohorecruit.com/jobs/Careers/')
  assert.equal(
    INSTASAFE_CATALOG.careersApiUrl,
    'https://instasafe.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(INSTASAFE_CATALOG.atsPlatform, 'zohorecruit')
  assert.equal(INSTASAFE_CATALOG.countryFilter, 'India')
  assert.equal(INSTASAFE_CATALOG.paginationStrategy, 'official-careers-page-embed-plus-public-zoho-api')
  assert.equal(
    INSTASAFE_CATALOG.extractionStrategy,
    'official-careers-page+embedded-zohorecruit-site+public-job-openings-api',
  )
  assert.equal(INSTASAFE_CATALOG.parser, 'custom-script')
  assert.equal(INSTASAFE_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INSTASAFE_CATALOG.companyDomain, 'instasafe.com')
  assert.equal(INSTASAFE_CATALOG.verifiedOn, '2026-07-16')
  assert.equal(INSTASAFE_CATALOG.verifiedPublicPostingCount, 14)
  assert.match(INSTASAFE_CATALOG.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(INSTASAFE_CATALOG.verifiedSurfaceSummary, /https:\/\/instasafe\.com\/careers\//i)
  assert.match(INSTASAFE_CATALOG.verifiedSurfaceSummary, /https:\/\/instasafe\.zohorecruit\.com\/jobs\/Careers\//i)
  assert.match(INSTASAFE_CATALOG.verifiedSurfaceSummary, /public Zoho Recruit portal/i)
  assert.equal(INSTASAFE_CATALOG.modulePath, modulePath)
  assert.match(INSTASAFE_CATALOG.dryRunFile, /instasafe[\\/]jobs\.json$/i)

  assert.equal(instasafe.PROVIDER_METADATA.source, INSTASAFE_CATALOG.source)
  assert.equal(instasafe.PROVIDER_METADATA.companyName, INSTASAFE_CATALOG.companyName)
  assert.equal(instasafe.PROVIDER_METADATA.companyCareerPage, INSTASAFE_CATALOG.companyCareerPage)
  assert.equal(instasafe.PROVIDER_METADATA.careersPortalUrl, INSTASAFE_CATALOG.careersPortalUrl)
  assert.equal(instasafe.PROVIDER_METADATA.careersApiUrl, INSTASAFE_CATALOG.careersApiUrl)
})

test('InstaSafe local catalog covers the exact backlog row without aliases', async () => {
  const { INSTASAFE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'InstaSafe\n',
    catalog: [INSTASAFE_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['InstaSafe', 'instasafe', 'InstaSafe']],
  )
})

test('getScraperCatalog includes InstaSafe as a verified Zoho Recruit provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'instasafe')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'InstaSafe')
  assert.equal(provider.companyCareerPage, 'https://instasafe.com/careers/')
  assert.equal(provider.companyDomain, 'instasafe.com')
  assert.equal(provider.atsPlatform, 'zohorecruit')
  assert.match(provider.modulePath, /instasafe[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable InstaSafe scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'instasafe')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'instasafe')
  assert.equal(scraper.provider.atsPlatform, 'zohorecruit')
  assert.match(scraper.dryRunFile, /instasafe[\\/]jobs\.json$/i)
})
