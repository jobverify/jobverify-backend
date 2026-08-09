import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const indiaMartModulePath = path.resolve(currentDir, '../../scraper/indiamart/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/indiamart/catalog.js')
  } catch {
    assert.fail('Expected IndiaMART catalog module at ../../scraper/indiamart/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/indiamart/script.js')
  } catch {
    assert.fail('Expected IndiaMART scraper module at ../../scraper/indiamart/script.js')
  }
}

test('IndiaMART local catalog captures the verified first-party careers microsite and Klimb board contract', async () => {
  const { INDIAMART_CATALOG } = await loadCatalogModule()
  const indiaMart = await loadScriptModule()

  assert.equal(INDIAMART_CATALOG.source, 'indiamart')
  assert.equal(INDIAMART_CATALOG.companyName, 'IndiaMART')
  assert.equal(INDIAMART_CATALOG.officialBrandName, 'IndiaMART InterMESH Ltd.')
  assert.equal(INDIAMART_CATALOG.adapter, 'script')
  assert.equal(INDIAMART_CATALOG.companyCareerPage, 'https://careers.indiamart.com/')
  assert.equal(INDIAMART_CATALOG.homepageUrl, 'https://careers.indiamart.com/')
  assert.equal(INDIAMART_CATALOG.leadershipJobsPageUrl, 'https://careers.indiamart.com/leadership-product-tech-corporate-roles.html')
  assert.equal(INDIAMART_CATALOG.jobsBoardUrl, 'https://joblist.klimb.io/indiamart')
  assert.equal(INDIAMART_CATALOG.klimbCustomerId, '5dd7966c6c4d197f68105048')
  assert.equal(INDIAMART_CATALOG.companyDomain, 'indiamart.com')
  assert.equal(INDIAMART_CATALOG.atsPlatform, 'klimb')
  assert.equal(INDIAMART_CATALOG.countryFilter, 'India')
  assert.equal(
    INDIAMART_CATALOG.paginationStrategy,
    'server-rendered-first-page+lastPosId-json-pagination',
  )
  assert.equal(
    INDIAMART_CATALOG.extractionStrategy,
    'verified-first-party-careers-microsite+verified-klimb-embed+public-board-html-and-json-pages',
  )
  assert.equal(INDIAMART_CATALOG.parser, 'custom-script')
  assert.equal(INDIAMART_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(INDIAMART_CATALOG.dryRunFile, 'indiamart/jobs.json')
  assert.equal(INDIAMART_CATALOG.verifiedOn, '2026-07-16')
  assert.match(INDIAMART_CATALOG.verifiedSurfaceSummary, /careers\.indiamart\.com/i)
  assert.match(INDIAMART_CATALOG.verifiedSurfaceSummary, /joblist\.klimb\.io\/indiamart/i)
  assert.match(INDIAMART_CATALOG.verifiedSurfaceSummary, /public klim[b]? board/i)
  assert.equal(INDIAMART_CATALOG.modulePath, indiaMartModulePath)

  assert.equal(indiaMart.PROVIDER_METADATA.source, INDIAMART_CATALOG.source)
  assert.equal(indiaMart.PROVIDER_METADATA.companyCareerPage, INDIAMART_CATALOG.companyCareerPage)
})

test('IndiaMART exact-name backlog rows resolve from local provider metadata without aliases', async () => {
  const { INDIAMART_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'IndiaMART\n',
    catalog: [INDIAMART_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['IndiaMART', 'indiamart', 'IndiaMART']],
  )
})

test('getScraperCatalog includes IndiaMART as a verified Klimb provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'indiamart')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'IndiaMART')
  assert.equal(provider.companyCareerPage, 'https://careers.indiamart.com/')
  assert.equal(provider.companyDomain, 'indiamart.com')
  assert.equal(provider.atsPlatform, 'klimb')
  assert.match(provider.modulePath, /indiamart[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable IndiaMART scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'indiamart')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'indiamart')
  assert.equal(scraper.provider.atsPlatform, 'klimb')
  assert.match(scraper.dryRunFile, /indiamart[\\/]jobs\.json$/i)
})
