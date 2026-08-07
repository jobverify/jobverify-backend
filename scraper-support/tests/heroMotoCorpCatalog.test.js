import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/heromotocorp/catalog.js')
  } catch {
    assert.fail('Expected Hero MotoCorp catalog module at ../../scraper/heromotocorp/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/heromotocorp/script.js')
  } catch {
    assert.fail('Expected Hero MotoCorp scraper module at ../../scraper/heromotocorp/script.js')
  }
}

test('Hero MotoCorp local catalog captures the verified first-party jobs board contract', async () => {
  const { HERO_MOTO_CORP_CATALOG } = await loadCatalogModule()
  const heroMotoCorp = await loadScriptModule()

  assert.equal(HERO_MOTO_CORP_CATALOG.source, 'heromotocorp')
  assert.equal(HERO_MOTO_CORP_CATALOG.companyName, 'Hero MotoCorp')
  assert.equal(HERO_MOTO_CORP_CATALOG.adapter, 'script')
  assert.equal(
    HERO_MOTO_CORP_CATALOG.companyCareerPage,
    'https://www.heromotocorp.com/en-in/company/careers/career-overview.html',
  )
  assert.equal(HERO_MOTO_CORP_CATALOG.companyDomain, 'heromotocorp.com')
  assert.equal(HERO_MOTO_CORP_CATALOG.atsPlatform, 'successfactors')
  assert.equal(HERO_MOTO_CORP_CATALOG.countryFilter, 'India')
  assert.equal(HERO_MOTO_CORP_CATALOG.paginationStrategy, 'search-board-or-category-discovery+page-query')
  assert.equal(
    HERO_MOTO_CORP_CATALOG.extractionStrategy,
    'official-careers-page+jobs2web-search-board-or-categories+html-search-rows+detail-pages+talentcommunity-apply-handoff',
  )
  assert.equal(HERO_MOTO_CORP_CATALOG.parser, 'custom-script')
  assert.equal(HERO_MOTO_CORP_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(
    HERO_MOTO_CORP_CATALOG.officialCareersHandoffUrl,
    'https://jobs.heromotocorp.com/search/?createNewAlert=false&q=&optionsFacetsDD_department=&locationsearch=',
  )
  assert.equal(HERO_MOTO_CORP_CATALOG.verifiedOn, '2026-07-16')
  assert.equal(HERO_MOTO_CORP_CATALOG.dryRunFile, 'heromotocorp/jobs.json')
  assert.match(HERO_MOTO_CORP_CATALOG.verifiedSurfaceSummary, /career-overview/i)
  assert.match(HERO_MOTO_CORP_CATALOG.verifiedSurfaceSummary, /jobs\.heromotocorp\.com\/search/i)
  assert.match(HERO_MOTO_CORP_CATALOG.modulePath, /heromotocorp[\\/]script\.js$/i)

  assert.equal(heroMotoCorp.PROVIDER_METADATA.source, HERO_MOTO_CORP_CATALOG.source)
  assert.equal(heroMotoCorp.PROVIDER_METADATA.companyName, HERO_MOTO_CORP_CATALOG.companyName)
  assert.equal(
    heroMotoCorp.PROVIDER_METADATA.officialCareersHandoffUrl,
    HERO_MOTO_CORP_CATALOG.officialCareersHandoffUrl,
  )
})

test('Hero MotoCorp exact backlog row resolves directly from local provider metadata', async () => {
  const { HERO_MOTO_CORP_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Hero MotoCorp\n',
    catalog: [HERO_MOTO_CORP_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Hero MotoCorp', 'heromotocorp', 'Hero MotoCorp']],
  )
})

test('getScraperCatalog includes Hero MotoCorp as a verified first-party jobs-board provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'heromotocorp')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Hero MotoCorp')
  assert.equal(
    provider.companyCareerPage,
    'https://www.heromotocorp.com/en-in/company/careers/career-overview.html',
  )
  assert.equal(provider.companyDomain, 'heromotocorp.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.match(provider.modulePath, /heromotocorp[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Hero MotoCorp scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'heromotocorp')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'heromotocorp')
  assert.equal(scraper.provider.atsPlatform, 'successfactors')
  assert.match(scraper.dryRunFile, /heromotocorp[\\/]jobs\.json$/i)
})
