import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadModule = async () => {
  try {
    return await import('../../scraper/cosmiccircuits/script.js')
  } catch {
    assert.fail('Expected Cosmic Circuits scraper module at ../../scraper/cosmiccircuits/script.js')
  }
}

test('getScraperCatalog includes Cosmic Circuits as a verified Cadence parent-careers sentinel', async () => {
  const cosmic = await loadModule()
  const provider = getScraperCatalog().find((item) => item.source === cosmic.SOURCE)

  assert.ok(provider)
  assert.equal(provider.source, 'cosmiccircuits')
  assert.equal(provider.companyName, 'Cosmic Circuits')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, cosmic.CAREERS_URL)
  assert.equal(provider.companyDomain, 'cadence.com')
  assert.equal(provider.atsPlatform, 'official-parent-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-parent-careers-page-handoff-monitor')
  assert.equal(
    provider.extractionStrategy,
    'verified-cadence-careers-page+generic-parent-workday-handoff-without-brand-specific-jobs-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.match(provider.modulePath, /cosmiccircuits[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /cosmiccircuits[\\/]jobs\.json$/i)

  assert.deepEqual(cosmic.PROVIDER_CONFIG, {
    source: 'cosmiccircuits',
    companyName: 'Cosmic Circuits',
    adapter: 'script',
    modulePath: '../../scraper/cosmiccircuits/script.js',
    companyCareerPage: 'https://www.cadence.com/en_US/home/company/life-at-cadence/careers.html',
    atsPlatform: 'official-parent-company-careers',
    countryFilter: 'India',
    paginationStrategy: 'verified-parent-careers-page-handoff-monitor',
    extractionStrategy: 'verified-cadence-careers-page+generic-parent-workday-handoff-without-brand-specific-jobs-return-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'cadence.com',
  })
  assert.equal(cosmic.SOURCE, provider.source)
  assert.equal(cosmic.COMPANY, provider.companyName)
  assert.equal(cosmic.CAREERS_URL, provider.companyCareerPage)
})

test('buildScrapers and company coverage resolve Cosmic Circuits from the shared catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cosmiccircuits')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cosmiccircuits')
  assert.match(scraper.dryRunFile, /cosmiccircuits[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Cosmic Circuits,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Cosmic Circuits', 'cosmiccircuits', 'Cosmic Circuits']],
  )
})
