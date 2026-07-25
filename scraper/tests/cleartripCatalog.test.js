import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadCleartripModule = async () => {
  try {
    return await import('../cleartrip/script.js')
  } catch {
    assert.fail('Expected Cleartrip scraper module at ../cleartrip/script.js')
  }
}

test('getScraperCatalog includes Cleartrip as a verified careers-to-TurboHire script provider', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cleartrip')
  const cleartrip = await loadCleartripModule()

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Cleartrip')
  assert.equal(provider.companyCareerPage, 'https://careers.cleartrip.com/')
  assert.equal(provider.companyDomain, 'careers.cleartrip.com')
  assert.equal(provider.atsPlatform, 'cleartrip-careers-to-flipkart-turbohire-handoff')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'official-jobs-redirect+publicorganization+turbohire-filteredjobs-api',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-cleartrip-careers-handoff+verified-flipkart-publicorganization+cleartrip-signal-filter',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.match(provider.modulePath, /cleartrip[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /cleartrip[\\/]jobs\.json$/i)

  assert.equal(cleartrip.SOURCE, provider.source)
  assert.equal(cleartrip.COMPANY, provider.companyName)
  assert.equal(cleartrip.CAREERS_URL, provider.companyCareerPage)
})

test('buildScrapers and company coverage resolve Cleartrip from the shared catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cleartrip')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cleartrip')
  assert.match(scraper.dryRunFile, /cleartrip[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Cleartrip,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Cleartrip', 'cleartrip', 'Cleartrip']],
  )
})
