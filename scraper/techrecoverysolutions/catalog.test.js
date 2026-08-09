import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Techcovery Solutions is registered as a first-party no-public-jobs sentinel provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'techrecoverysolutions')

  assert.ok(provider, 'Expected Techcovery Solutions provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Techcovery Solutions')
  assert.equal(provider.companyCareerPage, 'https://techcovery.in/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-about-contact-and-common-careers-route-validation')
  assert.equal(provider.extractionStrategy, 'verified-homepage+verified-about+verified-contact+verified-missing-first-party-careers-routes-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'techcovery.in')
  assert.match(provider.modulePath, /techrecoverysolutions[\\/]script\.js$/i)
})

test('Techcovery Solutions matches company coverage and builds through the provider catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Techcovery Solutions,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Techcovery Solutions', 'techrecoverysolutions', 'Techcovery Solutions']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'techrecoverysolutions')

  assert.ok(scraper, 'Expected buildScrapers() to return the Techcovery Solutions scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'techrecoverysolutions')
  assert.equal(scraper.provider.companyName, 'Techcovery Solutions')
  assert.match(scraper.dryRunFile, /techrecoverysolutions[\\/]jobs\.json$/i)
})
