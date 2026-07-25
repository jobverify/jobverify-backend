import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('Kaleyra is registered as a verified first-party shared-careers zero-job sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'kaleyra')

  assert.ok(provider, 'Expected Kaleyra provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Kaleyra')
  assert.equal(provider.companyCareerPage, 'https://www.kaleyra.com/')
  assert.equal(provider.atsPlatform, 'official-homepage-handoff-to-shared-parent-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-redirect-plus-shared-parent-careers-portal-check')
  assert.equal(
    provider.extractionStrategy,
    'verified-kaleyra-homepage-handoff+verified-shared-tata-careers-portal-without-kaleyra-board-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'kaleyra.com')
  assert.equal(provider.workspaceDomain, 'jobs.tatacommunications.com')
  assert.match(provider.modulePath, /kaleyra[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Kaleyra'), false)
})

test('Kaleyra matches company coverage directly from provider metadata and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Kaleyra,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kaleyra', 'kaleyra', 'Kaleyra']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'kaleyra')

  assert.ok(scraper, 'Expected buildScrapers() to return the Kaleyra scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'kaleyra')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.kaleyra.com/')
  assert.match(scraper.dryRunFile, /kaleyra[\\/]jobs\.json$/i)
})
