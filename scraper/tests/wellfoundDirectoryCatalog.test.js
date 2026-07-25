import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import wellfoundProviders from '../providers/wellfoundProviders.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const workbookCsv = readFileSync(
  new URL('../../artifacts/bangalore_500_current_hiring_companies.csv', import.meta.url),
  'utf8',
)

test('Wellfound provider catalog covers every company from the Bangalore current-hiring workbook', () => {
  const report = generateCompanyCoverageReport({
    csvText: workbookCsv,
    catalog: getScraperCatalog(),
  })

  assert.equal(wellfoundProviders.length, 499)
  assert.equal(report.totalRows, 500)
  assert.equal(report.candidateRows, 500)
  assert.equal(report.matchedCount, 500)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('Wellfound generated providers expose stable source ids and workbook hiring metadata', () => {
  const appliedIntuition = wellfoundProviders.find((provider) => (
    provider.companyName === 'Applied Intuition'
  ))
  const xpay = wellfoundProviders.find((provider) => provider.companyName === 'xPay')

  assert.ok(appliedIntuition)
  assert.equal(appliedIntuition.source, 'wfappliedintuition')
  assert.equal(appliedIntuition.adapter, 'wellfoundDirectory')
  assert.equal(appliedIntuition.companyCareerPage, 'https://wellfound.com/startups/location/bangalore?page=2')
  assert.equal(appliedIntuition.wellfoundOpeningsShown, 231)
  assert.equal(appliedIntuition.verifiedOn, '2026-07-19')
  assert.match(appliedIntuition.verifiedSurfaceSummary, /Applied Intuition/i)
  assert.match(appliedIntuition.verifiedSurfaceSummary, /231 current openings/i)

  assert.ok(xpay)
  assert.equal(xpay.source, 'wfxpay')
  assert.equal(xpay.wellfoundOpeningsShown, 1)
})

test('buildScrapers exposes runnable Wellfound-directory scrapers without duplicating existing catalog matches', () => {
  const catalog = getScraperCatalog()
  const scrapers = buildScrapers()
  const wellfoundScraper = scrapers.find((scraper) => scraper.name === 'wfappliedintuition')

  assert.equal(wellfoundProviders.some((provider) => provider.companyName === '6sense'), false)
  assert.equal(catalog.filter((provider) => provider.companyName === '6sense').length, 1)
  assert.ok(wellfoundScraper)
  assert.equal(typeof wellfoundScraper.run, 'function')
  assert.equal(wellfoundScraper.provider.adapter, 'wellfoundDirectory')
  assert.match(wellfoundScraper.dryRunFile, /wfappliedintuition[\\/]jobs\.json$/)
})
