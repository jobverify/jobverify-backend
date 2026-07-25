import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('Credgenics is registered as a verified homepage LinkedIn-handoff sentinel without alias churn', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'credgenics')

  assert.ok(provider, 'Expected Credgenics provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Credgenics')
  assert.equal(provider.companyCareerPage, 'https://www.credgenics.com/')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-official-homepage')
  assert.equal(
    provider.extractionStrategy,
    'verified-official-homepage-plus-linkedin-handoff-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'credgenics.com')
  assert.match(provider.modulePath, /credgenics[\\/]script\.js$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Credgenics'), false)
})

test('Credgenics matches directly from provider metadata without adding a new alias', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Credgenics,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Credgenics', 'credgenics', 'Credgenics']],
  )
})

test('Credgenics is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'credgenics')

  assert.ok(scraper, 'Expected buildScrapers() to return the Credgenics scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'credgenics')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.credgenics.com/')
  assert.match(scraper.dryRunFile, /credgenics[\\/]jobs\.json$/i)
})
