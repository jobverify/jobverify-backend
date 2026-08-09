import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport, getCompanyAliasMap } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const TOP_COMPANIES_CSV = readFileSync(
  new URL('../../top_companies_not_in_attached_list.csv', import.meta.url),
  'utf8',
)

test('top_companies_not_in_attached_list.csv resolves fully through the shared catalog', () => {
  const report = generateCompanyCoverageReport({
    csvText: TOP_COMPANIES_CSV,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })

  assert.equal(report.totalRows, 400)
  assert.equal(report.candidateRows, 400)
  assert.equal(report.matchedCount, 400)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('top_companies_not_in_attached_list.csv only resolves to runnable scraper sources', () => {
  const report = generateCompanyCoverageReport({
    csvText: TOP_COMPANIES_CSV,
    catalog: getScraperCatalog(),
    aliasMap: getCompanyAliasMap(),
  })
  const scrapers = buildScrapers()
  const scraperNames = new Set(scrapers.map((scraper) => scraper.name))
  const uniqueMatchedSources = [...new Set(report.matched.map((item) => item.source))]
  const missingRunnableSources = uniqueMatchedSources.filter((source) => !scraperNames.has(source))

  assert.equal(uniqueMatchedSources.length > 0, true)
  assert.deepEqual(missingRunnableSources, [])
})
