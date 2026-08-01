import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Samsung is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'samsung')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nSamsung Research\nSamsung Semiconductor India\n',
    catalog,
  })

  assert.ok(provider, 'Expected Samsung provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Samsung')
  assert.equal(provider.companyDomain, 'samsung.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-search-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Samsung').map((item) => item.source),
    ['samsung'],
  )
  assert.deepEqual(
    nearNameReport.matched.map((item) => [item.companyName, item.source]),
    [
      ['Samsung Research', 'samsungresearch'],
      ['Samsung Semiconductor India', 'samsungresearch'],
    ],
  )
})

test('Samsung scraper fails closed without a separately verified enumerable jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'samsung')

  assert.ok(scraper, 'Expected Samsung scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
