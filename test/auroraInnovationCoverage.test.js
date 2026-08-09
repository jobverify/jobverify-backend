import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/aurorainnovation/script.js'

test('Aurora Innovation resolves only to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAurora Innovation\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aurora Innovation', 'aurorainnovation', 'Aurora Innovation']],
  )
  assert.equal(report.unmatchedCount, 0)
})

test('Aurora Innovation fails closed without current public openings', async () => {
  assert.deepEqual(await run(), [])
})
