import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Genex Space is registered against the verified first-party fellowship page', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'genexspace')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Genex Space')
  assert.equal(provider.companyCareerPage, 'https://genex.space/gsef/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-program-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-gsef-page+single-public-fellowship+same-page-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'genex.space')
  assert.match(provider.modulePath, /genexspace[\\/]script\.js$/i)
})

test('Genex Space matches company coverage directly from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Genex Space\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Genex Space', 'genexspace', 'Genex Space']],
  )
})

test('Genex Space is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'genexspace')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'genexspace')
  assert.equal(scraper.provider.companyCareerPage, 'https://genex.space/gsef/')
  assert.match(scraper.dryRunFile, /genexspace[\\/]jobs\.json$/i)
})
