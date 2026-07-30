import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/sumhr/script.js'

test('SumHR resolves only to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nSumHR\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['SumHR', 'sumhr', 'SumHR']],
  )
})

test('SumHR fails closed without a verifiable public first-party careers surface', async () => {
  assert.deepEqual(await run(), [])
})
