import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('Qualigy Tech is registered against the verified first-party jobs archive with exact-company aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'qualigytech')

  assert.ok(provider, 'Expected Qualigy Tech provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Qualigy Tech')
  assert.equal(provider.companyCareerPage, 'https://www.qualigytech.com/jobs/')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-page-plus-jobs-archive-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-careers-page+verified-jobs-archive+same-domain-detail-pages+first-party-apply-form',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'qualigytech.com')
  assert.match(provider.modulePath, /qualigytech[\\/]script\.js$/i)
  assert.equal(companyAliases['Qualigy Tech'], 'qualigytech')
  assert.equal(companyAliases.QualigyTech, 'qualigytech')
})

test('Qualigy Tech backlog rows resolve through the alias map and buildScrapers exposes the lane', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Qualigy Tech,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [[
      'Qualigy Tech',
      'qualigytech',
      'Qualigy Tech',
    ]],
  )

  const scraper = buildScrapers().find((item) => item.name === 'qualigytech')

  assert.ok(scraper, 'Expected buildScrapers() to return the Qualigy Tech scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'qualigytech')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.qualigytech.com/jobs/')
  assert.match(scraper.dryRunFile, /qualigytech[\\/]jobs\.json$/i)
})
