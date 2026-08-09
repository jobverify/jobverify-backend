import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nPark+ India\n"

test('Park+ India is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'parkplusindia')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
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
  assert.deepEqual(
    nearNameReport.matched.map((item) => [item.companyName, item.source]),
    [['Park+', 'parkplus']],
  )
  assert.deepEqual(
    nearNameReport.unmatched.map((item) => item.companyName),
    ['Park Plus India'],
  )
})

test('Park+ India scraper fails closed without a public official application feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'parkplusindia')

  assert.ok(scraper, 'Expected Park+ India scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
