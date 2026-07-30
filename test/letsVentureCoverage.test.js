import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('LetsVenture is covered exactly by its first-party fail-closed provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'letsventure')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })

  assert.ok(provider, 'Expected LetsVenture provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'LetsVenture')
  assert.equal(provider.companyDomain, 'letsventure.com')
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'LetsVenture').map((item) => item.source),
    ['letsventure'],
  )
})

test('LetsVenture scraper fails closed without a verified official public careers feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'letsventure')

  assert.ok(scraper, 'Expected LetsVenture scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
