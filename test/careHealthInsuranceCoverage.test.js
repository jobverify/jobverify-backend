import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/carehealthinsurance/script.js'

test('Care Health Insurance resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nCare Health Insurance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Care Health Insurance', 'carehealthinsurance', 'Care Health Insurance']],
  )
})

test('Care Health Insurance fails closed when its official surface has no enumerable India openings', async () => {
  assert.deepEqual(await run(), [])
})
