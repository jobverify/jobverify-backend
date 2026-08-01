import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/kissht/script.js'

test('Kissht resolves only to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nKissht\nKissht Finance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 1)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kissht', 'kissht', 'Kissht']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Kissht Finance'])
})

test('Kissht fails closed when its official ATS has no verified enumerable listings', async () => {
  assert.deepEqual(await run(), [])
})
