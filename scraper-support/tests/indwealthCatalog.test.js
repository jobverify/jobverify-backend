import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const indwealthModulePath = path.resolve(currentDir, '../../scraper/indwealth/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/indwealth/catalog.js')
  } catch {
    assert.fail('Expected INDwealth catalog module at ../../scraper/indwealth/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/indwealth/script.js')
  } catch {
    assert.fail('Expected INDwealth scraper module at ../../scraper/indwealth/script.js')
  }
}

test('INDwealth local catalog captures the verified redirect to INDmoney and the official LinkedIn handoff', async () => {
  const { INDWEALTH_CATALOG } = await loadCatalogModule()
  const indwealth = await loadScriptModule()

  assert.equal(INDWEALTH_CATALOG.source, 'indwealth')
  assert.equal(INDWEALTH_CATALOG.companyName, 'INDwealth')
  assert.equal(INDWEALTH_CATALOG.officialBrandName, 'INDmoney')
  assert.equal(INDWEALTH_CATALOG.adapter, 'script')
  assert.equal(INDWEALTH_CATALOG.companyCareerPage, 'https://www.indmoney.com/about')
  assert.equal(INDWEALTH_CATALOG.officialRedirectSourceUrl, 'https://www.indwealth.in/')
  assert.equal(INDWEALTH_CATALOG.officialBrandHomepageUrl, 'https://www.indmoney.com/')
  assert.equal(INDWEALTH_CATALOG.officialAboutUrl, 'https://www.indmoney.com/about')
  assert.equal(INDWEALTH_CATALOG.linkedinCompanyJobsUrl, 'https://www.linkedin.com/company/indmoney/jobs/')
  assert.equal(INDWEALTH_CATALOG.linkedinCompanyPageUrl, 'https://in.linkedin.com/company/indmoney')
  assert.equal(INDWEALTH_CATALOG.publicLinkedInJobsUrl, 'https://in.linkedin.com/jobs/indmoney-jobs')
  assert.equal(INDWEALTH_CATALOG.atsPlatform, 'linkedin-guest-search')
  assert.equal(INDWEALTH_CATALOG.countryFilter, 'India')
  assert.equal(INDWEALTH_CATALOG.paginationStrategy, 'single-public-company-search-page')
  assert.equal(
    INDWEALTH_CATALOG.extractionStrategy,
    'official-brand-redirect+official-about-linkedin-handoff+public-linkedin-company-search+public-detail-jsonld',
  )
  assert.equal(INDWEALTH_CATALOG.parser, 'custom-script')
  assert.equal(INDWEALTH_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INDWEALTH_CATALOG.companyDomain, 'indmoney.com')
  assert.equal(INDWEALTH_CATALOG.verifiedOn, '2026-07-16')
  assert.match(INDWEALTH_CATALOG.dryRunFile, /indwealth[\\/]jobs\.json$/i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.indwealth\.in\//i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /redirects to https:\/\/www\.indmoney\.com\//i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.indmoney\.com\/about/i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.linkedin\.com\/company\/indmoney\/jobs\//i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /https:\/\/in\.linkedin\.com\/jobs\/indmoney-jobs/i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /Associate Product Manager/i)
  assert.match(INDWEALTH_CATALOG.verifiedSurfaceSummary, /Platform Engineer-SRE/i)
  assert.equal(INDWEALTH_CATALOG.modulePath, indwealthModulePath)

  assert.equal(indwealth.PROVIDER_METADATA.source, INDWEALTH_CATALOG.source)
  assert.equal(indwealth.PROVIDER_METADATA.companyName, INDWEALTH_CATALOG.companyName)
  assert.equal(
    indwealth.PROVIDER_METADATA.publicLinkedInJobsUrl,
    INDWEALTH_CATALOG.publicLinkedInJobsUrl,
  )
})

test('INDwealth backlog row matches directly from the local catalog without alias changes', async () => {
  const { INDWEALTH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'INDwealth\n',
    catalog: [INDWEALTH_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['INDwealth', 'indwealth', 'INDwealth']],
  )
})

test('getScraperCatalog includes INDwealth as a verified LinkedIn guest-search provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'indwealth')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'INDwealth')
  assert.equal(provider.companyCareerPage, 'https://www.indmoney.com/about')
  assert.equal(provider.companyDomain, 'indmoney.com')
  assert.equal(provider.atsPlatform, 'linkedin-guest-search')
  assert.match(provider.modulePath, /indwealth[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable INDwealth scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'indwealth')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'indwealth')
  assert.equal(scraper.provider.atsPlatform, 'linkedin-guest-search')
  assert.match(scraper.dryRunFile, /indwealth[\\/]jobs\.json$/i)
})
