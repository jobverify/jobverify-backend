import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('Altran India resolves to the verified Capgemini first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAltran India\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0]?.source, 'capgemini')
})
