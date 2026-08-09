import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../../scraper-support/providers/index.js'
import { run } from './script.js'

test('Skan resolves only to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nSkan\nSkanray Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 2)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['Skan', 'skan', 'Skan'],
      ['Skanray Technologies', 'skanraytechnologies', 'Skanray Technologies'],
    ],
  )
})

test('Skan fails closed when its official careers surface has no enumerable openings', async () => {
  assert.deepEqual(await run(), [])
})
