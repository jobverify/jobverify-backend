import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/katalon/script.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Katalon resolves only to its exact-name official ATS provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
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
