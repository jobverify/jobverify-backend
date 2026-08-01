import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Park Plus is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'parkpluscompany')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nPark+\nPark+ India\nPark Plus India\n',
    catalog,
  })

  assert.ok(provider, 'Expected Park Plus provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Park Plus')
  assert.equal(provider.companyDomain, 'parkplus.io')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Park Plus').map((item) => item.source),
    ['parkpluscompany'],
  )
  assert.deepEqual(
    nearNameReport.matched.map((item) => [item.companyName, item.source]),
    [
      ['Park+', 'parkplus'],
      ['Park+ India', 'parkplusindia'],
    ],
  )
  assert.deepEqual(
    nearNameReport.unmatched.map((item) => item.companyName),
    ['Park Plus India'],
  )
})

test('Park Plus scraper fails closed without public official application records', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'parkpluscompany')

  assert.ok(scraper, 'Expected Park Plus scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
