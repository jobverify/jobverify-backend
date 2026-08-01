import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Nuro resolves by exact name and fails closed without a verified public feed', async () => {
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Nuro\n2,"Nuro Inc."\n3,Neuro\n',
    catalog,
  })
  const scraper = buildScrapers().find((item) => item.name === 'nuro')

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [['Nuro', 'nuro']],
  )
  assert.equal(report.unmatchedCount, 2)
  assert.ok(scraper, 'Expected an exact Nuro scraper registration')
  assert.equal(scraper.provider.companyName, 'Nuro')
  assert.equal(scraper.provider.companyDomain, 'nuro.ai')
  assert.deepEqual(await scraper.run(), [])
})
