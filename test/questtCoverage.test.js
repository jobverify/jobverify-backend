import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'

test('Questt resolves only to its exact-name first-party provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nQuestt\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Questt', 'questt', 'Questt']],
  )
  assert.equal(report.unmatchedCount, 0)
})

test('Questt fails closed without a verified first-party careers feed', async () => {
  const modulePath = new URL('../scraper/questt/script.js', import.meta.url)
  assert.equal(existsSync(modulePath), true)

  const { run } = await import(modulePath)
  assert.deepEqual(await run(), [])
})
