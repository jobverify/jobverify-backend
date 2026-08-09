import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/pixis/script.js'

test('Pixis resolves to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nPixis\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Pixis', 'pixis', 'Pixis']],
  )
})

test('Pixis does not match similar company names', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nPixis AI\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 0)
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Pixis AI'])
})

test('Pixis fails closed when its official careers page has no public vacancies', async () => {
  assert.deepEqual(await run(), [])
})
