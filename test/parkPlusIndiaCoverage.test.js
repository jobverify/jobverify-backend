import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Park+ India is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'parkplusindia')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nPark+\nPark Plus India\n',
    catalog,
  })

  assert.ok(provider, 'Expected Park+ India provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Park+ India')
  assert.equal(provider.companyDomain, 'parkplus.io')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Park+ India').map((item) => item.source),
    ['parkplusindia'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Park+ India scraper fails closed without a public official application feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'parkplusindia')

  assert.ok(scraper, 'Expected Park+ India scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
