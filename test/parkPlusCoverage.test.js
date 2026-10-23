import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const COMPANY_CSV_TEXT = "company_name\nPark Plus\n"

test('Park Plus is covered only by its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'parkpluscompany')
  const report = generateCompanyCoverageReport({
    csvText: COMPANY_CSV_TEXT,
    catalog,
  })
  const nearNameReport = generateCompanyCoverageReport({
    csvText: 'company_name\nPark+\nPark+ India\nPark Plus India\n',
    catalog,
  })

  assert.ok(provider, 'Expected Park Plus provider extension in the scraper catalog')
  assert.equal(provider.companyName, 'Park Plus')
  assert.equal(provider.companyDomain, 'parkplus.io')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.atsPlatform, 'unresolved-exact-employer-identity-live-probe')
  assert.deepEqual(
    report.matched.filter((item) => item.companyName === 'Park Plus').map((item) => item.source),
    ['parkpluscompany'],
  )
  assert.deepEqual(
    nearNameReport.matched.map((item) => [item.companyName, item.source]),
    [
      ['Park+', 'parkplus'],
      ['Park+ India', 'parkplusindia'],
    ],
  )
  assert.deepEqual(
    nearNameReport.unmatched.map((item) => item.companyName),
    ['Park Plus India'],
  )
})

test('Park Plus scraper preserves unresolved entity coverage without false zero', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'parkpluscompany')

  assert.ok(scraper, 'Expected Park Plus scraper to be built from its provider extension')
  await assert.rejects(scraper.run({fetchImpl:async()=>{throw Error('offline')}}),error=>error.code==='PARKPLUSCOMPANY_COVERAGE_GAP'&&error.inventoryEvidence.reportedTotal===null&&error.lifecycleCleanupAllowed===false)
})
