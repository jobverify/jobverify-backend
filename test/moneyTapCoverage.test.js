import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/moneytap/script.js'

test('MoneyTap resolves to its exact-name official ATS-backed provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nMoneyTap\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['MoneyTap', 'moneytap', 'MoneyTap']],
  )
})

test('MoneyTap fails closed when its official ATS has no current openings', async () => {
  assert.deepEqual(await run(), [])
})
