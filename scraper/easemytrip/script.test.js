import test from 'node:test'
import assert from 'node:assert/strict'

import { run } from './script.js'
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../../scraper-support/providers/index.js'

test('fails closed when no official EaseMyTrip India jobs feed is available', async () => {
  assert.deepEqual(await run(), [])
})

test('matches the exact EaseMyTrip company name in coverage', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nEaseMyTrip\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].companyName, 'EaseMyTrip')
  assert.equal(report.matched[0].source, 'easemytrip')
})
