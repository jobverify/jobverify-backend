import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nUltraviolette Automotive\n"

test('Ultraviolette Automotive is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'ultravioletteautomotive')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nUltraviolette Automotive Technologies\n',
    catalog,
  })

  assert.ok(provider, 'Expected Ultraviolette Automotive provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Ultraviolette Automotive')
  assert.equal(provider.companyDomain, 'ultraviolette.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Ultraviolette Automotive').map((item) => item.source),
    ['ultravioletteautomotive'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 1)
})

test('Ultraviolette Automotive scraper fails closed without a verified enumerable jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'ultravioletteautomotive')

  assert.ok(scraper, 'Expected Ultraviolette Automotive scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
