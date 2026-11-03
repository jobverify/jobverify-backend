import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/agnext/script.js'

test('AgNext resolves approved case variants to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nAgNext\nAGNEXT\nAg Next\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [
      ['AgNext', 'agnext', 'AgNext'],
      ['AGNEXT', 'agnext', 'AgNext'],
    ],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Ag Next'])
})

test('AgNext rejects a failed official response instead of certifying an empty inventory', async () => {
  await assert.rejects(run({ fetchPage: async url => ({ status: 503, url, html: 'Unavailable' }) }), error => {
    assert.equal(error.failureKind, 'coverage_gap')
    assert.ok(error.recruitmentObservations.receipts.every(row => row.status === 503))
    assert.ok(error.recruitmentObservations.failures.every(row => /HTTP 503/.test(row.message)))
    return true
  })
})
