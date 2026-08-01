import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/aviatrixsystems/script.js'

test('Aviatrix Systems resolves only to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAviatrix Systems\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Aviatrix Systems', 'aviatrixsystems', 'Aviatrix Systems']],
  )
  assert.equal(report.unmatchedCount, 0)
})

test('Aviatrix Systems fails closed without a verified enumerable official jobs feed', async () => {
  assert.deepEqual(await run(), [])
})
