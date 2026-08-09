import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nZoox\n"

test('Zoox is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'zoox')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nZoox AI\nZoox Mobility\n',
    catalog,
  })

  assert.ok(provider, 'Expected Zoox provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Zoox')
  assert.equal(provider.companyDomain, 'zoox.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Zoox').map((item) => item.source),
    ['zoox'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Zoox scraper fails closed without a verified enumerable public jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'zoox')

  assert.ok(scraper, 'Expected Zoox scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
