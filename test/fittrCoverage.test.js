import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/fittr/script.js'

test('Fittr resolves only to its literal exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nFittr\nFITTR\nFittr Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 2)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Fittr', 'fittr', 'Fittr']],
  )
  assert.deepEqual(
    report.unmatched.map((item) => item.companyName),
    ['FITTR', 'Fittr Technologies'],
  )
})

test('Fittr fails closed because its official surface has no employee listing feed', async () => {
  assert.deepEqual(await run(), [])
})
