import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Lakshmi Electrical Control Systems is registered as a verified first-party zero-job scraper without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lakshmielectricalcontrolsystems')

  assert.ok(provider, 'Expected Lakshmi Electrical Control Systems provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Lakshmi Electrical Control Systems')
  assert.equal(provider.companyCareerPage, 'https://www.lecsindia.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-contact-page-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage+verified-contact-page-without-careers-or-jobs-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lecsindia.com')
  assert.match(provider.modulePath, /lakshmielectricalcontrolsystems[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Lakshmi Electrical Control Systems'), false)
})

test('Lakshmi Electrical Control Systems matches backlog coverage directly from provider metadata and is runnable via buildScrapers', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Lakshmi Electrical Control Systems,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lakshmi Electrical Control Systems', 'lakshmielectricalcontrolsystems', 'Lakshmi Electrical Control Systems']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'lakshmielectricalcontrolsystems')

  assert.ok(scraper, 'Expected buildScrapers() to return the Lakshmi Electrical Control Systems scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lakshmielectricalcontrolsystems')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.lecsindia.com/')
  assert.match(scraper.dryRunFile, /lakshmielectricalcontrolsystems[\\/]jobs\.json$/i)
})
