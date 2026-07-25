import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('Saint-Gobain is registered against the official Join Us jobs surface', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'saintgobain')

  assert.ok(provider, 'Expected Saint-Gobain provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Saint-Gobain')
  assert.equal(provider.companyCareerPage, 'https://joinus.saint-gobain.com/en')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-public-global-jobs-page')
  assert.equal(provider.extractionStrategy, 'verified-official-global-jobs-board-zero-india-openings')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'joinus.saint-gobain.com')
  assert.match(provider.modulePath, /saintgobain[\\/]script\.js$/i)
})

test('Saint-Gobain aliases cover the CSV row variants tied directly to this company', () => {
  assert.equal(companyAliases['Saint Gobain- Gyproc'], 'saintgobain')
  assert.equal(companyAliases['Saint-Gobain India Pvt. Ltd – SEFPRO India'], 'saintgobain')
})

test('Saint-Gobain coverage matches the exact CSV variants for this company', () => {
  const report = generateCompanyCoverageReport({
    csvText: [
      'Saint Gobain- Gyproc,',
      'Saint-Gobain,',
      'Saint-Gobain India Pvt. Ltd – SEFPRO India,',
    ].join('\n'),
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 3)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Saint Gobain- Gyproc', 'saintgobain'],
    ['Saint-Gobain', 'saintgobain'],
    ['Saint-Gobain India Pvt. Ltd – SEFPRO India', 'saintgobain'],
  ])
})

test('Saint-Gobain is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'saintgobain')

  assert.ok(scraper, 'Expected buildScrapers() to return the Saint-Gobain scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'saintgobain')
  assert.equal(scraper.provider.companyCareerPage, 'https://joinus.saint-gobain.com/en')
  assert.match(scraper.dryRunFile, /saintgobain[\\/]jobs\.json$/i)
})
