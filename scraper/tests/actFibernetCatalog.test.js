import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
  hydrateProviderCatalogEntry,
} from '../providers/index.js'

const loadProviderModule = async () => {
  try {
    return await import('../actfibernet/provider.js')
  } catch {
    assert.fail('Expected Act Fibernet provider module at ../actfibernet/provider.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../actfibernet/script.js')
  } catch {
    assert.fail('Expected Act Fibernet scraper module at ../actfibernet/script.js')
  }
}

const aliasMap = {
  'ACT Fibernet': 'actfibernet',
}

test('Act Fibernet exports local provider metadata for the verified ACT careers page and public Fountain board', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.deepEqual(providerModule.provider, {
    source: 'actfibernet',
    companyName: 'Act Fibernet',
    officialBrandName: 'ACT Fibernet',
    adapter: 'script',
    modulePath: '../actfibernet/script.js',
    companyCareerPage: 'https://www.actcorp.in/careers',
    fountainBoardUrl: 'https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5',
    atsPlatform: 'fountain',
    countryFilter: 'India',
    paginationStrategy: 'validate-official-careers-page-then-browser-load-public-fountain-board',
    extractionStrategy: 'official-careers-link-verification-plus-rendered-fountain-india-card-extraction',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'actcorp.in',
    verifiedOn: '2026-07-14',
    verifiedSurfaceSummary:
      'Verified https://www.actcorp.in/careers and https://careers.ap-1.fountain.com/act/84eee9cf-de39-4f45-9e65-02c4c9154dd5 on July 14, 2026. The official ACT Fibernet careers page exposes a first-party "EXPLORE JOB OPENINGS" handoff to the public Fountain board, and the rendered board currently shows public Hyderabad, India openings with a See more control.',
    dryRunFile: 'actfibernet/jobs.json',
  })

  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.OFFICIAL_BRAND_NAME, providerModule.provider.officialBrandName)
  assert.equal(scriptModule.CAREERS_PAGE_URL, providerModule.provider.companyCareerPage)
  assert.equal(scriptModule.FOUNTAIN_BOARD_URL, providerModule.provider.fountainBoardUrl)
})

test('Act Fibernet local provider contract hydrates into coverage with the expected alias snippet', async () => {
  const providerModule = await loadProviderModule()
  const hydratedProvider = hydrateProviderCatalogEntry(providerModule.provider)

  assert.equal(hydratedProvider.companyName, 'Act Fibernet')
  assert.equal(hydratedProvider.companyDomain, 'actcorp.in')
  assert.match(hydratedProvider.modulePath, /actfibernet[\\/]script\.js$/i)
  assert.match(hydratedProvider.dryRunFile, /actfibernet[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Act Fibernet\nACT Fibernet\n',
    catalog: [hydratedProvider],
    aliasMap,
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Act Fibernet', 'actfibernet', 'Act Fibernet'],
      ['ACT Fibernet', 'actfibernet', 'Act Fibernet'],
    ],
  )
})

test('buildScrapers and company coverage resolve Act Fibernet from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'actfibernet')
  const scraper = buildScrapers().find((item) => item.name === 'actfibernet')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Act Fibernet')
  assert.equal(provider.companyCareerPage, 'https://www.actcorp.in/careers')
  assert.match(scraper.dryRunFile, /actfibernet[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Act Fibernet\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Act Fibernet', 'actfibernet', 'Act Fibernet']],
  )
})
