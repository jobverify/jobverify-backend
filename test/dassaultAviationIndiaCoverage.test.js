import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/dassaultaviationindia/script.js'

test('Dassault Aviation India resolves only to its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nDassault Aviation India\nDassault Aviation\n',
    catalog,
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName]),
    [['Dassault Aviation India', 'dassaultaviationindia', 'Dassault Aviation India']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Dassault Aviation'])

  const provider = catalog.find((item) => item.source === 'dassaultaviationindia')
  assert.equal(provider?.exactCompanyMatchOnly, true)
  assert.equal(provider?.companyDomain, 'dassault-aviation.com')
})

test('Dassault Aviation India fails closed without verified public India openings', async () => {
  assert.deepEqual(await run(), [])
})
