import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Graphcore is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'graphcore')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
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
