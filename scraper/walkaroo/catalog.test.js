import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Walkaroo is registered as a verified first-party careers handoff sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'walkaroo')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Walkaroo')
  assert.equal(provider.companyCareerPage, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.equal(provider.atsPlatform, 'zappyhire-handoff')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-about-contact-and-zappyhire-handoff-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-about-page+verified-contact-page+verified-zappyhire-careers-handoff-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'walkaroo.in')
  assert.match(provider.modulePath, /walkaroo[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Walkaroo'), false)
})

test('Walkaroo resolves from provider metadata and stays runnable through the scraper catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Walkaroo,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Walkaroo', 'walkaroo', 'Walkaroo']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'walkaroo')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'walkaroo')
  assert.equal(scraper.provider.companyCareerPage, 'https://recruitcareers.zappyhire.com/en/walkaroo')
  assert.match(scraper.dryRunFile, /walkaroo[\\/]jobs\.json$/i)
})
