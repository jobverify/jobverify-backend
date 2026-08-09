import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nTaxBuddy\n"

test('TaxBuddy is covered exactly by its first-party fail-closed provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'taxbuddy')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })

  assert.ok(provider, 'Expected TaxBuddy provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'TaxBuddy')
  assert.equal(provider.companyDomain, 'taxbuddy.com')
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'TaxBuddy').map((item) => item.source),
    ['taxbuddy'],
  )
})

test('TaxBuddy scraper fails closed when no official public careers feed is verified', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'taxbuddy')

  assert.ok(scraper, 'Expected TaxBuddy scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
