import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../../scraper-support/providers/index.js'
import { createPurplleScraper } from './script.js'

test('Purplle resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nPurplle\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0]?.source, 'purplle')
})

test('Purplle fail-closed provider returns no unverifiable India jobs', async () => {
  const jobs = await createPurplleScraper().run()

  assert.deepEqual(jobs, [])
})
