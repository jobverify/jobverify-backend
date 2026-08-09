import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/dunzo/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/dunzo/catalog.js')
  } catch {
    assert.fail('Expected Dunzo catalog module at ../../scraper/dunzo/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/dunzo/script.js')
  } catch {
    assert.fail('Expected Dunzo scraper module at ../../scraper/dunzo/script.js')
  }
}

test('Dunzo catalog captures the verified loopback first-party host contract and empty Workable surface', async () => {
  const { DUNZO_CATALOG } = await loadCatalogModule()
  const dunzo = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(DUNZO_CATALOG)

  assert.equal(provider.source, 'dunzo')
  assert.equal(provider.companyName, 'Dunzo')
  assert.equal(provider.officialBrandName, 'dunzo')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://dunzo.com/')
  assert.equal(provider.companyCareerPage, 'https://apply.workable.com/dunzo/')
  assert.deepEqual(provider.officialHostnames, [
    'dunzo.com',
    'www.dunzo.com',
  ])
  assert.deepEqual(provider.verifiedFirstPartyUrls, [
    'https://dunzo.com/',
    'https://www.dunzo.com/',
    'https://dunzo.com/career',
    'https://dunzo.com/careers',
    'https://dunzo.com/jobs',
  ])
  assert.equal(provider.workableBoardUrl, 'https://apply.workable.com/dunzo/')
  assert.equal(provider.jobsFeedUrl, 'https://apply.workable.com/dunzo/jobs.md')
  assert.equal(provider.widgetApiUrl, 'https://apply.workable.com/api/v1/widget/accounts/dunzo')
  assert.equal(provider.companyDomain, 'dunzo.com')
  assert.equal(provider.atsPlatform, 'workable')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'workable-markdown-feed')
  assert.equal(
    provider.extractionStrategy,
    'verified-loopback-first-party-domain+verified-workable-board+verified-workable-jobs-feed+verified-workable-widget-api',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/dunzo\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.dunzo\.com\//i)
  assert.match(provider.verifiedSurfaceSummary, /127\.0\.0\.1/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/apply\.workable\.com\/dunzo\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/apply\.workable\.com\/dunzo\/jobs\.md/i)
  assert.match(
    provider.verifiedSurfaceSummary,
    /https:\/\/apply\.workable\.com\/api\/v1\/widget\/accounts\/dunzo/i,
  )
  assert.match(provider.verifiedSurfaceSummary, /0 current openings/i)
  assert.match(provider.dryRunFile, /dunzo[\\/]jobs\.json$/i)

  assert.equal(dunzo.PROVIDER_METADATA.source, provider.source)
  assert.equal(dunzo.PROVIDER_METADATA.companyName, provider.companyName)
  assert.equal(dunzo.PROVIDER_METADATA.companyCareerPage, provider.companyCareerPage)
})

test('Dunzo exact backlog name matches directly from the local provider contract', async () => {
  const { DUNZO_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Dunzo\n',
    catalog: [hydrateProviderCatalogEntry(DUNZO_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dunzo', 'dunzo', 'Dunzo']],
  )
})
