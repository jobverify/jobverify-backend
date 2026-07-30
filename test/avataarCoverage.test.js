import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Avataar is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'avataar')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nAvataar Technologies\n',
    catalog,
  })

  assert.ok(provider, 'Expected Avataar provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Avataar')
  assert.equal(provider.companyDomain, 'avataar.ai')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Avataar').map((item) => item.source),
    ['avataar'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 1)
})

test('Avataar scraper fails closed without an official public careers feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'avataar')

  assert.ok(scraper, 'Expected Avataar scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
