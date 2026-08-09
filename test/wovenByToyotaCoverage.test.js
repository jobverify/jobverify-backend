import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nWoven by Toyota\n"

test('Woven by Toyota is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'wovenbytoyota')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nWoven Toyota\nToyota Woven\n',
    catalog,
  })

  assert.ok(provider, 'Expected Woven by Toyota provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Woven by Toyota')
  assert.equal(provider.companyDomain, 'woven.toyota')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page-fail-closed')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Woven by Toyota').map((item) => item.source),
    ['wovenbytoyota'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Woven by Toyota scraper fails closed when the public careers page shows no matching roles', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'wovenbytoyota')

  assert.ok(scraper, 'Expected Woven by Toyota scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
