import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes Cuelogic as a parent-board empty-search sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cuelogic')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Cuelogic')
  assert.equal(provider.companyCareerPage, 'https://careers.ltimindtree.com/search/')
  assert.equal(provider.atsPlatform, 'successfactors-empty-search-sentinel')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-parent-search-query')
  assert.equal(provider.extractionStrategy, 'verified-parent-successfactors-search-empty-state-return-empty')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'careers.ltimindtree.com')
  assert.match(provider.modulePath, /cuelogic[\\/]script\.js$/i)
})

test('buildScrapers and company coverage resolve Cuelogic rows', () => {
  const scraper = buildScrapers().find((item) => item.name === 'cuelogic')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'cuelogic')
  assert.match(scraper.dryRunFile, /cuelogic[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Cuelogic,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Cuelogic', 'cuelogic', 'Cuelogic']],
  )
})
