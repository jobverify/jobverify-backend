import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('Loki resolves to the verified Grafana Labs provider while Prometheus resolves independently', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nLoki\nPrometheus\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [
      ['Loki', 'grafanalabs'],
      ['Prometheus', 'prometheus'],
    ],
  )
})
