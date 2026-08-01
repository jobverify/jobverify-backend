import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('Knolskape resolves only from its exact CSV company name', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'knolskape')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })

  assert.ok(provider, 'Expected a Knolskape provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Knolskape')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Knolskape').map((item) => item.source),
    ['knolskape'],
  )
  assert.equal(
    generateCompanyCoverageReport({
      csvText: 'company_name\nKnolskape Technologies\n',
      catalog,
    }).matchedCount,
    0,
  )
})

test('Knolskape scraper is built from its exact provider extension', () => {
  const scraper = buildScrapers().find((item) => item.name === 'knolskape')

  assert.ok(scraper, 'Expected Knolskape scraper to be built from its provider extension')
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /knolskape[\\/]jobs\.json$/i)
})
