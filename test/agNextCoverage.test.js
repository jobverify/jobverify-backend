import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/agnext/script.js'

test('AgNext resolves only to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAgNext\nAGNEXT\nAg Next\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['AgNext', 'agnext', 'AgNext']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['AGNEXT', 'Ag Next'])
})

test('AgNext fails closed without a verified public job listing parser', async () => {
  assert.deepEqual(await run(), [])
})
