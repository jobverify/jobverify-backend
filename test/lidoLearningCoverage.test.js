import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/lidolearning/script.js'

test('Lido Learning resolves only the exact CSV company name to its first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nLido Learning\nLido\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lido Learning', 'lidolearning', 'Lido Learning']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Lido'])
})

test('Lido Learning fails closed without a verified public careers feed', async () => {
  assert.deepEqual(await run(), [])
})
