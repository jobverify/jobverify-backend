import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

test('Cientra resolves to the official Accenture careers provider after its acquisition', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name,url_in_text,note\n1,Cientra,,',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map(({ companyName, source }) => [companyName, source]),
    [['Cientra', 'accenture']],
  )
})
