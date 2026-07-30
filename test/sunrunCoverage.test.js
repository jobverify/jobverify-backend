import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Sunrun is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'sunrun')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nSun Run\nSunrun Solar\n',
    catalog,
  })

  assert.ok(provider, 'Expected Sunrun provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Sunrun')
  assert.equal(provider.companyDomain, 'sunrun.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-search-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Sunrun').map((item) => item.source),
    ['sunrun'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Sunrun scraper fails closed until the first-party jobs feed is explicitly verified', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'sunrun')

  assert.ok(scraper, 'Expected Sunrun scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
