import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'

test('RoboMQ resolves only its exact company name', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nRoboMQ\nRoboMQ Technologies\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName]),
    [['RoboMQ', 'robomq', 'RoboMQ']],
  )
  assert.deepEqual(
    report.unmatched.map((item) => item.companyName),
    ['RoboMQ Technologies'],
  )
})

test('RoboMQ fails closed without a first-party or official ATS job feed', async () => {
  const { run } = await import('../scraper/robomq/script.js')

  assert.deepEqual(await run(), [])
})
