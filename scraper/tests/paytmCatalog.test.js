import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadPaytmCatalog = async () => {
  try {
    return await import('../paytm/catalog.js')
  } catch {
    assert.fail('Expected Paytm catalog module at ../paytm/catalog.js')
  }
}

test('Paytm catalog captures the verified first-party careers handoff and live India Lever state', async () => {
  const {
    PAYTM_CATALOG,
    default: defaultCatalog,
  } = await loadPaytmCatalog()

  assert.equal(defaultCatalog, PAYTM_CATALOG)
  assert.equal(PAYTM_CATALOG.source, 'paytm')
  assert.equal(PAYTM_CATALOG.companyName, 'Paytm')
  assert.equal(PAYTM_CATALOG.officialBrandName, 'Paytm')
  assert.equal(PAYTM_CATALOG.adapter, 'script')
  assert.equal(PAYTM_CATALOG.homepageUrl, 'https://paytm.com/')
  assert.equal(PAYTM_CATALOG.companyCareerPage, 'https://paytm.com/careers')
  assert.equal(PAYTM_CATALOG.companyDomain, 'paytm.com')
  assert.equal(PAYTM_CATALOG.officialLeverBoardUrl, 'https://jobs.lever.co/paytm')
  assert.equal(PAYTM_CATALOG.leverApiUrl, 'https://api.lever.co/v0/postings/paytm?mode=json')
  assert.equal(
    PAYTM_CATALOG.verifiedSampleJobUrl,
    'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
  )
  assert.equal(PAYTM_CATALOG.verifiedPublicJobCount, 238)
  assert.equal(PAYTM_CATALOG.verifiedIndiaJobCount, 230)
  assert.equal(PAYTM_CATALOG.atsPlatform, 'lever')
  assert.equal(PAYTM_CATALOG.countryFilter, 'India')
  assert.equal(PAYTM_CATALOG.paginationStrategy, 'official-careers-validation-plus-lever-api')
  assert.equal(
    PAYTM_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+verified-lever-board+lever-postings-api+india-country-filter',
  )
  assert.equal(PAYTM_CATALOG.parser, 'custom-script')
  assert.equal(PAYTM_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(PAYTM_CATALOG.verifiedOn, '2026-07-16')
  assert.equal(PAYTM_CATALOG.dryRunFile, 'paytm/jobs.json')
  assert.match(PAYTM_CATALOG.verifiedSurfaceSummary, /Thursday, July 16, 2026/i)
  assert.match(PAYTM_CATALOG.verifiedSurfaceSummary, /https:\/\/paytm\.com\/careers/i)
  assert.match(PAYTM_CATALOG.verifiedSurfaceSummary, /https:\/\/jobs\.lever\.co\/paytm/i)
  assert.match(PAYTM_CATALOG.verifiedSurfaceSummary, /238 public postings/i)
  assert.match(PAYTM_CATALOG.verifiedSurfaceSummary, /230 India postings/i)
  assert.match(PAYTM_CATALOG.modulePath, /paytm[\\/]script\.js$/i)
})

test('Paytm and One97 Communications backlog names resolve through one provider and the verified central alias map', async () => {
  const { PAYTM_CATALOG } = await loadPaytmCatalog()

  assert.equal(companyAliases['One97 Communications'], 'paytm')
  assert.equal(companyAliases['One97 Communications Limited'], 'paytm')
  assert.equal(companyAliases['One 97 Communications Ltd'], 'paytm')

  const report = generateCompanyCoverageReport({
    csvText: 'Paytm\nOne97 Communications\n',
    catalog: [PAYTM_CATALOG],
    aliasMap: companyAliases,
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Paytm', 'paytm', 'Paytm'],
      ['One97 Communications', 'paytm', 'Paytm'],
    ],
  )
})

test('getScraperCatalog and buildScrapers expose only the Paytm provider, not a duplicate One97 runner', () => {
  const paytm = getScraperCatalog().find((item) => item.source === 'paytm')
  const one97 = getScraperCatalog().find((item) => item.source === 'one97communications')
  const scraper = buildScrapers().find((item) => item.name === 'paytm')

  assert.ok(paytm)
  assert.equal(paytm.adapter, 'script')
  assert.equal(paytm.companyName, 'Paytm')
  assert.equal(paytm.companyCareerPage, 'https://paytm.com/careers')
  assert.equal(paytm.companyDomain, 'paytm.com')
  assert.equal(paytm.atsPlatform, 'lever')
  assert.equal(one97, undefined)

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'paytm')
  assert.match(scraper.dryRunFile, /paytm[\\/]jobs\.json$/i)
})
