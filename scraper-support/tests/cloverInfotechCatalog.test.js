import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

const loadProviderModule = async () => {
  try {
    return await import('../../scraper/cloverinfotech/provider.js')
  } catch {
    return null
  }
}

test('getScraperCatalog includes Clover Infotech as a verified first-party jobs scraper', async () => {
  const providerModule = await loadProviderModule()
  const sharedProvider = getScraperCatalog().find((item) => item.source === 'cloverinfotech')

  assert.ok(
    providerModule,
    'Expected Clover Infotech provider module at ../../scraper/cloverinfotech/provider.js',
  )
  assert.ok(sharedProvider)

  const provider = providerModule.provider

  assert.ok(provider, 'Expected Clover Infotech provider export')
  assert.equal(sharedProvider.source, 'cloverinfotech')
  assert.equal(sharedProvider.companyName, 'Clover Infotech')
  assert.equal(sharedProvider.adapter, 'script')
  assert.equal(sharedProvider.modulePath, '../../scraper/cloverinfotech/script.js')
  assert.equal(sharedProvider.companyCareerPage, 'https://www.cloverinfotech.com/job-openings/')
  assert.equal(sharedProvider.atsPlatform, 'official-company-careers')
  assert.equal(sharedProvider.countryFilter, 'India')
  assert.equal(sharedProvider.paginationStrategy, 'official-job-openings-page-pagination')
  assert.equal(
    sharedProvider.extractionStrategy,
    'verified-first-party-job-openings-page+india-role-filter+detail-pages+embedded-first-party-application-form',
  )
  assert.equal(sharedProvider.parser, 'custom-script')
  assert.equal(sharedProvider.normalizationProfile, 'engineering-default')
  assert.equal(sharedProvider.companyDomain, 'cloverinfotech.com')
  assert.match(sharedProvider.dryRunFile, /cloverinfotech[\\/]jobs\.json$/i)

  assert.deepEqual(provider, {
    ...provider,
    source: sharedProvider.source,
    companyName: sharedProvider.companyName,
    adapter: sharedProvider.adapter,
    modulePath: sharedProvider.modulePath,
    companyCareerPage: sharedProvider.companyCareerPage,
    atsPlatform: sharedProvider.atsPlatform,
    countryFilter: sharedProvider.countryFilter,
    paginationStrategy: sharedProvider.paginationStrategy,
    extractionStrategy: sharedProvider.extractionStrategy,
    parser: sharedProvider.parser,
    normalizationProfile: sharedProvider.normalizationProfile,
    companyDomain: sharedProvider.companyDomain,
  })
})

test('buildScrapers and company coverage resolve Clover Infotech from the shared catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cloverinfotech')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cloverinfotech')
  assert.match(scraper.dryRunFile, /cloverinfotech[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Clover Infotech,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Clover Infotech', 'cloverinfotech', 'Clover Infotech']],
  )
})
