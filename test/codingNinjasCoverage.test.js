import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/codingninjas/script.js'

test('Coding Ninjas resolves to its exact-name official Keka provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nCoding Ninjas\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Coding Ninjas', 'codingninjas', 'Coding Ninjas']],
  )
})

test('Coding Ninjas fails closed when its official Keka feed has no public openings', async () => {
  assert.deepEqual(await run(), [])
})
