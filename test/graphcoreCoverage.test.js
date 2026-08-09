import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nGraphcore\n"

test('Graphcore is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'graphcore')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nGraph Core\nGraphcore AI\n',
    catalog,
  })

  assert.ok(provider, 'Expected Graphcore provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Graphcore')
  assert.equal(provider.companyDomain, 'graphcore.ai')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'official-first-party-jobs-page-no-openings')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Graphcore').map((item) => item.source),
    ['graphcore'],
  )
  assert.equal(nearNameReport.matchedCount, 0)
  assert.equal(nearNameReport.unmatchedCount, 2)
})

test('Graphcore scraper returns no jobs when the official jobs page has no openings', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'graphcore')

  assert.ok(scraper, 'Expected Graphcore scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
