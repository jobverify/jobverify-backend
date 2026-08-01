import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Lucid Motors is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'lucidmotors')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nLucid Motor\nLucid Automotive\n',
    catalog,
  })

  assert.ok(provider, 'Expected Lucid Motors provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Lucid Motors')
  assert.equal(provider.companyDomain, 'lucidmotors.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-search-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Lucid Motors').map((item) => item.source),
    ['lucidmotors'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Lucid Motors scraper fails closed without a verified enumerable public jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'lucidmotors')

  assert.ok(scraper, 'Expected Lucid Motors scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
