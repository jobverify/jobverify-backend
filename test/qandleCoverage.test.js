import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/qandle/script.js'

test('exact CSV company name Qandle is covered by its first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nQandle\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Qandle', 'qandle', 'Qandle']],
  )
})

test('Qandle fails closed without a verified public first-party jobs feed', async () => {
  assert.deepEqual(await run(), [])
})
