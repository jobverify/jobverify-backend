import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

test('company coverage resolves Go Digit brand variants to the Go Digit provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Go Digit\n2,DIGIT General Insurance\n3,Digit Insurance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Go Digit', 'godigit'],
    ['DIGIT General Insurance', 'godigit'],
    ['Digit Insurance', 'godigit'],
  ])
})
