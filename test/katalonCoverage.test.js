import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/katalon/script.js'

const COMPANY_CSV_TEXT = "company_name\nKatalon\n"

test('Katalon resolves only to its exact-name official ATS provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog: getScraperCatalog(),
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nKatalon Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched
      .filter((item) => item.companyName === 'Katalon')
      .map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Katalon', 'katalon', 'Katalon']],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 1)
})

test('Katalon fails closed when its official ATS has no enumerable India openings', async () => {
  assert.deepEqual(await run(), [])
})
