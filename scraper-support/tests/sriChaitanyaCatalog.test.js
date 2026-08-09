import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/srichaitanya/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/srichaitanya/catalog.js')
  } catch {
    assert.fail('Expected Sri Chaitanya catalog module at ../../scraper/srichaitanya/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/srichaitanya/script.js')
  } catch {
    assert.fail('Expected Sri Chaitanya scraper module at ../../scraper/srichaitanya/script.js')
  }
}

const buildCatalogReadyProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Sri Chaitanya local catalog captures the verified first-party careers page and detail pages', async () => {
  const { SRI_CHAITANYA_CATALOG } = await loadCatalogModule()
  const sriChaitanya = await loadScriptModule()
  const provider = buildCatalogReadyProvider(SRI_CHAITANYA_CATALOG)

  assert.equal(provider.source, 'srichaitanya')
  assert.equal(provider.companyName, 'Sri Chaitanya')
  assert.equal(provider.officialBrandName, 'Sri Chaitanya')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://srichaitanya.net/')
  assert.equal(provider.companyCareerPage, 'https://srichaitanya.net/careers/')
  assert.deepEqual(provider.detailPageUrls, [
    'https://srichaitanya.net/career/sr-faculty-for-neet/',
    'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
  ])
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'single-first-party-careers-page-with-first-party-detail-pages',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+same-domain-detail-pages+inline-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'srichaitanya.net')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/srichaitanya\.net\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/srichaitanya\.net\/career\/sr-faculty-for-neet\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/srichaitanya\.net\/career\/sr-faculty-for-iitjee\//i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /srichaitanya[\\/]jobs\.json$/i)

  assert.equal(sriChaitanya.PROVIDER_METADATA.source, provider.source)
  assert.equal(sriChaitanya.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(sriChaitanya.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Sri Chaitanya exact backlog row resolves from the local provider contract without alias churn', async () => {
  const { SRI_CHAITANYA_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Sri Chaitanya\n',
    catalog: [buildCatalogReadyProvider(SRI_CHAITANYA_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sri Chaitanya', 'srichaitanya', 'Sri Chaitanya']],
  )
})
