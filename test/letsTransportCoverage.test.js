import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('LetsTransport is covered only by its exact first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'letstransport')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nLets Transport\n',
    catalog,
  })

  assert.ok(provider, 'Expected LetsTransport provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'LetsTransport')
  assert.equal(provider.companyDomain, 'letstransport.in')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'LetsTransport').map((item) => item.source),
    ['letstransport'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 1)
})

test('LetsTransport scraper fails closed without an enumerable official jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'letstransport')

  assert.ok(scraper, 'Expected LetsTransport scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
