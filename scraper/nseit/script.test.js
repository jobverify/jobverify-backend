import assert from 'node:assert/strict'
import test from 'node:test'

import { run } from './script.js'
import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('NSEIT matches exact company coverage through the provider catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'nseit')

  assert.ok(provider)
  assert.equal(provider.companyName, 'NSEIT')
  assert.equal(provider.companyCareerPage, 'https://www.nseit.com/careers')
  assert.equal(provider.verifiedIndiaJobCount, 0)

  const report = generateCompanyCoverageReport({
    csvText: 'NSEIT,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'nseit')
})

test('NSEIT is runnable and fails closed without a verified public listing surface', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'nseit')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.deepEqual(await run(), [])
})
