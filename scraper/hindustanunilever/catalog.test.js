import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'
import companyAliases from '../../scraper-support/providers/companyAliases.json' with { type: 'json' }

test('Hindustan Unilever is registered against the official India careers page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'hindustanunilever')

  assert.ok(provider, 'Expected Hindustan Unilever provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Hindustan Unilever Limited')
  assert.equal(provider.companyCareerPage, 'https://www.hul.co.in/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'hul-careers-redirect-plus-single-india-page')
  assert.equal(provider.extractionStrategy, 'official-hul-careers-redirect+unilever-india-inline-local-job-cards')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'hul.co.in')
  assert.match(provider.modulePath, /hindustanunilever[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Hindustan Unilever'), false)
})

test('Hindustan Unilever matches directly from provider metadata without a new alias', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Hindustan Unilever,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Hindustan Unilever', 'hindustanunilever'],
  ])
})

test('Hindustan Unilever is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'hindustanunilever')

  assert.ok(scraper, 'Expected buildScrapers() to return the Hindustan Unilever scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'hindustanunilever')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.hul.co.in/careers/')
  assert.match(scraper.dryRunFile, /hindustanunilever[\\/]jobs\.json$/i)
})
