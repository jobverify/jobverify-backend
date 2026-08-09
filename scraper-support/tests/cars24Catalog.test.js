import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadCars24Module = async () => {
  try {
    return await import('../../scraper/cars24/script.js')
  } catch {
    assert.fail('Expected Cars24 scraper module at ../../scraper/cars24/script.js')
  }
}

test('getScraperCatalog includes Cars24 as a verified first-party jobs-api scraper', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cars24')
  const cars24 = await loadCars24Module()

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Cars24')
  assert.equal(provider.companyCareerPage, 'https://www.cars24.com/careers/')
  assert.equal(provider.companyDomain, 'cars24.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-handoff-to-first-party-public-api')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-careers-handoff+first-party-jobs-feed+per-job-detail-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-official-careers-page+verified-dedicated-careers-site+india-jobs-feed+detail-api-enrichment',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.match(provider.modulePath, /cars24[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /cars24[\\/]jobs\.json$/i)

  assert.equal(cars24.SOURCE, provider.source)
  assert.equal(cars24.COMPANY, provider.companyName)
  assert.equal(cars24.OFFICIAL_CAREERS_URL, provider.companyCareerPage)
})

test('buildScrapers and company coverage resolve Cars24 from the shared catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cars24')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cars24')
  assert.match(scraper.dryRunFile, /cars24[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Cars24,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Cars24', 'cars24', 'Cars24']],
  )
})
