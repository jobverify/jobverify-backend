import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadAmicableAiCatalog = async () => {
  try {
    return await import('../amicableai/catalog.js')
  } catch {
    assert.fail('Expected Amicable AI catalog module at ../amicableai/catalog.js')
  }
}

test('Amicable AI catalog captures the verified first-party no-public-careers surface and non-India Screenloop board metadata', async () => {
  const {
    AMICABLE_AI_CATALOG,
    default: defaultCatalog,
  } = await loadAmicableAiCatalog()

  assert.equal(defaultCatalog, AMICABLE_AI_CATALOG)
  assert.equal(AMICABLE_AI_CATALOG.source, 'amicableai')
  assert.equal(AMICABLE_AI_CATALOG.companyName, 'Amicable AI')
  assert.equal(AMICABLE_AI_CATALOG.officialBrandName, 'amicable')
  assert.equal(AMICABLE_AI_CATALOG.adapter, 'script')
  assert.equal(AMICABLE_AI_CATALOG.companyCareerPage, 'https://amicable.io/careers')
  assert.equal(AMICABLE_AI_CATALOG.companyDomain, 'amicable.io')
  assert.equal(AMICABLE_AI_CATALOG.officialHomepageUrl, 'https://amicable.io/')
  assert.equal(
    AMICABLE_AI_CATALOG.officialScreenloopBoardUrl,
    'https://app.screenloop.com/careers/amicable',
  )
  assert.equal(AMICABLE_AI_CATALOG.officialSpeculativeApplyEmail, 'jobs@amicable.co.uk')
  assert.equal(AMICABLE_AI_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(AMICABLE_AI_CATALOG.countryFilter, 'India')
  assert.equal(
    AMICABLE_AI_CATALOG.paginationStrategy,
    'verified-homepage-plus-careers-no-openings-message-plus-non-india-screenloop-board',
  )
  assert.equal(
    AMICABLE_AI_CATALOG.extractionStrategy,
    'verified-homepage-careers-link+verified-careers-no-openings-message+verified-non-india-screenloop-board-return-empty',
  )
  assert.equal(AMICABLE_AI_CATALOG.parser, 'custom-script')
  assert.equal(AMICABLE_AI_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(AMICABLE_AI_CATALOG.verifiedOn, '2026-07-28')
  assert.match(AMICABLE_AI_CATALOG.verifiedSurfaceSummary, /https:\/\/amicable\.io\//i)
  assert.match(AMICABLE_AI_CATALOG.verifiedSurfaceSummary, /https:\/\/amicable\.io\/careers/i)
  assert.match(
    AMICABLE_AI_CATALOG.verifiedSurfaceSummary,
    /https:\/\/app\.screenloop\.com\/careers\/amicable/i,
  )
  assert.match(AMICABLE_AI_CATALOG.verifiedSurfaceSummary, /jobs@amicable\.co\.uk/i)
  assert.match(AMICABLE_AI_CATALOG.verifiedSurfaceSummary, /no trustworthy india jobs surface/i)
  assert.match(AMICABLE_AI_CATALOG.verifiedSurfaceSummary, /non-india roles such as remote or london/i)
  assert.match(AMICABLE_AI_CATALOG.modulePath, /amicableai[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Amicable AI'), false)
})

test('Amicable AI backlog matching works directly from the local catalog metadata', async () => {
  const { AMICABLE_AI_CATALOG } = await loadAmicableAiCatalog()

  const report = generateCompanyCoverageReport({
    csvText: 'Amicable AI\n',
    catalog: [AMICABLE_AI_CATALOG],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Amicable AI', 'amicableai', 'Amicable AI']],
  )
})

test('buildScrapers and company coverage resolve Amicable AI from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'amicableai')
  const scraper = buildScrapers().find((item) => item.name === 'amicableai')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Amicable AI')
  assert.equal(provider.companyCareerPage, 'https://amicable.io/careers')
  assert.match(scraper.dryRunFile, /amicableai[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Amicable AI\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Amicable AI', 'amicableai', 'Amicable AI']],
  )
})
