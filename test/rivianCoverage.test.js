import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Rivian is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'rivian')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nRivian Automotive\nRivian India\n',
    catalog,
  })

  assert.ok(provider, 'Expected Rivian provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Rivian')
  assert.equal(provider.companyDomain, 'rivian.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page-india-enumeration-unverified-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Rivian').map((item) => item.source),
    ['rivian'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Rivian scraper fails closed without a verified India jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'rivian')

  assert.ok(scraper, 'Expected Rivian scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
