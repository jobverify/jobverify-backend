import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const akulakuModulePath = path.resolve(currentDir, '../akulaku/script.js')

const loadAkulakuCatalog = async () => {
  try {
    return await import('../akulaku/catalog.js')
  } catch {
    assert.fail('Expected Akulaku catalog module at ../akulaku/catalog.js')
  }
}

const loadAkulakuModule = async () => {
  try {
    return await import('../akulaku/script.js')
  } catch {
    assert.fail('Expected Akulaku scraper module at ../akulaku/script.js')
  }
}

test('Akulaku local catalog captures the verified first-party careers shell and linked official jobs board', async () => {
  const { AKULAKU_CATALOG } = await loadAkulakuCatalog()
  const akulaku = await loadAkulakuModule()

  assert.equal(AKULAKU_CATALOG.source, 'akulaku')
  assert.equal(AKULAKU_CATALOG.companyName, 'Akulaku')
  assert.equal(AKULAKU_CATALOG.officialBrandName, 'Akulaku')
  assert.equal(AKULAKU_CATALOG.adapter, 'script')
  assert.equal(AKULAKU_CATALOG.companyCareerPage, 'https://www.akulaku.com/staff-life')
  assert.equal(AKULAKU_CATALOG.firstPartyCareersUrl, 'https://www.akulaku.com/staff-life')
  assert.equal(AKULAKU_CATALOG.officialJobsBoardUrl, 'https://akulaku.zhiye.com/')
  assert.equal(AKULAKU_CATALOG.jobListingsUrl, 'https://akulaku.zhiye.com/alljob/?o=1')
  assert.equal(AKULAKU_CATALOG.companyDomain, 'akulaku.com')
  assert.equal(AKULAKU_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(AKULAKU_CATALOG.countryFilter, 'India')
  assert.equal(
    AKULAKU_CATALOG.paginationStrategy,
    'first-party-careers-shell-plus-linked-zhiye-next-link-pagination',
  )
  assert.equal(
    AKULAKU_CATALOG.extractionStrategy,
    'first-party-shell-link-verification+zhiye-list-parse+india-location-filter+detail-fetch-for-india-matches',
  )
  assert.equal(AKULAKU_CATALOG.parser, 'custom-script')
  assert.equal(AKULAKU_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(AKULAKU_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(AKULAKU_CATALOG.dryRunFile, 'akulaku/jobs.json')
  assert.match(AKULAKU_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.akulaku\.com\/staff-life/i)
  assert.match(AKULAKU_CATALOG.verifiedSurfaceSummary, /https:\/\/akulaku\.zhiye\.com\//i)
  assert.match(AKULAKU_CATALOG.verifiedSurfaceSummary, /https:\/\/akulaku\.zhiye\.com\/alljob\/\?o=1/i)
  assert.match(AKULAKU_CATALOG.verifiedSurfaceSummary, /no India roles/i)
  assert.equal(AKULAKU_CATALOG.modulePath, akulakuModulePath)

  assert.equal(akulaku.PROVIDER_METADATA.source, AKULAKU_CATALOG.source)
  assert.equal(akulaku.PROVIDER_METADATA.companyName, AKULAKU_CATALOG.companyName)
  assert.equal(
    akulaku.PROVIDER_METADATA.officialJobsBoardUrl,
    AKULAKU_CATALOG.officialJobsBoardUrl,
  )
  assert.equal(
    akulaku.PROVIDER_METADATA.jobListingsUrl,
    AKULAKU_CATALOG.jobListingsUrl,
  )
})

test('Akulaku backlog row hydrates locally without requiring a shared alias entry', async () => {
  const { AKULAKU_CATALOG } = await loadAkulakuCatalog()
  const provider = hydrateProviderCatalogEntry(AKULAKU_CATALOG)

  assert.equal(provider.companyName, 'Akulaku')
  assert.equal(provider.companyDomain, 'akulaku.com')
  assert.match(provider.modulePath, /akulaku[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /akulaku[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Akulaku'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Akulaku\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Akulaku', 'akulaku', 'Akulaku']],
  )
})

test('buildScrapers and company coverage resolve Akulaku from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'akulaku')
  const scraper = buildScrapers().find((item) => item.name === 'akulaku')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Akulaku')
  assert.equal(provider.companyCareerPage, 'https://www.akulaku.com/staff-life')
  assert.match(scraper.dryRunFile, /akulaku[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Akulaku\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Akulaku', 'akulaku', 'Akulaku']],
  )
})
