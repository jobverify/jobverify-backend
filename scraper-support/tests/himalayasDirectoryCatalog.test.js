import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import himalayasBatch1 from '../providers/himalayasProviders.batch1.json' with { type: 'json' }
import himalayasBatch2 from '../providers/himalayasProviders.batch2.json' with { type: 'json' }
import himalayasBatch3 from '../providers/himalayasProviders.batch3.json' with { type: 'json' }
import himalayasBatch4 from '../providers/himalayasProviders.batch4.json' with { type: 'json' }
import himalayasBatch5 from '../providers/himalayasProviders.batch5.json' with { type: 'json' }
import himalayasBatch6 from '../providers/himalayasProviders.batch6.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const workbookCsvPath = fileURLToPath(
  new URL('../../../artifacts/himalayas_500_current_hiring_companies.csv', import.meta.url),
)
const himalayasProviders = [
  ...himalayasBatch1,
  ...himalayasBatch2,
  ...himalayasBatch3,
  ...himalayasBatch4,
  ...himalayasBatch5,
  ...himalayasBatch6,
]

test('Himalayas provider catalog covers every company from the July 23 workbook', () => {
  if (!existsSync(workbookCsvPath)) {
    test.skip('Local Himalayas workbook artifact is not available in this workspace.')
    return
  }

  const report = generateCompanyCoverageReport({
    csvText: readFileSync(workbookCsvPath, 'utf8'),
    catalog: getScraperCatalog(),
  })

  assert.equal(himalayasProviders.length, 477)
  assert.equal(report.totalRows, 500)
  assert.equal(report.candidateRows, 500)
  assert.equal(report.matchedCount, 500)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
})

test('Himalayas generated providers expose stable source ids and workbook metadata', () => {
  const acvAuctions = himalayasProviders.find((provider) => (
    provider.companyName === 'ACV Auctions'
  ))

  assert.ok(acvAuctions)
  assert.equal(acvAuctions.source, 'hmacvauctions')
  assert.equal(acvAuctions.adapter, 'himalayasDirectory')
  assert.equal(
    acvAuctions.companyCareerPage,
    'https://himalayas.app/jobs/countries/india/software-engineering?page=2',
  )
  assert.equal(acvAuctions.himalayasCompanySlug, 'acv-auctions')
  assert.equal(acvAuctions.verifiedOn, '2026-07-23')
  assert.match(acvAuctions.verifiedSurfaceSummary, /Software Engineer/i)
  assert.equal(himalayasProviders.some((provider) => provider.companyName === 'BlackLine'), false)
})

test('buildScrapers exposes runnable Himalayas-directory scrapers', () => {
  const scrapers = buildScrapers()
  const himalayasScraper = scrapers.find((scraper) => scraper.name === 'hmacvauctions')

  assert.ok(himalayasScraper)
  assert.equal(typeof himalayasScraper.run, 'function')
  assert.equal(himalayasScraper.provider.adapter, 'himalayasDirectory')
  assert.match(himalayasScraper.dryRunFile, /hmacvauctions[\\/]jobs\.json$/)
})
