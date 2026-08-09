import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/ionic/catalog.js')
  } catch {
    assert.fail('Expected Ionic catalog module at ../../scraper/ionic/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/ionic/script.js')
  } catch {
    assert.fail('Expected Ionic scraper module at ../../scraper/ionic/script.js')
  }
}

test('Ionic local catalog captures the verified broken first-party Lever surface sentinel contract', async () => {
  const { IONIC_CATALOG } = await loadCatalogModule()
  const ionic = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(IONIC_CATALOG)

  assert.equal(IONIC_CATALOG.source, 'ionic')
  assert.equal(IONIC_CATALOG.companyName, 'Ionic')
  assert.equal(IONIC_CATALOG.officialBrandName, 'Ionic')
  assert.equal(IONIC_CATALOG.adapter, 'script')
  assert.equal(IONIC_CATALOG.homepageUrl, 'https://ionic.io/')
  assert.equal(IONIC_CATALOG.companyCareerPage, 'https://ionic.io/about/jobs')
  assert.equal(IONIC_CATALOG.companyDomain, 'ionic.io')
  assert.equal(IONIC_CATALOG.leverProxyUrl, 'https://ionic.io/api/lever')
  assert.equal(IONIC_CATALOG.leverBoardUrl, 'https://jobs.lever.co/Ionic')
  assert.equal(IONIC_CATALOG.atsPlatform, 'official-company-site-broken-lever-surface')
  assert.equal(IONIC_CATALOG.countryFilter, 'Global')
  assert.equal(
    IONIC_CATALOG.paginationStrategy,
    'verified-careers-page-plus-broken-first-party-lever-proxy-validation',
  )
  assert.equal(
    IONIC_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+broken-first-party-lever-proxy+404-lever-board-return-empty',
  )
  assert.equal(IONIC_CATALOG.parser, 'custom-script')
  assert.equal(IONIC_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(IONIC_CATALOG.modulePath, '../../scraper/ionic/script.js')
  assert.equal(IONIC_CATALOG.dryRunFile, 'ionic/jobs.json')
  assert.equal(IONIC_CATALOG.verifiedOn, '2026-07-16')
  assert.match(IONIC_CATALOG.verifiedSurfaceSummary, /ionic\.io\/about\/jobs/i)
  assert.match(IONIC_CATALOG.verifiedSurfaceSummary, /ionic\.io\/api\/lever/i)
  assert.match(IONIC_CATALOG.verifiedSurfaceSummary, /jobs\.lever\.co\/Ionic/i)
  assert.match(IONIC_CATALOG.verifiedSurfaceSummary, /Document not found/i)

  assert.equal(provider.source, 'ionic')
  assert.equal(provider.companyName, 'Ionic')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://ionic.io/about/jobs')
  assert.equal(provider.companyDomain, 'ionic.io')
  assert.match(provider.modulePath, /ionic[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /ionic[\\/]jobs\.json$/i)

  assert.equal(ionic.PROVIDER_METADATA.source, provider.source)
  assert.equal(ionic.CAREERS_URL, provider.companyCareerPage)
  assert.equal(ionic.HOMEPAGE_URL, provider.homepageUrl)
  assert.equal(ionic.LEVER_PROXY_URL, provider.leverProxyUrl)
  assert.equal(ionic.LEVER_BOARD_URL, provider.leverBoardUrl)
})

test('Ionic exact-name backlog rows resolve directly from local provider metadata without shared aliases', async () => {
  const { IONIC_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Ionic\n',
    catalog: [hydrateProviderCatalogEntry(IONIC_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Ionic', 'ionic', 'Ionic']],
  )
})

test('getScraperCatalog includes Ionic as a verified broken-Lever sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'ionic')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Ionic')
  assert.equal(provider.companyCareerPage, 'https://ionic.io/about/jobs')
  assert.equal(provider.companyDomain, 'ionic.io')
  assert.equal(provider.atsPlatform, 'official-company-site-broken-lever-surface')
  assert.match(provider.modulePath, /ionic[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Ionic scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'ionic')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'ionic')
  assert.equal(scraper.provider.atsPlatform, 'official-company-site-broken-lever-surface')
  assert.match(scraper.dryRunFile, /ionic[\\/]jobs\.json$/i)
})
