import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

test('Tata CLiQ resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nTata CLiQ\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tata CLiQ', 'tatacliq', 'Tata CLiQ']],
  )
})

test('Tata CLiQ fails closed when its official ATS has no verified enumerable openings', async () => {
  const scraper = buildScrapers().find((candidate) => candidate.name === 'tatacliq')

  assert.ok(scraper)
  assert.deepEqual(await scraper.run(), [])
})
