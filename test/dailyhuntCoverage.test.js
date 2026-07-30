import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/dailyhunt/script.js'

test('Dailyhunt resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nDailyhunt\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Dailyhunt', 'dailyhunt', 'Dailyhunt']],
  )
})

test('Dailyhunt fails closed when its official operator careers page has no enumerable openings', async () => {
  assert.deepEqual(await run(), [])
})
