import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/tataneu/script.js'

test('Tata Neu resolves only to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nTata Neu\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Tata Neu', 'tataneu', 'Tata Neu']],
  )
})

test('Tata Neu fails closed rather than returning Tata Digital or Tata group jobs', async () => {
  assert.deepEqual(await run(), [])
})
