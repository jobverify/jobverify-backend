import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

test('company coverage resolves the exact Varroc name without aliases', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Varroc\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['Varroc', 'varroc', 'varroc']],
  )
  assert.equal(report.unmatchedCount, 0)
})
