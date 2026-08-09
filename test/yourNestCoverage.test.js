import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/yournest/script.js'

test('YourNest resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nYourNest\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['YourNest', 'yournest', 'YourNest']],
  )
})

test('YourNest fails closed without an enumerable first-party careers feed', async () => {
  assert.deepEqual(await run(), [])
})
