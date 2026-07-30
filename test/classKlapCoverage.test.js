import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import { run } from '../scraper/classklap/script.js'

test('ClassKlap resolves only to its exact-name first-party provider', () => {
  const catalog = getScraperCatalog()
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nClassKlap\nClass Klap\n',
    catalog,
  })

  const provider = catalog.find((item) => item.source === 'classklap')

  assert.ok(provider)
  assert.equal(provider.companyName, 'ClassKlap')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.companyDomain, 'classklap.com')
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [['ClassKlap', 'classklap']],
  )
  assert.deepEqual(
    report.unmatched.map((item) => item.companyName),
    ['Class Klap'],
  )
})

test('ClassKlap fails closed without a trustworthy public official listing feed', async () => {
  assert.deepEqual(await run(), [])
})
