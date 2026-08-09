import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

test('company coverage resolves Continental AG to the Continental scraper', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Continental AG\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [['Continental AG', 'continental']],
  )
  assert.equal(report.unmatchedCount, 0)
})
