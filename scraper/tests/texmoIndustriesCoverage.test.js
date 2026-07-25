import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

test('company coverage resolves the exact Texmo Industries name without aliases', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Texmo Industries\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.source ?? null]),
    [['Texmo Industries', 'texmoindustries', 'texmoindustries']],
  )
  assert.equal(report.unmatchedCount, 0)
})
