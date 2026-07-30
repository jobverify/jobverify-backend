import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper/providers/index.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

test('ChargePoint resolves only to its exact-name official provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'chargepoint')
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nChargePoint Technologies\nChargePoint India\n',
    catalog,
  })

  assert.ok(provider, 'Expected ChargePoint provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'ChargePoint')
  assert.equal(provider.companyDomain, 'chargepoint.com')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'exact-name-fail-closed-sentinel')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'ChargePoint').map((item) => item.source),
    ['chargepoint'],
  )
  assert.deepEqual(nearNameReport.matched, [])
  assert.deepEqual(
    nearNameReport.unmatched.map((item) => item.companyName),
    ['ChargePoint Technologies', 'ChargePoint India'],
  )
})

test('ChargePoint scraper fails closed without a verified enumerable official jobs feed', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'chargepoint')

  assert.ok(scraper, 'Expected ChargePoint scraper to be built from its provider extension')
  assert.deepEqual(await scraper.run(), [])
})
